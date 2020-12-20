#!/bin/bash

ifconfig wlan0 up &> /dev/null
# accesspoint
if systemctl -q is-active hostapd; then
	ssid=$( awk -F'=' '/^ssid/ {print $2}' /etc/hostapd/hostapd.conf )
	passphrase=$( awk -F'=' '/^wpa_passphrase/ {print $2}' /etc/hostapd/hostapd.conf )
	hostapdip=$( awk -F',' '/router/ {print $2}' /etc/dnsmasq.conf )
	ap='
	  "ssid"       : "'${ssid//\"/\\\"}'"
	, "passphrase" : "'${passphrase//\"/\\\"}'"
	, "hostapdip"  : "'$hostapdip'"'
fi

readarray -t lines <<< $( /srv/http/bash/networks.sh ifconfig )
for line in "${lines[@]}"; do
	items=( $line )
	interface=${items[0]}
	inftype=${interface:0:4}
	[[ $inftype != eth0 && $inftype != wlan ]] && continue
	
	items1=${items[1]}
	items2=${items[2]}
	if [[ ${items1:2:1} != : ]]; then
		ip=$items1
		mac=$items2
	else
		ip=
		mac=$items1
	fi
	ipr=$( ip r | grep "^default.*$interface" )
	dhcp=$( [[ $ipr == *"dhcp src $ip "* ]] && echo dhcp || echo static )
	gateway=$( cut -d' ' -f3 <<< $ipr )
	[[ -z $gateway ]] && gateway=$( ip r | grep ^default | head -n1 | cut -d' ' -f3 )
	if [[ $inftype == wlan && -n $ip && $ip != $hostapdip ]]; then
		ssid=$( iwgetid $interface -r )
		connected=$ssid
	else
		ssid=
	fi
	list+=',{"dhcp":"'$dhcp'","mac":"'$mac'","gateway":"'$gateway'","interface":"'$interface'","ip":"'$ip'","ssid":"'$ssid'"}'
done
[[ -n $list ]] && list=[${list:1}] || list=false

profile=$( netctl list | cut -c 3- )
[[ -n $connected ]] && profile=$( echo "$profile" | grep -v "^$connected$" )
profile=$( echo "$profile" | grep . | sed 's/.*/"&"/' | tr '\n' , | head -c -1 )
[[ -n $profile ]] && profile=[$profile] || profile=false

# bluetooth
if systemctl -q is-active bluetooth; then
	readarray -t lines <<< $( bluetoothctl paired-devices | cut -d' ' -f2,3- )
	if [[ -n $lines ]]; then
		for line in "${lines[@]}"; do
			devices+="
		${line#* }^${line/ *}"
		done
		readarray -t lines <<< "$( echo "$devices" | sort -f | grep . )"
		for line in "${lines[@]}"; do
			mac=${line#*^}
			name=${line/^*}
			connected=$( bluetoothctl info $mac | grep -q 'Connected: yes' && echo true || echo false )
			btlist+=',{"name":"'${name//\"/\\\"}'","connected":'$connected',"mac":"'$mac'"}'
		done
		btlist=[${btlist:1}]
	else
		btlist=false
	fi
else
	btlist=false
fi

data='
	  "bluetooth" : '$btlist'
	, "list"      : '$list'
	, "hostapd"   : {'$ap'}
	, "hostname"  : "'$( hostname )'"
	, "profile"   : '$profile'
	, "reboot"    : "'$( cat /srv/http/data/shm/reboot 2> /dev/null )'"
	, "wlan"      : '$( lsmod | grep -q ^brcmfmac && echo true || echo false )

echo {$data}
