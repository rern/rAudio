#!/bin/bash

. /srv/http/bash/common.sh

# data directories
mkdir -p $dirdata/{addons,audiocd,bookmarks,camilladsp,lyrics,mpd,mpdconf,playlists,system,webradio,webradio/img} \
		 $dircamilladsp/{coeffs,configs,configs-bt,raw} \
		 /mnt/MPD/{NAS,SD,USB}
ln -sf /dev/shm $dirdata
ln -sf /mnt /srv/http/
chown -h http:http $dirshm /srv/http/mnt
dirs=$( ls $dirdata )
for dir in $dirs; do
	printf -v dir$dir '%s' $dirdata/$dir
done

# camilladsp
[[ ! -e /bin/camilladsp ]] && rm -rf $dircamilladsp

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

# localbrowser
if [[ -e /bin/firefox ]]; then
	timeout 1 firefox --headless &> /dev/null
	echo "\
rotate=0
zoom=100
screenoff=0
onwhileplay=
cursor=" > $dirsystem/localbrowser.conf
fi

# mirror
curl -sL https://raw.githubusercontent.com/archlinuxarm/PKGBUILDs/master/core/pacman-mirrorlist/mirrorlist -o /etc/pacman.d/mirrorlist

# snapclient
[[ -e /bin/snapclient ]] && echo 'SNAPCLIENT_OPTS="--latency=800"' > /etc/default/snapclient

# system
hostnamectl set-hostname rAudio
sed -i 's/#NTP=.*/NTP=pool.ntp.org/' /etc/systemd/timesyncd.conf
timedatectl set-timezone UTC
usermod -a -G root http # add user http to group root to allow /dev/gpiomem access
rm -f /root/.bash_history

dirPermissions
