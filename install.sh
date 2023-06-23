#!/bin/bash

alias=r1

# restore 20230522
#. /srv/http/bash/settings/addons.sh
[[ -e /srv/http/bash/settings/addons.sh ]] && . /srv/http/bash/settings/addons.sh || . /srv/http/bash/addons.sh

# 20230630
if ! grep -q sudo /etc/conf.d/devmon; then
	sed -i 's|/srv|/usr/bin/sudo /srv|g' /etc/conf.d/devmon
	systemctl restart devmon@http
fi

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

# 20230522
crontab -l | grep -q addonsupdates && echo "00 01 * * * $dirsettings/addons-data.sh" | crontab -
systemctl restart cronie

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

systemctl -q is-enabled powerbutton && touch $dirsystem/powerbutton

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

[[ -e /usr/bin/rtsp-simple-server ]] && packages+=mediamtx

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

# 20230522
[[ ! -e $dirshm/cpuinfo ]] && $dirsettings/system.sh cpuinfo

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
