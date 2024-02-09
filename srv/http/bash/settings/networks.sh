#!/bin/bash

. /srv/http/bash/common.sh

args2var "$1"

pushRefreshWlan() {
	$dirsettings/networks-data.sh pushwl
}
iwctlConnect() {
	local hidden
	wlandev=$( < $dirshm/wlan )
	[[ $HIDDEN == true ]] && hidden=-hidden
	if [[ $PASSPHRASE ]]; then
		iwctl station $wlandev connect$hidden "$SSID" --passphrase "$PASSPHRASE"
	else
		iwctl station $wlandev connect$hidden "$SSID"
	fi
	[[ $? == 0 ]] && return 0 || return 1
}
iwctlScan() {
	local ssid
	ssid=$1
	wlandev=$( < $dirshm/wlan )
	iwctl station $wlandev scan "$ssid"
	for i in {0..9}; do
		sleep 1
		iwctl station $wlandev get-networks 2> /dev/null \
			| sed -e '1,4 d' -e $'s/\e\\[[0-9;]*m>*//g' \
			| awk 'NF{NF-=2}1 && NF' \
			| grep -q "^$ssid$" \
				&& return 0
	done
	return 1
}
wlanDevice() {
	local iplinkw wlandev
	iplinkw=$( ip -br link | grep -m1 ^w )
	if [[ ! $iplinkw ]]; then
		if [[ -e $dirshm/onboardwlan ]]; then
			modprobe brcmfmac
			sleep 1
			iplinkw=$( ip -br link | grep ^w )
		fi
	fi
	if [[ $iplinkw ]]; then
		wlandev=$( tail -1 <<< "$iplinkw" | cut -d' ' -f1 )
		echo $wlandev | tee $dirshm/wlan
		ip link set $wlandev up
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
	if [[ $ADDRESS && $ADDRESS != $( ipAddress ) ]]; then
		ipOnline $ADDRESS && echo 'IP address not available.' && exit
	fi
	
	! iwctlScan "$SSID" && echo 'SSID not found.' && exit
	
	if [[ $ADDRESS ]]; then # static ip
		[[ $PASSPHRASE ]] && ext=psk || ext=open
		if [[ $SSID =~ [^a-zA-Z0-9\ _-] ]]; then
			profile==$( echo -n "$SSID" \
							| od -A n -t x1 \
							| tr -d ' ' )
		else
			profile=$SSID
		fi
		echo "\
[IPv4]
Address=$ADDRESS
Gateway=$GATEWAY" > "/var/lib/iwd/$profile.$ext"
	fi
	killProcess networksscan
	sleep 1
	for i in {0..3}; do
		iwctlConnect && break || sleep 3
	done
	sleep 1
	if [[ $( iwgetid -r ) ]]; then
		avahi-daemon --kill # flush cache > auto restart
		[[ -e /boot/wifi ]] && rm -f /boot/wifi && pushRefresh
	else
		notify wifi Wi-Fi 'Connect failed.'
	fi
	;;
disconnect )
	iwctl station $( < $dirshm/wlan ) disconnect
	pushRefreshWlan
	;;
lanedit )
	if [[ $ADDRESS && $ADDRESS != $( ipAddress ) ]]; then
		ipOnline $ADDRESS && echo -1 && exit
	fi
	
	file=/etc/systemd/network/en.network
	[[ ! -e $file ]] && file=$( ls /etc/systemd/network/eth*.network | head -1 )
	sed -E -i '/^DHCP|^Address|^Gateway/ d' $file
	if [[ $ADDRESS ]]; then # static
		sed -i '/^DNSSEC/ i\
Address='$ADDRESS'/24\
Gateway='$GATEWAY $file
	else                    # dhcp - reset
		sed -i '/^DNSSEC/ i\DHCP=yes' $file
	fi
	systemctl restart systemd-networkd
	avahi-daemon --kill
	pushRefresh
	;;
profileconnect )
	[[ -e $dirsystem/ap ]] && rm -f $dirsystem/{ap,ap.conf} && systemctl restart iwd
	! iwctlScan "$SSID" && echo -1 && exit
	
	grep -q ^Hidden=true "/var/lib/iwd/$SSID".* && hidden=-hidden
	iwctl station $( < $dirshm/wlan ) connect$hidden "$SSID"
	pushRefreshWlan
	;;
profileforget )
	iwctl known-networks "$SSID" forget
	pushRefreshWlan
	;;
profileget )
	data=$( cat "/var/lib/iwd/$SSID".* )
	. <( grep -E '^Address|^AutoConnect|^Gateway|^Hidden|^Passphrase' <<< $data )
	[[ ! $Hidden ]] && Hidden=false
	[[ $Address ]] && ip=static || ip=dhcp
	echo '{
  "IP"         : "'$ip'"
, "SSID"       : "'$SSID'"
, "PASSPHRASE" : "'$Passphrase'"
, "ADDRESS"    : "'$Address'"
, "GATEWAY"    : "'$Gateway'"
, "HIDDEN"     : '$Hidden'
}'
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
