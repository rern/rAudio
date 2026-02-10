#!/bin/bash

# Flags: updating, listing
#
#  - Use only `updating` flag from start to finish.
#  - Resume on boot:
#    - updating - resume mpc update
#    - listing  - resume without mpc update

. /srv/http/bash/common.sh

killProcess cmdlist
echo $$ > $dirshm/pidcmdlist

file_album=$dirmpd/albumbyartist-year
file_latest=$dirmpd/latestbyartist-year
format='[%albumartist%|%artist%]^^%date%^^%album%^^%file%'

albumList() {
	local mpclistall
	mpclistall=$( mpc -f $format listall 2> /dev/null )
	[[ $mpclistall ]] && albumSort "$mpclistall"
}
albumSort() { # exclude blank, no %album% | sort unique without %file%
	awk NF <<< $1 \
		| grep -v '^^.*^^\s*^^' \
		| awk -F'/[^/]*$' '!/^\^/ {print $1 | "sort -u"}'
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
	updatetime="(Scan: $( timeFormat $mpdtime ) · Cache: $( timeFormat $SECONDS ))"
	echo $updatetime > $dirmpd/updatetime
	pushData mpdupdate '{ '$counts' }'
	touch $dirshm/updatedone
	$dirbash/status-push.sh
	( sleep 5; rm -f $dirmpd/listing )& # debounce mpc idleloop
}

touch $dirmpd/listing
grep -qs ^latest=true $dirsystem/mpcupdate.conf && latestappend=1
[[ -e $dirmpd/updatestart ]] && mpdtime=$(( $( date +%s ) - $( < $dirmpd/updatestart ) )) || mpdtime=0
rm -f $dirmpd/updatestart $dirsystem/mpcupdate.conf

song=$( mpc stats | awk '/^Songs/ {print $NF}' )
counts='
  "song"      : '$song'
, "playlists" : '$( ls $dirplaylists | wc -l )
counts+=$( countRadio )
if [[ $song == 0 ]]; then
	find $dirmpd -type f ! -name *.db -delete
	updateDone
	exit
# --------------------------------------------------------------------
fi
##### album
albumlist=$( albumList )
if [[ ! $albumlist ]]; then # very large database
	ln -sf $dirmpdconf/{conf/,}outputbuffer.conf
	buffer=$( cut -d'"' -f2 $dirmpdconf/outputbuffer.conf )
	for (( i=0; i < 20; i++ )); do # increase buffer
		buffer=$(( buffer + 8192 ))
		notifyError "Large Library: Increase buffer to $buffer k ..."
		echo 'max_output_buffer_size "'$buffer'"' > $dirmpdconf/outputbuffer.conf
		systemctl restart mpd
		albumlist=$( albumList )
		[[ $albumlist ]] && break
	done
	
	if [[ ! $albumlist ]]; then # too large - get by album list instead
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
				albumlist+=$( albumSort "$mpclistfind" )
			done <<< $albums
		else
			notifyError 'Library is too large.<br>Album list will not be available.'
		fi
	fi
	echo 'max_output_buffer_size "8192"' > $dirmpdconf/outputbuffer.conf
	rm $dirmpdconf/outputbuffer.conf
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
	albumlist=$( sort -u <<< $albumlist )
##### latest
	if [[ -e $file_album ]]; then # skip if initial scan
		sed -i 's/^...//' $file_album  # remove I^^ leading index for compare
		latest=$( comm -23 --nocheck-order <( echo "$albumlist" ) $file_album )
					 # suppress if in: [2]only, [3]both -- stdout in: [1]only >> new latest
		if [[ -e $file_latest && ( ! $latest || $latestappend ) ]]; then
			sed -i 's/^...//' $file_latest
			latestprev=$( comm -12 --nocheck-order $file_latest <( echo "$albumlist" ) ) # previous latest - omit removed albums
							 # suppress if in: [1]only, [2]only -- stdout in: [3]both >> previous latest
			[[ $latestprev ]] && latest+="
$latestprev"
		fi
	fi
	list2file album "$albumlist"
else
	rm -f $dirmpd/{album,albumby*}
fi
if [[ $latest ]]; then
	latest=$( awk NF <<< $latest | sort -u )
	list2file latest "$latest"
elif [[ ! $latest || ! $albumlist ]]; then
	rm -f $dirmpd/latest*
fi
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
