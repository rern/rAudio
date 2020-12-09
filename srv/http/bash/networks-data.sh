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

lines=$( /srv/http/bash/networks.sh ifconfig )
readarray -t lines <<<"$lines"
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
	[[ $inftype == wlan && -n $ip && $ip != $hostapdip ]] && ssid=$( iwgetid $interface -r ) || ssid=
	data+='{"dhcp":"'$dhcp'","mac":"'$mac'","gateway":"'$gateway'","interface":"'$interface'","ip":"'$ip'","ssid":"'$ssid'"},'
done

extra='
	  "hostapd"  : {'$ap'}
	, "hostname" : "'$( hostname )'"
	, "reboot"   : "'$( cat /srv/http/data/shm/reboot 2> /dev/null )'"
	, "wlan"     : '$( lsmod | grep -q ^brcmfmac && echo true || echo false )
# bluetooth
if systemctl -q is-active bluetooth; then
	lines=$( bluetoothctl paired-devices )
	if [[ -n $lines ]]; then
		readarray -t devices <<< "$lines"
		for device in "${devices[@]}"; do
			mac=$( cut -d' ' -f2 <<< "$device" )
			name=$( cut -d' ' -f3- <<< "$device" )
			connected=$( bluetoothctl info $mac | grep -q 'Connected: yes' && echo true || echo false )
			btlist+=',{"name":"'${name//\"/\\\"}'","connected":'$connected',"mac":"'$mac'"}'
		done
		btlist=[${btlist:1}]
	else
		btlist=false
	fi
	extra+=',"bluetooth":'$btlist
fi
		
data+={${extra}}

echo [${data}]
