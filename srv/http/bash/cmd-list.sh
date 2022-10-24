#!/bin/bash

# Flags: updating, listing
#
#  - Use only `updating` flag from start to finish.
#  - Resume on boot:
#    - updating - resume mpc update
#    - listing  - resume without mpc update

. /srv/http/bash/common.sh

touch $dirmpd/listing

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
	existing=$( grep max_output_buffer $mpdconf | cut -d'"' -f2 )
	ln -sf $dirmpdconf/{conf/,}outputbuffer.conf
	for (( i=1; i < 11; i++ )); do
		buffer=$(( $existing + ( i * $eachkb ) ))
		echo 'max_output_buffer_size "'$buffer'"' > $dirmpdconf/outputbuffer.conf
		systemctl restart mpd
		albums=$( mpc list album )
		(( $? == 0 )) && break
	done
	if [[ $albums ]]; then
		listAlbums "$albums"
	else
		toolarge=1
		rm $dirmpdconf/outputbuffer.conf
	fi
fi
##### wav list #############################################
# mpd not read *.wav albumartist
readarray -t dirwav <<< $( mpc listall \
							| grep '\.wav$' \
							| sed 's|/[^/]*$||' \
							| sort -u )
if [[ $dirwav ]]; then
	for dir in "${dirwav[@]}"; do
		file="/mnt/MPD/$( mpc ls "$dir" | head -1 )"
		kid=$( kid3-cli -c 'get album' -c 'get albumartist' -c 'get artist' "$file" )
		if [[ $kid ]]; then
			albumwav=$( echo "$kid" \
									| head -2 \
									| awk 1 ORS='^^' \
									| sed "s|$|$dir|" )
			if [[ $albumwav ]]; then
				album_artist_file=$( sed "\|$dir$| d" <<< "$album_artist_file" )
				album_artist_file+=$'\n'$albumwav$'\n'
			fi
		fi
	done
fi

filealbum=$dirmpd/album
filealbumprev=$dirmpd/albumprev
if [[ $( awk NF $dirmpd/album ) && $( cat $dirmpd/updating ) != rescan ]]; then
	cp -f $filealbum{,prev}
else
	> $dirmpd/latest
	latest=0
fi

for mode in album albumartist artist composer conductor genre date; do
	filemode=$dirmpd/$mode
	if [[ $mode == album ]]; then
		album=$( echo "$album_artist_file" | awk NF | sort -uf )
		if [[ -e $dirmpd/albumignore ]]; then
			readarray -t albumignore < $dirmpd/albumignore
			for line in "${albumignore[@]}"; do
				album=$( sed "/^$line^/ d" <<< "$album" )
			done
		fi
		album=$( echo "$album" | awk NF | tee $filealbum | wc -l )
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
	[[ -e $dirmpd/latest ]] && latest=$( cat $dirmpd/latest | wc -l ) || latest=0
fi
##### count #############################################
for mode in NAS SD USB; do
	printf -v $mode '%s' $( mpc ls $mode 2> /dev/null | wc -l )
done
dabradio=$( find -L $dirdata/dabradio -type f ! -path '*/img/*' 2> /dev/null | wc -l ) # no $dirdabradio if dab not installed
playlists=$( ls -1 $dirplaylists | wc -l )
song=$( mpc stats | awk '/^Songs/ {print $NF}' )
webradio=$( find -L $dirwebradio -type f ! -path '*/img/*' | wc -l )
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
, "nas"         : '$NAS'
, "playlists"   : '$playlists'
, "sd"          : '$SD'
, "song"        : '$song'
, "usb"         : '$USB'
, "webradio"    : '$webradio'
}'
echo $counts | jq > $dirmpd/counts
pushstream mpdupdate "$counts"
chown -R mpd:audio $dirmpd
rm -f $dirmpd/{updating,listing}

if [[ $toolarge ]]; then
	sleep 3
	pushstreamNotifyBlink 'Library Database' 'Library is too large.<br>Album list cannot be created.' 'refresh-library'
fi

[[ -e $filesharedip ]] && $dirsettings/system.sh shareddataiplist$'\n'reload

(
	nonutf8=$( mpc -f '/mnt/MPD/%file% [• %albumartist% ]• %artist% • %album% • %title%' listall | grep -axv '.*' )
	if [[ $nonutf8 ]]; then
		echo "$nonutf8" > $dirmpd/nonutf8
		pushstreamNotifyBlink 'Metadata Encoding' 'UTF-8 conversion needed: Player > Non UTF-8 Files' library
	else
		rm -f $dirmpd/nonutf8
	fi
	
	list=$( find -L /mnt/MPD -name .mpdignore | sort -V )
	[[ $list ]] && echo "$list" > $dirmpd/mpdignorelist || rm -f $dirmpd/mpdignorelist
) &
