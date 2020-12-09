#!/bin/bash

[[ -n $1 ]] && wlan=$1 || wlan=wlan0

ifconfig $wlan up

listProfile() {
	netctllist=$( netctl list | grep -v eth | sed 's/^\s*\**\s*//' )
	i=0
	if grep -q '^+' <<<"$netctllist"; then # leading '+' = connecting
		(( i++ ))
		(( i == 15 )) && echo -1 && exit
		
		sleep 2
		listProfile
	fi
}
listProfile

if [[ -n $netctllist ]]; then
	readarray -t netctllist_ar <<<"$netctllist"
	# pre-scan saved profile to force display hidden ssid
	for name in "${netctllist_ar[@]}"; do
		grep -q '^Hidden=yes' "/etc/netctl/$name" && iwlist $wlan scan essid "$name" &> /dev/null
	done
fi

connectedssid=$( iwgetid $wlan -r )

iwlistscan=$( iwlist $wlan scan \
				| grep '^\s*Qu\|^\s*En\|^\s*ES\|WPA \|WPA2' \
				| sed 's/^\s*//; s/Quality.*level\| dBm *\|En.*:\|ES.*://g; s/IE: .*\(WPA.*\) .* .*/\1/' \
				| sed 's/^"\|"$//g' \
				| tr '\n' '^' \
				| sed 's/=/\n/g' \
				| sort -V )
readarray -t lines <<<"${iwlistscan:1}" # remove leading \n
for line in "${lines[@]}"; do
	line=$( echo $line | tr '^' '\n' )
	readarray -t val <<< "$line"
	
	ssid=${val[2]}
	[[ -z $ssid ]] && continue
	
	dbm=${val[0]}
	encrypt=${val[1]}
	[[ -n ${val[3]} ]] && wpa=wpa || wpa=
	
	file="/etc/netctl/$ssid"
	if [[ -e "$file" ]]; then
		profile=1
		grep -q 'IP=dhcp' "$file" && dhcp=dhcp || dhcp=static
		password=$( grep '^Key' "$file" | tr -d '"' | cut -d'=' -f2 )
	else
		profile=
		dhcp=
		password=
	fi
	if [[ $ssid == $connectedssid ]]; then
		ip=$( ifconfig $wlan | awk '/inet / {print $2}' )
		[[ -n $ip ]] && connected=1
		gateway=$( ip r | grep "^default.*$wlan" | awk '{print $3}' )
		[[ -z $gateway ]] && gateway=$( ip r | grep ^default | head -n1 | cut -d' ' -f3 )
	else
		connected=
		gateway=
		ip=
	fi
	list+=',{"dbm":"'$dbm'","ssid":"'$ssid'","encrypt":"'$encrypt'","wpa":"'$wpa'","profile":"'$profile'","dhcp":"'$dhcp'","connected":"'$connected'","gateway":"'$gateway'","ip":"'$ip'","password":"'$password'"}'
done

echo [${list:1}] # 'remove leading ,
