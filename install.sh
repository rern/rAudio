#!/bin/bash

alias=r1

dirbash=/srv/http/bash
dirshm=/srv/http/data/shm
dirsystem=/srv/http/data/system

. $dirbash/addons.sh

#20121115
file=/etc/systemd/system/shairport-sync.service.d/override.conf
if ! grep -q root $file; then
	echo "\
User=root
Group=root" >> $file
fi
[[ -e /etc/sudoers.d/http ]] && rm -f /etc/sudoers.d/{http,shairport-sync,upmpdcli}

mkdir -p $dirshm/{airplay,spotify,local,online,webradio}
player=$( ls $dirshm/player-* 2> /dev/null | cut -d- -f2 )
[[ -n $player ]] && echo $player > $dirshm/player && rm -f $dirshm/player-*
chmod -R 777 $dirshm
systemctl try-restart shairport-sync

file=$dirsystem/localbrowser.conf
if [[ -e $file ]] && ! grep -q onwhileplay $file; then
	. $file
	cat << EOF > $file
rotate=$rotate
zoom=$( echo "print $zoom * 100" | perl )
screenoff=$(( $screenoff / 60 ))
onwhileplay=false
cursor=$cursor
EOF
	rm -rf /root/.config/chromium
	systemctl try-restart localbrowser
else
	echo "\
rotate=NORMAL
zoom=100
screenoff=1
onwhileplay=true
cursor=false" > $file
fi

#2021112
[[ ! -e $dirsystem/spotify ]] && systemctl stop spotifyd
systemctl disable --now mpdscribble@mpd

file=/etc/systemd/system/bluetooth.service.d/override.conf
grep -q battery $file || sed -i '/ExecStartPost/ i\
ExecStart=\
ExecStart=/usr/lib/bluetooth/bluetoothd -P battery' $file

if ! grep -q bton /etc/udev/rules.d/bluetooth.rules; then
	echo 'ACTION=="add", SUBSYSTEM=="bluetooth", RUN+="/srv/http/bash/mpd-conf.sh bton"
ACTION=="remove", SUBSYSTEM=="bluetooth", RUN+="/srv/http/bash/mpd-conf.sh btoff"' > /etc/udev/rules.d/bluetooth.rules
	udevadm control --reload-rules && udevadm trigger
fi

installstart "$1"

getinstallzip

[[ $( uname -m ) == armv6l ]] && sed -i -e 's|/usr/bin/taskset -c 3 ||' -e '/upnpnice/ d' /etc/systemd/system/upmpdcli.service

systemctl daemon-reload

$dirbash/mpd-conf.sh

installfinish

# 20211022
file=/srv/http/data/mpd/mpdignorelist
[[ ! -e $file ]] && find /mnt/MPD -name .mpdignore | sort -V > $file &> /dev/null &
