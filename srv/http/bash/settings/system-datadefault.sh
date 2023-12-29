#!/bin/bash

. /srv/http/bash/common.sh

# data directories
mkdir -p $dirdata/{addons,audiocd,bookmarks,camilladsp,lyrics,mpd,mpdconf,playlists,system,webradio,webradio/img} /mnt/MPD/{NAS,SD,USB}
mkdir -p $dircamilladsp/{coeffs,configs,configs-bt,raw}
ln -sf /dev/shm $dirdata
ln -sf /mnt /srv/http/
chown -h http:http $dirshm /srv/http/mnt
dirs=$( ls $dirdata )
for dir in $dirs; do
	printf -v dir$dir '%s' $dirdata/$dir
done
[[ $1 ]] && echo $1 > $diraddons/r1

# camilladsp
if [[ -e /usr/bin/camilladsp ]]; then
	echo "\
filtersmax=10
filtersmin=-10
filtersstep=0.1
mixersmax=10
mixersmin=-10
mixersstep=0.1" > $dirsystem/camilla.conf
else
	rm -rf $dircamilladsp
fi

# display
true='album albumartist artist bars buttons composer conductor count cover date fixedcover genre
	label latest nas playbackswitch playlists plclear plsimilar sd time usb volume webradio'
false='albumbyartist albumyear audiocdplclear backonleft barsalways composername conductorname covervu hidecover
	multiraudio noswipe progress radioelapsed tapaddplay tapreplaceplay vumeter'
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
if [[ -e /usr/bin/firefox ]]; then
	timeout 1 firefox --headless &> /dev/null
	echo "\
rotate=0
zoom=100
screenoff=0
onwhileplay=
cursor=
runxinitrcd=" > $dirsystem/localbrowser.conf
fi

# mirror
sed -i '/^Server/ s|//.*mirror|//mirror|' /etc/pacman.d/mirrorlist

# snapclient
echo 'SNAPCLIENT_OPTS="--latency=800"' > /etc/default/snapclient

# system
hostnamectl set-hostname rAudio
sed -i 's/#NTP=.*/NTP=pool.ntp.org/' /etc/systemd/timesyncd.conf
sed -i 's/".*"/"00"/' /etc/conf.d/wireless-regdom
timedatectl set-timezone UTC
usermod -a -G root http # add user http to group root to allow /dev/gpiomem access

# webradio
if [[ ! -e /tmp/webradio ]]; then # system-datareset.sh - keep existing
	curl -sL https://github.com/rern/rAudio-addons/raw/main/webradio/radioparadise.tar.xz | bsdtar xf - -C $dirwebradio
	echo '{
  "playlists" : 0
, "webradio"  : '$( find -L $dirwebradio -type f ! -path '*/img/*' | wc -l )'
}' > $dirmpd/counts
fi

dirPermissions
