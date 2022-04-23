#!/bin/bash

. /srv/http/bash/common.sh

# bluetooth
listBluetooth() {
	if systemctl -q is-active bluetooth; then
		readarray -t lines <<< $( bluetoothctl paired-devices \
									| cut -d' ' -f2,3- \
									| awk NF \
									| sort -k2 -fh )
		if [[ $lines ]]; then
			for line in "${lines[@]}"; do
				mac=${line/ *}
				[[ $mac == Device ]] && continue
				
				info=$( bluetoothctl info $mac )
				name=$( echo "$info" | grep '^\s*Alias:' | sed 's/^\s*Alias: //' )
				connected=$( echo "$info" | grep -q 'Connected: yes' && echo true || echo false )
				sink=$( echo "$info" | grep -q 'UUID: Audio Sink' && echo true || echo false )
				listbt+=',{
	  "name"      : "'${name//\"/\\\"}'"
	, "mac"       : "'$mac'"
	, "sink"      : '$sink'
	, "connected" : '$connected'
	}'
			done
			listbt="[ ${listbt:1} ]"
		fi
	fi
}

if [[ $1 ]]; then
	case $1 in
		list )
			listBluetooth
			echo $listbt
			;;
		btclient ) # receiver from mpd-conf.sh
			listBluetooth
			pushstream bluetooth "$listbt"
			;;
		1 ) # sender: 1 = connect - from bluezdbus.py
			[[ -e $dirshm/btsender ]] && exit
			
			for i in {1..5}; do
				btsender=$( bluetoothctl info 2> /dev/null | grep '^\s*Alias: ' | sed 's/.*Alias: //' )
				[[ ! $btsender ]] && sleep 1 || break
			done
			if [[ $btsender ]]; then
				echo $btsender > $dirshm/btsender
				pushstreamNotify "$btsender" Ready bluetooth
				listBluetooth
				pushstream bluetooth "$listbt"
			fi
			;;
		* ) # sender: 0 = disconnect - from bluezdbus.py
			[[ ! -e $dirshm/btsender ]] && exit
			
			btsender=$( cat $dirshm/btsender )
			rm -f $dirshm/btsender
			pushstreamNotify "$btsender" Disconnected bluetooth
			for i in {1..5}; do
				bluetoothctl info &> /dev/null && sleep 1 || break
			done
			listBluetooth
			pushstream bluetooth "$listbt"
			sleep 3
			rm -f $dirshm/{bluetoothdest,btsender}
			;;
	esac
	exit
fi

listBluetooth

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

wlandev=$( cat $dirshm/wlan )
ifconfig $wlandev up &> /dev/null # force up

readarray -t profiles <<< $( netctl list | sed 's/^. //' )
if [[ $profiles ]]; then
	for profile in "${profiles[@]}"; do
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
, "activebt"   : '$( systemctl -q is-active bluetooth && echo true )'
, "activeeth"  : '$( ifconfig eth0 &> /dev/null && echo true )'
, "activewlan" : '$( ip -br link | grep -q ^w && echo true )'
, "ipeth"      : "'$ipeth'"
, "ipwlan"     : "'$ipwlan'"
, "listbt"     : '$listbt'
, "listeth"    : '$listeth'
, "listwl"     : '$listwl'
, "hostapd"    : '$ap'
, "hostname"   : "'$( hostname )'"'

data2json "$data"
