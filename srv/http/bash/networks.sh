#!/bin/bash

dirsystem=/srv/http/data/system

# convert each line to each args
readarray -t args <<< "$1"

pushRefresh() {
	sleep 1
	curl -s -X POST http://127.0.0.1/pub?id=refresh -d '{ "page": "networks" }'
}

case ${args[0]} in

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
	wlan=${args[1]}
	ssid=${args[2]}
	wpa=${args[3]}
	password=${args[4]}
	hidden=${args[5]}
	ip=${args[6]}
	gw=${args[7]}
	edit=${args[8]}
	[[ -z $ip ]] && dhcp=dhcp || dhcp=static
	profile="\
Interface=$wlan
Connection=wireless
ESSID=\"$ssid\"
IP=$dhcp
"
	if [[ -n $password ]]; then
		profile+="\
Security=$wpa
Key=\"$password\"
"
	else
		profile+="\
Security=none
"
	fi
	[[ -n $hidden ]] && profile+="\
Hidden=yes
"
	[[ $dhcp == static ]] && profile+="\
Address=$ip/24
Gateway=$gw
"
	echo "$profile" > "/etc/netctl/$ssid"
	[[ -n $edit ]] && pushRefresh && exit
	
	ifconfig $wlan down
	netctl switch-to "$ssid"
	systemctl enable netctl-auto@$wlan
#	ifconfig $wlan up
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
		arp -n | grep -q ^$ip && echo -1 && exit
		
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
	lines=$( ifconfig \
		| sed -n '/^eth\|^wlan/,/ether/ p' \
		| grep -v inet6 \
		| sed 's/^\(.*\): .*/\1/; s/^ *inet \(.*\)   *net.*/\1/; s/^ *ether \(.*\)   *txq.*/\1=/' \
		| tr '\n' ' ' \
		| sed 's/= /\n/g' )
	echo "$lines"
	;;
ipused )
	arp -n | grep -q ^${args[1]} && echo 1 || echo 0
	;;
profile )
	value=$( cat "/etc/netctl/${args[1]}" \
				| grep . \
				| tr -d '"' \
				| sed 's/^/"/ ;s/=/":"/; s/$/",/' )
	echo {${value:0:-1}}
	;;
profileconnect )
	wlan=${args[1]}
	ssid=${args[2]}
	ifconfig $wlan down
	netctl switch-to "$ssid"
	systemctl enable netctl-auto@$wlan
	pushRefresh
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
statusnetctl )
	lists=$( netctl list )
	[[ -z $lists ]] && echo '(none)' && exit
	
	readarray -t lists <<< "$lists"
	for list in "${lists[@]}"; do
		name=$( sed 's/^-*\** *//' <<< $list )
		profiles+=$'\n'"<grn>$name</grn>"$'\n'"$( cat /etc/netctl/$name | sed -e '/^#.*/ d' -e 's/Key=.*/Key="*********"/' )"$'\n'
	done
	echo "${profiles:1:-1}"
	;;
	
esac
