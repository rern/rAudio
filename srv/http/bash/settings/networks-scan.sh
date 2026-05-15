#!/bin/bash

. /srv/http/bash/common.sh

killProcess networksscan
echo $$ > $dirshm/pidnetworksscan

if [[ $1 == wlan ]]; then
	wlandev=$( netDevice w )
	ip link set $wlandev up
	scan=$( iwlist $wlandev scan )
	[[ ! $scan ]] && exit
# --------------------------------------------------------------------
# Cell N - Address: 9E:A3:A9:B0:66:99
#	ESSID:"NAME"
#	Encryption key:on
#	Quality=37/70  Signal level=-73 dBm (might be - Quality=0/100  Signal level=25/100)
#	IE: IEEE 802.11i/WPA2 Version 1
#	IE: WPA Version 1
	scan=$( echo "$scan" \
		| awk '
			/Cell / {
				signal = -67; encrypt = "off"; ssid = ""; wpa = "false"
			}
			/Signal level=/ {
				match( $0, /level=([-0-9]+)/, arr )
				signal = arr[1]
			}
			/Encryption key:on/ {
				encrypt = "on"
			}
			/ESSID:/ {
				split( $0, a, "\"" )
				ssid = a[2]
			}
			/IE: .*WPA/ {
				wpa = "true"
				if ( ssid != "" ) printf ", { \"signal\": %d, \"encrypt\": \"%s\", \"ssid\": \"%s\", \"wpa\": %s }\n", signal, encrypt, ssid, wpa
			}
		' )
	echo '{
  "scan"     : [ '${scan:1}' ]
, "current"  : "'$( iwgetid -r )'"
, "profiles" : '$( line2array "$( ls -p /etc/netctl | grep -v /$ )" )'
}'
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
