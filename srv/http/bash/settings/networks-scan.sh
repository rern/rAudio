#!/bin/bash

. /srv/http/bash/common.sh

killProcess networksscan
echo $$ > $dirshm/pidnetworksscan

if [[ $1 == wlan ]]; then
	wlandev=$( < $dirshm/wlan )
	ip link set $wlandev up

	# ESSID:"NAME"
	# Encryption key:on
	# Quality=37/70  Signal level=-73 dBm || Quality=0/100  Signal level=25/100
	# IE: IEEE 802.11i/WPA2 Version 1
	# IE: WPA Version 1
	scan=$( iwlist $wlandev scan )
	[[ ! $scan ]] && exit
# --------------------------------------------------------------------
	scan=$( sed -E 's/^\s*|\s*$//g' <<< $scan \
				| sed -E -n '/^ESSID|^Encryption|^IE.*WPA|^Quality/ {
						s/\\x00//g
						s/^Quality.*level.(.*) dBm/,{,"signal":\1/
						s/^Encryption key:(.*)/,"encrypt":"\1"/
						s/^ESSID:/,"ssid":/
						s/^IE.*WPA.*/,"wpa":true/
						p
					}' \
				| tr -d '\n' \
				| sed 's/{,/{/g; s/,{/\n&/g' \
				| grep -E -v '^$|"ssid":""' \
				| sed 's/"signal":,/"signal":-67,/; s/wpa.*wpa/wpa/; s/$/}/' )
	
	# saved profile
	profiles=$( ls -p /etc/netctl | grep -v /$ )
	current=$( iwgetid -r )
	if [[ $profiles ]]; then
		while read profile; do
			[[ $current == $profile ]] && saved+=',"current":true' || saved=',"profile":true'
			scan=$( sed '/ssid.*'$profile'/ s/}$/'$saved'}/' <<< $scan  )
		done <<< $profiles
	fi
	echo "[ ${scan:1} ]" # ,{...} > [ {...} ]
	exit
# --------------------------------------------------------------------
fi
bluetoothctl --timeout=10 scan on &> /dev/null
devices=$( bluetoothctl devices \
			| grep -v ' ..-..-..-..-..-..$' \
			| sort -k3 -fh )
[[ ! $devices ]] && exit
# --------------------------------------------------------------------
connected=$( bluetoothctl devices Connected )
paired=$( bluetoothctl devices Paired )
while read dev; do
	mac=$( cut -d' ' -f2 <<< $dev )
	data+=',{
  "mac"     : "'$mac'"
, "name"    : "'$( cut -d' ' -f3- <<< $dev )'"
, "current" : '$( grep -q -m1 $mac <<< $connected && echo true || echo false )'
, "paired"  : '$( grep -q -m1 $mac <<< $paired && echo true || echo false )'
}'
done <<< $devices

echo "[ ${data:1} ]"
