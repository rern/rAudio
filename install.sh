#!/bin/bash

alias=r1

dirbash=/srv/http/bash
dirshm=/srv/http/data/shm
dirsystem=/srv/http/data/system

. $dirbash/addons.sh

#20121115
[[ -e /etc/sudoers.d/http ]] && rm -f /etc/sudoers.d/{http,shairport-sync,upmpdcli}
mkdir -p $dirshm/{local,online,webradio}
player=$( ls $dirshm/player-* 2> /dev/null | cut -d- -f2 )
[[ -n $player ]] && echo $player > $dirshm/player && rm -f $dirshm/player-*
#2021112
dir=/etc/systemd/system/upmpdcli.service.d
if [[ -e $dir ]]; then
	rm -rf $dir
	systemctl stop upmpdcli
	echo 'upmpdcli ALL=(ALL) NOPASSWD: ALL' > /etc/sudoers.d/upmpdcli
fi
[[ ! -e $dirsystem/spotify ]] && systemctl stop spotifyd
file=/etc/systemd/system/bluetooth.service.d/override.conf
grep -q battery $file || sed -i '/ExecStartPost/ i\
ExecStart=\
ExecStart=/usr/lib/bluetooth/bluetoothd -P battery' $file
mkdir -p $dirshm/{airplay,spotify}
systemctl disable --now mpdscribble@mpd
file=$dirsystem/localbrowser.conf
if [[ -e $file ]] && ! grep -q onwhileplay $file; then
	. $file
	echo "\
rotate=$rotate
zoom=$( echo "print $zoom * 100" | perl )
screenoff=$(( $screenoff / 60 ))
onwhileplay=false
cursor=$cursor
" > $dirsystem/localbrowser.conf
	rm -rf /root/.config/chromium
	systemctl try-restart localbrowser
fi
if ! grep -q bton /etc/udev/rules.d/bluetooth.rules; then
	echo 'ACTION=="add", SUBSYSTEM=="bluetooth", RUN+="/srv/http/bash/mpd-conf.sh bton"
ACTION=="remove", SUBSYSTEM=="bluetooth", RUN+="/srv/http/bash/mpd-conf.sh btoff"' > /etc/udev/rules.d/bluetooth.rules
	udevadm control --reload-rules && udevadm trigger
fi
systemctl try-restart shairport-sync
# 20211019
mv $dirsystem/equalizer.{conf,presets} &> /dev/null
if [[ ! -e /usr/bin/chromium ]] && grep -q 'dtoverlay=.*rotate=' /boot/config.txt; then
	echo -e "$bar Switch from Firefox to Chromium ..."
	echo This may take a couple minutes to download in some regions.
	pacman -R --noconfirm firefox
	pacman -Sy --noconfirm chromium
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
