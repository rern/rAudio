#!/bin/bash

. /srv/http/bash/common.sh

args2var "$1"

wlanDevice() {
	local iplinkw wlandev
	iplinkw=$( ip -br link | grep -m1 ^w )
	if [[ ! $iplinkw ]]; then
		if [[ -e $dirshm/onboardwlan ]]; then
			modprobe brcmfmac
			sleep 1
			ip link set wlan0 up
			iplinkw=$( ip -br link | grep ^w )
		fi
	fi
	if [[ $iplinkw ]]; then
		wlandev=$( tail -1 <<< "$iplinkw" | cut -d' ' -f1 )
		echo $wlandev | tee $dirshm/wlan
		( sleep 1 && iw $wlandev set power_save off ) &
	else
		rm -f $dirshm/wlan
	fi
}

case $CMD in

bluetoothinfo )
	info=$( bluetoothctl info $MAC )
	grep -q -m1 'not available' <<< $info && exit
	
	echo "\
<bll># bluetoothctl info $MAC</bll>
$info"
	;;
connect )
	wlandev=$( < $dirshm/wlan )
	if [[ $HIDDEN == true ]]; then
		hidden=-hidden
		iwctl station $wlandev scan "$SSID"
		sleep 3
	fi
	if [[ $ADDRESS ]]; then # static
		if [[ $PASSPHRASE ]]; then
			data+='
[Security]
Passphrase="'$PASSPHRASE'"'
			type=psk
		else
			type=open
		fi
		[[ $hidden ]] && data+='
[Settings]
Hidden=true'
		data+='
[IPv4]
Address='$ADDRESS'
Gateway='$GATEWAY
		awk NF <<< $data > "/var/lib/iwd/$SSID.$type"
		iwctl station $wlandev connect$hidden "$SSID"
		[[ ! $( iwgetid -r $wlandev ) ]] && rm -f "/var/lib/iwd/$SSID.$type"
	elif [[ $PASSPHRASE ]]; then
		iwctl station $wlandev connect$hidden "$SSID" --passphrase "$PASSPHRASE"
	else # open
		iwctl station $wlandev connect$hidden "$SSID"
	fi
	avahi-daemon --kill # flush cache and restart
	pushRefresh
	;;
disconnect )
	iwctl station $( < $dirshm/wlan ) disconnect
	$dirsettings/networks-data.sh pushwl
	;;
lanedit )
	if [[ $IP ]]; then
		ipOnline $IP && echo -1 && exit
	fi
	
	file=/etc/systemd/network/en.network
	if [[ -e $file ]]; then
		lan=en*
	else
		lan=eth0
		file=/etc/systemd/network/eth0.network
	fi
	sed -E -i '/^DHCP|^Address|^Gateway/ d' $file
	if [[ $IP ]]; then # static
		sed -i '/^DNSSEC/ i\
Address='$IP'/24\
Gateway='$GATEWAY $file
	else               # dhcp - reset
		sed -i '/^DNSSEC/ i\DHCP=yes' $file
	fi
	systemctl restart systemd-networkd
	avahi-daemon --kill # flush cache and restart
	;;
profileconnect )
	wlandev=$( < $dirshm/wlan )
	[[ -e $dirsystem/ap ]] && rm -f $dirsystem/{ap,ap.conf} && systemctl restart iwd
	grep -q ^Hidden=true "/var/lib/iwd/$SSID".* && hidden=-hidden
	iwctl station $wlandev connect$hidden "$SSID"
	$dirsettings/networks-data.sh pushwl
	;;
profileget )
	data=$( cat "/var/lib/iwd/$SSID".* )
	. <( grep -E '^Address|^Gateway|^Hidden|^Passphrase' <<< $data )
	[[ ! $Hidden ]] && Hidden=false
	echo '{
		  "ADDRESS"    : "'$Address'"
		, "GATEWAY"    : "'$Gateway'"
		, "HIDDEN"     : '$Hidden'
		, "PASSPHRASE" : "'$Passphrase'"
}'
	;;
profileremove )
	iwctl known-networks "$SSID" forget
	$dirsettings/networks-data.sh pushwl
	;;
scankill ) 
	killProcess networksscan
	;;
statuslan )
	lan=$( ip -br link | awk '/^e/ {print $1; exit}' )
	echo "\
<bll># ifconfig $lan</bll>
$( ifconfig $lan | grep -E -v 'RX|TX|^\s*$' )"
	;;
statuswebui )
	echo "\
<bll># avahi-browse -d local _http._tcp -rpt | awk -F';' '!/^+|^=;lo/ {print \$7\": \"\$8}'</bll>
$( avahi-browse -d local _http._tcp -rpt | awk -F';' '!/^+|^=;lo/ {print $7": "$8}' )"
	;;
statuswl )
	wlandev=$( < $dirshm/wlan )
	echo "\
<bll># ifconfig $wlandev; iwconfig $wlandev</bll>
$( ifconfig $wlandev | grep -E -v 'RX|TX')
$( iwconfig $wlandev | awk NF )"
	;;
usbbluetoothon ) # from usbbluetooth.rules
	! systemctl -q is-active bluetooth && systemctl start bluetooth
	[[ ! -e $dirshm/startup ]] && exit # suppress on startup
	
	sleep 3
	pushRefresh features
	pushRefresh networks pushbt
	notify bluetooth 'USB Bluetooth' Ready
	;;
usbbluetoothoff ) # from usbbluetooth.rules
	! rfkill | grep -q -m1 bluetooth && systemctl stop bluetooth
	notify bluetooth 'USB Bluetooth' Removed
	pushRefresh features
	pushRefresh networks pushbt
	;;
usbwifion )
	wlanDevice
	[[ ! -e $dirshm/startup ]] && exit # suppress on startup
	
	notify wifi 'USB Wi-Fi' Ready
	pushRefresh
	;;
usbwifioff )
	notify wifi 'USB Wi-Fi' Removed
	pushRefresh
	;;
wlandevice )
	wlanDevice
	;;
	
esac
