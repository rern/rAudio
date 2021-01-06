#!/bin/bash

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
	[[ -z $gateway ]] && gateway=$( ip r | grep ^default | head -1 | cut -d' ' -f3 )
	if [[ $inftype == wlan && -n $ip && $ip != $hostapdip ]]; then
		ssid=$( iwgetid wlan0 -r )
		wpa=$( grep ^Security "/etc/netctl/$ssid" | cut -d= -f2 )
		password=$( grep ^Key "/etc/netctl/$ssid" | cut -d= -f2- | tr -d '"' )
		dbm=$( iwconfig wlan0 | grep Signal | sed 's/.*level=\(.*\) dBm/\1/' )
	else
		ssid=
		dbm=0
	fi
	hostname=$( avahi-resolve -a4 $ip | awk '{print $NF}' )
	list+=',{
		  "dhcp"     : "'$dhcp'"
		, "gateway"  : "'$gateway'"
		, "hostname" : "'$hostname'"
		, "interface": "'$interface'"
		, "ip"       : "'$ip'"
		, "mac"      : "'$mac'"
		, "ssid"     : "'$ssid'"
		, "dbm"      : '$dbm'
	}'
done
[[ -n $list ]] && list=[${list:1}] || list=false

profiles=$( netctl list )
if [[ -n $profiles ]]; then
	ssid=$( iwgetid -r )
	profiles=$( echo "$profiles" \
					| cut -c3- \
					| sed "/^$ssid$/ d" \
					| sed 's/.*/"&"/' \
					| tr '\n' , \
					| head -c -1 )
	profiles=[$profiles]
else
	profiles=false
fi

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
	, "profiles"   : '$profiles'
	, "reboot"    : "'$( cat /srv/http/data/shm/reboot 2> /dev/null )'"
	, "wlan"      : '$( lsmod | grep -q ^brcmfmac && echo true || echo false )

echo {$data}
