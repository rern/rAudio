#!/bin/bash

alias=r1

. /srv/http/bash/settings/addons.sh

# 20250208
if grep -q '^#bind_to_address = ::' /etc/snapserver.conf; then
	sed -i '/^#bind_to_address/ a\
bind_to_address = 0.0.0.0
' /etc/snapserver.conf
fi

if [[ -e /usr/bin/camilladsp && $( camilladsp -V ) != 'CamillaDSP 3.0.0' ]]; then
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

# 20250111
if [[ -e /boot/kernel.img ]]; then
	if [[ $( pacman -Q cava ) < 'cava 0.7.4-1' ]]; then
		wget https://github.com/rern/rern.github.io/raw/refs/heads/main/armv6h/cava-0.7.4-1-any.pkg.tar.xz
		pacman -U --noconfirm cava-0.7.4-1-any.pkg.tar.xz
		rm cava-0.7.4-1-any.pkg.tar.xz
	fi
else
	[[ $( pacman -Q cava ) < 'cava 0.10.3-2' ]] && pacman -Sy --noconfirm cava
fi

if [[ $( pacman -Q python-rpi-gpio ) < 'python-rpi-gpio 0.7.1-3' ]]; then
	pacman -R --noconfirm python-rpi-gpio
	pacman -Sy --noconfirm python-rpi-gpio
	if [[ $( python -V ) < 'Python 3.13.1' ]]; then
		mv /lib/python3.13/site-packages/RPi* /lib/python3.12/site-packages
	fi
fi

file=/etc/systemd/system/mpd_oled.service
if [[ -e $file ]]; then
	rm -f $file
	pacman -R --noconfirm audio_spectrum_oled &> /dev/null
	pacman -Sy --noconfirm mpd_oled
fi

file=$dirsystem/lcdchar.conf
if [[ -e $dirsystem/lcdchar.conf ]]; then
	conf2json $file | jq > ${file/conf/json}
	rm -f $file
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
