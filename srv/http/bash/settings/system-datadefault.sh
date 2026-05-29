#!/bin/bash

# data directories
mkdir -p /srv/http/data/{addons,audiocd,bookmarks,camilladsp,lyrics,mpd,mpdconf,playlists,system,webradio,webradio/img} \
		 /mnt/MPD/{NAS,SD,USB}

. /srv/http/bash/common.sh

[[ -e /bin/camilladsp ]] && mkdir -p $dircamilladsp/{coeffs,configs,configs-bt,raw} || rmdir $dircamilladsp
ln -sf /dev/shm $dirdata
ln -sf /mnt /srv/http/
# display
for d in album albumartist artist bars           buttons   composer conductor count cover date fixedcover genre \
		 label latest      nas    playbackswitch playlists plclear  plsimilar sd    time  usb  volume     webradio
do
	display+=', "'$d'": true'
done
for d in albumbyartist albumyear audiocdplclear backonleft   barsalways  composername   conductorname \
		 covervu       hidecover progress       radioelapsed tapaddplay  tapreplaceplay vumeter
do
	display+=', "'$d'": false'
done
jq -S <<< "{ ${display:1} }" > $dirsystem/display.json
chown -R http:http /srv &> /dev/null
chown -R mpd:mpd $dirmpd $dirplaylists &> /dev/null
chmod -R u=rw,go=r,a+X /srv
chmod -R +x $dirbash
