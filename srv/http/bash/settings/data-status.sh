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
device )
	card=$( getVar card $dirshm/output )
	data=$( tty2std "timeout 0.1 aplay -D hw:$card /dev/zero --dump-hw-params" \
				| sed '1,/^---/ d; /^---/,$ d' \
				| column -t -l2 -o ' ' )
	[[ ! $data ]] && data='<gr>(Data not available - Device not idle)</gr>'
	echo "\
<bll># aplay -D hw:$card /dev/zero --dump-hw-params</bll>
$data"
	;;
infobluetooth )
	echo "\
<bll># bluetoothctl info $2</bll>
$( bluetoothctl info $2 )"
	;;
infocamilla | configuration )
	[[ $2 ]] && file="$dircamilladsp/configs/$2" || file=$( getVar CONFIG /etc/default/camilladsp )
	echo "\
<bll># cat $file</bll>
$( cat "$file" )"
	;;
infostorage )
	DEV=$2
	if [[ ${DEV:0:8} == /dev/mmc ]]; then
		dev=/sys/block/${DEV:5:-2}/device
		for k in cid csd scr; do
			data+="\
<bll># mmc $k read $dev</bll>
$( mmc $k read $dev )
"
		done
		echo "$data"
	else
		dev=$( tr -d 0-9 <<< $DEV )
		data="\
<bll># lsblk -no vendor,model $dev</bll>
$( lsblk -no vendor,model $dev )"
		param=$( hdparm -I $DEV )
		if [[ $param ]]; then
			data+="
<bll># hdparm -I $DEV</bll>
$( sed -E -e '1,3 d' -e '/^ATA device|Media.*:|Serial.*:|Transport:/ d' <<< $param )"
		fi
		echo "$data"
	fi
	;;
infowlan )
	if [[ $2 ]]; then
		wlandev=$( < $dirshm/wlan )
		if ip addr show $wlandev | grep -q 'state DOWN'; then
			down=1
			ifconfig $wlandev up
		fi
		data=$( iw dev $wlandev scan ssid "$2" )
		[[ ! $data ]] && data='(Not found)'
		echo "\
<bll># iw dev $wlandev scan ssid \"$2\"</bll>
$data"
		[[ $down ]] && ifconfig $wlandev down
	else
		$dirsettings/data-service.sh ap nostatus
	fi
	;;
lan )
	lan=$( lanDevice )
	echo "\
<bll># ifconfig $lan</bll>
$( ifconfig $lan )"
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
status )
	filebootlog=/tmp/bootlog
	[[ -e $filebootlog ]] && cat $filebootlog && exit
# --------------------------------------------------------------------
	startupfinished=$( systemd-analyze | head -1 )
	if grep -q 'Startup finished' <<< $startupfinished; then
		echo "\
<bll># systemd-analyze | head -1</bll>
$startupfinished

<bll># journalctl -b</bll>
$( journalctl -b | sed -n '1,/Startup finished.*kernel/ p' )" | tee $filebootlog
	else
		journalctl -b
	fi
	;;
storage )
	echo -n "\
<bll># cat /etc/fstab</bll>
$( < /etc/fstab )

$2"
	;;
system )
	config="\
<bll># cat /boot/cmdline.txt</bll>
$( < /boot/cmdline.txt )

<bll># cat /boot/config.txt</bll>
$( grep -Ev '^#|^\s*$' /boot/config.txt )"
	ignorepkg=$( grep ^IgnorePkg /etc/pacman.conf )
	[[ $ignorepkg ]] && config+="
	
<bll># grep ^IgnorePkg /etc/pacman.conf</bll>
$ignorepkg"
	filemodule=/etc/modules-load.d/raspberrypi.conf
	module=$( grep -v snd-bcm2835 $filemodule )
	if [[ $module ]]; then
		config+="

<bll># cat $filemodule</bll>
$module"
		devi2c=$( ls /dev/i2c* 2> /dev/null | cut -d- -f2 )
		[[ $devi2c ]] && config+="
		
<bll># i2cdetect -y $devi2c</bll>
$( i2cdetect -y $devi2c )"
	fi
	echo "$config"
	;;
timezone )
	echo "\
<bll># timedatectl</bll>
$( timedatectl )

<bll># cat /etc/systemd/timesyncd.conf</bll>
$( grep -v ^# /etc/systemd/timesyncd.conf | awk NF )

<bll># cat /etc/pacman.d/mirrorlist</bll>
$( grep -Ev '^#|^$' /etc/pacman.d/mirrorlist )
"
	;;
webui )
	echo "\
<bll># avahi-browse -d local _http._tcp -rpt | awk -F';' '!/^+|^=;lo/ {print \$7\": \"\$8}'</bll>
$( avahi-browse -d local _http._tcp -rpt | awk -F';' '!/^+|^=;lo/ {print $7": "$8}' )"
	;;
wl )
	wlandev=$( < $dirshm/wlan )
	echo "\
<bll># iw dev</bll>
$( iw dev )

<bll># iwconfig $wlandev</bll>
$( iwconfig $wlandev )"
	;;
wlan )
	echo '<bll># iw reg get</bll>'
	iw reg get
	echo '<bll># iw list</bll>'
	iw list
	;;
* )
	$dirsettings/data-service.sh $1
	;;

esac
