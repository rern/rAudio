#!/bin/bash

. /srv/http/bash/common.sh

date=$( date +'%F <gr>•</gr> %T' )
load=$( cut -d' ' -f1-3 /proc/loadavg | sed 's| | <gr>•</gr> |g' )
temp=$( vcgencmd measure_temp | tr -dc [:digit:]. )
availmem=$( free -h | awk '/^Mem/ {print $NF}' | sed -E 's|(.i)| \1B|' )
timezone=$( timedatectl | awk '/zone:/ {print $3}' )
timezoneoffset=$( date +%z | sed -E 's/(..)$/:\1/' )
since=$( uptime -s | cut -d: -f1-2 | sed 's/ / • /' )
uptime=$( uptime -p | tr -d 's,' | sed 's/up //; s/ day/d/; s/ hour/h/; s/ minute/m/' )
status="\
$load<br>\
$temp °C<br>\
$availmem<br>\
$date<wide class='gr'>&ensp;${timezone//\// · } $timezoneoffset</wide><br>\
$uptime<wide>&ensp;<gr>since $since</gr></wide><br>"
throttled=$( vcgencmd get_throttled | cut -d= -f2 2> /dev/null )  # hex
if [[ $throttled && $throttled != 0x0 ]]; then
	binary=$( perl -e "printf '%020b', $throttled" ) # hex > bin
	# 20 bits: occurred > 11110000000000001111 < current
	if="<i class='i-thermometer yl'></i> CPU"
	iv="<yl class='blink'><i class='i-voltage'></i> Under-voltage</yl>"
	declare -A warnings=(
		 [0]="$if temperature limit - occurred"
		 [1]="$if throttling - occurred"
		 [2]="$if frequency capping - occurred"
		 [3]="$iv - occurred</gr>"
		[16]="$if temperature limit"
		[17]="$if throttled"
		[18]="$if frequency capped"
		[19]="${iv//yl/red}</gr>"
	)
	for i in 19 3 18 17 16 2 1 0; do
		current=$(( i + 16 ))
		[[ ${binary:current:1} != 1 && ${binary:i:1} == 1 ]] && status+="${warnings[$i]}<br>"
	done
	statusvf=true
else
	statusvf=false
fi
# for interval refresh
[[ $1 == status ]] && echo '{ "status": "'$status'", "statusvf": '$statusvf' }' && exit
# --------------------------------------------------------------------
if [[ -e $dirshm/system ]]; then
	system=$( < $dirshm/system )
else
	# cpu
	revision=$( grep ^Revision /proc/cpuinfo )
	BB=${revision: -3:2}
	C=${revision: -4:1}
	# system
	readarray -t cpu <<< $( lscpu | awk '/Core|Model name|CPU max/ {print $NF}' )
	cpu=${cpu[0]}
	core=${cpu[1]}
	speed=${cpu[2]/.*}
	(( $speed < 1000 )) && speed+=' MHz' || speed=$( calc 2 $speed/1000 )' GHz'
	(( $core > 1 )) && soccpu="$core x $cpu" || soccpu=$cpu
	soccpu+=" @ $speed"
	model=$( tr -d '\000' < /proc/device-tree/model | sed -E 's/ Model //; s/ Plus/+/; s|( Rev.*)|<gr>\1</gr>|' )
	if [[ $model == *BeagleBone* ]]; then
		soc=AM3358
	else
		declare -A C_soc=( [0]=2835 [1]=2836 [204]=2837 [208]=2837 [20d]=2837B0 [20e]=2837B0 [212]=2710A1 [3]=2711 [4]=2712 )
		[[ $C != 2 ]] && c=$C || c=$C$BB
		kernel=$( uname -rm | sed -E 's|-rpi-ARCH (.*)| <gr>\1</gr>|' )
		soc=BCM${C_soc[$c]}$( free -h | awk '/^Mem/ {print " <gr>•</gr> "$2}' | sed -E 's|(.i)| \1B|' )
	fi
	system="\
rAudio $( getContent $diraddons/r1 )<br>\
$kernel<br>\
$model<br>\
$soc<br>\
$soccpu"
	echo $system > $dirshm/system
fi
lan=$( ip -br link | awk '/^e/ {print $1; exit}' )
if [[ $lan ]]; then
	if [[ -e $dirsystem/soundprofile.conf ]]; then
		soundprofileconf=$( conf2json $dirsystem/soundprofile.conf )
	else
		swappiness=$( sysctl vm.swappiness | cut -d' ' -f3 )
		dirlan=/sys/class/net/$lan
		mtu=$( cat $dirlan/mtu )
		txqueuelen=$( cat $dirlan/tx_queue_len )
		soundprofileconf='{ "SWAPPINESS": '$swappiness', "MTU": '$mtu', "TXQUEUELEN": '$txqueuelen' }'
	fi
fi

packageActive bluetooth nfs-server rotaryencoder smb

# i2smodule
if [[ -e $dirsystem/audio-aplayname && -e $dirsystem/audio-output ]]; then
	audioaplayname=$( < $dirsystem/audio-aplayname )
	audiooutput=$( < $dirsystem/audio-output )
	i2saudio=$( grep -q "$audiooutput.*$audioaplayname" /srv/http/assets/data/system-i2s.json && echo true )
fi
# reboot
if [[ -e $dirshm/reboot ]]; then
	reboot=$( < $dirshm/reboot )
	grep -q TFT <<< $reboot && tftreboot=true
	grep -q Character <<< $reboot && lcdcharreboot=true
	grep -q Spectrum <<< $reboot && mpdoledreboot=true
fi
# relays
if [[ -e $dirsystem/relays.conf ]]; then
	. $dirsystem/relays.conf
	relaysconf='{
  "ON"      : [ '${on// /,}' ]
, "OFF"     : [ '${off// /,}' ]
, "OND"     : [ '${ond// /,}' ]
, "OFFD"    : [ '${offd// /,}' ]
, "TIMERON" : '$timeron'
, "TIMER"   : '$timer'
}'
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
data+='
, "ap"                : '$( exists $dirsystem/ap )'
, "audio"             : '$( grep -q -m1 ^dtparam=audio=on /boot/config.txt && echo true )'
, "audioaplayname"    : "'$audioaplayname'"
, "audiocards"        : '$( aplay -l 2> /dev/null | grep ^card | grep -q -v 'bcm2835\|Loopback' && echo true )'
, "audiooutput"       : "'$audiooutput'"
, "hostname"          : "'$( hostname )'"
, "i2seeprom"         : '$( grep -q -m1 ^force_eeprom_read=0 /boot/config.txt && echo true )'
, "i2saudio"             : '$i2saudio'
, "ipsub"             : "'$( ipAddress sub )'"
, "lcdchar"           : '$( exists $dirsystem/lcdchar )'
, "lcdcharaddr"       : '$lcdcharaddr'
, "lcdcharconf"       : '$( conf2json lcdchar.conf )'
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
, "relayson"          : '$( exists $dirshm/relayson )'
, "rotaryencoder"     : '$rotaryencoder'
, "rotaryencoderconf" : '$( conf2json rotaryencoder.conf )'
, "rpi01"             : '$( exists /boot/kernel.img )'
, "shareddata"        : '$( [[ -L $dirmpd && $nfsserver == false ]] && echo true )'
, "soundprofile"      : '$( exists $dirsystem/soundprofile )'
, "soundprofileconf"  : '$soundprofileconf'
, "status"            : "'$status'"
, "statusvf"          : '$statusvf'
, "system"            : "'$system'"
, "tft"               : '$( grep -q -m1 'dtoverlay=.*rotate=' /boot/config.txt && echo true )'
, "tftconf"           : '$tftconf'
, "tftreboot"         : '$tftreboot'
, "timezone"          : "'$timezone'"
, "timezoneoffset"    : "'$timezoneoffset'"
, "vuled"             : '$( exists $dirsystem/vuled )'
, "vuledconf"         : '$( conf2json $dirsystem/vuled.conf )
##########
[[ $audioaplayname == cirrus-wm5102 ]] && data+='
, "audiowm5102"       : "'$( < $dirsystem/audio-wm5102 )'"'
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
, "btconnected"       : '$( exists $dirshm/btreceiver )
fi

data2json "$data" $1
