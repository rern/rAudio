#!/bin/bash

alias=r1

dirbash=/srv/http/bash
dirshm=/srv/http/data/shm
dirsystem=/srv/http/data/system

. $dirbash/addons.sh

# 20220114
rm -rf /etc/systemd/system/spotifyd.service.d

# 20220107
grep -q /srv/http/data/mpd/mpdstate /etc/mpd.conf && sed -i 's|^\(state_file.* "\).*|\1/var/lib/mpd/mpdstate"|' /etc/mpd.conf

# 20121224
if [[ -e /etc/default/snapserver ]]; then
	touch $dirsystem/usbautoupdate
	rm /etc/default/snapserver
fi

# 20211222
rm -f /etc/systemd/system/rotarymute.service

[[ ! -e /usr/bin/evtest ]] && pacman -Sy --noconfirm evtest

#20211210
revision=$( awk '/Revision/ {print $NF}' /proc/cpuinfo )
if [[ ${revision: -3:2} == 12 ]]; then
	grep -q dtparam=krnbt=on /boot/config.txt || echo dtparam=krnbt=on >> /boot/config.txt
fi

file=/etc/samba/smb.conf
if [[ -e $file ]] && ! grep -q 'force user' $file; then
	sed -i '/map to guest/ a\
	force user = mpd
' $file
	systemctl try-restart smb
fi

file=/srv/http/data/mpd/counts
grep -q playlists $file || sed -i '/genre/ a\
  "playlists": '$( ls -1 $dirdata/playlists | wc -l )',
' $file

installstart "$1"

getinstallzip

if [[ -e /boot/kernel.img ]]; then
	sed -i '/ExecStart=/ d'  /etc/systemd/system/shairport-sync.service.d/override.conf
	sed -i -e 's|/usr/bin/taskset -c 3 ||' /etc/systemd/system/spotifyd.service
	sed -i -e 's|/usr/bin/taskset -c 3 ||' /etc/systemd/system/upmpdcli.service
fi

systemctl daemon-reload

$dirbash/mpd-conf.sh

installfinish
