#!/bin/bash

. /srv/http/bash/common.sh

# bluetooth
if systemctl -q is-active bluetooth; then
	readarray -t devices <<< $( bluetoothctl devices Paired | sort -k3 -fh  )
	if [[ $devices ]]; then
		for dev in "${devices[@]}"; do
			name=$( echo $dev | cut -d' ' -f3- )
			mac=$( echo $dev | cut -d' ' -f2 )
			readarray -t info <<< $( bluetoothctl info $mac \
										| egrep 'Connected: |UUID: Audio' \
										| sed -E 's/^\s*Connected: yes/true/
												  s/^\s*Connected: no/false/
												  s/\s*UUID: Audio (.*) .*/\1/' )
			listbt+=',{
  "name"      : "'$name'"
, "mac"       : "'$mac'"
, "connected" : '${info[0]}'
, "type"      : "'${info[1]}'"
}'
		done
		listbt="[ ${listbt:1} ]"
	else
		listbt=false
	fi
fi

echo "$listbt" | grep -q '"type" : "Sink"' && btreceiver=true || btreceiver=false
echo "$listbt" | grep -q '"connected" : true' && connected=true || connected=false
pushstream bluetooth '{"connected":'$connected',"btreceiver":'$btreceiver'}'

[[ $1 == pushbt ]] && pushstream bluetooth "$listbt" && exit 

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
if [[ -e $dirshm/wlan ]]; then
	wlandev=$( cat $dirshm/wlan )
	ifconfig $wlandev up &> /dev/null # force up
	
	readarray -t profiles <<< $( ls -1p /etc/netctl | grep -v /$ )
	if [[ $profiles ]]; then
		for profile in "${profiles[@]}"; do
			! grep -q Interface=$wlandev "/etc/netctl/$profile" && continue
			
			if netctl is-active "$profile" &> /dev/null; then
				for i in {1..10}; do
					ipwlan=$( ifconfig $wlandev | awk '/^\s*inet / {print $2}' )
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
, "conf"       : '$( $dirbash/settings/features.sh hostapdget )'
}'
fi

data='
  "page"       : "networks"
, "activebt"   : '$( isactive bluetooth )'
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
