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
	ip link set $wlandev down
	[[ $currentssid ]] && netctl switch-to "$ESSID" || netctl start "$ESSID"
	for i in {0..20}; do
		sleep 1
		[[ $( iwgetid -r ) == $ESSID ]] && connected=1 && break
	done
	if [[ $connected ]]; then
		netctl enable "$ESSID"
		avahi-daemon --kill # flush cache and restart
		pushRefresh networks pushwl
	else
		echo -1
		if [[ $currentssid ]]; then
			mv -f "$dirshm/$currentssid" /etc/netctl
			ip link set $wlandev down
			netctl start "$currentssid"
		fi
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
	wlandev=$( < $dirshm/wlan )
	if [[ $ADDRESS ]]; then
		ipAvailable $ADDRESS
		iptype=static
	else
		iptype=dhcp
	fi
	currentssid=$( iwgetid -r )
	[[ $currentssid == $ESSID ]] && cp "/etc/netctl/$currentssid" $dirshm
	data='Interface='$wlandev'
Connection=wireless
IP='$iptype'
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
	netctlSwitch
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
	netctlSwitch
	;;
profileforget )
	netctl is-enabled "$SSID" && netctl disable "$SSID"
	if netctl is-active "$SSID" &> /dev/null; then
		netctl stop "$SSID"
		systemctl stop wpa_supplicant
		ip link set $( < $dirshm/wlan ) up
	fi
	rm "/etc/netctl/$SSID"
	pushRefresh networks pushwl
	;;
profileget )
	. "/etc/netctl/$SSID"
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
