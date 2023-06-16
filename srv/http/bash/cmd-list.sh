#!/bin/bash

# Flags: updating, listing
#
#  - Use only `updating` flag from start to finish.
#  - Resume on boot:
#    - updating - resume mpc update
#    - listing  - resume without mpc update

. /srv/http/bash/common.sh

touch $dirshm/listing # for debounce mpdidle.sh

# for latest albums
[[ -s $dirmpd/album && $( getContent $dirmpd/updating ) != rescan ]] && cp -f $dirmpd/album $dirshm/albumprev
rm -f $dirmpd/updating
touch $dirmpd/listing

updateDone() {
	[[ $counts ]] && jq <<< $counts > $dirmpd/counts
	rm -f $dirmpd/listing
	pushstream mpdupdate '{ "done": 1 }'
	status=$( $dirbash/status.sh )
	pushstream mpdplayer "$status"
	( sleep 10 && rm -f $dirshm/listing ) &
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

##### album #############################################
listAll() {
	mpc -f '[%albumartist%|%artist%]^^%date%^^%album%^^%file%' listall 2> /dev/null \
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
				album_artist_file+=$( mpc -f '[%albumartist%|%artist%]^^%date^^%album%^^%file%' find album "$album" \
										| awk -F'/[^/]*$' 'NF && !/^\^/ && !a[$0]++ {print $1}' \
										| sort -u )$'\n'
			done
		else
			notify -blink refresh-library 'Library Database' 'Library is too large.<br>Album list will not be available.' 3000
		fi
	fi
fi
##### album from wav (mpd not read *.wav albumartist)
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

album=$( awk NF <<< $album_artist_file | sort -uf )
if [[ -e $dirmpd/albumignore ]]; then
	readarray -t albumignore < $dirmpd/albumignore
	for line in "${albumignore[@]}"; do
		album=$( sed "/^$line^/ d" <<< $album )
	done
fi

##### save and sort #############################################
filealbumyear=$dirmpd/albumbyartist-year
awk NF <<< $album > $filealbumyear
php $dirbash/cmd-listsort.php $filealbumyear # albumbyartist-year > album and albumbyartist

for mode in albumartist artist composer conductor genre date; do
	filemode=$dirmpd/$mode
	printf -v $mode '%s' $( mpc list $mode | awk NF | awk '{$1=$1};1' | tee $filemode | wc -l )
	php $dirbash/cmd-listsort.php $filemode
done

##### latest albums #############################################
[[ -e $dirshm/albumprev ]] && new=$( diff $dirmpd/album $dirshm/albumprev | grep '^<' | cut -c 3- )
echo "$new" > $dirmpd/latest
rm -f $dirshm/albumprev

##### count #############################################
dabradio=$( find -L $dirdata/dabradio -type f ! -path '*/img/*' 2> /dev/null | wc -l ) # no $dirdabradio if dab not installed
counts='{
  "album"       : '$( awk NF $dirmpd/album | wc -l )'
, "albumyear"   : '$( awk NF $filealbumyear | wc -l )'
, "albumartist" : '$albumartist'
, "artist"      : '$artist'
, "composer"    : '$composer'
, "conductor"   : '$conductor'
, "dabradio"    : '$dabradio'
, "date"        : '$date'
, "genre"       : '$genre'
, "latest"      : '$( awk NF $dirmpd/latest | wc -l )'
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
