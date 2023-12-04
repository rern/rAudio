#!/bin/bash

. /srv/http/bash/common.sh

date=$( date +'%F <gr>•</gr> %T' )
load=$( cut -d' ' -f1-3 /proc/loadavg | sed 's| | <gr>•</gr> |g' )
temp=$( vcgencmd measure_temp | tr -cd '0-9.' )
timezone=$( timedatectl | awk '/zone:/ {print $3}' )
timezoneoffset=$( date +%z | sed -E 's/(..)$/:\1/' )
since=$( uptime -s | cut -d: -f1-2 | sed 's/ / • /' )
uptime=$( uptime -p | tr -d 's,' | sed 's/up //; s/ day/d/; s/ hour/h/; s/ minute/m/' )
status="\
$load<br>\
$temp °C<br>\
$date<wide class='gr'>&ensp;${timezone//\// · } $timezoneoffset</wide><br>\
$uptime<wide>&ensp;<gr>since $since</gr></wide><br>"
. $dirshm/cpuinfo
if [[ ! $degree ]]; then
	[[ ! $BB =~ ^(09|0c|12)$ ]] && onboardsound=1
	if [[ $BB == 0d ]]; then
		rpi3bplus=1
		degree=$( grep temp_soft_limit /boot/config.txt | cut -d= -f2 )
		[[ $degree ]] && softlimit=1 || degree=60
	else
		degree=60
	fi
	cpuinfo=degree=$degree
	[[ $onboardsound ]] && cpuinfo+=$'\n'onboardsound=true
	[[ $rpi3bplus ]] && cpuinfo+=$'\n'rpi3bplus=true
	[[ $softlimit ]] && cpuinfo+=$'\n'softlimit=true
	echo "$cpuinfo" >> $dirshm/cpuinfo
fi
throttled=$( vcgencmd get_throttled | cut -d= -f2 )  # hex
if [[ $throttled != 0x0 ]]; then
	binary=$( perl -e "printf '%020b', $throttled" ) # hex > bin
	# 20 bits: occurred > 11110000000000001111 < current
	declare -A warnings=(
		[0]="CPU temperature limit - occurred <gr>(>$degree°C)</gr>"
		[1]='CPU throttling - occurred'
		[2]='CPU frequency capping - occurred'
		[3]='<yl>Under-voltage</yl> - occurred <gr>(<4.7V)</gr>'
		[16]="CPU temperature limit - active <gr>(>$degree°C)</gr>"
		[17]='CPU throttled'
		[18]='CPU frequency capped'
		[19]='<red>Under-voltage</red> - currently <gr>(<4.7V)</gr>'
	)
	for i in 19 18 17 16 3 2 1 0; do
		[[ ${binary:i:1} == 1 ]] && warning+=" · ${warnings[$i]}<br>"
	done
fi
# for interval refresh
[[ $1 == status ]] && pushData refresh '{ "page": "system", "status": "'$status'", "warning": "'$warning'" }' && exit

if [[ -e $dirshm/system ]]; then
	system=$( < $dirshm/system )
else 
	readarray -t cpu <<< $( lscpu | awk '/Core|Model name|CPU max/ {print $NF}' )
	cpu=${cpu[0]}
	core=${cpu[1]}
	speed=${cpu[2]/.*}
	(( $speed < 1000 )) && speed+=' MHz' || speed=$( calc 2 $speed/1000 )' GHz'
	(( $core > 1 )) && soccpu="$core x $cpu" || soccpu=$cpu
	soccpu+=" @ $speed"
	rpimodel=$( tr -d '\000' < /proc/device-tree/model | sed -E 's/ Model //; s/ Plus/+/; s|( Rev.*)|<gr>\1</gr>|' )
	if [[ $rpimodel == *BeagleBone* ]]; then
		soc=AM3358
	else
		soc=BCM
		case $C in
			0 ) soc+=2835;; # 0, 1
			1 ) soc+=2836;; # 2
			2 ) case $BB in
					04|08 ) soc+=2837;;   # 2 1.2, 3B
					0d|0e ) soc+=2837B0;; # 3A+, 3B+
					12 )    soc+=2710A1;; # 0 2W
				esac;;
			3 ) soc+=2711;; # 4
		esac
	fi
	kernel=$( uname -rm | sed -E 's|-rpi-ARCH (.*)| <gr>\1</gr>|' )
	soc+=$( free -h | awk '/^Mem/ {print " <gr>•</gr> "$2}' | sed -E 's|(.i)| \1B|' )
	system="\
rAudio $( getContent $diraddons/r1 )<br>\
$kernel<br>\
$rpimodel<br>\
$soc<br>\
$soccpu"
	echo $system > $dirshm/system
fi

ifconfiglan=$( ifconfig | grep -A2 ^e | head -3 )
if [[ $ifconfiglan ]]; then
	if [[ -e $dirsystem/soundprofile.conf ]]; then
		soundprofileconf=$( conf2json $dirsystem/soundprofile.conf )
	else
		swappiness=$( sysctl vm.swappiness | cut -d' ' -f3 )
		mtu=$( awk '/mtu/ {print $4}' <<< $ifconfiglan )
		txqueuelen=$( awk '/txqueuelen/ {print $4}' <<< $ifconfiglan )
		soundprofileconf='{ "SWAPPINESS": '$swappiness', "MTU": '$mtu', "TXQUEUELEN": '$txqueuelen' }'
	fi
fi

packageActive bluetooth hostapd nfs-server rotaryencoder smb
# i2smodule
if [[ -e $dirsystem/audio-aplayname && -e $dirsystem/audio-output ]]; then
	audioaplayname=$( < $dirsystem/audio-aplayname )
	audiooutput=$( < $dirsystem/audio-output )
	i2smodulesw=$( grep -q "$audiooutput.*$audioaplayname" /srv/http/assets/data/system-i2s.json && echo true )
fi
# reboot
if [[ -e $dirshm/reboot ]]; then
	reboot=$( cat $dirshm/reboot )
	grep -q TFT <<< $reboot && tftreboot=true
	grep -q Character <<< $reboot && lcdcharreboot=true
	grep -q Spectrum <<< $reboot && mpdoledreboot=true
fi
# relays
if [[ -e $dirsystem/relays.conf ]]; then
	. $dirsystem/relays.conf
	on=( $on )
	off=( $off )
	ond=( $ond )
	offd=( $offd )
	pL=${#on[@]}
	dL=$(( pL - 1 ))
	for (( i=0; i < $pL; i++ )); do
						conf+=', "ON'$i'"  : '${on[i]}',  "OFF'$i'"  : '${off[i]}
		(( i < dL )) && conf+=', "OND'$i'" : '${ond[i]}', "OFFD'$i'" : '${offd[i]}
	done
	conf+=', "TIMER": '$timer
	relaysconf='{ '${conf:1}' }'
fi
# tft
tftmodel=$( getContent $dirsystem/lcdmodel )
[[ $tftmodel ]] && tftconf='{ "MODEL": "'$tftmodel'" }'
if grep -q -m1 dtparam=i2c_arm=on /boot/config.txt; then
	dev=$( ls /dev/i2c* 2> /dev/null | cut -d- -f2 )
	lines=$( i2cdetect -y $dev 2> /dev/null )
	if [[ $lines ]]; then
		hex=$( grep -v '^\s' <<< $lines \
					| cut -d' ' -f2- \
					| tr -d ' \-' \
					| grep -E -v '^\s*$|UU' \
					| sort -u )
		for h in $hex; do
			address+=','$(( 16#$h ))
		done
		lcdcharaddr='[ '${address:1}' ]'
	fi
fi
# vuled
chip=$( grep mpd_oled /etc/systemd/system/mpd_oled.service | cut -d' ' -f3 )
baud=$( grep baudrate /boot/config.txt | cut -d= -f3 )
[[ ! $baud ]] && baud=800000
mpdoledconf='{ "CHIP": "'$chip'", "BAUD": '$baud' }'
##########
data='
, "audioaplayname"    : "'$audioaplayname'"
, "audiooutput"       : "'$audiooutput'"
, "hddapm"            : '$hddapm'
, "hddsleep"          : '${hddapm/128/false}'
, "hostapd"           : '$hostapd'
, "hostname"          : "'$( hostname )'"
, "i2seeprom"         : '$( grep -q -m1 force_eeprom_read=0 /boot/config.txt && echo true )'
, "i2smodulesw"       : '$i2smodulesw'
, "ipsub"             : "'$( ipSub )'"
, "lcdchar"           : '$( exists $dirsystem/lcdchar )'
, "lcdcharaddr"       : '$lcdcharaddr'
, "lcdcharconf"       : '$( conf2json lcdcharconf.py )'
, "lcdcharreboot"     : '$lcdcharreboot'
, "list"              : '$( $dirsettings/system-storage.sh )'
, "mirror"            : "'$( grep -m1 ^Server /etc/pacman.d/mirrorlist | sed -E 's|.*//\|\.*mirror.*||g' )'"
, "mpdoled"           : '$( exists $dirsystem/mpdoled )'
, "mpdoledconf"       : '$mpdoledconf'
, "mpdoledreboot"     : '$mpdoledreboot'
, "nfsserver"         : '$nfsserver'
, "ntp"               : "'$( getVar NTP /etc/systemd/timesyncd.conf )'"
, "powerbutton"       : '$( exists $dirsystem/powerbutton )'
, "powerbuttonconf"   : '$( conf2json powerbutton.conf )'
, "poweraudiophonics" : '$( grep -q 'poweroff,gpiopin=22' /boot/config.txt && echo true )'
, "relays"            : '$( exists $dirsystem/relays )'
, "relaysconf"        : '$relaysconf'
, "relaysnameconf"    : '$( getContent $dirsystem/relays.json )'
, "rotaryencoder"     : '$rotaryencoder'
, "rotaryencoderconf" : '$( conf2json rotaryencoder.conf )'
, "rpi01"             : '$( exists /boot/kernel.img )'
, "shareddata"        : '$( [[ -L $dirmpd && $nfsserver == false ]] && echo true )'
, "soundprofile"      : '$( exists $dirsystem/soundprofile )'
, "soundprofileconf"  : '$soundprofileconf'
, "status"            : "'$status'"
, "system"            : "'$system'"
, "tft"               : '$( grep -q -m1 'dtoverlay=.*rotate=' /boot/config.txt && echo true )'
, "tftconf"           : '$tftconf'
, "tftreboot"         : '$tftreboot'
, "timezone"          : "'$timezone'"
, "timezoneoffset"    : "'$timezoneoffset'"
, "usbautoupdate"     : '$( [[ ! -e $dirsystem/usbautoupdateno && ! -e $filesharedip ]] && echo true )'
, "vuled"             : '$( exists $dirsystem/vuled )'
, "vuledconf"         : '$( conf2json $dirsystem/vuled.conf )'
, "warning"           : "'$warning'"'

if [[ $onboardsound ]]; then
##########
	data+='
, "audio"             : '$( grep -q ^dtparam=audio=on /boot/config.txt && echo true )'
, "audiocards"        : '$( aplay -l 2> /dev/null | grep ^card | grep -q -v 'bcm2835\|Loopback' && echo true )
fi
if [[ -e $dirshm/onboardwlan ]]; then
	regdom=$( cut -d'"' -f2 /etc/conf.d/wireless-regdom )
	apauto=$( [[ ! -e $dirsystem/wlannoap ]] && echo true )
	wlanconf='{ "REGDOM": "'$regdom'", "APAUTO": '$apauto' }'
##########
	data+='
, "wlan"              : '$( [[ -e $dirshm/startup ]] && lsmod | grep -q -m1 brcmfmac && echo true )'
, "wlanconf"          : '$wlanconf'
, "wlanconnected"     : '$( ip r | grep -q -m1 "^default.*wlan0" && echo true )
	discoverable=true
	if ! grep -q ^dtoverlay=disable-bt /boot/config.txt; then
		bluetoothon=true
		bluetoothactive=$bluetooth
		if [[ $bluetoothactive == true ]]; then
			bluetoothctl show | grep -q -m1 'Discoverable: yes' && discoverable=true || discoverable=false
		fi
	fi
	format=$( exists $dirsystem/btformat )
	bluetoothconf='{ "DISCOVERABLE": '$discoverable', "FORMAT": '$format' }'
##########
	data+='
, "bluetooth"         : '$bluetoothon'
, "bluetoothactive"   : '$bluetoothactive'
, "bluetoothconf"     : '$bluetoothconf'
, "btconnected"       : '$( [[ -e $dirshm/btconnected && $( awk NF $dirshm/btconnected ) ]] && echo true )
fi
if [[ $rpi3bplus ]]; then
##########
	data+='
, "softlimit"         : '$softlimit'
, "softlimitconf"     : { "SOFTLIMIT": '$degree' }'
fi

data2json "$data" $1
