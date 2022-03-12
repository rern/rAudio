#!/bin/bash

alias=r1

# 20220312
dirplaylists=/srv/http/data/playlists
if ! ls $dirplaylists/*.m3u &> /dev/null; then
	echo -e "\n\e[38;5;6m\e[48;5;6m . \e[0m Convert saved playlists ..."
	readarray -t plfile <<< $( ls -d1 $dirplaylists/* )
	for plfile in "${plfile[@]}"; do
		basename "$plfile"
		list=$( grep '"file":' "$plfile" | sed 's/^\s*"file": "//; s/",$//; s/\\//g' )
		readarray -t file_track <<< $( grep -B1 -A5 '"Range":' "$plfile" \
										| grep '"file":\|"Track":' \
										| sed 's/^\s*"file": "\|^\s*"Track": //; s/",$\|,$//; s/\\//g' )
		iL=${#file_track[@]}
		for (( i=0; i < iL; i++ )); do
			track=000${file_track[$(( i + 1 ))]}
			file=${file_track[i]}
			filecue="${file%.*}.cue/track${track: -4}"
			list=$( sed "s|$file|$filecue|" <<< "$list" )
			(( i++ ))
		done
		echo "$list" > "$plfile.m3u"
	    rm "$plfile"
	done
	chown mpd:audio $dirplaylists
	sed -i "s|/var/lib/mpd/playlists|$dirplaylists|" /etc/mpd.conf
fi

. /srv/http/bash/addons.sh

installstart "$1"

getinstallzip

systemctl restart mpd

installfinish
