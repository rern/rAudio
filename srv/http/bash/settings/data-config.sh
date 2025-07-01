#!/bin/bash

. /srv/http/bash/common.sh

gpioState() {
	[[ -e $dirsystem/vuled ]] && grep -q '^state="play"' $dirshm/status && vuledactive=1
	if [[ -e $dirsystem/relayson || $vuledactive ]]; then
		echo false
	else
		local output pins state
		pins=$( gpioinfo -c0 | grep GPIO )
		output=$( sed -n '/output$/ {s/:.*//; s/.* //; p}' <<< $pins )
		state=$( sed -n '/input$/ {s/.*line */"/; s/:.*GPIO.*/": false,/; p}' <<< $pins )
		state+=$( gpioget -a -c0 $output | sed -e 's/=active/: true,/g; s/=inactive/: false,/g;' )
		echo '{ '${state:0:-1}' }'
	fi
}

ID=$1

case $ID in

ap )
	ssid=$( hostname )
	file=/var/lib/iwd/ap/$ssid.ap
	echo '{ "SSID": "'$ssid'", "IP": "'$( getVar Address $file )'", "PASSPHRASE": "'$( getVar Passphrase $file )'" }'
	;;
audio-wm5102 )
	echo '{ "outputtype" : "'$( getContent $dirsystem/audio-wm5102 'HPOUT2 Digital' )'" }'
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
$( getContent "$dirsystem/custom-output-$name" )"
	;;
hddapm )
	apm=$( hdparm -B $2 | sed -n '/APM_level/ {s/.* //; p}' )
	[[ $apm ]] && echo $apm || echo false
	;;
hwparams )
	cat $dirshm/hwparams
	;;
i2seeprom )
	grep -q -m1 ^force_eeprom_read=0 /boot/config.txt && echo true || echo false
	;;
i2slist )
	cat /srv/http/assets/data/system-i2s.json
	;;
lcdchar )
	fileconf=$dirsystem/lcdchar.json
	if [[ -e $fileconf ]]; then
		values=$( < $fileconf )
		current=$( jq -r .INF $fileconf )
		[[ ! $2 && $current == gpio ]] && echo '{ "values": '$values', "current": "'$current'" }' && exit
# --------------------------------------------------------------------
	fi
	val='{ "INF": "gpio", "COLS": 20, "CHARMAP": "A00"'
	if [[ $2 == gpio ]]; then
		[[ $current != gpio ]] && values=$val', "P0": 21, "PIN_RS": 15, "P1": 22, "PIN_RW": 18, "P2": 23, "PIN_E": 16, "P3": 24'
	else
		[[ $current != i2c ]] && values=${val/gpio/i2c}', "ADDRESS": 39, "CHIP": "PCF8574"'
	fi
	! grep -q BACKLIGHT <<< $values && values+=', "BACKLIGHT": false }'
	[[ $2 == gpio ]] && echo '{ "values": '$values', "current": "'$current'" }' && exit
# --------------------------------------------------------------------
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
	echo '{ "values": '$values', "current": "'$current'", "address": { '${address:1}' } }'
	;;
localbrowser )
	echo '{
  "values"     : '$( conf2json localbrowser.conf )'
, "brightness" : '$( getContent /sys/class/backlight/rpi_backlight/brightness false )'
}'
	;;
mpdoled )
	opt=$( < /etc/default/mpd_oled )
	chip=$( cut -d' ' -f2 <<< $opt )
	spectrum=$( grep -q '\-X' <<< $opt && echo true || echo false )
	baud=$( sed -n '/baudrate/ {s/.*=//; p}' /boot/config.txt )
	[[ ! $baud ]] && baud=800000
	echo '{ "CHIP": "'$chip'", "BAUD": '$baud', "SPECTRUM": '$spectrum' }'
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
reboot )
	if [[ -e $dirshm/reboot ]]; then
		list=$( < $dirshm/reboot )
		rm -f $dirshm/reboot
		echo { ${list:1} }
	else
		echo false
	fi
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
		names=$( getContent $dirsystem/relays.json )
	else
		names='{ "17": "DAC", "27": "PreAmp", "22": "Amp", "23": "Subwoofer" }'
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
, "names"  : '$names'
, "state"  : '$( gpioState )'
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
	echo '{
  "values" : '$values'
, "key"    : '$( exists $dirsystem/scrobblekey )'
}'
	;;
servermirror )
	file=/etc/pacman.d/mirrorlist
	list=$( curl --connect-timeout 3 -sfL https://github.com/archlinuxarm/PKGBUILDs/raw/master/core/pacman-mirrorlist/mirrorlist )
	if [[ $? == 0 ]]; then
		mirror=$( sed -n '/^Server/ {s|\.*mirror.*||; s|.*//||; p}' $file )
		[[ $mirror ]] && list=$( sed "1,/^Server/ s|//.*mirror|//$mirror.mirror|" <<< $list )
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
			[[ $city ]] && cc="$country ($city)" || cc=$country
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
	snapserverList
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
templimit )
	line=$( grep ^temp_soft_limit /boot/config.txt )
	[[ $line ]] && degree=$( cut -d= -f2 <<< $line ) || degree=60
	echo '{ "DEGREE": '$degree' }'
	;;
timezonelist )
	cat /srv/http/assets/data/timezone.json
	;;
tft )
	model=$( sed -n -E '/rotate=/ {s/dtoverlay=(.*):rotate.*/\1/; p}' /boot/config.txt )
	echo '{ "MODEL": "'$( [[ $model ]] && echo $model || echo tft35a )'" }'
	;;
vuled )
	file=$dirsystem/vuled.conf
	[[ -e $file ]] && conf=$( < $file ) || conf='14 15 18 23 24 25 8'
	echo '{
  "values" : [ '$( tr ' ' , <<< $conf )' ]
, "state"  : '$( gpioState )'
}'
	;;
wlan )
	echo '{
	  "values" : {
	  "REGDOM" : "'$( cut -d'"' -f2 /etc/conf.d/wireless-regdom )'"
	, "APAUTO" : '$( [[ ! -e $dirsystem/wlannoap ]] && echo true || echo false )'
	}
	, "list"   : '$( cat /srv/http/assets/data/regdomcodes.json )'
}'
	;;
wlanprofile )
	. "/etc/netctl/$2"
	data='{
  "ESSID"    : "'$( quoteEscape $ESSID )'"
, "KEY"      : "'$Key'"'
	[[ $Address ]] && data+='
, "ADDRESS"  : "'${Address/\/24}'"
, "GATEWAY"  : "'$Gateway'"'
	data+='
, "SECURITY" : '$( [[ $Security == wep ]] && echo true || echo false )'
, "HIDDEN"   : '$( [[ $Hidden == yes ]] && echo true || echo false )'
}'
	echo "$data"
	;;
* )
	if [[ -e $dirsystem/$ID.conf ]]; then
		conf2json $dirsystem/$ID.conf
	elif [[ -e $dirsystem/$ID.json ]]; then
		getContent $dirsystem/$ID.json
	else
		case $ID in
			autoplay )      echo '{ "BLUETOOTH": true, "STARTUP": true }';;
			lyrics )        echo '{ "URL": "https://", "START": "<", "END": "</div>", "EMBEDDED": false	}';;
			powerbutton )   grep -q 'poweroff,gpiopin=22' /boot/config.txt && echo true || echo '{ "ON":3, "SW": 3, "LED": 21 }';;
			rotaryencoder ) echo '{ "PINA": 27, "PINB": 22, "PINS": 23, "STEP": 1 }';;
			soundprofile )
				dirlan=/sys/class/net/$( lanDevice )
				echo '{
  "SWAPPINESS" : '$( sysctl vm.swappiness | cut -d' ' -f3 )'
, "MTU"        : '$( cat $dirlan/mtu )'
, "TXQUEUELEN" : '$( cat $dirlan/tx_queue_len )'
}';;
			stoptimer )     echo '{ "values": { "MIN": 30, "POWEROFF": false }, "active": '$( exists $dirshm/pidstoptimer )' }';;
			volumelimit )
				volume=$( volumeGet )
				[[ $volume == 0 || ! $volume ]] && volume=50
				echo '{ "STARTUP": '$volume', "MAX": 100 }';;
			* )             echo false;;
		esac
	fi
	;;
	
esac
