#!/bin/bash

. /srv/http/bash/common.sh

killProcess networksscan
echo $$ > $dirshm/pidnetworksscan

if [[ $1 == wlan ]]; then
	wlandev=$( < $dirshm/wlan )
	ip link set $wlandev up
	scan=$( iwlist $wlandev scan )
	[[ ! $scan ]] && exit
	# ESSID:"NAME"
	# Encryption key:on
	# Quality=N/70  Signal level=-N dBm
	scan=$( sed -E 's/^\s*|\s*$|\\x00//g' <<< $scan \
				| sed -E -n '/^Cell|^ESSID|^Encryption|^Quality/ {
						s/^Cell.*/,{/
						s/^Quality.*level.(.*)/,"signal":"\1"/
						s/^Encryption key:(.*)/,"encrypt":"\1"/
						s/^ESSID:/,"ssid":/
					p}' \
				| tr -d '\n' \
				| sed 's/{,/{/g; s/,{/\n&/g' \
				| grep -E -v '^$|"ssid":""' \
				| sed 's/$/}/' \
				| sort )
	# omit saved profile
	readarray -t profiles <<< $( ls -1p /var/lib/iwd | grep -v /$ | sed -E 's/.psk$|.open$//' )
	if [[ $profiles ]]; then
		for profile in "${profiles[@]}"; do
			scan=$( grep -v "ssid.*$profile" <<< $scan  )
		done
	fi
	echo "[ ${scan:1} ]" # ,{...} > [ {...} ]
	exit
fi

bluetoothctl --timeout=10 scan on &> /dev/null
devices=$( bluetoothctl devices \
			| grep -v ' ..-..-..-..-..-..$' \
			| sort -k3 -fh )
[[ ! $devices ]] && exit

# omit paired devices
readarray -t paired <<< $( bluetoothctl devices Paired )
if [[ $paired ]]; then
	for dev in "${paired[@]}"; do
		devices=$( grep -v "$dev" <<< $devices  )
	done
fi
readarray -t devices <<< $devices
for dev in "${devices[@]}"; do
	data+=',{
  "mac"  : "'$( cut -d' ' -f2 <<< $dev )'"
, "name" : "'$( cut -d' ' -f3- <<< $dev )'"
}'
done

echo "[ ${data:1} ]"
