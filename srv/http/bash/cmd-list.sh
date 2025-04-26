#!/bin/bash

# Flags: updating, listing
#
#  - Use only `updating` flag from start to finish.
#  - Resume on boot:
#    - updating - resume mpc update
#    - listing  - resume without mpc update

. /srv/http/bash/common.sh

file_album_prev=$dirshm/albumprev
file_album_a_y=$dirmpd/albumbyartist-year
file_latest_a_y=$dirmpd/latestbyartist-year
format='[%albumartist%|%artist%]^^%date%^^%album%^^%file%'

albumList() {
	mpclistall=$( mpc -f $format listall 2> /dev/null )
	[[ $mpclistall ]] && albumlist=$( excludeNoAlbum "$mpclistall" )
}
excludeNoAlbum() { # exclude no album tag, strip filename, sort unique
	awk -F'/[^/]*$' 'NF && !/^\^/ {print $1|"sort -u"}' <<< $1
}
list2file() {
	echo "$2" > $dirmpd/$1'byartist-year' # %artist%^^%date^^%album%^^%file%
	awk -F'^' '{print $1"^^"$5"^^"$7}' <<< "$2" | sort -u > $dirmpd/$1'byartist'
	awk -F'^' '{print $5"^^"$1"^^"$7}' <<< "$2" | sort -u > $dirmpd/$1
}
notifyError() {
	notify 'refresh-library blink' 'Library Database' "$1" 3000
}
timeFormat() {
	date -d@$1 -u '+%-Hh %-Mm %-Ss' | sed -E 's/0h 0m |0h //'
}
updateDone() {
	jq -S <<< "{ $counts }" > $dirmpd/counts
	pushData mpdupdate '{ '$counts', "done": true }'
	updatetime="(Scan: $( timeFormat $mpdtime ) • Cache: $( timeFormat $SECONDS ))"
	echo $updatetime > $dirmpd/updatetime
	rm -f $dirmpd/listing $dirshm/albumprev
	$dirbash/status-push.sh
	( sleep 3 && rm -f $dirshm/listing ) &
}

touch $dirmpd/listing $dirshm/listing # for debounce mpdidle
[[ -e $dirmpd/updatestart ]] && mpdtime=$(( $( date +%s ) - $( < $dirmpd/updatestart ) )) || mpdtime=0
grep -qs LATEST=true $dirmpd/updating && latestappend=1
[[ -e $file_album_a_y ]] && cut -c 4- $file_album_a_y > $file_album_prev && albumprev=1
rm -f $dirmpd/{updatestart,updating}

song=$( mpc stats | awk '/^Songs/ {print $NF}' )
counts='
  "song"      : '$song'
, "playlists" : '$( ls $dirplaylists | wc -l )
for d in dabradio webradio; do
	[[ -e $dirdata/$d ]] && counts+='
, "'$d'" : '$( find -L $dirdata/$d -type f ! -regex '.*\.\(jpg\|gif\|png\)$' | wc -l )
done
if [[ $song == 0 ]]; then
	find $dirmpd -type f ! -name *.db -delete
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
				mpclistfind=$( mpc -f $format find album "$a" )
				albumlist+=$( excludeNoAlbum "$mpclistfind" )
			done <<< $albums
		else
			notifyError 'Library is too large.<br>Album list will not be available.'
		fi
	fi
	echo 'max_output_buffer_size "8192"' > $dirmpdconf/outputbuffer.conf
	systemctl restart mpd
fi
if [[ $albumlist ]]; then
	dirwav=$( sed -n -E '/\.wav$/ {s/.*\^//; s|/[^/]+$||; p}' <<< $albumlist | sort -u ) # mpd not support *.wav albumartist
	if [[ $dirwav ]]; then
		while read dir; do
			file=$( ls "/mnt/MPD/$dir/"*.wav | head -1 )
			albumartist=$( kid3-cli -c 'get albumartist' "$file" 2> /dev/null )
			[[ $albumartist ]] && albumlist=$( sed -n '\|\^'$dir'\/.*wav$| {s/[^^]*/'$albumartist'/; p}' <<< $albumlist )
		done <<< $dirwav
	fi
	albumlist=$( sort -u <<< $albumlist | awk NF )
	list2file album "$albumlist"
else
	rm -f $dirmpd/{album,albumbyartist*}
fi
##### latest
if [[ $albumprev && $albumlist ]]; then # skip if initial scan
	if [[ $latestappend && -e $file_latest_a_y ]]; then
		latest=$( comm -12 --nocheck-order <( cut -c 4- $file_latest_a_y ) <( echo "$albumlist" ) )
	fi
	if [[ $albumlist ]]; then
		latest+=$'\n'$( comm -23 --nocheck-order <( echo "$albumlist" ) $file_album_prev )
	fi                      #-23 suppress: in 2 only && in 3(both) >> in 1 only -new latest
	latest=$( sort -u <<< $latest | awk NF )
	[[ $latest ]] && list2file latest "$latest"
fi
[[ ! $latest ]] && rm -f $dirmpd/latest*
##### mode others
modes='album albumbyartist albumbyartist-year albumartist artist composer conductor date genre'
modelatest='latest latestbyartist latestbyartist-year'
for mode in albumartist artist composer conductor date genre; do
	data=$( mpc list $mode | awk NF )
	[[ $data ]] && echo "$data" > $dirmpd/$mode || rm -f $dirmpd/$mode
done
for mode in $modes latest; do
	file=$dirmpd/$mode
	[[ $mode != *by* ]] && counts+='
, "'$mode'" : '$( lineCount $file )
done

php /srv/http/cmd.php sort "$modes $modelatest"

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
	if [[ $list ]]; then
		while read file; do # verify ignored dirs exist
			dir=$( dirname "$file" )
			while read d; do
				[[ ! -e "$dir/$d" ]] && sed -i "/^$d$/ d" "$file"
			done < "$file"
			if [[ ! $( awk NF "$file" ) ]]; then
				rm -f "$file"
				list=$( grep -v "^$file$" <<< $list )
			fi
		done <<< $list
		[[ $list ]] && sort -V <<< $list > $dirmpd/mpdignorelist
	else
		rm -f $dirmpd/mpdignorelist
	fi
) &
