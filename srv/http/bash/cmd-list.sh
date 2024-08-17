#!/bin/bash

# Flags: updating, listing
#
#  - Use only `updating` flag from start to finish.
#  - Resume on boot:
#    - updating - resume mpc update
#    - listing  - resume without mpc update

. /srv/http/bash/common.sh

modes='album albumbyartist albumbyartist-year albumartist artist composer conductor date genre latest'

albumList() {
	mpclistall=$( mpc -f '%album%^^[%albumartist%|%artist%]^^%date%^^%file%' listall 2> /dev/null )        # include no album tag
	[[ $mpclistall ]] && albumlist=$( awk -F'/[^/]*$' 'NF && !/^\^/ {print $1|"sort -u"}'<<< $mpclistall ) # exclude no album tag, strip filename, sort unique
}
notifyError() {
	notify 'refresh-library blink' 'Library Database' "$1" 3000
}
timeFormat() {
	date -d@$1 -u '+%-Hh %-Mm %-Ss' | sed -E 's/0h 0m |0h //'
}
updateDone() {
	[[ $counts ]] && jq -S <<< "{ $counts }" > $dirmpd/counts
	[[ -e $dirshm/tageditor ]] && counts='"tageditor"' || counts=$( < $dirmpd/counts )
	updatetime="(MPD: $( timeFormat $mpdtime ) + Cache: $( timeFormat $SECONDS ))"
	echo $updatetime > $dirmpd/updatetime
	pushData mpdupdate '{ "done": '$counts', "updatetime": "'$updatetime'" }'
	rm -f $dirmpd/listing $dirshm/tageditor
	$dirbash/status-push.sh
	( sleep 3 && rm -f $dirshm/listing ) &
}

touch $dirmpd/listing $dirshm/listing # for debounce mpdidle.sh
[[ -s $dirmpd/album ]] && cp -f $dirmpd/album $dirshm/albumprev # for latest albums
rm -f $dirmpd/updating

[[ -e $dirmpd/updatestart ]] && mpdtime=$(( $( date +%s ) - $( < $dirmpd/updatestart ) )) || mpdtime=0
rm -f $dirmpd/updatestart

song=$( mpc stats | awk '/^Songs/ {print $NF}' )
if [[ -e $dirdabradio ]]; then
	dabradio=$( find -L $dirdabradio -type f ! -path '*/img/*' | wc -l )
else
	dabradio=0
fi
counts='
  "song"      : '$song'
, "playlists" : '$( ls -1 $dirplaylists | wc -l )'
, "dabradio"  : '$dabradio'
, "webradio"  : '$( find -L $dirwebradio -type f ! -path '*/img/*' | wc -l )
if [[ $song == 0 ]]; then
	for mode in $modes; do
		rm -f $dirmpd/$mode
	done
	updateDone
	exit
# --------------------------------------------------------------------
fi
##### album
albumList
if [[ ! $mpclistall ]]; then # very large database
	ln -sf $dirmpdconf/{conf/,}outputbuffer.conf
	buffer=$( cut -d'"' -f2 $dirmpdconf/outputbuffer.conf )
	for (( i=0; i < 20; i++ )); do # increase buffer
		buffer=$(( buffer + 8192 ))
		notifyError "Large Library: Increase buffer to $buffer k ..."
		echo 'max_output_buffer_size "'$buffer'"' > $dirmpdconf/outputbuffer.conf
		systemctl restart mpd
		albumList
		[[ $mpclistall ]] && break
	done
	
	if [[ ! $mpclistall ]]; then # too large - get by album list instead
		echo 'max_output_buffer_size "8192"' > $dirmpdconf/outputbuffer.conf
		systemctl restart mpd
		albums=$( mpc list album 2> /dev/null )
		if [[ ! $albums ]]; then
			buffer=8192
			for (( i=0; i < 10; i++ )); do
				buffer=$(( buffer + 8192 ))
				notifyError "Large Library - Album mode: Increase buffer to $buffer k ..."
				echo 'max_output_buffer_size "'$buffer'"' > $dirmpdconf/outputbuffer.conf
				systemctl restart mpd
				albums=$( mpc list album 2> /dev/null )
				[[ $albums ]] && break
			done
		fi
		if [[ $albums ]]; then
			while read a; do
				albumlist+=$( mpc -f '%album%^^[%albumartist%|%artist%]^^%date^^%file%' find album "$a" | awk -F'/[^/]*$' 'NF {print $1|"sort -u"}' )$'\n'
			done <<< $albums
		else
			notifyError 'Library is too large.<br>Album list will not be available.'
		fi
	fi
	echo 'max_output_buffer_size "8192"' > $dirmpdconf/outputbuffer.conf
	systemctl restart mpd
fi
if [[ $albumlist ]]; then # album^^artist^^date^^dir
	filewav=$( grep \.wav$ <<< $mpclistall )
	if [[ $filewav ]]; then # mpd not support *.wav albumartist
		dirwav=$( sed 's|.*\^||; s|/[^/]*$||' <<< $filewav | sort -u )
		if [[ $dirwav ]]; then
			while read dir; do
				dir=${dir//[/\\[/} # escape n-n to not as range in grep
				file=$( grep -m1 "$dir" <<< $mpclistall )
				albumartist=$( kid3-cli -c 'get albumartist' "/mnt/MPD/${file/*^}" 2> /dev/null )
				if [[ $albumartist ]]; then
					line=$( grep -m1 "$dir$" <<< $albumlist )
					readarray -t tags <<< $( echo -e "${line//^^/\\n}" )
					albumlist="\
$( grep -v "$dir$" <<< $albumlist )
${tags[0]}^^$albumartist^^${tags[2]}^^$dir"
				fi
			done <<< $dirwav
		fi
	fi
	albumignore=$( getContent $dirmpd/albumignore )
	declare -A array
	while read line; do
		readarray -t tags <<< $( echo -e "${line//^^/\\n}" )
		tagalbum=${tags[0]}
		tagartist=${tags[1]}
		[[ $albumignore ]] && grep -q "^$tagalbum^^$tagartist\$" <<< $albumignore && continue
		
		tagdate=${tags[2]}
		tagdir=${tags[3]}
		array[album]+="$tagalbum^^$tagartist^^$tagdir"$'\n'
		array[albumbyartist]+="$tagartist^^$tagalbum^^$tagdir"$'\n'
		array[albumbyartist-year]+="$tagartist^^$tagdate^^$tagalbum^^$tagdir"$'\n'
	done <<< $albumlist
	for mode in album albumbyartist albumbyartist-year; do
		sort -u <<< ${array[$mode]} > $dirmpd/$mode
	done
else
	rm -f $dirmpd/{album,albumbyartist*}
fi
##### latest
[[ -e $dirmpd/album && -e $dirshm/albumprev ]] && albumdiff=$( diff $dirmpd/album $dirshm/albumprev )
if [[ $albumdiff ]]; then
	new=$( grep '^<' <<< $albumdiff | cut -c 3- )
	deleted=$( grep '^>' <<< $albumdiff | cut -c 3- )
	[[ $new ]] && echo "$new" > $dirmpd/latest
	if [[ $deleted ]]; then
		echo "$deleted" > $dirshm/deleted
		latest=$( grep -Fvx -f $dirshm/deleted $dirmpd/latest )
		echo "$latest" > $dirmpd/latest
	fi
fi
rm -f $dirshm/{albumprev,deleted}

for mode in albumartist artist composer conductor date genre; do
	data=$( mpc list $mode | awk NF )
	if [[ $data ]]; then
		echo "$data" > $dirmpd/$mode
	else
		rm -f $dirmpd/$mode
	fi
done

php /srv/http/cmd.php sort "$modes"

for mode in $modes; do
	[[ $mode == albumby* ]] && continue
	
	counts+='
, "'$mode'" : '$( lineCount $dirmpd/$mode ) # albumbyartist-year > albumyear
done

updateDone

(
	nonutf8=$( mpc -f '/mnt/MPD/%file% [• %albumartist% ]• %artist% • %album% • %title%' listall | grep -axv '.*' )
	if [[ $nonutf8 ]]; then
		echo "$nonutf8" > $dirmpd/nonutf8
		notifyError 'UTF-8 conversion needed: See Player > Non UTF-8 Files'
	else
		rm -f $dirmpd/nonutf8
	fi
	
	list=$( find -L /mnt/MPD -name .mpdignore )
	[[ $list ]] && sort -V <<< $list > $dirmpd/mpdignorelist || rm -f $dirmpd/mpdignorelist
) &
