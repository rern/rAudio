#!/bin/bash

. /srv/http/bash/common.sh

# convert each line to each args
readarray -t args <<< "$1"

pushRefresh() {
	sleep 2
	data=$( $dirbash/networks-data.sh )
	pushstream refresh "$data"
}
netctlSwitch() {
	ssid=$1
	wlandev=$2
	connected=$( netctl list | grep ^* | sed 's/^\* //' )
	ifconfig $wlandev down
	netctl switch-to "$ssid"
	for i in {1..10}; do
		sleep 1
		if [[ $( netctl is-active "$ssid" ) == active ]]; then
			[[ $connected ]] && netctl disable "$connected"
			netctl enable "$ssid"
			active=1
			break
		fi
	done
	[[ ! $active ]] && netctl switch-to "$connected" && sleep 2
	pushRefresh
	if systemctl -q is-active hostapd; then
		data=$( $dirbash/features-data.sh )
		pushstream refresh "$data"
	fi
}
wlDeviceSet() {
	wlandev=$1
	startup=$2
	# profiles
	readarray -t profiles <<< $( ls -1p /etc/netctl | grep -v /$ )
	if [[ $profile ]]; then
		for name in "${profiles[@]}"; do
			file="/etc/netctl/$name"
			sed -i "s/^\(Interface=\).*/\1$wlandev/" "$file"
		done
	fi
	# hostapd
	file=/etc/hostapd/hostapd.conf
	sed -i -e "s/^\(interface=\).*/\1$wlandev/" $file
	
	[[ $startup ]] && echo $wlandev && exit
	
	pushRefresh
	connectedssid=$( iwgetid $( cat $dirshm/wlan ) -r )
	if [[ $connectedssid ]]; then
		pushstreamNotify 'USB Wi-Fi' "Reconnect to $connectedssid ..." wifi
		netctl restart "$connectedssid"
	elif systemctl -q is-active hostapd; then
		pushstreamNotify 'USB Wi-Fi' 'Restart Access Point ...' wifi
		systemctl restart hostapd
	else
		pushstreamNotify 'USB Wi-Fi' Detected. wifi
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
btdisconnect )
	bluetoothctl disconnect ${args[1]}
	sleep 2
	pushRefresh
	;;
btpair )
	mac=${args[1]}
	bluetoothctl disconnect &> /dev/null
	bluetoothctl trust $mac
	bluetoothctl pair $mac
	bluetoothctl connect $mac
	[[ $? != 0 ]] && echo -1 && exit
	
	pushRefresh
	sleep 2
	[[ ! -e $dirshm/btclient ]] && $dirbash/mpd-conf.sh bton
	;;
btremove )
	mac=${args[1]}
	bluetoothctl disconnect $mac
	bluetoothctl remove $mac
	sleep 2
	pushRefresh
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
	netctlSwitch "$ESSID" $wlandev
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
profileconnect )
	wlandev=$( cat $dirshm/wlan )
	if systemctl -q is-active hostapd; then
		systemctl disable --now hostapd
		ifconfig $wlandev 0.0.0.0
		sleep 2
	fi
	netctlSwitch "${args[1]}" $wlandev
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
usbwifi )
	! systemctl -q is-active mpd && exit
	
	startup=${args[1]}
	wlandev=$( ip -br link \
					| grep ^w \
					| grep -v wlan \
					| cut -d' ' -f1 )
	echo $wlandev > $dirshm/wlan
	wlDeviceSet $wlandev $startup
	;;
usbwifiremove )
	echo wlan0 > $dirshm/wlan
	wlDeviceSet wlan0
	pushstreamNotify 'USB Wi-Fi' Removed. wifi
	;;
	
esac
