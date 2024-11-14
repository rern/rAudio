#!/bin/bash

. /srv/http/bash/common.sh

case $1 in

albumignore )
	echo "\
<bll># /srv/http/data/mpd/albumignore</bll>

$( cat $dirmpd/albumignore )
"
	;;
audio )
	echo "\
<bll># aplay -l | grep bcm2835</bll>
$( aplay -l 2> /dev/null | grep bcm2835 || echo '(No audio devices)' )"
	;;
bluetooth )
	echo "\
<bll># bluetoothctl show</bll>
$( bluetoothctl show )"
	;;
lan )
	lan=$( ip -br link | awk '/^e/ {print $1; exit}' )
	echo "\
<bll># ifconfig $lan</bll>
$( ifconfig $lan | grep -E -v 'RX|TX|^\s*$' )"
	;;
mpdignore )
	files=$( < $dirmpd/mpdignorelist )
	list="\
<bll># find /mnt/MPD -name .mpdignore</bll>"
	while read file; do
		lines=$( < "$file" )
		[[ $file == /mnt/MPD/NAS/.mpdignore ]] && lines=$( sed 's|^data$|& <yl>(rAudio Shared Data)</yl>|' <<< $lines )
		path="<g>$( dirname "$file" )/</g>"
		list+="
$file
$( sed "s|^|$path|" <<< $lines )"
	done <<< $files
	echo "$list"
	;;
nonutf8 )
	cat $dirmpd/nonutf8
	;;
output )
	bluealsa=$( amixer -D bluealsa 2> /dev/nulll \
					| grep -B1 pvolume \
					| head -1 )
	[[ $bluealsa ]] && devices="\
<bll># amixer -D bluealsa scontrols</bll>
$bluealsa"$'\n'$'\n'
	devices+="\
<bll># cat /proc/asound/cards | grep ]</bll>
$( cat /proc/asound/cards | grep ] )

<bll># aplay -l | grep ^card</bll>
$( aplay -l | grep ^card )"$'\n'
	if [[ ! -e $dirsystem/camilladsp ]]; then
		devices+="
<bll># amixer scontrols</bll>"$'\n'
		card=$( < $dirsystem/asoundcard )
		aplayname=$( aplay -l | awk -F'[][]' '/^card $card/ {print $2}' )
		if [[ $aplayname != RPi-Cirrus ]]; then
			mixers=$( amixer scontrols )
			[[ ! $mixers ]] && mixers="<gr>(card $card: no mixers)</gr>"
			devices+="$mixers"$'\n'
		else
			devices+='(custom controls)'$'\n'
		fi
	fi
	devices+="
<bll># cat /etc/asound.conf</bll>
$( < /etc/asound.conf )"
	echo "$devices"
	;;
storage )
	echo -n "\
<bll># cat /etc/fstab</bll>
$( < /etc/fstab )

$2"
	;;
system )
	firmware="pacman -Qs 'firmware|bootloader' | grep -Ev '^\s|whence' | cut -d/ -f2"
	config="\
<bll># cat /boot/cmdline.txt</bll>
$( < /boot/cmdline.txt )

<bll># cat /boot/config.txt</bll>
$( grep -Ev '^#|^\s*$' /boot/config.txt )

<bll># $firmware</bll>
$( eval $firmware )"
	raspberrypiconf=$( cat $filemodule 2> /dev/null )
	if [[ $raspberrypiconf ]]; then
		config+="

<bll># $filemodule</bll>
$raspberrypiconf"
		dev=$( ls /dev/i2c* 2> /dev/null | cut -d- -f2 )
		[[ $dev ]] && config+="
		
<bll># i2cdetect -y $dev</bll>
$(  i2cdetect -y $dev )"
	fi
	echo "$config"
	;;
timezone )
	echo "\
<bll># timedatectl</bll>
$( timedatectl )"
	;;
webui )
	echo "\
<bll># avahi-browse -d local _http._tcp -rpt | awk -F';' '!/^+|^=;lo/ {print \$7\": \"\$8}'</bll>
$( avahi-browse -d local _http._tcp -rpt | awk -F';' '!/^+|^=;lo/ {print $7": "$8}' )"
	;;
wl )
	wlandev=$( < $dirshm/wlan )
	echo "\
<bll># ifconfig $wlandev</bll>
$( ifconfig $wlandev | grep -E -v 'RX|TX')

<bll># iwconfig $wlandev</bll>
$( iwconfig $wlandev | awk NF )"
	;;
wlan )
	echo '<bll># iw reg get</bll>'
	iw reg get
	echo '<bll># iw list</bll>'
	iw list
	;;

esac
