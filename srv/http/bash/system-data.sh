#!/bin/bash

cputemp=$( /opt/vc/bin/vcgencmd measure_temp | sed 's/[^0-9.]//g' )
data='
	  "cpuload"         : "'$( cat /proc/loadavg | cut -d' ' -f1-3 )'"
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
lcd=$( grep -q dtoverlay=tft35a /boot/config.txt 2> /dev/null && echo true || echo false )
lcdcharconf=$( cat /etc/lcdchar.conf 2> /dev/null | sed '1d' | cut -d= -f2 )
if [[ $i2c == true ]]; then
	dev=$( ls /dev/i2c* 2> /dev/null | tail -c 2 )
	[[ -n $dev ]] && lcdcharaddr=$( i2cdetect -y $dev \
									| grep -v '^\s' \
									| cut -d' ' -f2- \
									| tr -d ' \-' \
									| grep -v UU \
									| grep . \
									| sort -u )
fi
powerbuttonconf=$( cat /etc/powerbutton.conf | cut -d= -f2 2> /dev/null )
[[ -z $powerbuttonconf ]] && powerbuttonconf='40 33'
if [[ -e /etc/relays.conf ]]; then
	relayspins=$( grep '"on."' /etc/relays.conf | awk '{print $NF}' | grep -v '0.*' | tr -d '\n' )
	relayspins=[${relayspins:0:-1}]
else
	relayspins=false
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
if [[ -e /etc/soundprofile.conf ]]; then
	soundprofileval=$( cat /etc/soundprofile.conf | cut -d= -f2 )
else
	val=$( sysctl kernel.sched_latency_ns | awk '{print $NF}' | tr -d '\0' )
	val+=' '$( sysctl vm.swappiness | awk '{print $NF}'  )
	if ifconfig | grep -q ^eth0; then
		val+=' '$( ifconfig eth0 | awk '/mtu/ {print $NF}' )
		val+=' '$( ifconfig eth0 | awk '/txqueuelen/ {print $4}' )
	fi
	soundprofileval=$val
fi
version=$( cat $dirsystem/version )

# mounted partitions and remote shares
sd=( $( fdisk -lo device | grep ^/dev/mmcblk ) )
if [[ -n $sd ]]; then
	for source in "${sd[@]}"; do
		mountpoint=$( timeout 0.1s df -l --output=target,source \
						| grep "$source" \
						| sed "s| *$source||" )
		[[ $mountpoint == /boot ]] && continue
		
		used_size=( $( df -lh --output=used,size,source | grep "$source" ) )
		list+=',{"icon":"microsd","mountpoint":"'$mountpoint'","mounted":true,"source":"'$source'","size":"'${used_size[0]}'B/'${used_size[1]}'B"}'
	done
fi
readarray -t usb <<< $( ls -d1 /mnt/MPD/USB/*/ | sed 's/.$//' )
readarray -t nas <<< $( ls -d1 /mnt/MPD/NAS/*/ | sed 's/.$//' )
lines=( "${usb[@]}" "${nas[@]}" )
if [[ -n $lines ]]; then
	for mountpoint in "${lines[@]}"; do
		[[ $mountpoint == /boot ]] && continue
		
		[[ ${mountpoint:9:3} == USB ]] && icon=usbdrive || icon=networks
		df=$( timeout 0.1s df --output=source,target )
		if [[ $? == 0 ]]; then
			source=$( echo "$df" \
						| grep "$mountpoint" \
						| sed "s| *$mountpoint||" )
			used_size=( $( df -h --output=used,size,source | grep "$source" ) )
			list+=',{"icon":"'$icon'","mountpoint":"'$mountpoint'","mounted":true,"source":"'$source'","size":"'${used_size[0]}'B/'${used_size[1]}'B"}'
		else
			source=$( mount | grep "$mountpoint" | sed 's| on /.*||' )
			list+=',{"icon":"usbdrive","mountpoint":"'$mountpoint'","mounted":false,"source":"'$source'"}'
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
	, "ntp"             : "'$( grep '^NTP' /etc/systemd/timesyncd.conf | cut -d= -f2 )'"
	, "powerbutton"     : '$( systemctl -q is-active powerbutton && echo true || echo false )'
	, "powerbuttonconf" : "'$powerbuttonconf'"
	, "reboot"          : "'$( cat /srv/http/data/shm/reboot 2> /dev/null )'"
	, "regdom"          : "'$( cat /etc/conf.d/wireless-regdom | cut -d'"' -f2 )'"
	, "relays"          : '$( [[ -e $dirsystem/relays ]] && echo true || echo false )'
	, "relayspins"      : '$relayspins'
	, "rpimodel"        : "'$rpimodel'"
	, "soc"             : "'$soc'"
	, "soccpu"          : "'$soccpu'"
	, "socram"          : "'$( free -h | grep Mem | awk '{print $2}' )'B"
	, "socspeed"        : "'$socspeed'"
	, "soundprofile"    : '$( [[ -e $dirsystem/soundprofile ]] && echo true || echo false )'
	, "version"         : "'$version'"
	, "versionui"       : '$( cat /srv/http/data/addons/r$version 2> /dev/null || echo 0 )'
	, "wlan"            : '$( rfkill | grep -q wlan && echo true || echo false )'
	, "soundprofileval" : "'$soundprofileval'"'

echo {$data}
