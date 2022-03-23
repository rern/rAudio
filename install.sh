#!/bin/bash

alias=r1

# 20220325
file=/srv/http/bash/cmd-listsort.php
if ! grep -q '\^The ' $file; then
	 sed -i -e '/ui\|dirname/ d
' -e "/preg_replace/ a\
\		  [ '/^The +|^A +|^An +|\"|^[^\\\w\\\p{L}\\\p{N}\\\p{Pd} ~]/ui',
" -e "/mpd\/album/ {n;n;a\
\			if ( substr( \$line, -14, 10 ) === '.cue/track' ) \$line = dirname( dirname( \$line ) );
}" $file
	for mode in album albumartist artist composer conductor genre date; do
		file=/srv/http/data/mpd/$mode
		if [[ -s $file ]]; then
			sed -i 's/^.^^//' $file
			php $dirbash/cmd-listsort.php $file
		fi
	done
fi

# 20220312
file=/srv/http/data/system/display
grep -q latest $file || sed -i '1 a\  "latest": true,' $file

dirplaylists=/srv/http/data/playlists
readarray -t plfiles <<< $( ls -I '*.*' $dirplaylists )
if [[ $plfiles ]]; then
	echo -e "\n\e[38;5;6m\e[48;5;6m . \e[0m Convert saved playlists ..."
	for name in "${plfiles[@]}"; do
		echo $name
		plfile="$dirplaylists/$name"
		list=$( grep '"file":' "$plfile" | sed 's/^\s*"file": "//; s/",$//; s/\\//g' )
		if grep -q '^\s*"Range": ' "$plfile"; then
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
		fi
		echo "$list" > "$plfile.m3u"
		rm "$plfile"
	done
	chown mpd:audio $dirplaylists
	dirmpdpl=/var/lib/mpd/playlists
	readarray -t mpdplfile <<< $( ls -1 $dirmpdpl )
	if [[ $mpdplfile ]]; then
		for name in "${mpdplfile[@]}"; do
			cp "$dirmpdpl/$name" "$dirplaylists/_$name"
		done
	fi
	sed -i "s|$dirmpdpl|$dirplaylists|" /etc/mpd.conf
fi

. /srv/http/bash/addons.sh

installstart "$1"

getinstallzip

systemctl restart mpd

installfinish
