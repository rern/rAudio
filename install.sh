#!/bin/bash

alias=r1

dirbash=/srv/http/bash
dirshm=/srv/http/data/shm
dirsystem=/srv/http/data/system

. $dirbash/addons.sh

# 20211224
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

# 20211203
rm -rf /srv/http/data/embedded
mkdir -p $dirshm/{airplay,embedded,spotify,local,online,sampling,webradio}

sed -i '/chromium/ d' /etc/pacman.conf

files=( $( ls /etc/systemd/network/eth* ) )
for file in "${files[@]}"; do
	grep -q RequiredForOnline=no $file || echo "
[Link]
RequiredForOnline=no" >> $file
done

# 20211126
rm -f $dirshm/local/*

file=$dirsystem/lcdchar.conf
if [[ -e $file ]] && ! grep -q inf $file; then
	grep -q chip $file && inf=i2c || inf=gpio
	sed -i -e 's/"//g; s/0x27/39/; s/0x3f/63/; s/\(true\|false\)/\u\1/
' -e "3 a\inf=$inf
" $dirsystem/lcdchar.conf
fi

installstart "$1"

getinstallzip

[[ $( uname -m ) == armv6l ]] && sed -i -e 's|/usr/bin/taskset -c 3 ||' -e '/upnpnice/ d' /etc/systemd/system/upmpdcli.service

systemctl daemon-reload

$dirbash/mpd-conf.sh

installfinish
