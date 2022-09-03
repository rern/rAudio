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
				| egrep '^Cell|^ESSID|^Encryption|^IE.*WPA|^Quality' \
				| sed -E 's/^Cell.*/},{/
						  s/^ESSID:/,"ssid":/
						  s/\\x00//g
						  s/^Encryption key:(.*)/,"encrypt":"\1"/
						  s/^IE.*WPA.*/,"wpa":true/
						  s/^Quality.*level.(.*)/,"signal":"\1"/' \
				| tr -d '\n' \
				| sed 's/{,/{/g; s/,{/\n&/g' \
				| sed -e '1 d' \
					  -e '$ s/$/}/' \
					  -e '/"ssid":""/ d' \
					  -e 's/wpa.*wpa/wpa/' \
				| sort )
	
	# omit saved profile
	readarray -t profiles <<< $( ls -1p /etc/netctl | grep -v /$ )
	for profile in "${profiles[@]}"; do
		scan=$( grep -v "ssid.*$profile" <<< "$scan"  )
	done
	
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
