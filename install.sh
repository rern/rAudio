#!/bin/bash

alias=r1

. /srv/http/bash/addons.sh

if [[ ! -e /etc/systemd/system/radioparadise.service ]]; then
	wget -q https://github.com/rern/rOS/raw/main/etc/systemd/system/radioparadise.service -P /etc/systemd/system
	curl -L https://github.com/rern/rOS/raw/main/radioparadise.tar.xz | bsdtar xvf - -C /
fi

file=/etc/systemd/system/radiofrance.service
! grep -q ExecStop $file && echo 'ExecStop=/usr/bin/rm /srv/http/data/shm/radiofrance' >> $file

if [[ ! -e /usr/bin/cava ]]; then
	pacman -Sy --noconfirm cava
	wget -q https://github.com/rern/rOS/raw/main/etc/cava.conf -P /etc
fi
sed -i '/framerate/ d' /etc/cava.conf

file=/srv/http/data/system/display
if ! grep -q vumeter $file; then
	sed -i '/novu/ i\    "vumeter": false,' $file
fi

file=/etc/systemd/system/radiofrance.service
if [[ ! -e $file ]]; then
	echo -n "\
[Unit]
Description=radiofrance metadata

[Service]
Type=simple
ExecStart=/srv/http/bash/status-radiofrance.sh
" > $file
fi

sed -i '/TotalDownload/ d' /etc/pacman.conf

file=/etc/upmpdcli.conf
if ! grep -q upmpdcli.sh $file; then
	sed -i '/^on/ d' $file
	echo -n "\
onstart = /srv/http/bash/upmpdcli.sh
onplay = /srv/http/bash/cmd-pushstatus.sh
onpause = /srv/http/bash/cmd-pushstatus.sh
onstop = /srv/http/bash/cmd-pushstatus.sh
" >> $file
fi

file=/etc/systemd/system/upmpdcli.service.d/override.conf
if [[ -e $file ]] && ! grep -q User=http $file; then
	sed -i '1 a\User=http' $file
	systemctl try-restart upmpdcli
fi
if [[ -e /srv/http/data/system/soxrset ]]; then
	rm -f /srv/http/data/system/soxr
	mv /srv/http/data/system/soxr{set,}
fi
if [[ ! -e /usr/bin/cd-discid ]]; then
	pacman -Sy --noconfirm cd-discid
	mkdir -p /srv/http/data/audiocd
fi
file=/etc/systemd/system/systemd-udevd.service.d/ipaddressallow.conf
if ! grep -q IPAddressDeny=$ $file; then
	echo "\
[Service]
IPAddressDeny=
" > $file
	systemctl restart systemd-udevd
fi
file=/etc/udev/rules.d/cdrom.rules
if [[ ! -e $file ]]; then
	wget -q https://github.com/rern/rOS/raw/main$file -P /etc/udev/rules.d
	udevadm control --reload-rules && udevadm trigger
fi

if [[ ! -e /boot/overlays/waveshare35a.dtbo ]]; then
	for name in a b b-v2 c; do
		wget -q https://github.com/rern/rOS/raw/main/boot/overlays/waveshare35$name.dtbo -P /boot/overlays
	done
fi

grep -q '"novu"' /srv/http/data/system/display || sed -i '/progressbar/ i\    "novu": false,' /srv/http/data/system/display

if [[ -e /usr/bin/spotifyd ]] && ! grep -q 'device = \"' /etc/spotifyd.conf; then
	if systemctl is-active spotifyd; then
		active=1
		systemctl disable --now spotifyd
	fi
	pacman -Sy --noconfirm spotifyd
	ln -sf /usr/lib/systemd/{user,system}/spotifyd.service
	dev=$( grep ^device /etc/spotifyd.conf | cut -d' ' -f3 )
	echo '[global]
device = "'$dev'"
bitrate = 320
on_song_change_hook = "/srv/http/bash/spotifyd.sh"' > /etc/spotifyd.conf
	[[ -n $active ]] && systemctl enable --now spotifyd
fi

file=/usr/lib/systemd/system/mpdscribble@.service
if grep -q User=mpdscribble $file; then
	sed -i 's/User=.*/User=mpd/' $file
fi

connected=$( netctl list | grep ^* | sed 's/^\* //' )
[[ -n $connected ]] && netctl enable "$connected" &> /dev/null

systemctl disable netctl-auto@wlan0

grep -q sources.sh /etc/conf.d/devmon && sed -i 's/sources.sh/system.sh/g' /etc/conf.d/devmon

file=/srv/http/data/system/display
grep -q conductor $file || sed -i '/composer/ a\\t"conductor": true,' $file

installstart "$1"

getinstallzip

systemctl daemon-reload
systemctl restart mpd

installfinish

if ! grep -q woff2 /etc/nginx/nginx.conf; then
	sed -i 's/ttf|woff/woff2/' /etc/nginx/nginx.conf
	nginx -s reload &> /dev/null
fi
