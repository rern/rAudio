#!/bin/bash

. /srv/http/bash/common.sh

statusCmd() {
	status=$( eval "$1" )
	echo "\
<bll># $1</bll>
$status"
}

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
	statusCmd "rfkill | grep '^I\|bluetooth'"
	echo
	statusCmd 'bluetoothctl show'
	;;
btreceiver )
	statusCmd 'bluealsa-aplay -L'
	;;
btsender )
	statusCmd 'amixer -MD bluealsa'
	;;
device )
	card=$( getVar card $dirshm/output )
	cmd="aplay -D hw:$card /dev/zero --dump-hw-params"
	data=$( tty2std "timeout 0.1 $cmd" \
				| sed '1,/^---/ d; /^---/,$ d' \
				| column -t -l2 -o ' ' )
	[[ ! $data ]] && data='<gr>(Data not available - Device not idle)</gr>'
	echo "\
<bll># $cmd</bll>
$data"
	;;
infobluetooth )
	statusCmd "bluetoothctl info $2"
	;;
infocamilla | configuration )
	[[ $2 ]] && file="$dircamilladsp/configs/$2" || file=$( getVar CONFIG /etc/default/camilladsp )
	statusCmd "cat $file"
	;;
infostorage )
	DEV=$2
	if [[ ${DEV:0:8} == /dev/mmc ]]; then
		dev=/sys/block/${DEV:5:-2}/device
		cmd="for c in cid csd scr; do mmc \$c read $dev; done"
	else
		dev=$( tr -d 0-9 <<< $DEV )
		cmd="lsblk -no vendor,model $dev"
		param=$( hdparm -I $DEV )
		if [[ $param ]]; then
			data="
<bll># hdparm -I $DEV</bll>
$( sed -E -e '1,3 d' -e '/^ATA device|Media.*:|Serial.*:|Transport:/ d' <<< $param )"
		fi
	fi
	status="\
<bll># $cmd</bll>
$( eval $cmd | awk NF )"
	[[ $data ]] && status+="
$data"
	echo "$status"
	;;
infowlan )
	if [[ $2 ]]; then
		wlandev=$( < $dirshm/wlan )
		if ip addr show $wlandev | grep -q 'state DOWN'; then
			down=1
			ifconfig $wlandev up
		fi
		cmd="iw dev $wlandev scan ssid \"$2\""
		data=$( eval $cmd )
		[[ ! $data ]] && data='(Not found)'
		echo "\
<bll># $cmd</bll>
$data"
		[[ $down ]] && ifconfig $wlandev down
	else
		$dirsettings/data-service.sh ap nostatus
	fi
	;;
lan )
	lan=$( lanDevice )
	statusCmd "ifconfig $lan"
	;;
mixer )
	cmd='amixer scontents'
	devices="\
<bll># $cmd</bll>"
	card=$( < $dirsystem/asoundcard )
	aplayname=$( aplay -l | awk -F'[][]' '/^card $card/ {print $2}' )
	if [[ $aplayname != RPi-Cirrus ]]; then
		mixers=$( $cmd )
		[[ ! $mixers ]] && mixers="<gr>(card $card: no mixers)</gr>"
		devices+="
$mixers"
	else
		devices+="
(custom controls)"
	fi
	echo "$devices"
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
	statusCmd 'aplay -l | grep ^card'
	echo
	statusCmd 'cat /etc/asound.conf'
	;;
status )
	filebootlog=/tmp/bootlog
	[[ -e $filebootlog ]] && cat $filebootlog && exit
# --------------------------------------------------------------------
	cmd='systemd-analyze | head -1'
	startupfinished=$( eval $cmd )
	if grep -q 'Startup finished' <<< $startupfinished; then
		cmd1='journalctl -b'
		echo "\
<bll># $cmd</bll>
$startupfinished

<bll># $cmd1</bll>
$( eval $cmd1 | sed -n '1,/Startup finished.*kernel/ p' )" | tee $filebootlog
	else
		eval $cmd1
	fi
	;;
storage )
	statusCmd 'cat /etc/fstab'
	;;
system )
	statusCmd 'cat /boot/cmdline.txt'
	echo "
<bll># cat /boot/config.txt</bll>
$( grep -Ev '^#|^\s*$' /boot/config.txt )"
	cmd="grep '^IgnorePkg *= *[a-z]' /etc/pacman.conf"
	ignorepkg=$( eval $cmd )
	[[ $ignorepkg ]] && echo "
<bll># $cmd</bll>
$ignorepkg"
	filemodule=/etc/modules-load.d/raspberrypi.conf
	module=$( grep -v snd-bcm2835 $filemodule )
	if [[ $module ]]; then
		echo "
<bll># cat $filemodule</bll>
$module"
		devi2c=$( ls /dev/i2c* 2> /dev/null | cut -d- -f2 )
		if [[ $devi2c ]]; then
			echo
			statusCmd "i2cdetect -y $devi2c"
		fi
	fi
	;;
timezone )
	statusCmd timedatectl
	echo "
<bll># cat /etc/systemd/timesyncd.conf</bll>
$( grep -v ^# /etc/systemd/timesyncd.conf | awk NF )

<bll># cat /etc/pacman.d/mirrorlist</bll>
$( grep -Ev '^#|^$' /etc/pacman.d/mirrorlist )"
	;;
wl )
	wlandev=$( < $dirshm/wlan )
	statusCmd 'iw dev'
	echo
	statusCmd "iwconfig $wlandev"
	;;
wlan )
	statusCmd 'rfkill | grep wlan'
	echo
	statusCmd 'iw reg get'
	echo
	statusCmd 'iw list'
	;;
* )
	$dirsettings/data-service.sh $1
	;;

esac
