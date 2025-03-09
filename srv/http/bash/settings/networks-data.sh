#!/bin/bash

. /srv/http/bash/common.sh

if rfkill | grep -q -m1 bluetooth && systemctl -q is-active bluetooth; then
	devicebt=true
	devices=$( bluetoothctl devices Paired | sort -k3 -fh  )
fi
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
	listbt='[ '${listbt:1}' ]'
fi

gateway=$( ip -j route | jq -r .[0].gateway )

wlandev=$( < $dirshm/wlan )
profiles=$( ls -p /etc/netctl | grep -v /$ )
current=$( iwgetid -r )
if [[ $profiles ]]; then
	while read profile; do
		ssid=$( quoteEscape $profile )
		! grep -q 'Interface="*'$wlandev "/etc/netctl/$profile" && continue
		if [[ $current == $profile ]]; then
			ip=$( ifconfig $wlandev | awk '/inet .* netmask/ {print $2}' )
			dbm=$( awk '/'$wlandev'/ {print $4}' /proc/net/wireless | tr -d . )
			if [[ ! $dbm || $dbm -gt -60 ]]; then
				icon=wifi
			elif (( $dbm < -67 )); then
				icon=wifi1
			else
				icon=wifi2
			fi
			listwl=',{
"gateway" : "'$gateway'"
, "icon"    : "'$icon'"
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
[[ $listwl ]] && listwl='[ '${listwl:1}' ]'

# lan
ip=$( ifconfig | grep -A1 ^e | awk '/inet .* netmask/ {print $2}' )
if [[ $ip ]]; then
	listeth='{
  "ADDRESS" : "'$ip'"
, "GATEWAY" : "'$gateway'"
, "DHCP"    : '$( ip -j route | jq -c .[] | grep -q 'dev":"e.*dhcp' && echo true )'
}'
fi

[[ -e $dirsystem/ap ]] && apconf=$( getContent $dirsystem/ap.conf )
ip=$( ipAddress )
[[ $ip ]] && hostname=$( avahi-resolve -a4 $ip | awk '{print $NF}' )
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
, "hostname"    : "'$hostname'"
, "ip"          : "'$ip'"
, "listbt"      : '$listbt'
, "listeth"     : '$listeth'
, "listwl"      : '$listwl

data2json "$data" $1
