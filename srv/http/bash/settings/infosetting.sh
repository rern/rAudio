#!/bin/bash

. /srv/http/bash/common.sh

args2var "$1"

case $NAME in

ap )
	file=/var/lib/iwd/ap/$( hostname ).ap
	echo '{ "IP": "'$( getVar Address $file )'", "PASSPHRASE": "'$( getVar Passphrase $file )'" }'
	;;
bluetooth )
	bluetoothctl show | grep -q -m1 'Discoverable: yes' && discoverable=true || discoverable=false
	echo '{ "DISCOVERABLE": '$discoverable', "FORMAT": '$( exists $dirsystem/btformat )' }'
	;;
crossfade )
	echo '{ "SEC": '$( mpc crossfade | cut -d' ' -f2 )' }'
	;;
hddapm )
	apm=$( hdparm -B $DEV )
	if [[ $apm ]]; then
		awk=$( awk '{print $NF}' <<< $apm )
		echo $(( awk * 5 / 60 ))
	else
		echo false
	fi
	;;
lcdchar )
	fileconf=$dirsystem/lcdchar.conf
	if [[ -e $fileconf ]]; then
		grep -q ^p0 $fileconf && conf2json $fileconf && exit # gpio
# --------------------------------------------------------------------
		values=$( conf2json $fileconf )
	else
		if [[ $GPIO ]]; then
			echo '{ "INF": "gpio", "COLS": 20, "CHARMAP": "A00", "P0": 21, "PIN_RS": 15, "P1": 22, "PIN_RW": 18, "P2": 23, "PIN_E": 16, "P3": 24, "BACKLIGHT": false }'
			exit
# --------------------------------------------------------------------
		fi
		values='{ "INF": "i2c", "COLS": 20, "CHARMAP": "A00", "ADDRESS": 39, "CHIP": "PCF8574", "BACKLIGHT": false }'
	fi
	dev=$( ls /dev/i2c* 2> /dev/null | cut -d- -f2 )
	[[ $dev ]] && lines=$( i2cdetect -y $dev 2> /dev/null )
	if [[ $lines ]]; then
		hex=$( grep -v '^\s' <<< $lines \
					| cut -d' ' -f2- \
					| tr -d ' \-' \
					| grep -E -v '^\s*$|UU' \
					| sort -u )
		for h in $hex; do
			[[ $address != *$h* ]] && address+=', "0x'$h'": '$(( 16#$h ))
		done
	else
		address=', "0x27": 39, "0x3f": 63'
	fi
	echo '{ "values" : '$values', "address"  : { '${address:1}' } }'
	;;
localbrowser )
	brightness=$( getContent /sys/class/backlight/rpi_backlight/brightness false )
	conf2json localbrowser.conf | sed 's/ }$/, "BRIGHTNESS": '$brightness' }/'
	;;
mpdoled )
	chip=$( grep mpd_oled /etc/systemd/system/mpd_oled.service | cut -d' ' -f3 )
	baud=$( grep baudrate /boot/config.txt | cut -d= -f3 )
	[[ ! $baud ]] && baud=800000
	echo '{ "CHIP": "'$chip'", "BAUD": '$baud' }'
	;;
multiraudioconf )
	getContent $dirsystem/multiraudio.json
	;;
relays )
	if [[ -e $dirsystem/relays.conf ]]; then
		. $dirsystem/relays.conf
		[[ ! $timeron ]] && timeron=false
	else
		on="17 27 22 23"
		off="23 22 27 17"
		ond="2 2 2"
		offd="2 2 2"
		timeron=true
		timer=5
	fi
	if [[ -e $dirsystem/relays.json ]]; then
		relaysname=$( getContent $dirsystem/relays.json )
	else
		relaysname='{ "17": "DAC", "27": "PreAmp", "22": "Amp", "23": "Subwoofer" }'
	fi
	echo '{
"relays" : {
  "ON"      : [ '${on// /,}' ]
, "OFF"     : [ '${off// /,}' ]
, "OND"     : [ '${ond// /,}' ]
, "OFFD"    : [ '${offd// /,}' ]
, "TIMERON" : '$timeron'
, "TIMER"   : '$timer'
}
, "relaysname" : '$relaysname'
}'
	;;
replaygain )
	echo '{
"MODE"     : "'$( getVar replaygain $dirmpdconf/conf/replaygain.conf )'"
, "HARDWARE" : '$( exists $dirsystem/replaygain-hw )'
}'
	;;
smb )
	file=/etc/samba/smb.conf
	sed -n '/\[SD]/,/^\[/ p' $file | grep -q 'read only = no' && sd=true || sd=false
	sed -n '/\[USB]/,/^\[/ p' $file | grep -q 'read only = no' && usb=true || usb=false
	echo '{ "SD": '$sd', "USB": '$usb' }'
	;;
soundprofile )
	if [[ -e $dirsystem/soundprofile.conf ]]; then
		conf2json soundprofile.conf
	else
		dirlan=/sys/class/net/$( ip -br link | awk '/^e/ {print $1; exit}' )
		echo '{
"SWAPPINESS" : '$( sysctl vm.swappiness | cut -d' ' -f3 )'
, "MTU"        : '$( cat $dirlan/mtu )'
, "TXQUEUELEN" : '$( cat $dirlan/tx_queue_len )'
}'
	fi
	;;
spotify )
	current=$( getVar device /etc/spotifyd.conf )
	if [[ ${current:0:3} == hw: ]]; then
		current=Default
	else
		current=$( getContent $dirsystem/spotifyoutput )
	fi
	devices=$( aplay -L | sed -n '/^.*:CARD/ {s/^/, "/; s/$/"/p}' )
	echo '{ "current": "'$current'", "devices": [ "Default"'$devices' ] }'
	;;
tft )
	model=$( sed -n -E '/rotate=/ {s/dtoverlay=(.*):rotate.*/\1/; p}' /boot/config.txt )
	echo '{ "MODEL": "'$( [[ $model ]] && echo $model || echo tft35a )'" }'
	;;
wlan )
	echo '{
"REGDOM"     : "'$( cut -d'"' -f2 /etc/conf.d/wireless-regdom )'"
, "APAUTO"     : '$( [[ ! -e $dirsystem/wlannoap ]] && echo true || echo false )'
, "regdomlist" : '$( cat /srv/http/assets/data/regdomcodes.json )'
}'
	;;
* )
	if [[ -e $dirsystem/$NAME.conf ]]; then
		conf2json $dirsystem/$NAME.conf
	else
		case $NAME in
			autoplay )  echo '{ "BLUETOOTH": true, "STARTUP": true }';;
			lyrics )    echo '{ "URL": "https://", "START": "<", "END": "</div>", "EMBEDDED": false	}';;
			powerbutton )   echo '{ "ON":3, "SW": 3, "LED": 21 }';;
			rotaryencoder ) echo '{ "PINA": 27, "PINB": 22, "PINS": 23, "STEP": 1 }';;
			scrobble )  echo '{ "AIRPLAY": true, "BLUETOOTH": true, "SPOTIFY": true, "UPNP": true }';;
			stoptimer ) echo '{ "MIN": 30, "POWEROFF": false }';;
			volumelimit )
				volume=$( volumeGet )
				[[ $volume == 0 || ! $volume ]] && volume=50
				echo '{ "STARTUP": '$volume', "MAX": 100 }';;
			vuled )         echo '{ "P0": 14, "P1": 15, "P2": 18, "P3": 23, "P4": 24, "P5": 25, "P6": 8	}';;
			* )         echo false;;
		esac
	fi
	;;
	
esac
