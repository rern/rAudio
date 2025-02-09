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
		sed -i -e '/^pipeline/,$ d' "$file"
	done
	[[ $camillaactive ]] && pacman start camilladsp
fi

# 20250111
if [[ -e /boot/kernel.img ]]; then
	if [[ $( pacman -Q cava ) != 'cava 0.7.4-1' ]]; then
		wget https://github.com/rern/rern.github.io/raw/refs/heads/main/armv6h/cava-0.7.4-1-any.pkg.tar.xz
		pacman -U --noconfirm cava-0.7.4-1-any.pkg.tar.xz
		rm cava-0.7.4-1-any.pkg.tar.xz
	fi
else
	[[ $( pacman -Q cava ) != 'cava 0.10.3-2' ]] && pacman -Sy --noconfirm cava
fi

if [[ $( pacman -Q python-rpi-gpio ) < 'python-rpi-gpio 0.7.1-3' ]]; then
	pacman -R --noconfirm python-rpi-gpio
	pacman -Sy --noconfirm python-rpi-gpio
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

# 20241208
rm -f $dirshm/playlist*

dir=/srv/http/assets/img/guide
if [[ -e $dir/58.jpg ]]; then
	rm $dir/*
	curl -skL https://github.com/rern/_assets/raw/master/guide/guide.tar.xz | bsdtar xf - -C $dir
fi

file=/etc/pacman.conf
if ! grep -q linux-rpi $file; then
	[[ -e /boot/kernel7.img ]] && ignore='libunwind mesa'
	sed -i -e '/^#*IgnorePkg/ d' -e "/^#*IgnoreGroup/ i\IgnorePkg   = linux-rpi $ignore" $file
fi
if [[ -e /boot/kernel7.img ]] && ! grep -q mesa $file; then
	sed -i '/^IgnorePkg/ s/$/ mesa/' $file
fi

[[ ! -e /boot/kernel.img ]] && sed -i '/^brightness/ d' $dirsystem/localbrowser.conf

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
