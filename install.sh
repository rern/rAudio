#!/bin/bash

alias=r1

. /srv/http/bash/settings/addons.sh

# 20231125
[[ ! e /lib/libfdt.so ]] && pacman -Sy --noconfirm dtc

# 20231118
grep -q dhcpcd /etc/pacman.conf && sed -i -E 's/(IgnorePkg   =).*/#\1/' /etc/pacman.conf

# 20231111
file=$dirsystem/scrobble.conf
[[ -e $file ]] && sed -i '/notify/ d' $file

if [[ -e /boot/kernel8.img ]]; then
	pacman -Q wiringpi | grep 181 && pacman -Sy --noconfirm wiringpi
fi

# 29231101
[[ ! -e /usr/bin/vcgencmd ]] && cp /opt/vc/bin/{dtoverlay,vcgencmd} /usr/bin

# 20231022
if [[ -e /boot/kernel.img && ! -e /lib/python3.10/site-packages/websocket ]]; then
	echo '
[alarm]
SigLevel = PackageRequired
Include = /etc/pacman.d/mirrorlist

[community]
SigLevel = PackageRequired
Include = /etc/pacman.d/mirrorlist' >> /etc/pacman.conf
	pacman -Sy --noconfirm python-websocket-client
	systemctl restart websocket
fi

# 20231020
file=$dirsystem/localbrowser.conf
if [[ -e $file ]] && ! grep -q runxinitrcd $file; then
	sed -i -e '/hdmi/ d
' -e '$ a\
runxinitrcd=
' $file
fi

# 20231001
if [[ -e /usr/bin/upmpdcli ]]; then
	! pacman -Q python-upnpp &> /dev/null && pacman -Sy --noconfirm python-upnpp
	if grep -q ownqueue /etc/upmpdcli.conf; then
		sed -i -e '/^ownqueue/ d
' -e 's|^onstart.*|onstart = /usr/bin/sudo /srv/http/bash/cmd.sh upnpstart|
' /etc/upmpdcli.conf
		systemctl try-restart upmpdcli
	fi
fi

file=$dirsystem/display.json
if ! grep -q plclear $file; then
	grep 'tapreplaceplay.*true' $file && plclear=false || plclear=true
	sed -i '1 a\
    "plclear": '$plclear',\
    "plsimilar": true,\
    "audiocdplclear": false,
' $file
fi

if [[ ! -e $dirsystem/localbrowser.conf ]]; then
	echo "\
rotate=0
zoom=100
screenoff=0
onwhileplay=
cursor=
runxinitrcd" > $dirsystem/localbrowser.conf
fi

#-------------------------------------------------------------------------------
installstart "$1"

rm -rf /srv/http/assets/{css,js}

getinstallzip

. $dirbash/common.sh
dirPermissions
cacheBust
[[ -e $dirsystem/color ]] && $dirbash/cmd.sh color

installfinish

# 20231013
if ! grep -q smbdfree /etc/samba/smb.conf; then
	sed -i '/^.USB/ a\\tdfree command = /srv/http/bash/smbdfree.sh' /etc/samba/smb.conf
	systemctl try-restart smb
fi
