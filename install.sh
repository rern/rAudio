#!/bin/bash

alias=r1

# 20220422 - with /etc/*
if modinfo ntfs3 &> /dev/null; then
	pacman -R --noconfirm ntfs-3g 2> /dev/null
	modprobe ntfs3
fi

if systemctl -q is-enabled bluetooth; then
	bluetoothenabled=1
	systemctl disable bluetooth
fi

# 20220415
v=$( pacman -Q bluez-alsa 2> /dev/null | cut -d. -f4 | tr -d r )
[[ $v ]] && (( $v < 106 )) && pacman -Sy --needed --noconfirm bluez-alsa

file=/srv/http/data/shm/wlan
if [[ ! -e $file ]]; then
	wlandev=$( ip -br link \
					| grep ^w \
					| grep -v wlan \
					| cut -d' ' -f1 )
	[[ ! $wlandev ]] && wlandev=wlan0
	echo $wlandev > /srv/http/data/shm/wlan
fi
rm -f /etc/udev/rules.d/wifi.rules

# 20220327
sed -i '/chromium/ d' /etc/pacman.conf

file=/srv/http/bash/cmd-listsort.php
if grep -q '/The' $file; then
	sed -i 's/The.*s+/^The +|^A +|^An +/' $file
	for mode in album albumartist artist composer conductor genre date; do
		filemode=/srv/http/data/mpd/$mode
		if [[ -s $filemode ]]; then
			sed -i 's/^.^^//' $filemode
			php $file $filemode
		fi
	done
fi

. /srv/http/bash/addons.sh

installstart "$1"

getinstallzip

# 20220422
if [[ -e /srv/http/bash/features.sh ]]; then
	echo 'PATH+=:/srv/http/bash:/srv/http/bash/settings:/opt/vc/bin' > /root/.profile
	rm -f /srv/http/bash/{features*,networks*,player*,relays.*,relays-data*,system*}
fi
chmod 777 /srv/http/bash/cmd.sh
/srv/http/bash/cmd.sh dirpermissions
udevadm control --reload-rules
udevadm trigger
systemctl daemon-reload
[[ $bluetoothenabled ]] && systemctl enable --now bluetooth

systemctl restart mpd

installfinish
