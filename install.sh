#!/bin/bash

alias=r1

# 20220505
[[ ! -e /srv/http/data/system/asoundcard ]] && cp /srv/http/data/{shm,system}/asoundcard

dir=/srv/http/shareddata
if [[ -e $dir ]]; then
	chown -h http:http $dir/*/
	chown -h mpd:audio $dir $dir/{mpd,playlist} $dir/mpd/mpd.db $dir/playlists/*
fi

# 20220428
# /etc/udev/rules.d/bluetooth.rules
rm -f /etc/systemd/system/bluealsa-aplay.service

echo 'PATH+=:/srv/http/bash:/srv/http/bash/settings:/opt/vc/bin' > /root/.profile

# 20220422 - with /etc/*
if modinfo ntfs3 &> /dev/null; then
	if pacman -Q ntfs-3g &> /dev/null; then
		pacman -R --noconfirm ntfs-3g 2> /dev/null
		modprobe ntfs3
		echo ntfs3 > /etc/modules-load.d/ntfs3.conf
	fi
else
	rm -f /etc/modules-load.d/ntfs3.conf
fi

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

# 20220428
chmod +x /srv/http/bash/cmd.sh
/srv/http/bash/cmd.sh dirpermissions

udevadm control --reload-rules
udevadm trigger

systemctl daemon-reload
systemctl try-restart bluetooth
systemctl restart mpd

installfinish
