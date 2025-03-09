#!/bin/bash

. /srv/http/bash/common.sh

args2var "$1"

netctlSwitch() {
	ip link set $wlandev down
	[[ $currentssid ]] && netctl switch-to "$ESSID" || netctl start "$ESSID"
	for i in {0..20}; do
		sleep 1
		[[ $( iwgetid -r ) == $ESSID ]] && connected=1 && break
	done
	[[ $( netctl is-enabled "$ESSID" ) == enabled ]] && enabled=1
	if [[ $connected ]]; then
		[[ ! $enabled ]] && netctl enable "$ESSID"
		avahi-daemon --kill # flush cache and restart
		pushRefresh
	else
		notify wifi "$ESSID" 'Connecting failed.'
		[[ $enabled ]] && netctl disable "$ESSID"
		if [[ $currentssid ]]; then
			mv -f "$dirshm/$currentssid" /etc/netctl
			ip link set $wlandev down
			netctl start "$currentssid"
			notify wifi "$currentssid" 'Restored'
		fi
	fi
}
wlanDevice() {
	local wlandev
	if test -e /sys/class/net/w*; then
		wlandev=$( ls /sys/class/net | grep ^w )
		echo $wlandev | tee $dirshm/wlan
		( sleep 1 && iw $wlandev set power_save off ) &
	else
		rm -f $dirshm/wlan
	fi
}

case $CMD in

btrename )
	bluetoothctl set-alias "$NEWNAME"
	amixer -D bluealsa scontrols | cut -d"'" -f2 > $dirshm/btmixer
	pushRefresh
	pushRefresh player
	[[ -e $dirsystem/camilladsp ]] && pushRefresh camilla
	;;
connect )
	wlandev=$( < $dirshm/wlan )
	if [[ $ADDRESS ]]; then
		ipOnline $ADDRESS && echo -1 && exit
# --------------------------------------------------------------------
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
	pushRefresh
	;;
lanedit )
	echo 000
	if [[ $ADDRESS ]]; then
		ipOnline $ADDRESS && echo -1 && exit
# --------------------------------------------------------------------
	fi
	echo 111
	file=$( ls /etc/systemd/network/e* | head -1 )
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
	for i in {0..5}; do
		[[ $( ifconfig | grep -A1 ^e | awk '/inet .* netmask/ {print $2}' ) ]] && break || sleep 1
	done
	pushRefresh
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
	pushRefresh
	;;
usbbluetoothon ) # from usbbluetooth.rules
	! systemctl -q is-active bluetooth && systemctl start bluetooth
	[[ ! -e $dirshm/startup ]] && exit # suppress on startup
# --------------------------------------------------------------------
	sleep 3
	pushRefresh features
	pushRefresh
	notify bluetooth 'USB Bluetooth' Ready
	;;
usbbluetoothoff ) # from usbbluetooth.rules
	! rfkill | grep -q -m1 bluetooth && systemctl stop bluetooth
	notify bluetooth 'USB Bluetooth' Removed
	pushRefresh features
	pushRefresh
	;;
usbwifion )
	wlanDevice
	[[ ! -e $dirshm/startup ]] && exit # suppress on startup
# --------------------------------------------------------------------
	notify wifi 'USB Wi-Fi' Ready
	pushRefresh
	;;
usbwifioff )
	wlanDevice
	notify wifi 'USB Wi-Fi' Removed
	pushRefresh
	;;
wlandevice )
	wlanDevice
	;;
	
esac
