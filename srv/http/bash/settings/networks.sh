#!/bin/bash

. /srv/http/bash/common.sh

args2var "$1"

ipAvailable() {
	if [[ $1 != $( ipAddress ) ]] && ipOnline $1; then
		echo 'IP <wh>'$1'</wh> already in use.'
		rexit
	fi
}
netctlSwitch() {
	local active ssid wlandev
	ssid=$1
	wlandev=$( < $dirshm/wlan )
	ip link set $wlandev down
	netctl switch-to "$ssid"
	for i in {1..10}; do
		sleep 1
		if netctl is-active "$ssid" &> /dev/null; then
			netctl enable "$ssid"
			avahi-daemon --kill # flush cache and restart
			pushRefresh networks pushwl
			rm -f "$filecurrent"
			exit
# --------------------------------------------------------------------
		fi
	done
	echo -1
	if [[ -e "$filecurrent" ]]; then
		mv -f "$filecurrent" /etc/netctl
		netctl switch-to "$current"
	fi
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
# --------------------------------------------------------------------
	echo "\
<bll># bluetoothctl info $MAC</bll>
$info"
	;;
btrename )
	bluetoothctl set-alias "$NEWNAME"
	amixer -D bluealsa scontrols | cut -d"'" -f2 > $dirshm/btmixer
	pushRefresh networks pushbt
	pushRefresh player
	[[ -e $dirsystem/camilladsp ]] && pushRefresh camilla
	;;
connect )
	if [[ $ADDRESS ]]; then
		ipAvailable $ADDRESS
		ip=static
	else
		ip=dhcp
	fi
	current=$( iwgetid -r )
	if [[ $current == $ESSID ]]; then
		filecurrent="$dirshm/$current"
		cp "/etc/netctl/$current" $dirshm
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
	
	if [[ -e $dirsystem/ap ]]; then
		pushData wlan '{"ssid":"'$ESSID'","reboot":1}'
		exit
# --------------------------------------------------------------------
	fi
	netctl stop "$ESSID"
	netctlSwitch "$ESSID"
	;;
disconnect )
	netctl stop "$SSID"
	systemctl stop wpa_supplicant
	ip link set $( < $dirshm/wlan ) up
	pushRefresh networks pushwl
	;;
lanedit )
	[[ $ADDRESS ]] && ipAvailable $ADDRESS
	file=$( ls -1 /etc/systemd/network/e* | head -1 )
	if [[ $ADDRESS ]]; then # static
		sed -i -E -e '/^DHCP|^Address|^Gateway/ d
' -e '/^DNSSEC/ i\
Address='$ADDRESS'/24\
Gateway='$GATEWAY $file
	else                    # dhcp - reset
		sed -i -E -e '/^DHCP|^Address|^Gateway/ d
' -e '/^DNSSEC/ i\DHCP=yes' $file
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
profileforget )
	netctl is-enabled "$SSID" && netctl disable "$SSID"
	if netctl is-active "$SSID" &> /dev/null; then
		netctl stop "$SSID"
		systemctl stop wpa_supplicant
		wlandev=$( < $dirshm/wlan )
		ip link set $wlandev up
	fi
	rm "/etc/netctl/$SSID"
	pushRefresh networks pushwl
	;;
profileget )
	[[ $( netctl is-enabled "$SSID" ) == enabled ]] && disable=false || disable=true
	conf2json "/etc/netctl/$SSID" | sed -E 's/INT.*(SECURITY)/\1/'
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
# --------------------------------------------------------------------
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
# --------------------------------------------------------------------
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
