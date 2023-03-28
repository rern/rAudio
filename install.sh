#!/bin/bash

alias=r1

#. /srv/http/bash/settings/addons.sh
[[ -e /srv/http/bash/addons.sh ]] && . /srv/http/bash/addons.sh || . /srv/http/bash/settings/addons.sh

# 20230324
if ls $dirsystem/autoplay* 2> /dev/null; then
	k=( startup bluetooth cd )
	f=( autoplay autoplaybt autoplaycd )
	for (( i=0; i < 3; i++ )); do
		[[ -e $dirsystem/${f[i]} ]] && data+=${k[i]}=true || data+=${k[i]}=false
	done
	echo "$data" >> $dirsystem/autoplay
	rm -f $dirsystem/{autoplaybt,autoplaycd}
fi

file=$dirsystem/localbrowser.conf
if ! grep -q hdmi $file; then
	[[ -e $dirsystem/onwhileplay ]] && onwhileplay=true && rm $dirsystem/onwhileplay
	grep -q hdmi_force_hotplug=1 /boot/config.txt && hdmi=true
	. $file
	conf="\
rotate=$rotate
zoom=$zoom
cursor=$( [[ $cursor == yes ]] && echo true )
screenoff=$screenoff
onwhileplay=$onwhileplay
hdmi=$hdmi"
	echo "$conf" > $file
fi

file=$dirsystem/multiraudio.conf
if [[ -e $file ]]; then
	if [[ $( head -1 $file ) == { ]]; then # json from testing
		data=$( sed -E '/\{|}/d; s/,//; s/^\s*"(.*)": "*(.*)"$/_\2="\1"/; s/\./_/g' <<< $file )
	else
		readarray -t lines < $file
		lL=${#lines[@]}
		data=
		for (( i=0; i < lL; i++ )); do
			v=${lines[i]}
			[[ $(( i % 2 )) == 0 ]] && v='"'${v//\"/\\\"}'"' || data+="k=_${v//./_}=$v"$'\n'
		done
	fi
	echo "$data" > $file
fi

file=$dirsystem/lcdchar.conf
if [[ -e $file ]] && grep -q pins_data $file; then
	lines=$( < $file )
	data=$( grep -Ev 'var|pins_data' <<< $lines )
	p=( $( sed -E -n '/pins_data/ {s/.*\[(.*)]/\1/; s/,/ /g; p}' <<< $lines ) )
	for (( i=0; i < 4; i++ )); do
		data+=$'\n'"p$i=$p"
	done
	echo "$data" > $file
fi

file=$dirsystem/vuled.conf
if [[ -e $file ]]; then
	pins=( $( < $file ) )
	data=
	for (( i=0; i < 7; i++ )); do
		data+="p$i=${pins[i]}"$'\n'
	done
	echo "$data" > $file
fi

[[ -e /srv/http/bash/addons.sh ]] && . /srv/http/bash/addons.sh || . /srv/http/bash/settings/addons.sh

if crontab -l | grep -q addonsupdates; then
	cron="00 01 * * * $dirsettings/addons-data.sh"
	current=$( crontab -l | grep -v addonsupdates )
	[[ $current ]] && cron+="
$current"
	echo "$cron" | crontab -
fi

rm -f $dirsystem/btoutputonly
[[ -e $dirmpdconf/bluetooth.conf && -e $dirmpdconf/output.conf ]] && touch $dirsystem/btoutputall

# 20230218
sed -E -i 's/(cursor=)true/\1yes/; s/(cursor=)false/\1no/' $dirsystem/localbrowser.conf &> /dev/null

[[ -d $dirsystem/scrobble.conf ]] && rm -rf $dirsystem/scrobble.conf
if [[ -e /boot/kernel7.img ]]; then
	if [[ ! -e /usr/bin/firefox ]]; then
		echo -e "$bar Switch Browser on RPi to Firefox ..."
		pacman -R --noconfirm chromium
		pacman -Sy --noconfirm firefox
		timeout 1 firefox --headless &> /dev/null
	fi
	! grep -q hdmi_force_hotplug=1 /boot/config.txt && echo hdmi_force_hotplug=1 >> /boot/config.txt
fi

# 20230212
if [[ -e /boot/kernel8.img && ! $( ls /etc/systemd/network/et* 2> /dev/null ) ]]; then
	sed 's/=en/=eth/' /etc/systemd/network/en.network > /etc/systemd/network/eth.network
fi

#-------------------------------------------------------------------------------
installstart "$1"

rm -rf /srv/http/assets/{css,fonts,js}

getinstallzip

. $dirbash/common.sh
dirPermissions

[[ -e $dirsystem/color ]] && $dirbash/cmd.sh color
[[ ! -e /usr/bin/camilladsp ]] && rm -rf /srv/http/settings/camillagui

hash=?v=$( date +%s )
sed -E -i "s/(rern.woff2).*'/\1$hash'/" /srv/http/assets/css/common.css
sed -i "s/?v=.*/$hash';/" /srv/http/common.php

installfinish
#-------------------------------------------------------------------------------

# 20230224
if [[ -e $dirmpdconf/replaygain.conf ]]; then
	! grep -q mixer_type.*software $dirmpdconf/output.conf && $dirsettings/player-conf.sh
fi
