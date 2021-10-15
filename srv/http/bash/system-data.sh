#!/bin/bash

cputemp=$( /opt/vc/bin/vcgencmd measure_temp | sed 's/[^0-9.]//g' )
data='
  "page"             : "system"
, "cpuload"          : "'$( cat /proc/loadavg | cut -d' ' -f1-3 )'"
, "cputemp"          : '$( [[ -n $cputemp ]] && echo $cputemp || echo 0 )'
, "startup"          : "'$( systemd-analyze | head -1 | cut -d' ' -f4- | cut -d= -f1 | sed 's/\....s/s/g' )'"
, "throttled"        : "'$( /opt/vc/bin/vcgencmd get_throttled | cut -d= -f2 )'"
, "time"             : "'$( date +'%T %F' )'"
, "timezone"         : "'$( timedatectl | awk '/zone:/ {print $3}' )'"
, "uptime"           : "'$( uptime -p | tr -d 's,' | sed 's/up //; s/ day/d/; s/ hour/h/; s/ minute/m/' )'"
, "uptimesince"      : "'$( uptime -s | cut -d: -f1-2 )'"'

# for interval refresh
(( $# > 0 )) && echo {$data} && exit

dirsystem=/srv/http/data/system

bluetooth=$( systemctl -q is-active bluetooth && echo true || echo false )
btformat=$( [[ -e $dirsystem/btformat ]] && echo true || echo false )
if [[ $bluetooth == true ]]; then # 'bluetoothctl show' needs active bluetooth
	discoverable=$( bluetoothctl show | grep -q 'Discoverable: yes' && echo true || echo false )
else
	discoverable=true
fi
bluetoothconf="[ $discoverable, $btformat ]"
lcdmodel=$( cat $dirsystem/lcdmodel 2> /dev/null || echo tft35a )
lcd=$( grep -q dtoverlay=$lcdmodel /boot/config.txt 2> /dev/null && echo true || echo false )
readarray -t cpu <<< $( lscpu | awk '/Core|Model name|CPU max/ {print $NF}' )
soccore=${cpu[0]}
(( $soccore > 1 )) && soccpu="$soccore x ${cpu[1]}" || soccpu=${cpu[1]}
socspeed=${cpu[2]/.*}
rpimodel=$( cat /proc/device-tree/model | tr -d '\0' )
if [[ $rpimodel == *BeagleBone* ]]; then
	soc=AM3358
else
	revision=$( awk '/Revision/ {print $NF}' /proc/cpuinfo )
	case ${revision: -4:1} in
		0 ) soc=BCM2835;;
		1 ) soc=BCM2836;;
		2 ) [[ ${revision: -3:2} > 08 ]] && soc=BCM2837B0 || soc=BCM2837;;
		3 ) soc=BCM2711;;
	esac
fi
if ifconfig | grep -q eth0; then
	if [[ -e $dirsystem/soundprofile.conf ]]; then
		soundprofileconf="[ $( cut -d= -f2 $dirsystem/soundprofile.conf | xargs | tr ' ' , ) ]"
	else
		soundprofileconf="[
 $( sysctl kernel.sched_latency_ns | awk '{print $NF}' | tr -d '\0' )
,$( sysctl vm.swappiness | awk '{print $NF}'  )
,$( ifconfig eth0 | awk '/mtu/ {print $NF}' )
,$( ifconfig eth0 | awk '/txqueuelen/ {print $4}' )
]"
	fi
else
	soundprofileconf=false
fi
version=$( cat $dirsystem/version )

# sd, usb and nas
if mount | grep -q 'mmcblk0p2 on /'; then
	used_size=( $( df -lh --output=used,size,target | grep '\/$' ) )
	list+=',{"icon":"microsd","mountpoint":"/","mounted":true,"source":"/dev/mmcblk0p2","size":"'${used_size[0]}'B/'${used_size[1]}'B"}'
fi
usb=$( fdisk -lo device | grep ^/dev/sd )
if [[ -n $usb ]]; then
	readarray -t usb <<< "$usb"
	for source in "${usb[@]}"; do
		mountpoint=$( df -l --output=target,source \
						| grep "$source" \
						| sed "s| *$source||" )
		if [[ -n $mountpoint ]]; then
			used_size=( $( df -lh --output=used,size,source | grep "$source" ) )
			list+=',{"icon":"usbdrive","mountpoint":"'$mountpoint'","mounted":true,"source":"'$source'","size":"'${used_size[0]}'B/'${used_size[1]}'B"}'
		else
			label=$( e2label $source )
			[[ -z $label ]] && label=?
			list+=',{"icon":"usbdrive","mountpoint":"/mnt/MPD/USB/'$label'","mounted":false,"source":"'$source'"}'
		fi
	done
fi
nas=$( awk '/\/mnt\/MPD\/NAS/ {print $1" "$2}' /etc/fstab )
if [[ -n $nas ]]; then
	readarray -t nas <<< "$nas"
	for line in "${nas[@]}"; do
		source=$( echo $line | cut -d' ' -f1 | sed 's/\\040/ /g' )
		mountpoint=$( echo $line | cut -d' ' -f2 | sed 's/\\040/ /g' )
		used_size=( $( timeout 0.1s df -h --output=used,size,source | grep "$source" ) )
		if [[ -n $used_size ]]; then
			list+=',{"icon":"networks","mountpoint":"'$mountpoint'","mounted":true,"source":"'$source'","size":"'${used_size[0]}'B/'${used_size[1]}'B"}'
		else
			list+=',{"icon":"networks","mountpoint":"'$mountpoint'","mounted":false,"source":"'$source'"}'
		fi
	done
fi
list="[ ${list:1} ]"

if grep -q dtparam=i2c_arm=on /boot/config.txt; then
	dev=$( ls /dev/i2c* 2> /dev/null | cut -d- -f2 )
	lines=$( i2cdetect -y $dev 2> /dev/null )
	if [[ -n $lines ]]; then
		i2caddr=$( echo "$lines" \
						| grep -v '^\s' \
						| cut -d' ' -f2- \
						| tr -d ' \-' \
						| grep -v UU \
						| grep . \
						| sort -u )
	fi
fi
if [[ -e $dirsystem/lcdchar.conf ]]; then
	vals=$( cat $dirsystem/lcdchar.conf )
	keys=( cols charmap inf address chip pin_rs pin_rw pin_e pins_data backlight )
	if (( $( echo "$vals" | wc -l ) == 6 )); then
		declare -A default=( [inf]=i2c [pin_rs]=15 [pin_rw]=18 [pin_e]=16 [pins_data]=21,22,23,24 )
	else
		declare -A default=( [inf]=gpio [address]=0x27 [chip]=PCF8574 )
	fi
	kL=${#keys[@]}
	for (( i=0; i < $kL; i++ )); do
		k=${keys[$i]}
		line=$( grep $k <<< "$vals" )
		if (( i > 0 && i < 5 )); then
			[[ -n $line ]] && pins+=",\"${line/*=}\"" || pins+=",\"${default[$k]}\""
		else
			[[ -n $line ]] && pins+=",${line/*=}" || pins+=",${default[$k]}"
		fi
	done
	lcdcharconf="[ ${pins:1} ]" # need a space before end bracket
else
	lcdcharconf='[ 20,"A00","i2c","0x27","PCF8574",15,18,16,21,22,23,24,false ]'
fi
if [[ -e $dirsystem/powerbutton.conf ]]; then
	powerbuttonconf="[ $( cat $dirsystem/powerbutton.conf | cut -d= -f2 | xargs | tr ' ' , ) ]"
else
	powerbuttonconf='[ 5,40,5 ]'
fi
if [[ -e $dirsystem/vuled.conf ]]; then
	vuledconf="[ $( cat $dirsystem/vuled.conf | tr ' ' , ) ]"
else
	vuledconf='[ 14,15,18,23,24,25,8 ]'
fi
wlanconf="[
 \"$( cat /etc/conf.d/wireless-regdom | cut -d'"' -f2 )\"
,$( [[ -e $dirsystem/wlannoap ]] && echo false || echo true )
]"

data+='
, "audioaplayname"   : "'$( cat $dirsystem/audio-aplayname 2> /dev/null )'"
, "audiooutput"      : "'$( cat $dirsystem/audio-output 2> /dev/null )'"
, "bluetooth"        : '$bluetooth'
, "bluetoothconf"    : '$bluetoothconf'
, "firmware"         : "'$( pacman -Q raspberrypi-firmware 2> /dev/null |  cut -d' ' -f2 )'"
, "hostapd"          : '$( systemctl -q is-active hostapd && echo true || echo false )'
, "hostname"         : "'$( hostname )'"
, "kernel"           : "'$( uname -rm )'"
, "lcd"              : '$lcd'
, "lcdchar"          : '$( [[ -e $dirsystem/lcdchar ]] && echo true || echo false )'
, "lcdcharaddr"      : "'$( [[ -n $i2caddr ]] && echo 0x$i2caddr || echo 0x27 0x3F )'"
, "lcdcharconf"      : '$lcdcharconf'
, "list"             : '$list'
, "lcdmodel"         : "'$lcdmodel'"
, "mpdoled"          : '$( [[ -e $dirsystem/mpdoled ]] && echo true || echo false )'
, "mpdoledconf"      : '$( grep mpd_oled /etc/systemd/system/mpd_oled.service | cut -d' ' -f3 )'
, "online"           : '$( : >/dev/tcp/8.8.8.8/53 && echo true || echo false )'
, "ntp"              : "'$( grep '^NTP' /etc/systemd/timesyncd.conf | cut -d= -f2 )'"
, "powerbutton"      : '$( systemctl -q is-enabled powerbutton && echo true || echo false )'
, "powerbuttonconf"  : '$powerbuttonconf'
, "relays"           : '$( [[ -e $dirsystem/relays ]] && echo true || echo false )'
, "rpimodel"         : "'$rpimodel'"
, "soc"              : "'$soc'"
, "soccpu"           : "'$soccpu'"
, "socram"           : "'$( free -h | grep Mem | awk '{print $2}' )'B"
, "socspeed"         : "'$socspeed'"
, "soundprofile"     : '$( [[ -e $dirsystem/soundprofile ]] && echo true || echo false )'
, "soundprofileconf" : '$soundprofileconf'
, "version"          : "'$version'"
, "versionui"        : '$( cat /srv/http/data/addons/r$version 2> /dev/null || echo 0 )'
, "vuled"            : '$( [[ -e $dirsystem/vuled ]] && echo true || echo false )'
, "vuledconf"        : '$vuledconf'
, "wlan"             : '$( rfkill | grep -q wlan && echo true || echo false )'
, "wlanconf"         : '$wlanconf'
, "wlanconnected"    : '$( ip r | grep -q "^default.*wlan0" && echo true || echo false )

echo {$data}
