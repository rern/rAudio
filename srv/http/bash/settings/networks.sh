#!/bin/bash

. /srv/http/bash/common.sh

args2var "$1"

pushRefreshWlan() {
	$dirsettings/networks-data.sh pushwl
}
iwctlConnect() { # wlandev ssid hidden passphrase
	local hidden
	! iwctlScan "$SSID" && echo -1 && exit
	
	# wlandev: from iwctlScan
	[[ $HIDDEN == true ]] && hidden=-hidden
	if [[ $PASSPHRASE ]]; then
		iwctl station $wlandev connect$hidden "$SSID" --passphrase "$PASSPHRASE"
	else
		iwctl station $wlandev connect$hidden "$SSID"
	fi
	if [[ $( iwgetid -r $wlandev ) ]]; then
		avahi-daemon --kill # flush cache and restart
	else
		rm -f "/var/lib/iwd/$SSID".*
	fi
	pushRefresh
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
	killProcess networksscan
	iwctlConnect
	;;
connectstatic )
	if [[ $PASSPHRASE ]]; then
		presharedkey=$( wpa_passphrase "$SSID" "$PASSPHRASE" | grep '\spsk=' | cut -d= -f2 )
		data='
[Security]
PreSharedKey='$presharedkey'
Passphrase="'$PASSPHRASE'"'
		profile="/var/lib/iwd/$SSID.psk"
	else
		profile="/var/lib/iwd/$SSID.open"
	fi
	data+='
[IPv4]
Address='$ADDRESS'
Gateway='$GATEWAY
	[[ $HIDDEN == true ]] && settings='
Hidden=true'
	[[ $DISABLE == true ]] && settings+='
AutoConnect=true'
	[[ $settings ]] && data+="
[Settings]
$settings"
	echo "$data" > "$profile"
	iwctlConnect
	;;
disconnect )
	iwctl station $( < $dirshm/wlan ) disconnect
	pushRefreshWlan
	;;
iwctlconnect )
	iwctlConnect
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
	avahi-daemon --kill
	pushRefresh
	;;
profileconnect )
	[[ -e $dirsystem/ap ]] && rm -f $dirsystem/{ap,ap.conf} && systemctl restart iwd
	! iwctlScan "$SSID" && echo -1 && exit
	
	# wlandev: from iwctlScan
	grep -q ^Hidden=true "/var/lib/iwd/$SSID".* && hidden=-hidden
	iwctl station $wlandev connect$hidden "$SSID"
	pushRefreshWlan
	;;
profiledisable )
	file=$( ls -1 "/var/lib/iwd/$SSID".* | head -1 )
	if [[ $DISABLE == true ]]; then
		if grep -q '^\[Settings' "$files"; then
			sed -i '/^\[Settings/ a\AutoConnect=false' "$file"
		else
			echo '
[Settings]
AutoConnect=false' >> "$file"
		fi
	else
		data=$( sed '/^AutoConnect=false/ d' "$file" )
		if ! grep -q ^Hidden "$file"; then
			data=$( sed '/^\[Settings/ d' <<< $data )
			data=$( sed ':a;/^[ \n]*$/{$d;N;ba}' <<< $data )
		fi
		echo "$data" > "$file"
	fi
	pushRefreshWlan
	;;
profileget )
	data=$( cat "/var/lib/iwd/$SSID".* )
	. <( grep -E '^Address|^AutoConnect|^Gateway|^Hidden|^Passphrase' <<< $data )
	[[ ! $Hidden ]] && Hidden=false
	[[ $AutoConnect == false ]] && disable=true || disable=false
	[[ $Address ]] && ip=static || ip=dhcp
	echo '{
  "IP"         : "'$ip'"
, "SSID"       : "'$SSID'"
, "PASSPHRASE" : "'$Passphrase'"
, "ADDRESS"    : "'$Address'"
, "GATEWAY"    : "'$Gateway'"
, "HIDDEN"     : '$Hidden'
, "DISABLE"    : '$disable'
}'
	;;
profileremove )
	iwctl known-networks "$SSID" forget
	pushRefreshWlan
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
