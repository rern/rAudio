#!/bin/bash

. /srv/http/bash/common.sh

args2var "$1"

netctlSwitch() {
	local active connected ssid wlandev
	ssid=$1
	wlandev=$( < $dirshm/wlan )
	connected=$( iwgetid $wlandev -r )
	ifconfig $wlandev down
	netctl switch-to "$ssid"
	for i in {1..10}; do
		sleep 1
		if netctl is-active "$ssid" &> /dev/null; then
			[[ $connected ]] && netctl disable "$connected"
			netctl enable "$ssid"
			active=1
			break
		fi
	done
	if [[ $active ]]; then
		$dirsettings/networks-data.sh pushwl
	else
		echo -1
		[[ $connected ]] && netctl switch-to "$connected"
	fi
}
wlanDevice() {
	local iplinkw wlandev
	iplinkw=$( ip -br link | grep ^w )
	if [[ ! $iplinkw ]]; then
		if [[ -e $dirshm/onboardwlan ]]; then
			modprobe brcmfmac
			sleep 1
			iplinkw=$( ip -br link | grep ^w )
		fi
	fi
	if [[ $iplinkw ]]; then
		wlandev=$( tail -1 <<< "$iplinkw" | cut -d' ' -f1 )
		iw $wlandev set power_save off
		echo $wlandev | tee $dirshm/wlan
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
	[[ $ADDRESS ]] && ip=static || ip=dhcp
	if [[ $ADDRESS && $ADDRESS != $( ipAddress ) ]]; then # static
		if ipOnline $ADDRESS; then
			rm "$file"
			echo 'IP <wh>'$ADDRESS'</wh> already in use.'
			exit
		fi
	fi
	
	data='Interface='$( < $dirshm/wlan )'
Connection=wireless
IP='$ip'
ESSID="'$ESSID'"'
	if [[ $KEY ]]; then
		[[ $SECURITY ]] && security=wep || security=wpa
		data+='
Key="'$KEY'"'
	else
		security=none
	fi
	[[ $ADDRESS ]] && data+='
Address='$ADDRESS'/24
Gateway='$GATEWAY
	data+='
Security='$security
	[[ $HIDDEN ]] && data+='
Hidden=yes'
	echo "$data" > "/etc/netctl/$ESSID"
	
	if systemctl -q is-active hostapd && ! systemctl -q is-enabled hostapd; then # boot to hostapd when no network connection
		pushData wlan '{"ssid":"'$ESSID'","reboot":1}'
		exit
	fi
	
	if ! netctl is-active "$ESSID" &> /dev/null; then
		netctlSwitch "$ESSID"
		avahi-daemon --kill # flush cache and restart
	else
		pushRefresh
	fi
	;;
disconnect )
	wlandev=$( < $dirshm/wlan )
	connected=$( iwgetid $wlandev -r )
	netctl stop "$connected"
	netctl disable "$connected"
	systemctl stop wpa_supplicant
	ifconfig $wlandev up
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
	if systemctl -q is-active hostapd; then
		systemctl disable --now hostapd
		ifconfig $wlandev 0.0.0.0
		sleep 2
	fi
	netctlSwitch "$SSID"
	;;
profileget )
	conf2json "/etc/netctl/$SSID"
	;;
profileremove )
	netctl is-enabled "$SSID" && netctl disable "$SSID"
	if netctl is-active "$SSID" &> /dev/null; then
		netctl stop "$SSID"
		systemctl stop wpa_supplicant
		wlandev=$( < $dirshm/wlan )
		ifconfig $wlandev up
	fi
	rm "/etc/netctl/$SSID"
	$dirsettings/networks-data.sh pushwl
	;;
scankill ) 
	killProcess networksscan
	;;
statuslan )
	lan=$( ifconfig | grep ^e | cut -d: -f1 )
	echo "\
<bll># ifconfig $lan</bll>
$( ifconfig $lan | grep -E -v 'RX|TX|^\s*$' )"
	;;
statuswebui )
	hostname=$( hostname )
	echo "\
<bll># avahi-browse -arp | cut -d';' -f7,8 | grep $hostname</bll>
$( timeout 1 avahi-browse -arp \
	| cut -d';' -f7,8 \
	| grep $hostname \
	| grep -v 127.0.0.1 \
	| sed 's/;/ : /' \
	| sort -u )"
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
	[[ ! -e $dirshm/startup.svg ]] && exit # suppress on startup
	
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
	[[ ! -e $dirshm/startup.svg ]] && exit # suppress on startup
	
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
