#!/bin/bash

# Flags: updating, listing
#
#  - Use only `updating` flag from start to finish.
#  - Resume on boot:
#    - updating - resume mpc update
#    - listing  - resume without mpc update

. /srv/http/bash/common.sh

updateDone() {
	rm -f $dirmpd/listing
	[[ $counts ]] && jq <<< $counts > $dirmpd/counts
	pushstream mpdupdate '{ "done": 1 }'
	status=$( $dirbash/status.sh )
	pushstream mpdplayer "$status"
}

song=$( mpc stats | awk '/^Songs/ {print $NF}' )
webradio=$( find -L $dirwebradio -type f ! -path '*/img/*' | wc -l )

if [[ $song == 0 ]]; then
	counts='{
  "playlists" : 0
, "webradio"  : '$webradio'
}'
	updateDone
	exit
fi

touch $dirmpd/listing

##### normal list #############################################
listAll() {
	mpc -f '%album%^^[%albumartist%|%artist%]^^%file%' listall 2> /dev/null \
							| awk -F'/[^/]*$' 'NF && !/^\^/ {print $1}' \
							| sort -u
#	-F'/[^/]*$' - truncate %file% to path without filename
#	NF          - not empty lines
#	!/^\^/      - not lines with no album name
}

album_artist_file=$( listAll )

if [[ ! $album_artist_file ]]; then # very large database
	notify -blink refresh-library 'Library Database' 'Increase buffer for large Library ...' 3000
	ln -sf $dirmpdconf/{conf/,}outputbuffer.conf
	buffer=$( cut -d'"' -f2 $dirmpdconf/outputbuffer.conf )
	for (( i=0; i < 10; i++ )); do # increase buffer
		buffer=$(( buffer + 8192 ))
		echo 'max_output_buffer_size "'$buffer'"' > $dirmpdconf/outputbuffer.conf
		systemctl restart mpd
		album_artist_file=$( listAll )
		[[ $album_artist_file ]] && break
	done
	
	if [[ ! $album_artist_file ]]; then # too large - get by album list instead
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
				album_artist_file+=$( mpc -f '%album%^^[%albumartist%|%artist%]^^%file%' find album "$album" \
										| awk -F'/[^/]*$' 'NF && !/^\^/ && !a[$0]++ {print $1}' \
										| sort -u )$'\n'
			done
		else
			notify -blink refresh-library 'Library Database' 'Library is too large.<br>Album list will not be available.' 3000
		fi
	fi
fi
##### wav list #############################################
# mpd not read *.wav albumartist
readarray -t dirwav <<< $( mpc listall \
							| sed -n '/\.wav$/ {s|/[^/]*$||; p}' \
							| sort -u )
if [[ $dirwav ]]; then
	for dir in "${dirwav[@]}"; do
		file="/mnt/MPD/$( mpc ls "$dir" | head -1 )"
		kid=$( kid3-cli -c 'get album' -c 'get albumartist' -c 'get artist' "$file" )
		if [[ $kid ]]; then
			albumwav=$( head -2 <<< $kid \
							| awk 1 ORS='^^' \
							| sed "s|$|$dir|" )
			if [[ $albumwav ]]; then
				album_artist_file=$( sed "\|$dir$| d" <<< $album_artist_file )
				album_artist_file+=$'\n'$albumwav$'\n'
			fi
		fi
	done
fi

filealbum=$dirmpd/album
filealbumprev=$dirmpd/albumprev
if [[ $( awk NF $dirmpd/album ) && $( getContent $dirmpd/updating ) != rescan ]]; then
	cp -f $filealbum{,prev}
else
	> $dirmpd/latest
	latest=0
fi

for mode in album albumartist artist composer conductor genre date; do
	filemode=$dirmpd/$mode
	if [[ $mode == album ]]; then
		album=$( awk NF <<< $album_artist_file | sort -uf )
		if [[ -e $dirmpd/albumignore ]]; then
			readarray -t albumignore < $dirmpd/albumignore
			for line in "${albumignore[@]}"; do
				album=$( sed "/^$line^/ d" <<< $album )
			done
		fi
		album=$( awk NF <<< $album | tee $filealbum | wc -l )
	else
		printf -v $mode '%s' $( mpc list $mode | awk NF | awk '{$1=$1};1' | tee $filemode | wc -l )
	fi
	(( $mode > 0 )) && php $dirbash/cmd-listsort.php $filemode
done

##### latest album #############################################
if [[ -e $filealbumprev ]]; then # latest
	latestnew=$( diff $filealbum $filealbumprev | grep '^<' | cut -c 3- )
	rm -f $filealbumprev
	if [[ $latestnew ]]; then
		echo "$latestnew" > $dirmpd/latestnew
		if diff $dirmpd/latest $dirmpd/latestnew &> /dev/null; then # no diff - return 0
			rm -f $dirmpd/latestnew
		else
			mv -f $dirmpd/latest{new,}
		fi
	fi
	[[ -e $dirmpd/latest ]] && latest=$( wc -l < $dirmpd/latest ) || latest=0
fi
##### count #############################################
dabradio=$( find -L $dirdata/dabradio -type f ! -path '*/img/*' 2> /dev/null | wc -l ) # no $dirdabradio if dab not installed
counts='{
  "album"       : '$album'
, "albumartist" : '$albumartist'
, "artist"      : '$artist'
, "composer"    : '$composer'
, "conductor"   : '$conductor'
, "dabradio"    : '$dabradio'
, "date"        : '$date'
, "genre"       : '$genre'
, "latest"      : '$latest'
, "nas"         : '$( mpc ls NAS 2> /dev/null | wc -l )'
, "playlists"   : '$( ls -1 $dirplaylists | wc -l )'
, "sd"          : '$( mpc ls SD 2> /dev/null | wc -l )'
, "song"        : '$song'
, "usb"         : '$( mpc ls USB 2> /dev/null | wc -l )'
, "webradio"    : '$webradio'
}'
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
