#!/bin/bash

. /srv/http/bash/common.sh

args2var "$1"

netctlSwitch() {
	local active connected ssid wlandev
	ssid=$1
	wlandev=$( < $dirshm/wlan )
	connected=$( iwgetid -r $wlandev )
	ip link set $wlandev down
	netctl switch-to "$ssid"
	for i in {1..10}; do
		sleep 1
		if netctl is-active "$ssid" &> /dev/null; then
			netctl enable "$ssid"
			$dirsettings/networks-data.sh pushwl
			exit
		fi
	done
	
	echo -1
	[[ $connected ]] && netctl switch-to "$connected"
}
wlanDevice() {
	local iplinkw wlandev
	iplinkw=$( ip -br link | grep -m1 ^w )
	if [[ ! $iplinkw ]]; then
		if [[ -e $dirshm/onboardwlan ]]; then
			modprobe brcmfmac
			ip link set wlan0 up
			sleep 1
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
	if [[ $ADDRESS && $ADDRESS != $( ipAddress ) ]]; then # static
		if ipOnline $ADDRESS; then
			rm "$file"
			echo 'IP <wh>'$ADDRESS'</wh> already in use.'
			exit
		fi
	fi
	
	data='Interface='$( < $dirshm/wlan )'
Connection=wireless
IP='$IP'
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
	
	if [[ -e $dirsystem/ap ]]; then
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
	netctl stop "$SSID"
	systemctl stop wpa_supplicant
	ip link set $( < $dirshm/wlan ) up
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
	if [[ -e $dirsystem/ap ]]; then
		rm -f $dirsystem/{ap,ap.conf}
		systemctl stop iwd
		ifconfig $wlandev 0.0.0.0
		sleep 2
	fi
	netctlSwitch "$SSID"
	;;
profiledisable )
	[[ $DISABLE == true ]] && toggle=disable || toggle=enable
	netctl $toggle "$SSID"
	pushRefreshWlan
	;;
profileforget )
	netctl is-enabled "$SSID" && netctl disable "$SSID"
	if netctl is-active "$SSID" &> /dev/null; then
		netctl stop "$SSID"
		systemctl stop wpa_supplicant
		wlandev=$( < $dirshm/wlan )
		ip link set $wlandev up
	fi
	rm "/etc/netctl/$SSID"
	$dirsettings/networks-data.sh pushwl
	;;
profileget )
	profile=$( conf2json "/etc/netctl/$SSID" )
	echo ${profile/INT*IP/IP}
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
<bll># ifconfig $wlandev</bll>
$( ifconfig $wlandev | grep -E -v 'RX|TX')

<bll># iwconfig $wlandev</bll>
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
