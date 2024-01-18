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

wldev=$( < $dirshm/wlan )
listWlan() {
	local dbm listwl notconnected profiles profile
	readarray -t profiles <<< $( ls -1p /etc/netctl | grep -v /$ )
	if [[ $profiles ]]; then
		for profile in "${profiles[@]}"; do
			ssid=$( stringEscape $profile )
			! grep -q 'Interface="*'$wldev "/etc/netctl/$profile" && continue
			if netctl is-active "$profile" &> /dev/null; then
				for i in {1..10}; do
					IPWL=$( ifconfig $wldev | awk '/inet.*broadcast/ {print $2}' )
					[[ $IPWL ]] && break || sleep 1
				done
				gatewaywl=$( ip r | grep "^default.*$wldev" | cut -d' ' -f3 )
				dbm=$( awk '/'$wldev'/ {print $4}' /proc/net/wireless | tr -d . )
				[[ ! $dbm ]] && dbm=0
				listwl=',{
	  "dbm"     : '$dbm'
	, "gateway" : "'$gatewaywl'"
	, "ip"      : "'$IPWL'"
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
	[[ $listwl ]] && LISTWL='[ '${listwl:1}' ]' || LISTWL=false
}
if [[ $1 == pushwl ]]; then
	pushwl=1
	listWlan
	pushData wlan '{ "listwl": '$LISTWL', "ipwl": "'$IPWL'", "gatewaywl": "'$gatewaywl'" }'
	exit
fi

# bluetooth
rfkill | grep -q -m1 bluetooth && systemctl -q is-active bluetooth && activebt=true
[[ $activebt ]] && listbt=$( listBluetooth )

# wlan
[[ -e $dirshm/wlan ]] && listWlan

# lan
ifconfiglan=$( ifconfig | grep -A1 ^e )
[[ $ifconfiglan ]] && ipeth=$( grep inet <<< $ifconfiglan | awk '{print $2}' )
if [[ $ipeth ]]; then
	landev=$( grep ^e <<< $ifconfiglan | cut -d: -f1 )
	ipr=$( ip r | grep ^default.*$landev )
	static=$( [[ $ipr != *"dhcp src $ipeth "* ]] && echo true )
	gateway=$( cut -d' ' -f3 <<< $ipr )
	[[ ! $gateway ]] && gateway=$( ip r | awk '/^default/ {print $3;exit}' )
	listeth='{
  "gateway"  : "'$gateway'"
, "ip"       : "'$ipeth'"
, "static"   : '$static'
}'
fi
[[ ! $gateway ]] && gateway=$gatewaywl

# iwd
if systemctl -q is-active iwd && iwctl ap list | grep -q "$( < $dirshm/wlan ).*yes"; then
	fileap=/var/lib/iwd/ap/$( hostname ).ap
	iwd='{
  "ip"         : "'$( getVar Address $fileap )'"
, "passphrase" : "'$( getVar Passphrase $fileap )'"
}'
fi
##########
data='
, "activebt"    : '$activebt'
, "activeeth"   : '$( ip -br link | grep -q -m1 ^e && echo true )'
, "activewl"    : '$( rfkill | grep -q -m1 wlan && echo true )'
, "camilladsp"  : '$( exists $dirsystem/camilladsp )'
, "connectedwl" : '$( netctl list | grep -q -m1 '^\*' && echo true )'
, "gateway"     : "'$gateway'"
, "ipeth"       : "'$ipeth'"
, "ipsub"       : "'$( ipSub )'"
, "ipwl"        : "'$IPWL'"
, "listbt"      : '$listbt'
, "listeth"     : '$listeth'
, "listwl"      : '$LISTWL'
, "iwd"         : '$iwd'
, "hostname"    : "'$( hostname )'"
, "wldev"       : "'$wldev'"'

data2json "$data" $1
