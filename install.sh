#!/bin/bash

alias=r1

. /srv/http/bash/settings/addons.sh

# 20230630
if ! grep -q sudo /etc/conf.d/devmon; then
	sed -i 's|/srv|/usr/bin/sudo /srv|g' /etc/conf.d/devmon
	systemctl restart devmon@http
fi

file=/etc/systemd/system/spotifyd.service
grep -q CPUAffinity $file && sed -i '/CPUAffinity/ d' $file

# 20230620
file=/etc/pacman.conf
grep -q community $file && sed -i -e '/community/,/^$/ d' -e '/aur/,/^$/ d' $file

! grep -q scrobblekeyremove $dirsettings/features.sh && rm -f $dirsystem/scrobble

# 20230616
if [[ -e /boot/overlays/i2s-dac.dtbo ]]; then
	grep -q rpi-dac /boot/config.txt && sed -i 's/rpi-dac/i2s-dac/' /boot/config.txt && rebooti2s=1
	grep -q rpi-cirrus /boot/config.txt && sed -i 's/rpi-cirrus/cirrus/' /boot/config.txt && rebooti2s=1
fi

for f in album albumbyartist; do
	file=$dirmpd/$f
	if [[ -e $file ]]; then
		awk 'a[$0]++{exit 1}' $file || awk -i inplace '!seen[$0]++' $file
	fi
done

# 20230609
rm -f $dirshm/system

file=$dirsystem/localbrowser.conf
if [[ -e $file ]]; then
	rotate=$( getVar rotate $file | tr -dc [A-Z] )
	if [[ $rotate ]]; then
		case $rotate in
			NORMAL ) degree=0;;
			CCW )    degree=270;;
			CW )     degree=90;;
			UD )     degree=180;;
		esac
		sed -i "s/^rotate.*/rotate=$degree/" $file
	fi
fi
rm -f /tmp/localbrowser.conf

[[ $( pacman -Q bluealsa ) != 'bluealsa 4.1.0-1' ]] && packages+=bluealsa

# 20230528
file=$dirmpdconf/conf/snapserver.conf
if grep -q port $file; then
	echo 'audio_output {
	name    "SnapServer"
	type    "fifo"
	path    "/tmp/snapfifo"
	format  "48000:16:2"
}' > $file
fi

if [[ ! -e /boot/kernel.img && -e /lib/python3.11 && ! -e /lib/python3.11/site-packages/RPi ]]; then
	packages+='python-pycamilladsp python-pycamilladsp-plot python-rpi-gpio python-rplcd python-smbus2'
	rm -rf /lib/python3.10
fi

# 20230609
[[ $packages ]] && pacman -Sy --noconfirm $packages

#-------------------------------------------------------------------------------
installstart "$1"

rm -rf /srv/http/assets/{css,js}

getinstallzip

. $dirbash/common.sh
dirPermissions
[[ -e $dirsystem/color ]] && $dirbash/cmd.sh color
hash=?v=$( date +%s )
sed -E -i "s/(rern.woff2).*'/\1$hash'/" /srv/http/assets/css/common.css
sed -i "s/?v=.*/$hash';/" /srv/http/common.php

installfinish
#-------------------------------------------------------------------------------

# 20230528
if [[ -e $dirshm/mixernone ]] && grep -q . $dirshm/amixercontrol; then
	if [[ $( volumeGet valdb | jq .db ) != 0 ]]; then
		rm -f $dirshm/mixernone $dirsystem/mixertype-*
		$dirsettings/player-conf.sh
		echo "$info Re-enable again: Volume Control - None/0dB"
	fi
fi

# 20230611
if [[ $rebooti2s ]]; then
	echo "$info Reboot required for Audio - I²S"
	echo 'Audio - I²S' > $dirshm/reboot
fi

# 20230623
if [[ -e $dirmpd/album ]]; then
	files=$( ls -1 $dirmpd | grep -Ev 'mpd.db|listing|updating' )
	for f in $files; do
		charlast=$( tail -c 1 $dirmpd/$f )
		[[ $charlast ]] && echo >> $dirmpd/$f
	done
fi

systemctl restart mpd
