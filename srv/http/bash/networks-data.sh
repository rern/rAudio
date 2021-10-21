#!/bin/bash

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
			listbt+=',{
  "name"      : "'${name//\"/\\\"}'"
, "connected" : '$connected'
, "mac"       : "'$mac'"
}'
		done
		listbt="[ ${listbt:1} ]"
	fi
fi
[[ $1 == bt ]] && echo $listbt && exit

ipeth=$( ifconfig eth0 2> /dev/null | awk '/^\s*inet / {print $2}' )
if [[ -n $ipeth ]]; then
	ipr=$( ip r | grep ^default.*eth0 )
	static=$( [[ $ipr != *"dhcp src $ipeth "* ]] && echo true )
	gateway=$( echo $ipr | cut -d' ' -f3 )
	[[ -z $gateway ]] && gateway=$( ip r | grep ^default | head -1 | cut -d' ' -f3 )
	if [[ -n $ipeth ]]; then
		hostname=$( avahi-resolve -a4 $ipeth | awk '{print $NF}' )
		if [[ -z $hostname ]]; then
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
if [[ -n $ipr ]]; then
	gateway=$( echo $ipr | cut -d' ' -f3 )
	ipwlan=$( ifconfig wlan0 | awk '/^\s*inet / {print $2}' )
	ssid=$( iwgetid wlan0 -r )
	dbm=$( awk '/wlan0/ {print $4}' /proc/net/wireless | tr -d . )
	[[ -z $dbm ]] && dbm=0
	listwl=',{
  "dbm"      : '$dbm'
, "gateway"  : "'$gateway'"
, "ip"       : "'$ipwlan'"
, "ssid"     : "'$ssid'"
}'
fi

readarray -t notconnected <<< $( netctl list | grep -v '^\s*\*' | sed 's/^\s*//' )
if [[ -n $notconnected ]]; then
	for ssid in "${notconnected[@]}"; do
		if [[ $static == true ]]; then
			gateway=$( echo "$netctl" | grep ^Gateway | cut -d= -f2 )
			ip=$( echo "$netctl" | grep ^Address | cut -d= -f2 | cut -d/ -f1 )
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
[[ -n $listwl ]] && listwl="[ ${listwl:1} ]"

# hostapd
if systemctl -q is-active hostapd; then
	ssid=$( awk -F'=' '/^ssid/ {print $2}' /etc/hostapd/hostapd.conf )
	passphrase=$( awk -F'=' '/^wpa_passphrase/ {print $2}' /etc/hostapd/hostapd.conf )
	ip=$( awk -F',' '/router/ {print $2}' /etc/dnsmasq.conf )
	ap='{
  "ssid"       : "'${ssid//\"/\\\"}'"
, "passphrase" : "'${passphrase//\"/\\\"}'"
, "ip"         : "'$ip'"
, "conf"       : '$( /srv/http/bash/features.sh hostapdget )'
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

echo {$data} \
	| sed  's/:\s*,/: false,/g
			s/:\s*}/: false }/g
			s/\[\s*,/[ false,/g
			s/,\s*,/, false,/g
			s/,\s*]/, false ]/g' # sed - null > false
