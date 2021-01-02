#!/bin/bash

dirdata=/srv/http/data
diraddons=$dirdata/addons
dirsystem=$dirdata/system
dirtmp=$dirdata/shm

systemctl stop mpd
rm -f $dirsystem/{relays,soundprofile,updating,listing,wav,buffer,bufferoutput,crossfade,custom,replaygain,soxr}

# lcd
sed -i 's/ console=ttyAMA0.*ProFont6x11//' /boot/cmdline.txt
sed -i '/i2c-bcm2708\|i2c-dev/ d' /etc/modules-load.d/raspberrypi.conf
sed -i 's/fb1/fb0/' /usr/share/X11/xorg.conf.d/99-fbturbo.conf 2> /dev/null

# config.txt
if (( $# == 0 )); then
	config="\
over_voltage=2
hdmi_drive=2
force_turbo=1
gpu_mem=32
initramfs initramfs-linux.img followkernel
max_usb_current=1
disable_splash=1
disable_overscan=1
dtparam=audio=on
"	rpi=$( /srv/http/bash/system.sh hwrpi )
	[[ $rpi != 0 ]] && config=$( sed '/over_voltage\|hdmi_drive/ d' <<<"$config" )
	[[ $rpi == 4 ]] && config=$( sed '/force_turbo/ d' <<<"$config" )
	
	echo -n "$config" > /boot/config.txt
fi
# addons - new/backup
if [[ -n $1 ]]; then # from create-ros.sh
	version=$1
	revision=$2
else
	mv $diraddons $dirtmp
	rm -rf $dirdata
fi
# data directories
mkdir -p $dirdata/{addons,bookmarks,embedded,lyrics,mpd,playlists,system,tmp,webradios,webradiosimg} /mnt/MPD/{NAS,SD,USB}
ln -sf /dev/shm $dirdata
# addons - new/restore
if [[ -n $version ]]; then # from create-ros.sh
	echo $version > $dirsystem/version
	echo $revision > $diraddons/r$version
else
	mv $dirtmp/addons $dirdata
fi
# display
echo '{
	"album": true,
	"albumbyartist": false,
	"albumartist": true,
	"artist": true,
	"composer": true,
	"date": true,
	"genre": true,
	"nas": true,
	"sd": true,
	"usb": true,
	"webradio": true,
	"backonleft": false,
	"count": true,
	"fixedcover": true,
	"hidecover": false,
	"label": true,
	"playbackswitch": true,
	"plclear": true,
	"tapaddplay": false,
	"tapreplaceplay": false,
	"bars": true,
	"barsalways": false,
	"buttons": true,
	"cover": true,
	"coversmall": false,
	"progressbar": false,
	"radioelapsed": false,
	"time": true,
	"volume": true
}' > $dirsystem/display
echo '[
	"SD",
	"USB",
	"NAS",
	"WebRadio",
	"Album",
	"Artist",
	"AlbumArtist",
	"Composer",
	"Genre",
	"Date"
]' > $dirsystem/order
rm -f $dirdata/shm/player-*
touch $dirdata/shm/player-mpd
# system
[[ $rpi == 0 ]] && output='HDMI 1' || output=Headphone
echo "bcm2835 $output" > $dirsystem/audio-aplayname
echo "On-board - $output" > $dirsystem/audio-output
echo rAudio > $dirsystem/hostname
hostnamectl set-hostname rAudio
sed -i 's/#NTP=.*/NTP=pool.ntp.org/' /etc/systemd/timesyncd.conf
sed -i 's/".*"/"00"/' /etc/conf.d/wireless-regdom
timedatectl set-timezone UTC
echo UTC > $dirsystem/timezone

# mpd
sed -i -e '/^auto_update\|^audio_buffer_size\| #custom$/ d
' -e '/quality/,/}/ d
' -e '/soxr/ a\
	quality        "very high"\
}
' /etc/mpd.conf

usermod -a -G root http # add user http to group root to allow /dev/gpiomem access

# webradio default
wget -qO - https://github.com/rern/rOS/raw/main/radioparadise.tar.xz | bsdtar xvf - -C /

# services
systemctl -q disable --now bluetooth hostapd mpdscribble shairport-sync smb snapclient snapserver spotifyd upmpdcli

# set permissions and ownership
chown -R http:http /srv/http
chown -R mpd:audio $dirdata/mpd /mnt/MPD
chmod 755 /srv/http/* /srv/http/bash/* /srv/http/settings/*
chmod 777 /srv/http/data/tmp

# symlink /mnt for coverart files
ln -sf /mnt /srv/http/

[[ -n $version ]] && exit

systemctl start mpd

curl -s -X POST http://127.0.0.1/pub?id=restore -d '{"restore":"reload"}' &> /dev/null
