#!/bin/bash

dirsystem=/srv/http/data/system

# convert each line to each args
readarray -t args <<< "$1"

pushRefresh() {
	sleep 1
	curl -s -X POST http://127.0.0.1/pub?id=refresh -d '{ "page": "networks" }'
}

case ${args[0]} in

avahi )
	lines=$( avahi-browse -art | grep 'hostname =\|address =' )
	echo "$lines" \
		| sed 's/^.*hostname = /,/; s/^.*address = / : /' \
		| tr -d '\n[]' \
		| tr , '\n' \
		| grep . \
		| sort -u
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
	Interface=$( jq -r .Interface <<< $data )
	ESSID=$( jq -r .ESSID <<< $data )
	Key=$( jq -r .Key <<< $data )
	profile="\
Interface=$Interface
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
	netctl list | grep ^..$ESSID$ || new=1
	netctl is-active Home2GHz &> /dev/null && active=1
	echo "$profile" > "/etc/netctl/$ESSID"
	if [[ -n $new || -n $active ]]; then
		ifconfig $Interface down
		netctl switch-to "$ESSID"
		systemctl enable netctl-auto@$Interface
	fi
	pushRefresh
	;;
disconnect )
	wlan=${args[1]}
	ssid=${args[2]}
	netctl stop-all
	killall wpa_supplicant
	ifconfig $wlan up
	systemctl disable netctl-auto@$wlan
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
	wlan=${args[1]}
	ssid=${args[2]}
	ifconfig $wlan down
	netctl switch-to "$ssid"
	systemctl enable netctl-auto@$wlan
	pushRefresh
	;;
profileget )
	value=$( cat "/etc/netctl/${args[1]}" \
				| grep . \
				| tr -d '"' \
				| sed 's/^/"/ ;s/=/":"/; s/$/",/' )
	echo {${value:0:-1}}
	;;
profileremove )
	wlan=${args[1]}
	ssid=${args[2]}
	if netctl list | grep -q "^\* $ssid$"; then
		netctl stop "$ssid"
		killall wpa_supplicant
		ifconfig $wlan up
		systemctl disable netctl-auto@$wlan
	fi
	rm "/etc/netctl/$ssid"
	pushRefresh
	;;
	
esac
