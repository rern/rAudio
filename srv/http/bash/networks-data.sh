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

ipeth=$( ifconfig eth0 2> /dev/null | awk '/^\s*inet / {print $2}' )
if [[ -n $ipeth ]]; then
	ipr=$( ip r | grep ^default.*eth0 )
	dhcp=$( [[ $ipr == *"dhcp src $ipeth "* ]] && echo dhcp || echo static )
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
  "dhcp"     : "'$dhcp'"
, "gateway"  : "'$gateway'"
, "hostname" : "'$hostname'"
, "interface": "'$interface'"
, "ip"       : "'$ipeth'"
}'
fi

ifconfig wlan0 up &> /dev/null # force up
ipr=$( ip r | grep "^default.*wlan0" )
if [[ -n $ipr ]]; then
	gateway=$( echo $ipr | cut -d' ' -f3 )
	ipwlan=$( ifconfig wlan0 | awk '/^\s*inet / {print $2}' )
	dhcp=$( [[ $ipr == *"dhcp src $ipwlan "* ]] && echo dhcp || echo static )
	[[ -n $ipwlan ]] && hostname=$( avahi-resolve -a4 $ipwlan | awk '{print $NF}' )
	ssid=$( iwgetid wlan0 -r )
	netctl=$( cat "/etc/netctl/$ssid" )
	security=$( echo "$netctl" | grep ^Security | cut -d= -f2 )
	password=$( echo "$netctl" | grep ^Key | cut -d= -f2- | tr -d '"' )
	hidden=$( echo "$netctl" | grep -q ^Hidden && echo true || echo false )
	dbm=$( awk '/wlan0/ {print $4}' /proc/net/wireless | tr -d . )
	[[ -z $dbm ]] && dbm=0
	listwlan='{
  "dbm"      : '$dbm'
, "dhcp"     : "'$dhcp'"
, "gateway"  : "'$gateway'"
, "hidden"   : '$hidden'
, "hostname" : "'$hostname'"
, "ip"       : "'$ipwlan'"
, "password" : "'$password'"
, "security" : "'$security'"
, "ssid"     : "'$ssid'"
}'
fi

readarray -t notconnected <<< $( netctl list | grep -v '^\s*\*' | sed 's/^\s*//' )
if [[ -n $notconnected ]]; then
	for ssid in "${notconnected[@]}"; do
		netctl=$( cat "/etc/netctl/$ssid" )
		dhcp=$( echo "$netctl" | grep ^IP | cut -d= -f2 )
		hidden=$( echo "$netctl" | grep -q ^Hidden && echo true || echo false )
		password=$( echo "$netctl" | grep ^Key | cut -d= -f2- | tr -d '"' )
		security=$( echo "$netctl" | grep ^Security | cut -d= -f2 )
		if [[ $dhcp == static ]]; then
			gateway=$( echo "$netctl" | grep ^Gateway | cut -d= -f2 )
			ip=$( echo "$netctl" | grep ^Address | cut -d= -f2 | cut -d/ -f1 )
		else
			gateway=
			ip=
		fi
		
		listwlannc+=',{
  "dhcp"     : "'$dhcp'"
, "gateway"  : "'$gateway'"
, "hidden"   : '$hidden'
, "ip"       : "'$ip'"
, "password" : "'$password'"
, "security" : "'$security'"
, "ssid"     : "'$ssid'"
}'
	done
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
			listbt+=',{
  "name"      : "'${name//\"/\\\"}'"
, "connected" : '$connected'
, "mac"       : "'$mac'"
}'
		done
	fi
fi

data='
  "page"       : "networks"
, "activebt"   : '$( systemctl -q is-active bluetooth && echo true || echo false )'
, "activeeth"  : '$( ifconfig eth0 &> /dev/null && echo true || echo false )'
, "activewlan" : '$( rfkill | grep -q wlan && echo true || echo false )'
, "listbt"     : '$( [[ -n $listbt ]] && echo [ ${listbt:1} ] || echo false )'
, "listeth"    : '$( [[ -n $listeth ]] && echo $listeth || echo false )'
, "listwlannc" : '$( [[ -n $listwlannc ]] && echo [ ${listwlannc:1} ] || echo false )'
, "listwlan"   : '$( [[ -n $listwlan ]] && echo $listwlan || echo false )'
, "hostapd"    : '$( [[ -n $ap ]] && echo {$ap} || echo false )'
, "hostname"   : "'$( hostname )'"
, "reboot"     : "'$( /srv/http/bash/cmd.sh rebootlist )'"'

echo {$data}
