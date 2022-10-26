#!/bin/bash

. /srv/http/bash/common.sh

# bluetooth
rfkill | grep -q bluetooth && systemctl -q is-active bluetooth && activebt=1
if [[ $activebt ]]; then
	readarray -t devices <<< $( bluetoothctl devices Paired | sort -k3 -fh  )
	if [[ $devices ]]; then
		for dev in "${devices[@]}"; do
			mac=$( cut -d' ' -f2 <<< $dev )
			info=$( bluetoothctl info $mac )
			listbt+=',{
  "mac"       : "'$mac'"
, "name"      : "'$( cut -d' ' -f3- <<< $dev )'"
, "connected" : '$( grep -q 'Connected: yes' <<< "$info" && echo true || echo false )'
, "type"      : "'$( awk '/UUID: Audio/ {print $3}' <<< "$info" )'"
}'
		done
		listbt="[ ${listbt:1} ]"
		grep -q '"type" : "Sink"' <<< "$listbt" && btreceiver=true || btreceiver=false
		grep -q '"connected" : true' <<< "$listbt" && connected=true || connected=false
		pushstream bluetooth '{"connected":'$connected',"btreceiver":'$btreceiver'}'
		
		[[ $1 == pushbt ]] && pushstream bluetooth "$listbt" && exit
	fi
else
	listbt=false
fi

ipeth=$( ifconfig eth0 2> /dev/null | awk '/inet.*broadcast/ {print $2}' )
if [[ $ipeth ]]; then
	ipr=$( ip r | grep ^default.*eth0 )
	static=$( [[ $ipr != *"dhcp src $ipeth "* ]] && echo true )
	gateway=$( cut -d' ' -f3 <<< $ipr )
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
if [[ -e $dirshm/wlan ]]; then
	wlandev=$( < $dirshm/wlan )
	ifconfig $wlandev up &> /dev/null # force up
	
	readarray -t profiles <<< $( ls -1p /etc/netctl | grep -v /$ )
	if [[ $profiles ]]; then
		for profile in "${profiles[@]}"; do
			! grep -q Interface=$wlandev "/etc/netctl/$profile" && continue
			
			if netctl is-active "$profile" &> /dev/null; then
				for i in {1..10}; do
					ipwlan=$( ifconfig $wlandev | awk '/inet.*broadcast/ {print $2}' )
					[[ $ipwlan ]] && break || sleep 1
				done
				gateway=$( ip r | grep "^default.*$wlandev" | cut -d' ' -f3 )
				dbm=$( awk '/'$wlandev'/ {print $4}' /proc/net/wireless | tr -d . )
				[[ ! $dbm ]] && dbm=0
				listwl=',{
	  "dbm"      : '$dbm'
	, "gateway"  : "'$gateway'"
	, "ip"       : "'$ipwlan'"
	, "ssid"     : "'${profile//\"/\\\"}'"
	}'
			else
				listwlnotconnected=',{
	  "ssid"     : "'${profile//\"/\\\"}'"
	}'
			fi
		done
	fi
	listwl+="$listwlnotconnected"
	[[ $listwl ]] && listwl="[ ${listwl:1} ]"
fi

# hostapd
if systemctl -q is-active hostapd; then
	ssid=$( awk -F'=' '/^ssid/ {print $2}' /etc/hostapd/hostapd.conf )
	passphrase=$( awk -F'=' '/^wpa_passphrase/ {print $2}' /etc/hostapd/hostapd.conf )
	ip=$( awk -F',' '/router/ {print $2}' /etc/dnsmasq.conf )
	ap='{
  "ssid"       : "'${ssid//\"/\\\"}'"
, "passphrase" : "'${passphrase//\"/\\\"}'"
, "ip"         : "'$ip'"
, "conf"       : '$( $dirsettings/features.sh hostapdget )'
}'
fi

data='
  "page"       : "networks"
, "activebt"   : '$activebt'
, "activeeth"  : '$( ip -br link | grep -q ^e && echo true )'
, "activewlan" : '$( rfkill -no type | grep -q wlan && echo true )'
, "camilladsp" : '$( exists $dirsystem/camilladsp )'
, "ipeth"      : "'$ipeth'"
, "ipwlan"     : "'$ipwlan'"
, "listbt"     : '$listbt'
, "listeth"    : '$listeth'
, "listwl"     : '$listwl'
, "hostapd"    : '$ap'
, "hostname"   : "'$( hostname )'"'

data2json "$data" $1
