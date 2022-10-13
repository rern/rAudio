#!/bin/bash

. /srv/http/bash/common.sh

if [[ $1 == wlan ]]; then
	wlandev=$( cat $dirshm/wlan )
	ip link set $wlandev up

	# ESSID:"NAME"
	# Encryption key:on
	# Quality=37/70  Signal level=-73 dBm --- Quality=0/100  Signal level=25/100
	# IE: IEEE 802.11i/WPA2 Version 1
	# IE: WPA Version 1
	scan=$( iwlist $wlandev scan )
	[[ ! $scan ]] && exit
	
	scan=$( echo "$scan" \
				| sed -E 's/^\s*|\s*$//g' \
				| grep -E '^Cell|^ESSID|^Encryption|^IE.*WPA|^Quality' \
				| sed -E 's/^Cell.*/,{/
						  s/^Quality.*level.(.*)/,"signal":"\1"/
						  s/^Encryption key:(.*)/,"encrypt":"\1"/
						  s/^ESSID:/,"ssid":/
						  s/^IE.*WPA.*/,"wpa":true/
						  s/\\x00//g' \
				| tr -d '\n' \
				| sed 's/{,/{/g; s/,{/\n&/g' \
				| sed -E -e '/^$|"ssid":""/ d' \
						 -e 's/wpa.*wpa/wpa/; s/$/}/' \
				| sort )
	
	# omit saved profile
	readarray -t profiles <<< $( ls -1p /etc/netctl | grep -v /$ )
	if [[ $profiles ]]; then
		for profile in "${profiles[@]}"; do
			scan=$( grep -v "ssid.*$profile" <<< "$scan"  )
		done
	fi
	echo "[ ${scan:1} ]" # ,{...} > [ {...} ]
	exit
fi

bluetoothctl --timeout=10 scan on &> /dev/null
devices=$( bluetoothctl devices | grep -v ' ..-..-..-..-..-..$' )
[[ ! $devices ]] && exit

# omit paired devices
paired=$( bluetoothctl devices Paired )
if [[ $paired ]]; then
	devices=$( echo "$devices
$paired" \
	| sort -k3 -fh \
	| uniq -u )
fi
readarray -t devices <<< "$devices"
for dev in "${devices[@]}"; do
	data+=',{
  "mac"  : "'$( echo $dev | cut -d' ' -f2 )'"
, "name" : "'$( echo $dev | cut -d' ' -f3- )'"
}'
done

echo "[ ${data:1} ]"
