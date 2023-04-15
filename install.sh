#!/bin/bash

alias=r1

# restore 20230413
#. /srv/http/bash/settings/addons.sh

# 20230413
[[ -e /srv/http/bash/addons.sh ]] && . /srv/http/bash/addons.sh || . /srv/http/bash/settings/addons.sh

if crontab -l | grep -q addonsupdates; then
	echo "\
00 01 * * * $dirsettings/addons-data.sh
$( crontab -l | grep -v addonsupdates )" | crontab -
fi

if ls $dirsystem/autoplay* 2> /dev/null; then
	k=( startup bluetooth cd )
	f=( autoplay autoplaybt autoplaycd )
	for (( i=0; i < 3; i++ )); do
		[[ -e $dirsystem/${f[i]} ]] && data+=${k[i]}=true || data+=${k[i]}=false
	done
	echo "$data" >> $dirsystem/autoplay
	rm -f $dirsystem/{autoplaybt,autoplaycd}
fi

rm -f $dirsystem/btoutputonly
[[ -e $dirmpdconf/bluetooth.conf && -e $dirmpdconf/output.conf ]] && touch $dirsystem/btoutputall

file=$dirsystem/equalizer.conf
if [[ -e $file ]]; then
	readarray -t lines <<< $( grep -v '^Flat$' $file )
	for l in "${lines[@]}"; do
		preset+=', "'${l/^*}'" : [ '$( tr ' ' , <<< ${l/*^} )' ]'
	done
	data='{
  "active" : "'$( head -1 $file )'"
, "preset" : { "Flat": [ 62, 62, 62, 62, 62, 62, 62, 62, 62, 62 ]'$preset' }
}'
	jq <<< $data > $dirsystem/equalizer.json
	rm $file
fi

for file in display order; do
	[[ -e $dirsystem/$file ]] && mv $dirsystem/$file{,.json}
done

if systemctl -q is-active localbrowser; then
	file=$dirsystem/localbrowser.conf
	if [[ $( sed -n 6p $file ) != cursor* ]]; then
		[[ -e $dirsystem/onwhileplay ]] && onwhileplay=true && rm $dirsystem/onwhileplay
		grep -q hdmi_force_hotplug=1 /boot/config.txt && hdmi=true
		. $file
		conf="\
	rotate=$rotate
	zoom=$zoom
	screenoff=$screenoff
	onwhileplay=$onwhileplay
	hdmi=$hdmi
	cursor=$( [[ $cursor == yes ]] && echo true )"
		echo "$conf" > $file
	fi
else
	rm -f $dirsystem/localbrowser.conf
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

if [[ ! -e $dirsystem/relays ]]; then
	rm -f $dirsystem/relays.conf
elif grep -q ^pin $dirsystem/relays.conf; then
	. $dirsystem/relays.conf
	data="\
on='${on[@]}'
off='${off[@]}'
ond='${ond[@]}'
offd='${offd[@]}'
timer=$timer"
	p=( $( tr , ' ' <<< ${pin:2:-2} ) )
	n=( $( tr , ' ' <<< ${name:2:-2} ) )
	for (( i=0; i < 4; i++ )); do
		pn+=', "'${p[i]}'" : '${n[i]}
	done
	json='{ '${pn:1}' }'
	jq <<< $json > $dirsystem/relays.json
	for p in ${on[@]}; do
		name=$( jq -r '.["'$p'"]' <<< $json )
		[[ $name ]] && orderon+=$name'\n'
	done
	for p in ${off[@]}; do
		name=$( jq -r '.["'$p'"]' <<< $json )
		[[ $name ]] && orderoff+=$name'\n'
	done
	data+='
orderon="'$( sed -E 's/(["`])/\\\1/g; s/\\n$//' <<< $orderon )'"
orderoff="'$( sed -E 's/(["`])/\\\1/g; s/\\n$//' <<< $orderoff )'"'
	echo "$data" > $dirsystem/relays.conf
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

#-------------------------------------------------------------------------------
installstart "$1"

getinstallzip

. $dirbash/common.sh
dirPermissions
[[ -e $dirsystem/color ]] && $dirbash/cmd.sh color
hash=?v=$( date +%s )
sed -E -i "s/(rern.woff2).*'/\1$hash'/" /srv/http/assets/css/common.css
sed -i "s/?v=.*/$hash';/" /srv/http/common.php

# 20230413
[[ ! -e $dirshm/cpuinfo ]] && cpuInfo

file=$dirsystem/multiraudio.conf
if [[ -e $file ]]; then
	filejson=${file/conf/json}
	grep -q '{' $file && jq < $file > $filejson || conf2json $file | jq > $filejson
	rm -f $file
fi

installfinish
#-------------------------------------------------------------------------------

# 20230224
if [[ -e $dirmpdconf/replaygain.conf ]]; then
	! grep -q mixer_type.*software $dirmpdconf/output.conf && $dirsettings/player-conf.sh
fi
