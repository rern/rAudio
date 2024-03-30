#!/bin/bash

alias=r1

. /srv/http/bash/settings/addons.sh

# 20240315
[[ -e /usr/bin/iwctl ]] && groupadd -f netdev

# 20240303
file=/etc/udev/rules.d/bluetooth.rules
if [[ -e $file ]] && grep -q bluetoothcommand $file; then
	sed -i 's|bluetoothcommand|settings/networks-bluetooth|' $file
	udevadm control --reload-rules
	udevadm trigger
fi

file=/usr/lib/systemd/system/camilladsp.service
if [[ -e $file ]] && ! grep -q {CONFIG} $file; then
	sed -i 's/CONFIG/{CONFIG}/' $file
	systemctl daemon-reload
fi

# 202402226
file=/etc/default/camilladsp
if [[ -e $file ]] && grep -qs /etc/ $file; then
	sed -i 's|/etc/|/srv/http/data/|' $file
	mv -f /{etc,srv/http/data}/camilladsp/configs/*
fi

file=$dirsystem/autoplay.conf
grep -qs ^cd $file && sed -i '/^cd/ d' $file

# 20240219
readarray -t mixerfiles <<< $( ls $dirsystem/hwmixer-* 2> /dev/null )
if [[ $mixerfiles ]]; then
	for f in "${mixerfiles[@]}"; do
		mv "$f" "${f/hwmixer-/mixer-}"
	done
fi

[[ -e $dirsystem/btoutputall ]] && mv $dirsystem/{btoutputall,devicewithbt}

# 20240212
[[ ! -e /usr/bin/mmc ]] && pacman -Sy --noconfirm mmc-utils

#-------------------------------------------------------------------------------
installstart "$1"

rm -rf /srv/http/assets/{css,js}

getinstallzip

. $dirbash/common.sh
dirPermissions
cacheBust
[[ -e $dirsystem/color ]] && $dirbash/cmd.sh color

# 20240315
echo "$bar Restart MPD ..."
$dirsettings/player-conf.sh

installfinish
