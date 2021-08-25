#!/bin/bash

cputemp=$( /opt/vc/bin/vcgencmd measure_temp | sed 's/[^0-9.]//g' )
data='
  "page"            : "system"
, "cpuload"         : "'$( cat /proc/loadavg | cut -d' ' -f1-3 )'"
, "cputemp"         : '$( [[ -n $cputemp ]] && echo $cputemp || echo 0 )'
, "startup"         : "'$( systemd-analyze | head -1 | cut -d' ' -f4- | cut -d= -f1 | sed 's/\....s/s/g' )'"
, "throttled"       : "'$( /opt/vc/bin/vcgencmd get_throttled | cut -d= -f2 )'"
, "time"            : "'$( date +'%T %F' )'"
, "timezone"        : "'$( timedatectl | awk '/zone:/ {print $3}' )'"
, "uptime"          : "'$( uptime -p | tr -d 's,' | sed 's/up //; s/ day/d/; s/ hour/h/; s/ minute/m/' )'"
, "uptimesince"     : "'$( uptime -s | cut -d: -f1-2 )'"'

# for interval refresh
(( $# > 0 )) && echo {$data} && exit

dirsystem=/srv/http/data/system

bluetooth=$( systemctl -q is-active bluetooth && echo true || echo false )
if [[ $bluetooth == true ]]; then
	# 'bluetoothctl show' needs active bluetooth
	btdiscoverable=$( bluetoothctl show | grep -q 'Discoverable: yes' && echo true || echo false )
else
	btdiscoverable=false
fi
i2c=$( grep -q dtparam=i2c_arm=on /boot/config.txt 2> /dev/null && echo true || echo false )
lcdmodel=$( cat /srv/http/data/system/lcdmodel 2> /dev/null || echo tft35a )
lcd=$( grep -q dtoverlay=$lcdmodel /boot/config.txt 2> /dev/null && echo true || echo false )
lcdcharconf=$( cat /etc/lcdchar.conf 2> /dev/null | sed '1d' | cut -d= -f2 )
if [[ $i2c == true ]]; then
	dev=$( ls /dev/i2c* 2> /dev/null | tail -c 2 )
	[[ -n $dev ]] && lcdcharaddr=0x$( i2cdetect -y $dev \
									| grep -v '^\s' \
									| cut -d' ' -f2- \
									| tr -d ' \-' \
									| grep -v UU \
									| grep . \
									| sort -u )
fi
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
	if [[ -e /etc/soundprofile.conf ]]; then
		soundprofileval=$( cat /etc/soundprofile.conf | cut -d= -f2 )
	else
		soundprofileval=$( sysctl kernel.sched_latency_ns | awk '{print $NF}' | tr -d '\0' )
		soundprofileval+=' '$( sysctl vm.swappiness | awk '{print $NF}'  )
		soundprofileval+=' '$( ifconfig eth0 | awk '/mtu/ {print $NF}' )
		soundprofileval+=' '$( ifconfig eth0 | awk '/txqueuelen/ {print $4}' )
	fi
	data+='
, "soundprofile"    : '$( [[ -e $dirsystem/soundprofile ]] && echo true || echo false )'
, "soundprofileval" : "'$soundprofileval'"'
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

data+='
, "audioaplayname"  : "'$( cat $dirsystem/audio-aplayname 2> /dev/null )'"
, "audiooutput"     : "'$( cat $dirsystem/audio-output 2> /dev/null )'"
, "bluetooth"       : '$bluetooth'
, "btdiscoverable"  : '$btdiscoverable'
, "btformat"        : '$( [[ -e $dirsystem/btformat ]] && echo true || echo false )'
, "hostapd"         : '$( systemctl -q is-active hostapd && echo true || echo false )'
, "hostname"        : "'$( hostname )'"
, "kernel"          : "'$( uname -rm )'"
, "lcd"             : '$lcd'
, "lcdchar"         : '$( [[ -e $dirsystem/lcdchar ]] && echo true || echo false )'
, "lcdcharaddr"     : "'$lcdcharaddr'"
, "lcdcharconf"     : "'$lcdcharconf'"
, "list"            : ['${list:1}']
, "lcdmodel"        : "'$lcdmodel'"
, "ntp"             : "'$( grep '^NTP' /etc/systemd/timesyncd.conf | cut -d= -f2 )'"
, "powerbutton"     : '$( systemctl -q is-enabled powerbutton && echo true || echo false )'
, "powerbuttonconf" : "'$( cat /etc/powerbutton.conf 2> /dev/null | cut -d= -f2 )'"
, "reboot"          : "'$( cat /srv/http/data/shm/reboot 2> /dev/null | sed 's/"/\\"/g' )'"
, "regdom"          : "'$( iw reg get | awk '/country/ {print $2}' | tr -d : )'"
, "relays"          : '$( [[ -e $dirsystem/relays ]] && echo true || echo false )'
, "rpimodel"        : "'$rpimodel'"
, "soc"             : "'$soc'"
, "soccpu"          : "'$soccpu'"
, "socram"          : "'$( free -h | grep Mem | awk '{print $2}' )'B"
, "socspeed"        : "'$socspeed'"
, "version"         : "'$version'"
, "versionui"       : '$( cat /srv/http/data/addons/r$version 2> /dev/null || echo 0 )'
, "vuled"           : '$( [[ -e /srv/http/data/system/vuled ]] && echo true || echo false )'
, "vuledval"        : "'$( cat /srv/http/data/system/vuledpins 2> /dev/null )'"
, "wlan"            : '$( rfkill | grep -q wlan && echo true || echo false )'
, "wlannoap"        : '$( [[ -e $dirsystem/wlannoap ]] && echo true || echo false )'
, "wlanconnected"   : '$( ip r | grep -q "^default.*wlan0" && echo true || echo false )

echo {$data}
