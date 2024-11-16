#!/bin/bash

. /srv/http/bash/common.sh

ID=$1

case $ID in

ap )
	file=/var/lib/iwd/ap/$( hostname ).ap
	echo '{ "IP": "'$( getVar Address $file )'", "PASSPHRASE": "'$( getVar Passphrase $file )'" }'
	;;
bluetooth )
	if systemctl -q is-active bluetooth; then
		bluetoothctl show | grep -q -m1 'Discoverable: yes' && discoverable=true || discoverable=false
	else
		discoverable=false
	fi
	echo '{ "DISCOVERABLE": '$discoverable', "FORMAT": '$( exists $dirsystem/btformat )' }'
	;;
buffer|outputbuffer )
	conf2json $dirmpdconf/conf/$ID.conf
	;;
crossfade )
	echo '{ "SEC": '$( mpc crossfade | cut -d' ' -f2 )' }'
	;;
custom )
	name=$( getVar name $dirshm/output )
	echo "\
$( getContent $dirmpdconf/conf/custom.conf )
^^
$( getContent "$dirsystem/custom-output-$DEVICE" )"
	;;
hddapm )
	apm=$( hdparm -B $2 )
	if [[ $apm ]]; then
		awk=$( awk '{print $NF}' <<< $apm )
		echo $(( awk * 5 / 60 ))
	else
		echo false
	fi
	;;
i2seeprom )
	grep -q -m1 ^force_eeprom_read=0 /boot/config.txt && echo true || echo false
	;;
i2slist )
	cat  /srv/http/assets/data/system-i2s.json
	;;
lcdchar )
	fileconf=$dirsystem/lcdchar.conf
	if [[ -e $fileconf ]]; then
		grep -q ^p0 $fileconf && conf2json $fileconf && exit # gpio
# --------------------------------------------------------------------
		values=$( conf2json $fileconf )
	else
		if [[ $2 ]]; then
			echo '{ "INF": "gpio", "COLS": 20, "CHARMAP": "A00"
			      , "P0": 21, "PIN_RS": 15, "P1": 22, "PIN_RW": 18, "P2": 23, "PIN_E": 16, "P3": 24
				  , "BACKLIGHT": false }'
			exit
# --------------------------------------------------------------------
		fi
		values='{ "INF": "i2c", "COLS": 20, "CHARMAP": "A00"
		        , "ADDRESS": 39, "CHIP": "PCF8574"
				, "BACKLIGHT": false }'
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
reboot )
	getContent $dirshm/reboot
	rm -f $dirshm/{reboot,backup.gz}
	;;
packagelist )
	filepackages=/tmp/packages
	if [[ ! -e $filepackages ]]; then
		pacmanqi=$( pacman -Qi | grep -E '^Name|^Vers|^Desc|^URL' )
		while read line; do
			case ${line:0:3} in
			Nam ) name=$line;;
			Ver ) version=$line;;
			Des ) description=$line;;
			URL ) url=$line
				  lines+="\
$url
$name
$version
$description
"
;;
			esac
		done <<< $pacmanqi
		sed -E 's|^URL.*: (.*)|<a href="\1" target="_blank">|
				s|^Name.*: (.*)|\1</a> |
				s|^Vers.*: (.*)|<gr>\1</gr>|
				s|^Desc.*: (.*)| - \1<br>|' <<< $lines \
				> /tmp/packages
	fi
	grep -B1 -A2 --no-group-separator ^${2,} $filepackages
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
scrobble )
	if [[ -e $dirsystem/scrobble.conf ]]; then
		values=$( conf2json $dirsystem/scrobble.conf )
	else
		values='{ "AIRPLAY": true, "BLUETOOTH": true, "SPOTIFY": true, "UPNP": true }'
	fi
	echo '{ "values": '$values', "key": '$( exists $dirsystem/scrobblekey )' }'
	;;
servermirror )
	file=/etc/pacman.d/mirrorlist
	list=$( curl -sfL https://github.com/archlinuxarm/PKGBUILDs/raw/master/core/pacman-mirrorlist/mirrorlist )
	if [[ $? == 0 ]]; then
		mirror=$( sed -n '/^Server/ {s|\.*mirror.*||; s|.*//||; p}' $file )
		[[ $mirror ]] && list=$( sed "0,/^Server/ s|//.*mirror|//$mirror.mirror|" <<< $list )
		echo "$list" > $file
	else
		list=$( < $file )
	fi
	lines=$( sed -E -n '/^### Mirror/,$ {/^\s*$|^### Mirror/ d; s|.*//(.*)\.mirror.*|\1|; p}' <<< $list )
	codelist='"Auto":""'
	while read line; do
		if [[ ${line:0:4} == '### ' ]];then
			city=
			country=${line:4}
		elif [[ ${line:0:3} == '## ' ]];then
			city=${line:3}
		else
			[[ $city ]] && cc="$country - $city" || cc=$country
			[[ $cc == $ccprev ]] && cc+=" 2"
			ccprev=$cc
			codelist+=',"'$cc'":"'$line'"'
		fi
	done <<< $lines
	mirror=$( grep -m1 ^Server /etc/pacman.d/mirrorlist | sed -E 's|.*//\|\.*mirror.*||g' )
	echo '{ "list": { '$codelist' }, "values": { "MIRROR": "'$mirror'" } }'
	;;
serverntp )
	echo '{
  "values" : { "NTP": "'$( getVar NTP /etc/systemd/timesyncd.conf )'" }
, "rpi01"  : '$( exists /boot/kernel.img )'
}'
	;;
smb )
	file=/etc/samba/smb.conf
	sed -n '/\[SD]/,/^\[/ p' $file | grep -q 'read only = no' && sd=true || sd=false
	sed -n '/\[USB]/,/^\[/ p' $file | grep -q 'read only = no' && usb=true || usb=false
	echo '{ "SD": '$sd', "USB": '$usb' }'
	;;
snapclient )
	snapserverList | tail -1
	;;
soxr )
	if [[ $2 ]]; then
		file=$dirmpdconf/conf/$2.conf
	else
		file=$( ls $dirmpdconf/soxr* 2> /dev/null )
		[[ ! $file ]] && file=$dirmpdconf/conf/soxr.conf
	fi
	conf2json $file | jq | sed '/PLUGIN/ d'
	;;
spotifyd )
	exists $dirsystem/spotifykey
	;;
spotifyoutput )
	current=$( getVar device /etc/spotifyd.conf )
	if [[ ${current:0:3} == hw: ]]; then
		current=Default
	else
		current=$( getContent $dirsystem/spotifyoutput )
	fi
	devices=$( aplay -L | sed -n '/^.*:CARD/ {s/^/, "/; s/$/"/p}' )
	volume=$( getVar volume_controller /etc/spotifyd.conf )
	echo '{ "values": { "OUTPUT": "'$current'", "VOLUME": "'$volume'" }, "devices": [ "Default"'$devices' ] }'
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
	if [[ -e $dirsystem/$ID.conf ]]; then
		conf2json $dirsystem/$ID.conf
	else
		case $ID in
			autoplay )      echo '{ "BLUETOOTH": true, "STARTUP": true }';;
			lyrics )        echo '{ "URL": "https://", "START": "<", "END": "</div>", "EMBEDDED": false	}';;
			powerbutton )   grep -q 'poweroff,gpiopin=22' /boot/config.txt && echo true || echo '{ "ON":3, "SW": 3, "LED": 21 }';;
			rotaryencoder ) echo '{ "PINA": 27, "PINB": 22, "PINS": 23, "STEP": 1 }';;
			soundprofile )
				dirlan=/sys/class/net/$( ip -br link | awk '/^e/ {print $1; exit}' )
				echo '{
  "SWAPPINESS" : '$( sysctl vm.swappiness | cut -d' ' -f3 )'
, "MTU"        : '$( cat $dirlan/mtu )'
, "TXQUEUELEN" : '$( cat $dirlan/tx_queue_len )'
}';;
			stoptimer )     echo '{ "MIN": 30, "POWEROFF": false }';;
			volumelimit )
				volume=$( volumeGet )
				[[ $volume == 0 || ! $volume ]] && volume=50
				echo '{ "STARTUP": '$volume', "MAX": 100 }';;
			vuled )         echo '{ "P0": 14, "P1": 15, "P2": 18, "P3": 23, "P4": 24, "P5": 25, "P6": 8	}';;
			* )             echo false;;
		esac
	fi
	;;
	
esac
