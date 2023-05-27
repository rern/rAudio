#!/bin/bash

alias=r1

# restore 20230521
#. /srv/http/bash/settings/addons.sh

# 20230527
if [[ ! -e /boot/kernel.img && -e /lib/python3.11 && ! -e /lib/python3.11/site-packages/RPi ]]; then
	pkg='python-pycamilladsp python-pycamilladsp-plot python-rpi-gpio python-rplcd python-smbus2'
	pacman -R --noconfirm $pkg
	rm -rf /lib/python3.10
	pacman -Sy --noconfirm $pkg
fi

# 20230521
[[ -e /srv/http/bash/settings/addons.sh ]] && . /srv/http/bash/settings/addons.sh || . /srv/http/bash/addons.sh

if crontab -l | grep -q addonsupdates; then
	echo "\
00 01 * * * $dirsettings/addons-data.sh
$( crontab -l | grep -v addonsupdates )" | crontab -
fi

if ls $dirsystem/autoplay* &> /dev/null && [[ ! -s $dirsystem/autoplay ]]; then
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
if [[ ! -e ${file/.*} ]]; then
	rm -f $file
elif [[ ! -e$dirsystem/equalizer.json ]]; then
	active=$( head -1 $file )
	current=$( sed -n "/^$active^/ {s/^.*\^//; p}" $file )
	readarray -t lines <<< $( grep -v '^Flat$' $file )
	for l in "${lines[@]}"; do
		preset+=', "'${l/^*}'" : [ '$( tr ' ' , <<< ${l/*^} )' ]'
	done
	data='{
  "active"  : "'$active'"
, "current" : "'$current'"
, "preset"  : {
	"Flat": [ 62, 62, 62, 62, 62, 62, 62, 62, 62, 62 ]'
	$preset'
	}
}'
	jq <<< $data > $dirsystem/equalizer.json
	rm $file
fi

for file in display order; do
	[[ -e $dirsystem/$file ]] && mv $dirsystem/$file{,.json}
done

file=/etc/systemd/system/lcdchar.service
if [[ ! -e $file ]]; then
	echo '[Unit]
Description=Character LCD

[Service]
ExecStart=/srv/http/bash/lcdchar.py' > $file
	systemctl daemon-reload
fi
file=$dirsystem/lcdchar.conf
if [[ ! -e ${file/.*} ]]; then
	rm -f $file
elif [[ -e $file ]]; then
	. $file
	data='inf="'$inf'"
cols='$cols'
charmap="'$charmap'"'
	if [[ $address ]]; then
		data+='
address='$(( 16#${address: -2} ))'
chip="'$chip'"'
	else
		data+='
pin_rs='$pin_rs'
pin_rw='$pin_rw'
pin_e='$pin_e
		p=( $( tr [,] ' ' <<< $pins_data ) )
		for (( i=0; i < 4; i++ )); do
			data+="
p$i=${p[i]}"
		done
	fi
	data+='
backlight='$backlight
	echo $data > $dirsystem/lcdcharconf.py
	rm -f $file
fi

if [[ ! -e /boot/kernel.img ]]; then
	file=$dirsystem/localbrowser.conf
	if ! systemctl -q is-enabled localbrowser; then
		rm -f $file
	elif [[ -e $file && $( sed -n 6p $file ) != cursor* ]]; then
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
fi

systemctl is-enabled powerbutton && touch $dirsystem/powerbutton

file=$dirsystem/relays.conf
if [[ ! -e ${file/.*} ]]; then
	rm -f $file
elif [[ ! -e $dirsystem/relays.json ]]; then
	. $file
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
	echo "$data" > $file
fi

[[ -e /usr/bin/rtsp-simple-server ]] && pacman -Sy --noconfirm mediamtx

if [[ -L $dirmpd && ! -s /etc/exports && -e /mnt/MPD/SD ]]; then
	mv /mnt/MPD/{SD,USB} /mnt
	sed -i 's|/mnt/MPD/USB|/mnt/USB|' /etc/udevil/udevil.conf
	systemctl restart devmon@http
	rm /mnt/MPD/.mpdignore
fi

[[ -e $dirsystem/spotify ]] && mv $dirsystem/spotify{,key}

if [[ ! -e $dirshm/cpuinfo ]]; then
	file=$dirsystem/usbautoupdate
	[[ -e $file ]] && rm $file || touch $file{,no}
fi

file=$dirsystem/vuled.conf
if [[ ! -e ${file/.*} ]]; then
	rm -f $file
elif ! grep -q ^p0 $file; then
	pins=( $( < $file ) )
	data=
	for (( i=0; i < 7; i++ )); do
		data+="p$i=${pins[i]}"$'\n'
	done
	echo "$data" > $file
fi

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
if [[ -e $dirshm/mixernone && $( volumeGet valdb | jq .db ) != 0 ]]; then
	rm -f $dirshm/mixernone $dirsystem/mixertype-*
	$dirsettings/player-conf.sh
	echo "$info Re-enable again: Volume Control - None/0dB"
fi

# 20230511
[[ ! -e $dirshm/cpuinfo ]] && cpuInfo

! grep -q listing $dirbash/mpdidle.sh && systemctl restart mpd

file=$dirsystem/multiraudio.conf
if [[ -e $file ]]; then
	filejson=${file/conf/json}
	grep -q '{' $file && jq < $file > $filejson || conf2json $file | jq > $filejson
	rm -f $file
fi

if grep -q /srv/http/data /etc/exports; then
	echo "$info Server rAudio:
- Disconnect client
- Disable server
- Re-enable again" 
fi
