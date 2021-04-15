#!/bin/bash

dirsystem=/srv/http/data/system

# convert each line to each args
readarray -t args <<< "$1"

netctlSwitch() {
	ssid=$1
	connected=$( netctl list | grep ^* | sed 's/^\* //' )
	ifconfig wlan0 down
	netctl switch-to "$ssid"
	for i in {1..10}; do
		sleep 1
		if [[ $( netctl is-active "$ssid" ) == active ]]; then
			[[ -n $connected ]] && netctl disable "$connected"
			netctl enable "$ssid"
			active=1
			break
		fi
	done
	[[ -z $active ]] && netctl switch-to "$connected" && sleep 2
	pushRefresh
	pushRefreshFeatures
}
pushRefresh() {
	sleep 2
	curl -s -X POST http://127.0.0.1/pub?id=refresh -d '{ "page": "networks" }'
}
pushRefreshFeatures() {
	systemctl -q is-active hostapd && curl -s -X POST http://127.0.0.1/pub?id=refresh -d '{ "page": "features" }'
}

case ${args[0]} in

avahi )
	lines=$( timeout 1 avahi-browse -arp )
	echo "$lines" | cut -d';' -f7,8 | grep . | grep -v 127.0.0.1 | sed 's/;/ : /' | sort -u
	;;
btdisconnect )
	bluetoothctl disconnect ${args[1]}
	sleep 2
	pushRefresh
	;;
btpair )
	mac=${args[1]}
	bluetoothctl trust $mac
	bluetoothctl pair $mac
	bluetoothctl connect $mac
	[[ $? == 0 ]] && pushRefresh || echo -1
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
	profile="\
Interface=wlan0
Connection=wireless
ESSID=\"$ESSID\"
IP=$( jq -r .IP <<< $data )
"
	if [[ -n $Key ]]; then
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
		curl -s -X POST http://127.0.0.1/pub?id=wifi -d '{ "ssid": "'"$ESSID"'" }'
		exit
	fi
	
	echo "$profile" > "/etc/netctl/$ESSID"
	netctlSwitch "$ESSID"
	;;
disconnect )
	netctl stop-all
	killall wpa_supplicant
	ifconfig wlan0 up
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
	if [[ -z $ip ]];then
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
	echo "$eth0" > /etc/systemd/network/eth0.network
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
ifconfig )
	ifconfig wlan0 up &> /dev/null # force up
	lines=$( ifconfig \
		| sed -n '/^eth\|^wlan/,/ether/ p' \
		| grep -v inet6 \
		| sed 's/^\(.*\): .*/\1/; s/^ *inet \(.*\)   *net.*/\1/; s/^ *ether \(.*\)   *txq.*/\1=/' \
		| tr '\n' ' ' \
		| sed 's/= /\n/g' )
	echo "$lines"
	;;
ipused )
	ping -c 1 -w 1 ${args[1]} &> /dev/null && echo 1 || echo 0
	;;
profileconnect )
	if systemctl -q is-active hostapd; then
		systemctl disable --now hostapd
		ifconfig wlan0 0.0.0.0
		sleep 2
	fi
	netctlSwitch ${args[1]}
	;;
profileget )
	value=$( cat "/etc/netctl/${args[1]}" \
				| grep . \
				| tr -d '"' \
				| sed 's/^/"/ ;s/=/":"/; s/$/",/' )
	echo {${value:0:-1}}
	;;
profileremove )
	ssid=${args[1]}
	netctl disable "$ssid"
	netctl stop "$ssid"
	killall wpa_supplicant
	ifconfig wlan0 up
	rm "/etc/netctl/$ssid"
	pushRefresh
	;;
	
esac
