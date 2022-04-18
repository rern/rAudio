#!/bin/bash

alias=r1

# 20220422
if modinfo ntfs3 &> /dev/null && [[ ! -e /etc/modules-load.d/ntfs3.conf ]]; then
	echo ntfs3 > /etc/modules-load.d/ntfs3.conf
	cat << EOF > /etc/udev/rules.d/ntfs3.rules
ACTION=="add", SUBSYSTEM=="block", ENV{ID_FS_TYPE}=="ntfs", ENV{ID_FS_TYPE}="ntfs3", RUN+="/srv/http/bash/system.sh usbconnect"
ACTION=="remove", SUBSYSTEM=="block", ENV{ID_FS_TYPE}=="ntfs", ENV{ID_FS_TYPE}="ntfs3", RUN+="/srv/http/bash/system.sh usbremove"
EOF
	modprobe ntfs3
	udevadm control --reload-rules && udevadm trigger
fi

# 20220415
v=$( pacman -Q bluez-alsa 2> /dev/null | cut -d. -f4 | tr -d r )
[[ $v ]] && (( $v < 106 )) && pacman -Sy --noconfirm bluez-alsa

file=/srv/http/data/shm/wlan
if [[ ! -e $file ]]; then
	wlandev=$( ip -br link \
					| grep ^w \
					| grep -v wlan \
					| cut -d' ' -f1 )
	[[ ! $wlandev ]] && wlandev=wlan0
	echo $wlandev > /srv/http/data/shm/wlan
fi

file=/etc/udev/rules.d/usbwifi.rules
if [[ ! -e $file ]]; then
	cat << EOF > $file
ACTION=="add", SUBSYSTEMS=="usb", SUBSYSTEM=="net", RUN+="/srv/http/bash/usbwifi.sh add"
ACTION=="remove", SUBSYSTEMS=="usb", SUBSYSTEM=="net", RUN+="/srv/http/bash/usbwifi.sh remove"
EOF
	file=/etc/udev/rules.d/usbdac.rules
	cat << EOF > $file
ACTION=="add", SUBSYSTEMS=="usb", KERNEL=="card*", SUBSYSTEM=="sound", RUN+="/srv/http/bash/mpd-conf.sh add"
ACTION=="remove", SUBSYSTEMS=="usb", KERNEL=="card*", SUBSYSTEM=="sound", RUN+="/srv/http/bash/mpd-conf.sh remove"
EOF
	rm -f /etc/udev/rules.d/wifi.rules
	udevadm control --reload-rules
	udevadm trigger
fi

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

# 20220312
file=/srv/http/data/system/display
grep -q latest $file || sed -i '1 a\  "latest": true,' $file

dirplaylists=/srv/http/data/playlists
readarray -t plfiles <<< $( ls -I '*.*' $dirplaylists )
if [[ $plfiles ]]; then
	echo -e "\n\e[38;5;6m\e[48;5;6m . \e[0m Convert saved playlists ..."
	for name in "${plfiles[@]}"; do
		echo $name
		plfile="$dirplaylists/$name"
		list=$( grep '"file":' "$plfile" | sed 's/^\s*"file": "//; s/",$//; s/\\//g' )
		if grep -q '^\s*"Range": ' "$plfile"; then
			readarray -t file_track <<< $( grep -B1 -A5 '"Range":' "$plfile" \
											| grep '"file":\|"Track":' \
											| sed 's/^\s*"file": "\|^\s*"Track": //; s/",$\|,$//; s/\\//g' )
			iL=${#file_track[@]}
			for (( i=0; i < iL; i++ )); do
				track=000${file_track[$(( i + 1 ))]}
				file=${file_track[i]}
				filecue="${file%.*}.cue/track${track: -4}"
				list=$( sed "s|$file|$filecue|" <<< "$list" )
				(( i++ ))
			done
		fi
		echo "$list" > "$plfile.m3u"
		rm "$plfile"
	done
	chown mpd:audio $dirplaylists
	dirmpdpl=/var/lib/mpd/playlists
	readarray -t mpdplfile <<< $( ls -1 $dirmpdpl )
	if [[ $mpdplfile ]]; then
		for name in "${mpdplfile[@]}"; do
			cp "$dirmpdpl/$name" "$dirplaylists/_$name"
		done
	fi
	sed -i "s|$dirmpdpl|$dirplaylists|" /etc/mpd.conf
fi

. /srv/http/bash/addons.sh

installstart "$1"

getinstallzip

chmod -R 755 /srv/http/bash
rm -f /srv/http/bash/{features*,networks*,player*,relays.*,relays-data*,system*}

systemctl restart mpd

installfinish
