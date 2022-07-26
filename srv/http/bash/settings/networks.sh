#!/bin/bash

. /srv/http/bash/common.sh

# convert each line to each args
readarray -t args <<< "$1"

pushRefresh() {
	sleep 2
	$dirbash/settings/networks-data.sh pushrefresh
}
netctlSwitch() {
	ssid=$1
	wlandev=$( cat $dirshm/wlan )
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
	[[ ! $active ]] && netctl switch-to "$connected"
	sleep 3
	pushRefresh
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
	echo "$info" | grep -q 'not available' && exit
	
	if (( $( echo "$info" | grep 'Connected: yes\|UUID: Audio' | wc -l ) == 2 )); then
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
	wlandev=$( cat $dirshm/wlan )
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
	if systemctl -q is-active hostapd && ! systemctl -q is-enabled hostapd; then
		echo "$profile" > /boot/wifi
		data='{ "ssid": "'"$ESSID"'" }'
		pushstream wifi "$data"
		exit
	fi
	
	echo "$profile" > "/etc/netctl/$ESSID"
	netctlSwitch "$ESSID"
	;;
disconnect )
	wlandev=$( cat $dirshm/wlan )
	netctl stop-all
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
editwifidhcp )
	ssid=${args[1]}
	netctl stop "$ssid"
	sed -i -e '/^Address\|^Gateway/ d
' -e 's/^IP.*/IP=dhcp/
' "$file"
	cp "$file" "/etc/netctl/$ssid"
	netctl start "$ssid"
	pushRefresh
	;;
ifconfigeth )
	echo "\
<bll># ifconfig eth0</bll>
$( ifconfig eth0 | grep -v 'RX\\|TX' | awk NF )"
	;;
ifconfigwlan )
	wlandev=$( cat $dirshm/wlan )
	echo "\
<bll># ifconfig $wlandev; iwconfig $wlandev</bll>
$( ifconfig $wlandev | grep -v 'RX\|TX')
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
	wlandev=$( cat $dirshm/wlan )
	if systemctl -q is-active hostapd; then
		systemctl disable --now hostapd
		ifconfig $wlandev 0.0.0.0
		sleep 2
	fi
	netctlSwitch "${args[1]}"
	;;
profileget )
	netctl=$( cat "/etc/netctl/${args[1]}" )
	password=$( echo "$netctl" | grep ^Key | cut -d= -f2- | tr -d '"' )
	static=$( echo "$netctl" | grep -q ^IP=dhcp && echo false || echo true )
	hidden=$( echo "$netctl" | grep -q ^Hidden && echo true || echo false )
	wep=$( [[ $( echo "$netctl" | grep ^Security | cut -d= -f2 ) == wep ]] && echo true || echo false )
	echo '[ "'$password'", '$static', '$hidden', '$wep' ]'
	;;
profileremove )
	ssid=${args[1]}
	connected=${args[2]}
	wlandev=$( cat $dirshm/wlan )
	netctl disable "$ssid"
	if [[ $connected == true ]]; then
		netctl stop "$ssid"
		killall wpa_supplicant
		ifconfig $wlandev up
	fi
	rm "/etc/netctl/$ssid"
	pushRefresh
	;;
usbbluetoothon )
	! systemctl -q is-active bluetooth && systemctl start bluetooth
	! systemctl -q is-active mpd && exit
	
	pushstreamNotify 'USB Bluetooth' Ready bluetooth
	sleep 3
	$dirbash/settings/features-data.sh pushrefresh
	$dirbash/settings/networks-data.sh pushbt
	;;
usbbluetoothoff )
	! rfkill | grep -q bluetooth && systemctl stop bluetooth
	pushstreamNotify 'USB Bluetooth' Removed bluetooth
	$dirbash/settings/features-data.sh pushrefresh
	$dirbash/settings/networks-data.sh pushbt
	;;
usbwifion )
	wlandev=$( ip -br link \
					| grep ^w \
					| grep -v wlan \
					| cut -d' ' -f1 )
	echo $wlandev > /dev/shm/wlan
	iw $wlandev set power_save off &> /dev/null
	pushstreamNotify '{"title":"USB Wi-Fi","text":"Ready","icon":"wifi"}'
	pushRefresh
	;;
usbwifioff )
	echo wlan0 > /dev/shm/wlan
	iw wlan0 set power_save off &> /dev/null
	pushstreamNotify '{"title":"USB Wi-Fi","text":"Removed","icon":"wifi"}'
	pushRefresh
	;;
	
esac
