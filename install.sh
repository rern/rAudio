#!/bin/bash

alias=r1

. /srv/http/bash/settings/addons.sh

# 20250404
if [[ $( pacman -Q snapcast ) != 'snapcast 0.31.0-3' ]]; then
	pacman -Sy --noconfirm snapcast
fi

# 20250322
if [[ ! -e /lib/systemd/user/spotifyd.service ]]; then
	mv /lib/systemd/{system,user}/spotifyd.service
	ln -s /lib/systemd/{user,system}/spotifyd.service
fi

# 20250228
file=/etc/pacman.conf
if grep -q 'linux-rpi' $file; then
	if [[ -e /boot/kernel8.img ]]; then
		sed -i 's/^IgnorePkg.*/#IgnorePkg   =/' $file
	elif [[ -e /boot/kernel7.img ]]; then
		sed -i 's/ linux-rpi//' $file
	fi
fi

# 20250208
if grep -q '^#bind_to_address = ::' /etc/snapserver.conf; then
	sed -i '/^#bind_to_address/ a\
bind_to_address = 0.0.0.0
' /etc/snapserver.conf
fi

if [[ -e /usr/bin/camilladsp && $( camilladsp -V | cut -c 12 ) != 3 ]]; then
	echo "$bar CamillaDSP - Upgrade ..."
	systemctl -q is-active camilladsp && pacman stop camilladsp && camillaactive=1
	pacman -Sy --noconfirm camilladsp
	readarray -t files <<< $( ls $dircamilladsp/configs/* )
	for file in "${files[@]}"; do
		if sed -n '/^pipeline/,$ p' "$file" | grep -q 'channel:'; then
			sed -i '/^pipeline/,$ d' "$file"
			echo 'pipeline: []' >> "$file"
		fi
	done
	[[ $camillaactive ]] && pacman start camilladsp
fi

#-------------------------------------------------------------------------------
installstart "$1"

rm -rf /srv/http/assets/{css,js} /srv/http/{bash,settings}

getinstallzip

. $dirbash/common.sh
dirPermissions
$dirbash/cmd.sh cachebust
[[ -e $dirsystem/color ]] && $dirbash/cmd.sh color

installfinish

# 20250208
if [[ $camillaactive ]]; then
	echo "$info CamillaDSP - Pipeline was reset."
	echo 'Need reconfiguration.'
fi
