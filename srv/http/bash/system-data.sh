#!/bin/bash

. /srv/http/bash/common.sh

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

bluetooth=$( systemctl -q is-active bluetooth && echo true )
btformat=$( exists $dirsystem/btformat )
if [[ $bluetooth == true ]]; then # 'bluetoothctl show' needs active bluetooth
	discoverable=$( bluetoothctl show | grep -q 'Discoverable: yes' && echo true )
else
	discoverable=true
fi
bluetoothconf="[ $discoverable, $btformat ]"
lcdmodel=$( cat $dirsystem/lcdmodel 2> /dev/null || echo tft35a )
lcd=$( grep -q 'dtoverlay=.*rotate=' /boot/config.txt && echo true )
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
		i2caddress=$( echo "$lines" \
						| grep -v '^\s' \
						| cut -d' ' -f2- \
						| tr -d ' \-' \
						| grep -v UU \
						| grep . \
						| sort -u )
		i2caddress="[ $(( "0x$i2caddress" )) ]"
	else
		i2caddress=false
	fi
else
	i2caddress='[ 39,63 ]'
fi
if [[ -e $dirsystem/lcdchar.conf ]]; then
	vals=$( cat $dirsystem/lcdchar.conf \
				| grep -v '\[var]' \
				| sed -e '/charmap\|inf\|chip/ s/.*=\(.*\)/"\1"/; s/.*=//' \
					  -e 's/[][]//g; s/,/ /g; s/\(True\|False\)/\l\1/' )
	if grep -q i2c <<< "$vals"; then
		vals=$( echo $vals | sed 's/\(true\|false\)$/15 18 16 21 22 23 24 \1/' )
	else
		vals=$( echo $vals | sed 's/\("gpio"\)/\1 39 "PCF8574"/' )
	fi
	lcdcharconf='[ '$( echo $vals | tr ' ' , )' ]'
else # cols charmap inf address chip pin_rs pin_rw pin_e pins_data backlight
	lcdcharconf='[ 20,"A00","i2c","0x27","PCF8574",15,18,16,21,22,23,24,false ]'
fi
oledchip=$( grep mpd_oled /etc/systemd/system/mpd_oled.service | cut -d' ' -f3 )
baudrate=$( grep baudrate /boot/config.txt | cut -d= -f3 )
[[ -z $baudrate ]] && baudrate=400000
mpdoledconf='[ "'$oledchip'", '$baudrate' ]'
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
wlanconf='[
  "'$( cat /etc/conf.d/wireless-regdom | cut -d'"' -f2 )'"
, '$( [[ ! -e $dirsystem/wlannoap ]] && echo true )'
]'

data+='
, "audioaplayname"   : "'$( cat $dirsystem/audio-aplayname 2> /dev/null )'"
, "audiooutput"      : "'$( cat $dirsystem/audio-output 2> /dev/null )'"
, "bluetooth"        : '$bluetooth'
, "bluetoothactive"  : '$( [[ -e $dirshm/btclient || $( cat $dirshm/player ) == bluetooth ]] && echo true )'
, "bluetoothconf"    : '$bluetoothconf'
, "firmware"         : "'$( pacman -Q raspberrypi-firmware 2> /dev/null |  cut -d' ' -f2 )'"
, "hostapd"          : '$( systemctl -q is-active hostapd && echo true )'
, "hostname"         : "'$( hostname )'"
, "kernel"           : "'$( uname -rm )'"
, "lcd"              : '$lcd'
, "lcdchar"          : '$( exists $dirsystem/lcdchar )'
, "lcdcharaddr"      : '$i2caddress'
, "lcdcharconf"      : '$lcdcharconf'
, "list"             : '$list'
, "lcdmodel"         : "'$lcdmodel'"
, "mpdoled"          : '$( exists $dirsystem/mpdoled )'
, "mpdoledconf"      : '$mpdoledconf'
, "online"           : '$( : >/dev/tcp/8.8.8.8/53 && echo true )'
, "ntp"              : "'$( grep '^NTP' /etc/systemd/timesyncd.conf | cut -d= -f2 )'"
, "powerbutton"      : '$( systemctl -q is-enabled powerbutton && echo true )'
, "powerbuttonconf"  : '$powerbuttonconf'
, "relays"           : '$( exists $dirsystem/relays )'
, "rpimodel"         : "'$rpimodel'"
, "soc"              : "'$soc'"
, "soccpu"           : "'$soccpu'"
, "socram"           : "'$( free -h | grep Mem | awk '{print $2}' )'B"
, "socspeed"         : "'$socspeed'"
, "soundprofile"     : '$( exists $dirsystem/soundprofile )'
, "soundprofileconf" : '$soundprofileconf'
, "version"          : "'$version'"
, "versionui"        : '$( cat $diraddons/r$version 2> /dev/null )'
, "vuled"            : '$( exists $dirsystem/vuled )'
, "vuledconf"        : '$vuledconf'
, "wlan"             : '$( rfkill | grep -q wlan && echo true )'
, "wlanconf"         : '$wlanconf'
, "wlanconnected"    : '$( ip r | grep -q "^default.*wlan0" && echo true )

data2json "$data"
