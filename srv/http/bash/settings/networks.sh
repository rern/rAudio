#!/bin/bash

. /srv/http/bash/common.sh

# convert each line to each args
readarray -t args <<< $1

netctlSwitch() {
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
	[[ ! $active && $connected ]] && netctl switch-to "$connected"
	sleep 3
	pushRefresh
}
wlanDevice() {
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

case ${args[0]} in

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
bluetoothinfo )
	mac=${args[1]}
	info=$( bluetoothctl info $mac )
	grep -q 'not available' <<< $info && exit
	
	if (( $( grep -Ec 'Connected: yes|UUID: Audio' <<< $info ) == 2 )); then
		data="\
<bll># bluealsa-aplay -L</bll>
$( bluealsa-aplay -L | grep -A2 $mac )

"
	fi
	data+="\
<bll># bluetoothctl info $mac</bll>
$info"
	echo "$data"
	;;
btcontroller )
	echo "\
<bll># bluetoothctl show</bll>
$( bluetoothctl show )"
	;;
connect )
	data=${args[1]}
	ESSID=$( jq -r .ESSID <<< $data )
	Key=$( jq -r .Key <<< $data )
	wlandev=$( < $dirshm/wlan )
	profile="\
Interface=$wlandev
Connection=wireless
ESSID=\"$ESSID\"
IP=$( jq -r .IP <<< $data )
"
	if [[ $Key ]]; then
		profile+="\
Security=$( jq -r .Security <<< $data )
Key=\"$Key\"
"
	else
		profile+="\
Security=none
"
	fi
	[[ $( jq -r .Hidden <<< $data ) == true ]] && profile+="\
Hidden=yes
"
	[[ $( jq -r .IP <<< $data ) == static ]] && profile+="\
Address=$( jq -r .Address <<< $data )/24
Gateway=$( jq -r .Gateway <<< $data )
"
	if systemctl -q is-active hostapd && ! systemctl -q is-enabled hostapd; then # boot to hostapd when no network connection
		echo "$profile" > /boot/wifi                                             # save for next boot
		pushstream wifi '{"ssid":"'$ESSID'"}'
		exit
	fi
	
	echo "$profile" > "/etc/netctl/$ESSID"
	if [[ $( jq -r .add <<< $data ) == true ]]; then
		netctlSwitch "$ESSID"
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
	pushRefresh
	;;
editlan )
	ip=${args[1]}
	gw=${args[2]}
	eth0="\
[Match]
Name=eth0
[Network]
DNSSEC=no
"
	if [[ ! $ip ]];then
		eth0+="\
DHCP=yes
"
	else
		ping -c 1 -w 1 $ip &> /dev/null && echo -1 && exit
		
		eth0+="\
Address=$ip/24
Gateway=$gw
"
	fi
	[[ -e /etc/systemd/network/eth0.network ]] && n=0
	echo "$eth0" > /etc/systemd/network/eth$n.network
	systemctl restart systemd-networkd
	pushRefresh
	;;
hostapd )
	echo $dirsettings/features.sh "$1"
	;;
ifconfigeth )
	echo "\
<bll># ifconfig eth0</bll>
$( ifconfig eth0 | grep -E -v 'RX|TX|^\s*$' )"
	;;
ifconfigwlan )
	wlandev=$( < $dirshm/wlan )
	echo "\
<bll># ifconfig $wlandev; iwconfig $wlandev</bll>
$( ifconfig $wlandev | grep -E -v 'RX|TX')
$( iwconfig $wlandev | awk NF )"
	;;
ipused )
	ping -c 1 -w 1 ${args[1]} &> /dev/null && echo 1 || echo 0
	;;
iwlist )
	echo '<bll># iw reg get</bll>'
	iw reg get
	echo
	echo '<bll># iw list</bll>'
	iw list
	;;
profileconnect )
	wlandev=$( < $dirshm/wlan )
	if systemctl -q is-active hostapd; then
		systemctl disable --now hostapd
		ifconfig $wlandev 0.0.0.0
		sleep 2
	fi
	netctlSwitch "${args[1]}"
	;;
profileget )
	ssid=${args[1]}
	data='"'$ssid'"'
	if netctl is-active "$ssid" &> /dev/null; then
		status=( $( netctl status Home5GHz \
					| grep -E 'rebinding lease|default route' \
					| awk '{print $NF}' ) )
		data+=',"'${status[0]}'","'${status[1]}'"'
	else
		data+=',"",""'
	fi
	netctl=$( < "/etc/netctl/$ssid" )
	password=$( grep ^Key <<< $netctl | cut -d= -f2- | tr -d '"' )
	grep -q ^IP=dhcp <<< $netctl && static=false || static=true
	grep -q ^Hidden <<< $netctl && hidden=true || hidden=false
	grep -q ^Security=wep <<< $netctl && wep=true || wep=false
	data+=',"'$password'", '$static', '$hidden', '$wep
	echo "[$data]"
	;;
profileremove )
	ssid=${args[1]}
	netctl disable "$ssid"
	if netctl is-active "$ssid" &> /dev/null; then
		netctl stop "$ssid"
		killall wpa_supplicant
		ifconfig $( < $dirshm/wlan ) up
	fi
	rm "/etc/netctl/$ssid"
	pushRefresh
	;;
usbbluetoothon ) # from usbbluetooth.rules
	! systemctl -q is-active bluetooth && systemctl start bluetooth
	[[ ! -e $dirshm/startupdone ]] && exit # suppress on startup
	
	sleep 3
	pushRefresh features
	pushRefresh networks pushbt
	pushstreamNotify bluetooth 'USB Bluetooth' Ready
	;;
usbbluetoothoff ) # from usbbluetooth.rules
	! rfkill -no type | grep -q bluetooth && systemctl stop bluetooth
	pushstreamNotify bluetooth 'USB Bluetooth' Removed
	pushRefresh features
	pushRefresh networks pushbt
	;;
usbwifion )
	wlanDevice
	[[ ! -e $dirshm/startupdone ]] && exit # suppress on startup
	
	pushstreamNotify wifi 'USB Wi-Fi' Ready
	pushRefresh
	;;
usbwifioff )
	pushstreamNotify wifi 'USB Wi-Fi' Removed
	pushRefresh
	;;
wlandevice )
	wlanDevice
	;;
	
esac
