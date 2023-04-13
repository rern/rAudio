#!/bin/bash

. /srv/http/bash/common.sh

listBluetooth() {
	local devices dev mac info listbt 
	readarray -t devices <<< $( bluetoothctl devices Paired | sort -k3 -fh  )
	if [[ $devices ]]; then
		for dev in "${devices[@]}"; do
			mac=$( cut -d' ' -f2 <<< $dev )
			info=$( bluetoothctl info $mac )
			listbt+=',{
  "mac"       : "'$mac'"
, "name"      : "'$( cut -d' ' -f3- <<< $dev )'"
, "connected" : '$( grep -q -m1 'Connected: yes' <<< $info && echo true || echo false )'
, "type"      : "'$( awk '/UUID: Audio/ {print $3}' <<< $info | tr -d '\n' )'"
}'
		done
		echo [ ${listbt:1} ]
	fi
}
if [[ $1 == pushbt ]]; then
	listbt=$( listBluetooth )
	if [[ $listbt ]]; then
		grep -q -m1 '"type" : "Sink"' <<< $listbt && btreceiver=true || btreceiver=false
		grep -q -m1 '"connected" : true' <<< $listbt && connected=true || connected=false
		pushstream bluetooth '{"connected":'$connected',"btreceiver":'$btreceiver'}'
	else
		listbt=false
	fi
	pushstream bluetooth "$listbt"
	exit
fi

wldev=$( < $dirshm/wlan )
listWlan() {
	local profiles profile dbm listwlnotconnected
	readarray -t profiles <<< $( ls -1p /etc/netctl | grep -v /$ )
	if [[ $profiles ]]; then
		for profile in "${profiles[@]}"; do
			! grep -q 'Interface="*'$wldev "/etc/netctl/$profile" && continue
			if netctl is-active "$profile" &> /dev/null; then
				for i in {1..10}; do
					ipwl=$( ifconfig $wldev | awk '/inet.*broadcast/ {print $2}' )
					[[ $ipwl ]] && break || sleep 1
				done
				gatewaywl=$( ip r | grep "^default.*$wldev" | cut -d' ' -f3 )
				dbm=$( awk '/'$wldev'/ {print $4}' /proc/net/wireless | tr -d . )
				[[ ! $dbm ]] && dbm=0
				listwl=',{
	  "dbm"      : '$dbm'
	, "gateway"  : "'$gatewaywl'"
	, "ip"       : "'$ipwl'"
	, "ssid"     : "'$( stringEscape $profile )'"
	}'
			else
				listwlnotconnected+=',{
	  "ssid"     : "'$( stringEscape $profile )'"
	}'
			fi
		done
	fi
	[[ $listwlnotconnected ]] && listwl+="$listwlnotconnected"
	[[ $listwl ]] && listwl='[ '${listwl:1}' ]' || listwl=false
}
if [[ $1 == pushwl ]]; then
	pushwl=1
	listWlan
	pushstream wlan '{ "listwl": '$listwl', "ipwl": "'$ipwl'", "gatewaywl": "'$gatewaywl'" }'
	exit
fi

# bluetooth
rfkill | grep -q -m1 bluetooth && systemctl -q is-active bluetooth && activebt=1
[[ $activebt ]] && listbt=$( listBluetooth )

# wlan
[[ -e $dirshm/wlan ]] && listWlan

# lan
ifconfiglan=$( ifconfig | grep -A1 ^e )
if [[ $ifconfiglan ]]; then
	lan=$( head -1 <<< $ifconfiglan | cut -d: -f1 )
	[[ $lan ]] && ipeth=$( tail -1 <<< $ifconfiglan | awk '{print $2}' )
fi
if [[ $ipeth ]]; then
	ipr=$( ip r | grep ^default.*$lan )
	static=$( [[ $ipr != *"dhcp src $ipeth "* ]] && echo true )
	gateway=$( cut -d' ' -f3 <<< $ipr )
#	dns=$( sed -n '/^nameserver/ {s/.* //;p}' /etc/resolv.conf )
#	subnet=$( ifconfig $lan | awk '/netmask/ {print $4}' )
	[[ ! $gateway ]] && gateway=$( ip r | awk '/^default/ {print $3;exit}' )
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
[[ ! $gateway ]] && gateway=$gatewaywl

# hostapd
if systemctl -q is-active hostapd; then
	hostapd='{
  "ssid"       : "'$( hostname )'"
, "ip"         : "'$( grep router /etc/dnsmasq.conf | cut -d, -f2 )'"
, "passphrase" : "'$( getVar wpa_passphrase /etc/hostapd/hostapd.conf )'"
}'
fi

data='
  "page"        : "networks"
, "activebt"    : '$activebt'
, "activeeth"   : '$( ip -br link | grep -q -m1 ^e && echo true )'
, "activewl"    : '$( rfkill | grep -q -m1 wlan && echo true )'
, "camilladsp"  : '$( exists $dirsystem/camilladsp )'
, "connectedwl" : '$( netctl list | grep -q -m1 '^\*' && echo true )'
, "gateway"     : "'$gateway'"
, "ipeth"       : "'$ipeth'"
, "ipsub"       : "'$( ipSub )'"
, "ipwl"        : "'$ipwl'"
, "listbt"      : '$listbt'
, "listeth"     : '$listeth'
, "listwl"      : '$listwl'
, "hostapd"     : '$hostapd'
, "hostname"    : "'$( hostname )'"
, "wldev"       : "'$wldev'"'

data2json "$data" $1
