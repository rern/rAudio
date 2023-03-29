#!/bin/bash

. /srv/http/bash/common.sh

args2var "$1"

netctlSwitch() {
	local ssid wlandev connected active i
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
		cpuInfo
		if [[ $onboardwireless ]]; then
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

case $cmd in

avahi )
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
bluetoothcommand )
	$dirbash/bluetoothcommand.sh $action $mac
	;;
bluetoothinfo )
	info=$( bluetoothctl info $mac )
	grep -q -m1 'not available' <<< $info && exit
	
	echo "\
<bll># bluetoothctl info $mac</bll>
$info"
	;;
bluetoothshow )
	echo "\
<bll># bluetoothctl show</bll>
$( bluetoothctl show )"
	;;
connect )
	file="/etc/netctl/$ESSID"
	if [[ $IP == static && $Address != $( ipAddress ) ]]; then
		if ping -c 1 -w 1 $Address &> /dev/null; then
			rm "$file"
			echo "IP <wh>$Address</wh> already in use."
			exit
		fi
	fi
	
	data="\
Interface=$( < $dirshm/wlan )
Connection=wireless
IP=$IP
ESSID=$ESSID"
	if [[ $Key ]]; then
		[[ $Security ]] && Security=wep || Security=wpa
		data+="
Key=$Key"
	else
		Security=none
	fi
	[[ $Address ]] && data+="
Address=$Address/24
Gateway=$Gateway"
	data+="
Security=$Security"
	[[ $Hidden ]] && data+="
Hidden=yes"
	echo "$data" > "/etc/netctl/$ESSID"
	
	if systemctl -q is-active hostapd && ! systemctl -q is-enabled hostapd; then # boot to hostapd when no network connection
		pushstream wlan '{"ssid":"'$ESSID'","reboot":1}'
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
	killall wpa_supplicant
	ifconfig $wlandev up
	$dirsettings/networks-data.sh pushwl
	;;
hostapd )
	echo $dirsettings/features.sh "$1"
	;;
ifconfigeth )
	lan=$( ifconfig | grep ^e | cut -d: -f1 )
	echo "\
<bll># ifconfig $lan</bll>
$( ifconfig $lan | grep -E -v 'RX|TX|^\s*$' )"
	;;
ifconfigwlan )
	wlandev=$( < $dirshm/wlan )
	echo "\
<bll># ifconfig $wlandev; iwconfig $wlandev</bll>
$( ifconfig $wlandev | grep -E -v 'RX|TX')
$( iwconfig $wlandev | awk NF )"
	;;
iwlist )
	echo '<bll># iw reg get</bll>'
	iw reg get
	echo
	echo '<bll># iw list</bll>'
	iw list
	;;
lanedit )
	if [[ $ip ]]; then
		ping -c 1 -w 1 $ip &> /dev/null && echo -1 && exit
	fi
	
	file=/etc/systemd/network/en.network
	if [[ -e $file ]]; then
		lan=en*
	else
		lan=eth0
		file=/etc/systemd/network/eth0.network
	fi
	sed -E -i '/^DHCP|^Address|^Gateway/ d' $file
	if [[ $ip ]]; then # static
		sed -i '/^DNSSEC/ i\
Address='$ip'/24\
Gateway='$gw $file
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
	netctlSwitch "$ssid"
	;;
profileget )
	conf2json "/etc/netctl/$ssid"
	;;
profileremove )
	netctl is-enabled "$ssid" && netctl disable "$ssid"
	if netctl is-active "$ssid" &> /dev/null; then
		netctl stop "$ssid"
		killall wpa_supplicant &> /dev/null &
		ifconfig $( < $dirshm/wlan ) up
	fi
	rm "/etc/netctl/$ssid"
	$dirsettings/networks-data.sh pushwl
	;;
scanbluetooth )
	$dirsettings/networks-scan.sh
	;;
scankill ) 
	killall -q networks-scan.sh &> /dev/null
	;;
scanwlan )
	$dirsettings/networks-scan.sh wlan
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
