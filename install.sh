#!/bin/bash

alias=r1

dirbash=/srv/http/bash
dirshm=/srv/http/data/shm
dirsystem=/srv/http/data/system

# 20220211
if [[ -e /boot/kernel.img ]]; then
	sed -i '/\[core\]/,$ d' /etc/pacman.conf
	echo 'Server = http://tardis.tiny-vps.com/aarm/repos/2022/01/08/$arch/$repo' > /etc/pacman.d/mirrorlist
fi
(( $( cat $dirsystem/soundprofile.conf 2> /dev/null | grep . | wc -l ) == 4 )) && sed -i 1d $dirsystem/soundprofile.conf

# 20220204
if ! grep -q 'assets,bash' $dirbash/addons.sh; then
	sed -i -e '/chown/ d
' -e '/chmod 755 .srv/ i\
	chown -R http:http /srv/http/{assets,bash,settings}
' $dirbash/addons.sh
fi

. $dirbash/addons.sh

# 2022017
chip=$( grep mpd_oled /etc/systemd/system/mpd_oled.service | cut -d' ' -f3 )

# 20220116
[[ -e /lib/python3.10 && -e /lib/python3.9/site-packages/RPLCD ]] && mv -f /lib/python3.9/site-packages/{RPLCD,smbus2} /lib/python3.10/site-packages
rm -rf /etc/systemd/system/spotifyd.service.d

# 20220107
grep -q /srv/http/data/mpd/mpdstate /etc/mpd.conf && sed -i 's|^\(state_file.* "\).*|\1/var/lib/mpd/mpdstate"|' /etc/mpd.conf

installstart "$1"

getinstallzip

# 20220117
[[ $chip != 6 ]] && sed -i "s/-o ./-o $chip/" /etc/systemd/system/mpd_oled.service
grep -q 'waveshare\|tft35a' /boot/config.txt && sed -i '/disable-software-rasterizer/ d' $dirbash/xinitrc
if [[ $( nproc ) == 1 ]]; then
	sed -i '/ExecStart=/ d'  /etc/systemd/system/shairport-sync.service.d/override.conf
	sed -i -e 's|/usr/bin/taskset -c 3 ||' /etc/systemd/system/spotifyd.service
	sed -i -e 's|/usr/bin/taskset -c 3 ||' /etc/systemd/system/upmpdcli.service
fi
systemctl try-restart upmpdcli

systemctl daemon-reload

$dirbash/mpd-conf.sh

installfinish
