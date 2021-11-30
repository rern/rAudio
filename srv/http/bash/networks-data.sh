#!/bin/bash

. /srv/http/bash/common.sh

# bluetooth
if systemctl -q is-active bluetooth; then
	readarray -t lines <<< $( bluetoothctl paired-devices \
								| cut -d' ' -f2,3- \
								| grep . \
								| sort -k2 -fh )
	if [[ $lines ]]; then
		for line in "${lines[@]}"; do
			mac=${line/ *}
			name=${line#* }
			info=$( bluetoothctl info $mac )
			connected=$( echo "$info" | grep -q 'Connected: yes' && echo true || echo false )
			sink=$( echo "$info" | grep -q 'UUID: Audio Sink' && echo true || echo false )
			listbt+=',{
  "connected" : '$connected'
, "mac"       : "'$mac'"
, "name"      : "'${name//\"/\\\"}'"
, "sink"      : '$sink'
}'
		done
		listbt="[ ${listbt:1} ]"
	fi
fi
[[ $1 == bt ]] && curl -s -X POST http://127.0.0.1/pub?id=bluetooth -d "$listbt" && exit

ipeth=$( ifconfig eth0 2> /dev/null | awk '/^\s*inet / {print $2}' )
if [[ $ipeth ]]; then
	ipr=$( ip r | grep ^default.*eth0 )
	static=$( [[ $ipr != *"dhcp src $ipeth "* ]] && echo true )
	gateway=$( echo $ipr | cut -d' ' -f3 )
	[[ ! $gateway ]] && gateway=$( ip r \
									| grep ^default \
									| head -1 \
									| cut -d' ' -f3 )
	if [[ $ipeth ]]; then
		hostname=$( avahi-resolve -a4 $ipeth | awk '{print $NF}' )
		if [[ ! $hostname ]]; then
			systemctl restart avahi-daemon
			hostname=$( avahi-resolve -a4 $ipeth | awk '{print $NF}' )
		fi
	fi
	listeth='{
  "gateway"  : "'$gateway'"
, "hostname" : "'$hostname'"
, "ip"       : "'$ipeth'"
, "static"   : '$static'
}'
fi

ifconfig wlan0 up &> /dev/null # force up
ipr=$( ip r | grep "^default.*wlan0" )
if [[ $ipr ]]; then
	gateway=$( echo $ipr | cut -d' ' -f3 )
	ipwlan=$( ifconfig wlan0 | awk '/^\s*inet / {print $2}' )
	ssid=$( iwgetid wlan0 -r )
	dbm=$( awk '/wlan0/ {print $4}' /proc/net/wireless | tr -d . )
	[[ ! $dbm ]] && dbm=0
	listwl=',{
  "dbm"      : '$dbm'
, "gateway"  : "'$gateway'"
, "ip"       : "'$ipwlan'"
, "ssid"     : "'$ssid'"
}'
fi

readarray -t notconnected <<< $( netctl list | grep -v '^\s*\*' | sed 's/^\s*//' )
if [[ $notconnected ]]; then
	for ssid in "${notconnected[@]}"; do
		if [[ $static == true ]]; then
			gateway=$( echo "$netctl" \
						| grep ^Gateway \
						| cut -d= -f2 )
			ip=$( echo "$netctl" \
					| grep ^Address \
					| cut -d= -f2 \
					| cut -d/ -f1 )
		else
			gateway=
			ip=
		fi
		listwl+=',{
  "gateway"  : "'$gateway'"
, "ip"       : "'$ip'"
, "ssid"     : "'$ssid'"
}'
	done
fi
[[ $listwl ]] && listwl="[ ${listwl:1} ]"

# hostapd
if systemctl -q is-active hostapd; then
	ssid=$( awk -F'=' '/^ssid/ {print $2}' /etc/hostapd/hostapd.conf )
	passphrase=$( awk -F'=' '/^wpa_passphrase/ {print $2}' /etc/hostapd/hostapd.conf )
	ip=$( awk -F',' '/router/ {print $2}' /etc/dnsmasq.conf )
	ap='{
  "ssid"       : "'${ssid//\"/\\\"}'"
, "passphrase" : "'${passphrase//\"/\\\"}'"
, "ip"         : "'$ip'"
, "conf"       : '$( $dirbash/features.sh hostapdget )'
}'
fi

data='
  "page"       : "networks"
, "activebt"   : '$( systemctl -q is-active bluetooth && echo true )'
, "activeeth"  : '$( ifconfig eth0 &> /dev/null && echo true )'
, "activewlan" : '$( rfkill | grep -q wlan && echo true )'
, "listbt"     : '$listbt'
, "listeth"    : '$listeth'
, "listwl"     : '$listwl'
, "hostapd"    : '$ap'
, "hostname"   : "'$( hostname )'"'

data2json "$data"
