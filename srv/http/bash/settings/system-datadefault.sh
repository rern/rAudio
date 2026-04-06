#!/bin/bash

# data directories
mkdir -p /srv/http/data/{addons,audiocd,bookmarks,camilladsp,lyrics,mpd,mpdconf,playlists,system,webradio,webradio/img} \
		 /mnt/MPD/{NAS,SD,USB}

. /srv/http/bash/common.sh

[[ -e /bin/camilladsp ]] && mkdir -p $dircamilladsp/{coeffs,configs,configs-bt,raw} || rmdir $dircamilladsp
ln -sf /dev/shm $dirdata
ln -sf /mnt /srv/http/
chown -h http:http $dirshm /srv/http/mnt
# display
true='album albumartist artist bars buttons composer conductor count cover date fixedcover genre
	  label latest nas playbackswitch playlists plclear plsimilar sd time usb volume webradio'
false='albumbyartist albumyear audiocdplclear backonleft barsalways composername conductorname covervu
	   hidecover progress radioelapsed tapaddplay tapreplaceplay vumeter'
for i in $true; do
	lines+='
, "'$i'": true'
done
for i in $false; do
	lines+='
, "'$i'": false'
done
jq -S <<< {${lines:2}} > $dirsystem/display.json

dirPermissions
