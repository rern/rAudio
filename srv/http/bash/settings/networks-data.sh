#!/bin/bash

. /srv/http/bash/common.sh

gatewayAddress() {
	ip r | grep -m1 "^default .* $1" | tail -1 | cut -d' ' -f3
}
listBluetooth() {
	local dev devices info listbt mac
	devices=$( bluetoothctl devices Paired | sort -k3 -fh  )
	if [[ $devices ]]; then
		while read dev; do
			mac=$( cut -d' ' -f2 <<< $dev )
			info=$( bluetoothctl info $mac )
			listbt+=',{
  "mac"       : "'$mac'"
, "name"      : "'$( cut -d' ' -f3- <<< $dev )'"
, "connected" : '$( grep -q -m1 'Connected: yes' <<< $info && echo true || echo false )'
, "type"      : "'$( awk '/UUID: Audio/ {print $3}' <<< $info | tr -d '\n' )'"
}'
		done <<< $devices
		echo [ ${listbt:1} ]
	fi
}
if [[ $1 == pushbt ]]; then
	listbt=$( listBluetooth )
	if [[ $listbt ]]; then
		grep -q -m1 '"type" : "Sink"' <<< $listbt && btreceiver=true || btreceiver=false
		grep -q -m1 '"connected" : true' <<< $listbt && connected=true || connected=false
		pushData bluetooth '{ "connected": '$connected', "btreceiver": '$btreceiver' }'
	else
		listbt=false
	fi
	pushData bluetooth "$listbt"
	exit
fi

listWlan() {
	local dbm notconnected profiles profile ssid wlandev
	wlandev=$( < $dirshm/wlan )
	profiles=$( ls -1p /etc/netctl | grep -v /$ )
	if [[ $profiles ]]; then
		while read profile; do
			ssid=$( quoteEscape $profile )
			! grep -q 'Interface="*'$wlandev "/etc/netctl/$profile" && continue
			if [[ $( iwgetid -r ) == $profile ]]; then
				for i in {1..10}; do
					ip=$( ipAddress $wlandev )
					[[ $ip ]] && break || sleep 1
				done
				gateway=$( gatewayAddress $wlandev )
				[[ ! $dbm ]] && dbm=0
				listwl=',{
  "dbm"     : '$( awk '/'$wlandev'/ {print $4}' /proc/net/wireless | sed 's/\.$//' )'
, "gateway" : "'$gateway'"
, "ip"      : "'$ip'"
, "ssid"    : "'$ssid'"
}'
			else
				notconnected+=',{
  "ssid"    : "'$ssid'"
}'
			fi
		done <<< $profiles
	fi
	[[ $notconnected ]] && listwl+="$notconnected"
	[[ $listwl ]] && listwl='[ '${listwl:1}' ]' || listwl=false
}
if [[ $1 == pushwl ]]; then
	listWlan
	pushData wlan '{ "listwl": '$listwl', "ip": "'$ip'", "gateway": "'$gateway'" }'
	exit
fi

# bluetooth
rfkill | grep -q -m1 bluetooth && systemctl -q is-active bluetooth && devicebt=true
[[ $devicebt ]] && listbt=$( listBluetooth )

# wlan
[[ -e $dirshm/wlan ]] && listWlan

# lan
ip=$( ipAddress e )
if [[ $ip ]]; then
	gateway=$( gatewayAddress e )
	listeth='{
  "ADDRESS" : "'$ip'"
, "GATEWAY" : "'$gateway'"
, "DHCP"    : '$( [[ ${ipr[6]} == dhcp ]] && echo true )'
}'
fi

[[ -e $dirsystem/ap ]] && apconf=$( getContent $dirsystem/ap.conf )
ip=$( ipAddress )

##########
data='
, "devicebt"    : '$devicebt'
, "deviceeth"   : '$( ifconfig | grep -q ^e && echo true )'
, "devicewl"    : '$( rfkill | grep -q -m1 wlan && echo true )'
, "ap"          : '$( exists $dirsystem/ap )'
, "apconf"      : '$apconf'
, "apstartup"   : '$( exists $dirshm/apstartup )'
, "camilladsp"  : '$( exists $dirsystem/camilladsp )'
, "connectedwl" : '$( [[ $( iwgetid -r ) ]] && echo true )'
, "gateway"     : "'$gateway'"
, "hostname"    : "'$( avahi-resolve -a4 $ip | awk '{print $NF}' )'"
, "ip"          : "'$ip'"
, "listbt"      : '$listbt'
, "listeth"     : '$listeth'
, "listwl"      : '$listwl

data2json "$data" $1
