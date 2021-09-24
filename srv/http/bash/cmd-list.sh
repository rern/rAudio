#!/bin/bash

# Flags: updating, listing
#
#  - Use only `updating` flag from start to finish.
#  - Resume on boot:
#    - updating - resume mpc update
#    - listing  - resume without mpc update

dirdata=/srv/http/data
diraddons=$dirdata/addons
dirmpd=$dirdata/mpd
dirsystem=$dirdata/system

touch $dirsystem/listing

notify() {
	curl -s -X POST http://127.0.0.1/pub?id=notify -d "$1"
}

listAlbums() {
	albums=$1
	readarray -t albums <<< "$albums"
	for album in "${albums[@]}"; do
		album_artist_file+=$( mpc -f '%album%^^[%albumartist%|%artist%]^^%file%' find album "$album" \
								| awk -F'/[^/]*$' 'NF && !/^\^/ && !a[$0]++ {print $1}' \
								| sort -u )$'\n'
	done
}
##### normal list #############################################
album_artist_file=$( mpc -f '%album%^^[%albumartist%|%artist%]^^%file%' listall \
						| awk -F'/[^/]*$' 'NF && !/^\^/ && !a[$0]++ {print $1}' \
						| sort -u )$'\n'
#	-F'/[^/]*$' - truncate %file% to path without filename
#	NF          - not empty lines
#	!/^\^/      - not lines with no album name
#	!a[$0]++    - not duplicate lines

if (( $? != 0 )); then # very large database
	eachkb=8192
	existing=$( grep max_output_buffer /etc/mpd.conf | cut -d'"' -f2 )
	for (( i=1; i < 11; i++ )); do
		buffer=$(( $existing + ( i * $eachkb ) ))
		sed -i '/^max_output_buffer/ d' /etc/mpd.conf
		sed -i '1 i\max_output_buffer_size "'$buffer'"' /etc/mpd.conf
		systemctl restart mpd
		albums=$( mpc list album )
		(( $? == 0 )) && break
	done
	if [[ -n $albums ]]; then
		listAlbums "$albums"
		echo $buffer > $dirsystem/bufferoutput.conf
	else
		toolarge=1
		sed -i '/^max_output_buffer/ d' /etc/mpd.conf
	fi
fi
##### wav list #############################################
# mpd not read *.wav albumartist
readarray -t dirwav <<< $( mpc listall \
							| grep .wav$ \
							| sed 's|/[^/]*$||' \
							| sort -u )
if [[ -n $dirwav ]]; then
	for dir in "${dirwav[@]}"; do
		file="/mnt/MPD/$( mpc ls "$dir" | head -1 )"
		kid=$( kid3-cli -c 'get album' -c 'get albumartist' -c 'get artist' "$file" )
		if [[ -n $kid ]]; then
			albumwav=$( echo "$kid" \
									| head -2 \
									| awk 1 ORS='^^' \
									| sed "s|$|$dir|" )
			if [[ -n $albumwav ]]; then
				album_artist_file=$( sed "\|$dir$| d" <<< "$album_artist_file" )
				album_artist_file+=$'\n'$albumwav$'\n'
			fi
		fi
	done
fi

for mode in album albumartist artist composer conductor genre date; do
	dircount=$dirmpd/$mode
	if [[ $mode == album ]]; then
		album=$( grep . <<< "$album_artist_file" | sort -uf )
		if [[ -e $dirmpd/albumignore ]]; then
			readarray -t albumignore < $dirmpd/albumignore
			for line in "${albumignore[@]}"; do
				album=$( sed "/^$line^/ d" <<< "$album" )
			done
		fi
		album=$( echo "$album" | grep . | tee $dirmpd/album | wc -l )
	else
		printf -v $mode '%s' $( mpc list $mode | grep . | awk '{$1=$1};1' | tee $dircount | wc -l )
	fi
	(( $mode > 0 )) && php /srv/http/bash/cmd-listsort.php $dircount
done
##### count #############################################
for mode in NAS SD USB; do
	printf -v $mode '%s' $( mpc ls $mode 2> /dev/null | wc -l )
done
song=$( mpc stats | awk '/^Songs/ {print $NF}' )
webradio=$( ls -1q $dirdata/webradios | wc -l )
counts='
  "album"       : '$album'
, "albumartist" : '$albumartist'
, "artist"      : '$artist'
, "composer"    : '$composer'
, "conductor"   : '$conductor'
, "date"        : '$date'
, "genre"       : '$genre'
, "nas"         : '$NAS'
, "sd"          : '$SD'
, "usb"         : '$USB'
, "song"        : '$song'
, "webradio"    : '$webradio
echo {$counts} | jq . > $dirmpd/counts
curl -s -X POST http://127.0.0.1/pub?id=mpdupdate -d "{$counts}"
chown -R mpd:audio $dirmpd
rm -f $dirsystem/{updating,listing}

if [[ -n $toolarge ]]; then
	sleep 3
	notify '{"title":"Update Library Database","text":"Library is too large.<br>Album list cannot be created.","icon":"refresh-library","delay":-1}'
fi