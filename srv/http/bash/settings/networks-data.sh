#!/bin/bash

. /srv/http/bash/common.sh

listBluetooth() {
	local dev devices info listbt mac
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
		pushData bluetooth '{ "connected": '$connected', "btreceiver": '$btreceiver' }'
	else
		listbt=false
	fi
	pushData bluetooth "$listbt"
	exit
fi

wlandev=$( < $dirshm/wlan )
listWlan() {
	local connected dbm ipr notconnected profiles profile ssid
	readarray -t profiles <<< $( ls -1 /var/lib/iwd/*.* 2> /dev/null | sed -E 's|.*/||; s/.psk|.open//' )
	if [[ $profiles ]]; then
		for ssid in "${profiles[@]}"; do
			[[ $( iwgetid -r $wlandev ) == $ssid ]] && connected=1 || connected=
			ssid=$( stringEscape $ssid )
			if [[ $connected ]]; then
				for i in {1..10}; do
					ipr=$( ip r |  grep -m1 $wlandev )
					[[ $ipr ]] && break || sleep 1
				done
				ipwl=$( cut -d' ' -f9 <<< $ipr )
				gatewaywl=$( cut -d' ' -f3 <<< $ipr )
				dbm=$( awk '/'$wlandev'/ {print $4}' /proc/net/wireless | tr -d . )
				[[ ! $dbm ]] && dbm=0
				listwl=',{
  "dbm"     : '$dbm'
, "gateway" : "'$gatewaywl'"
, "ip"      : "'$ipwl'"
, "ssid"    : "'$ssid'"
}'
			else
				notconnected+=',{
  "ssid"    : "'$ssid'"
}'
			fi
		done
	fi
	[[ $notconnected ]] && listwl+="$notconnected"
	[[ $listwl ]] && listwl='[ '${listwl:1}' ]' || listwl=false
}
if [[ $1 == pushwl ]]; then
	listWlan
	pushData wlan '{ "listwl": '$listwl', "ipwl": "'$ipwl'", "gatewaywl": "'$gatewaywl'" }'
	exit
fi

# bluetooth
rfkill | grep -q -m1 bluetooth && systemctl -q is-active bluetooth && activebt=true
[[ $activebt ]] && listbt=$( listBluetooth )

# wlan
[[ -e $dirshm/wlan ]] && listWlan

# lan
lan=$( ip -br link | awk '/^e/ {print $1; exit}' )
[[ $lan ]] && ipr=$( ip r | grep ^default.*$lan )
if [[ $ipr ]]; then
	ipeth=$( cut -d' ' -f9 <<< $ipr )
	static=$( [[ $ipr != *"dhcp src "* ]] && echo true )
	gateway=$( cut -d' ' -f3 <<< $ipr )
	listeth='{
  "gateway"  : "'$gateway'"
, "ip"       : "'$ipeth'"
, "static"   : '$static'
}'
fi
[[ ! $gateway ]] && gateway=$gatewaywl

[[ -e $dirsystem/ap ]] && apconf=$( getContent $dirsystem/ap.conf )
##########
data='
, "activebt"    : '$activebt'
, "activeeth"   : '$( ip -br link | grep -q -m1 ^e && echo true )'
, "activewl"    : '$( rfkill | grep -q -m1 wlan && echo true )'
, "ap"          : '$( exists $dirsystem/ap )'
, "apconf"      : '$apconf'
, "camilladsp"  : '$( exists $dirsystem/camilladsp )'
, "connectedwl" : '$( [[ $( iwgetid -r $wlandev ) ]] && echo true )'
, "gateway"     : "'$gateway'"
, "hostname"    : "'$( getContent $dirshm/avahihostname )'"
, "ipeth"       : "'$ipeth'"
, "ipsub"       : "'$( ipAddress sub )'"
, "ipwl"        : "'$ipwl'"
, "listbt"      : '$listbt'
, "listeth"     : '$listeth'
, "listwl"      : '$listwl

data2json "$data" $1
