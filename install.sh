#!/bin/bash

alias=r1

. /srv/http/bash/settings/addons.sh

# 20241101
dir=/etc/systemd/system
file=$dir/dab.service
if [[ -e $file ]]; then
	$dirbash/cmd.sh radiostop
	systemctl disable --now mediamtx
	sed -i '/^Description/ a\
Requires=mediamtx.service
After=mediamtx.service
' $file
dir+=/mediamtx.service.d
mkdir -p $dir
echo "\
[Unit]
BindsTo=dab.service
" > $dir/override.conf
	systemctl daemon-reload
fi

file=$dirsystem/lcdchar.conf
if [[ -e $file && $( sed -n -E '/^charmap/,/^p0/ p' $file | wc -l ) -gt 2 ]]; then
	. $file
	for k in inf cols charmap p0 pin_rs p1 pin_rw p2 pin_e p3 backlight; do
		conf+="$k=${!k}\n"
	done
	echo -e $conf > $file
fi

# 20241011
file=$dirsystem/powerbutton.conf
[[ -e $file ]] && sed -i '/reserved/ d' $file

# 20240921
file=$dirsystem/relays.conf
if [[ -e $file ]] && ! grep -q timeron $file; then
	! grep -q timer=0 $file && on=true
	sed -i "/^timer=/ i\timeron=$on" $file
fi

[[ -e $dirmpd/latest && ! -e $dirmpd/latestbyartist ]] && rm -f $dirmpd/latest

# 20240914
file=$dirsystem/volumeboot
if [[ -e $file ]]; then
	echo "\
startup=$( cut -d= -f2 $file.conf )
max=100
" > $dirsystem/volumelimit.conf
	rm -f $file*
	touch $dirsystem/volumelimit
fi

file=/etc/pacman.conf
sed -i 's/wpa_supplicant//' $file

if [[ -e /boot/kernel7.img ]]; then
	! grep -q libunwind $file && sed -i -e '/^#*IgnorePkg/ d
' -e '/^#IgnoreGroup/ i\
IgnorePkg   = libunwind
' $file
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
