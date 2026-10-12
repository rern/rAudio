#!/bin/bash

. /srv/http/bash/common.sh

if rfkill | grep -q -m1 bluetooth && systemctl -q is-active bluetooth; then
	devicebt=true
	bluetoothctl show | grep -q 'Discoverable: yes' && discoverable=true
	devices=$( bluetoothctl devices Trusted | sort -k3 -fh  )
fi
if [[ $devices ]]; then
	while read dev; do
		MAC=$( cut -d' ' -f2 <<< $dev ) # MAC - fixed var name
		listbluetooth+=',{
  "mac"       : "'$MAC'"
, "name"      : "'$( bluetoothProperty Alias )'"
, "connected" : '$( bluetoothProperty Connected )'
, "type"      : "'$( bluetoothSinkSource )'"
}'
	done <<< $devices
	listbluetooth='[ '${listbluetooth:1}' ]'
fi

gateway=$( ip -j route | jq -r .[0].gateway )

wlandev=$( netDevice w )
profiles=$( ls -p /etc/netctl | grep -v /$ )
current=$( iwgetid -r )
if [[ $profiles ]]; then
	while read profile; do
		ssid=$( quoteEscape $profile )
		! grep -q 'Interface="*'$wlandev "/etc/netctl/$profile" && continue
		if [[ $current == $profile ]]; then
			ip=$( ipAddress w )
			dbm=$( awk '/'$wlandev'/ {print $4}' /proc/net/wireless | tr -d . )
			if [[ ! $dbm || $dbm -gt -60 ]]; then
				icon=wifi
			elif (( $dbm < -67 )); then
				icon=wifi1
			else
				icon=wifi2
			fi
			listwlan=',{
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
[[ $notconnected ]] && listwlan+="$notconnected"
[[ $listwlan ]] && listwlan='[ '${listwlan:1}' ]'

# lan
ip=$( ipAddress e )
if [[ $ip ]]; then
	listlan='{
  "ADDRESS" : "'$ip'"
, "GATEWAY" : "'$gateway'"
, "DHCP"    : '$( ip -j route | jq -c .[] | grep -q 'dev":"e.*dhcp' && echo true )'
}'
fi

[[ -e $dirsystem/ap ]] && apconf=$( getContent $dirsystem/ap.conf )
ip=$( ipAddress )
##########
data='
, "device"    : {
	  "bluetooth" : '$devicebt'
	, "lan"       : '$( [[ $( netDevice e ) ]] && echo true )'
	, "wlan"      : '$( rfkill | grep -q -m1 wlan && echo true )'
}
, "ap"           : '$( exists $dirsystem/ap )'
, "apconf"       : '$apconf'
, "apstartup"    : '$( exists $dirshm/apstartup )'
, "discoverable" : '$discoverable'
, "gateway"      : "'$gateway'"
, "hostname"     : "'$( hostname )'.local"
, "ip"           : "'$ip'"
, "list"         : {
	  "bluetooth" : '$listbluetooth'
	, "lan"       : '$listlan'
	, "wlan"      : '$listwlan'
}'
data2json "$data" $1
