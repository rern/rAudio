#!/bin/bash

# Flags: updating, listing
#
#  - Use only `updating` flag from start to finish.
#  - Resume on boot:
#    - updating - resume mpc update
#    - listing  - resume without mpc update

. /srv/http/bash/common.sh

touch $dirmpd/listing $dirshm/listing # for debounce mpdidle.sh
rm -f $dirmpd/updating

modes='album albumbyartist-year latest albumartist artist composer conductor genre date'

updateDone() {
	[[ $counts ]] && jq -S <<< "{ $counts }" > $dirmpd/counts
	rm -f $dirmpd/listing
	pushstream mpdupdate '{ "done": 1 }'
	status=$( $dirbash/status.sh )
	pushstream mpdplayer "$status"
	( sleep 3 && rm -f $dirshm/listing ) &
}

song=$( mpc stats | awk '/^Songs/ {print $NF}' )
counts='
  "song"      : '$song'
, "playlists" : '$( ls -1 $dirplaylists | wc -l )'
, "dabradio"  : '$( [[ -e $dirdabradio ]] && find -L $dirdabradio -type f ! -path '*/img/*' | wc -l || echo 0 )'
, "webradio"  : '$( find -L $dirwebradio -type f ! -path '*/img/*' | wc -l )
if [[ $song == 0 ]]; then
	for mode in "$modes albumbyartist"; do
		rm -f $dirmpd/$mode
	done
	updateDone
	exit
fi

for mode in NAS SD USB; do
	counts+='
, "'${mode,,}'" : '$( mpc ls $mode 2> /dev/null | wc -l )
done

##### album
# for latest albums
[[ -s $dirmpd/album && $( getContent $dirmpd/updating ) != rescan ]] && cp -f $dirmpd/album $dirshm/albumprev

albumList() {
	mpclistall=$( mpc -f '%album%^^[%albumartist%|%artist%]^^%date%^^%file%' listall 2> /dev/null )        # include no album tag
	[[ $mpclistall ]] && albumlist=$( awk -F'/[^/]*$' 'NF && !/^\^/ {print $1|"sort -u"}'<<< $mpclistall ) # exclude no album tag, strip filename, sort unique
}

albumList
if [[ ! $mpclistall ]]; then # very large database
	notify -blink refresh-library 'Library Database' 'Increase buffer for large Library ...' 3000
	ln -sf $dirmpdconf/{conf/,}outputbuffer.conf
	buffer=$( cut -d'"' -f2 $dirmpdconf/outputbuffer.conf )
	for (( i=0; i < 10; i++ )); do # increase buffer
		buffer=$(( buffer + 8192 ))
		echo 'max_output_buffer_size "'$buffer'"' > $dirmpdconf/outputbuffer.conf
		systemctl restart mpd
		albumList
		[[ $mpclistall ]] && break
	done
	
	if [[ ! $mpclistall ]]; then # too large - get by album list instead
		notify -blink refresh-library 'Library Database' 'Parse each album for large Library ...' 3000
		echo 'max_output_buffer_size "8192"' > $dirmpdconf/outputbuffer.conf
		systemctl restart mpd
		readarray -t albums <<< $( mpc list album 2> /dev/null )
		if [[ ! $albums ]]; then
			buffer=8192
			for (( i=0; i < 10; i++ )); do
				buffer=$(( buffer + 8192 ))
				echo 'max_output_buffer_size "'$buffer'"' > $dirmpdconf/outputbuffer.conf
				systemctl restart mpd
				readarray -t albums <<< $( mpc list album 2> /dev/null )
				[[ $albums ]] && break
			done
		fi
		if [[ $albums ]]; then
			for album in "${albums[@]}"; do
				albumlist+=$( mpc -f '%album%^^[%albumartist%|%artist%]^^%date^^%file%' find album "$album" | awk -F'/[^/]*$' 'NF {print $1|"sort -u"}' )$'\n'
			done
		else
			notify -blink refresh-library 'Library Database' 'Library is too large.<br>Album list will not be available.' 3000
		fi
	fi
fi
if [[ $albumlist ]]; then # album^^artist^^date^^file
	[[ -e $dirmpd/albumignore ]] && albumignore=$( < $dirmpd/albumignore )
	readarray -t lines <<< $albumlist
	for l in "${lines[@]}"; do
		readarray -t tags <<< $( echo -e ${l//^^/\\n} )
		tagalbum=${tags[0]}
		tagartist=${tags[1]}
		[[ $albumignore ]] && grep -q "$tagalbum^^$tagartist" <<< $albumignore && continue
		
		tagdate=${tags[2]}
		tagdir=${tags[3]}
		byalbum+="$tagalbum^^$tagartist^^$tagdir"$'\n'
		byartist+="$tagartist^^$tagalbum^^$tagdir"$'\n'
		byartistyear+="$tagartist^^$tagdate^^$tagalbum^^$tagdir"$'\n'
	done
	sort -u <<< ${byalbum:0:-1} > $dirmpd/album
	sort -u <<< ${byartist:0:-1} > $dirmpd/albumbyartist
	sort -u <<< ${byartistyear:0:-1} > $dirmpd/albumbyartist-year
	for mode in album albumbyartist albumbyartist-year; do
		php $dirbash/cmd-listsort.php $mode
	done
else
	rm -f $dirmpd/{album,albumbyartist,albumbyartist-year}
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
##### non-album - albumartist artist composer conductor genre date
modenonalbum=${modes/*latest }
for mode in $modenonalbum; do
	data=$( mpc list $mode | awk NF )
	if [[ $data ]]; then
		echo "$data" > $dirmpd/$mode
		php $dirbash/cmd-listsort.php $mode
	else
		rm -f $dirmpd/$mode
	fi
done

for mode in $modes; do
	[[ $mode == albumbyartist-year ]] && key=albumyear || key=$mode
	counts+='
, "'$key'" : '$( lineCount $dirmpd/$mode ) # albumbyartist-year > albumyear
done

updateDone

(
	nonutf8=$( mpc -f '/mnt/MPD/%file% [• %albumartist% ]• %artist% • %album% • %title%' listall | grep -axv '.*' )
	if [[ $nonutf8 ]]; then
		echo "$nonutf8" > $dirmpd/nonutf8
		notify -blink library 'Metadata Encoding' 'UTF-8 conversion needed: Player > Non UTF-8 Files'
	else
		rm -f $dirmpd/nonutf8
	fi
	
	list=$( find -L /mnt/MPD -name .mpdignore | sort -V )
	[[ $list ]] && echo "$list" > $dirmpd/mpdignorelist || rm -f $dirmpd/mpdignorelist
) &
