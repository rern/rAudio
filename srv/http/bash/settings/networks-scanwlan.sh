#!/bin/bash

. /srv/http/bash/common.sh

wlandev=$( cat $dirshm/wlan )
ip link set $wlandev up

# pre-scan hidden ssid to force responding to scan
readarray -t hiddenprofiles <<< $( grep -rl --exclude-dir=examples ^Hidden=yes /etc/netctl )
if [[ $hiddenprofiles ]]; then
	for file in "${hiddenprofiles[@]}"; do
		iwlist $wlandev scan essid "$( basename "$file" )" &> /dev/null
	done
fi

# ESSID:"NAME"
# Encryption key:on
# Quality=37/70  Signal level=-73 dBm --- Quality=0/100  Signal level=25/100
# IE: IEEE 802.11i/WPA2 Version 1
# IE: WPA Version 1
scan=$( iwlist $wlandev scan \
			| sed 's/^\s*\|\s*$//g' \
			| grep -E '^Cell|^ESSID|^Encryption|^IE.*WPA|^Quality' \
			| sed -e 's/^Cell.*/},{/
					  s/^ESSID:/,"ssid":/
					  s/\\x00//g
					  s/^Encryption key:\(.*\)/,"encrypt":"\1"/
					  s/^IE.*WPA.*/,"wpa":true/
					  s/^Quality.*level.\(.*\)/,"signal":"\1"/' \
			| sed '/},{/ {n;s/^,/ /}' )
# save profile
readarray -t ssids <<< $( grep '"ssid":' <<< "$scan" \
			| sed 's/^.*:"\(.*\)"/\1/' \
			| grep . )
for ssid in "${ssids[@]}"; do
	[[ -e "/etc/netctl/$ssid" ]] && scan=$( sed '/"ssid":"'$ssid'"/ a\,"profile":true' <<< "$scan" )
done
# connected ssid
connectedssid=$( iwgetid $wlandev -r )
scan=$( sed '/"ssid":"'$connectedssid'"/ a\,"connected":true' <<< "$scan" )

# },{... > [ {...} ]
echo "[ ${scan:2} } ]" | jq
