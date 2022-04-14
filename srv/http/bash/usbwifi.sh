#!/bin/bash

pushstream() {
	curl -s -X POST http://127.0.0.1/pub?id=$1 -d "$2"
}
pushRefresh() {
	sleep 2
	data=$( /srv/http/bash/networks-data.sh )
	pushstream refresh "$data"
}
pushstreamWiFi() {
	pushstream notify '{"title":"USB Wi-Fi","text":"'$1'","icon":"wifi"}'
}

readarray -t profiles <<< $( netctl list | sed 's/^* \|^+ //' )
if [[ $profiles ]]; then
	for profile in "${profiles[@]}"; do
		netctl is-enabled "$profile" && activessid=$profile && break
	done
fi
systemctl -q is-enabled hostapd && activehostapd=1

if [[ $1 == add ]]; then
	wlandev=$( ip -br link \
					| grep ^w \
					| grep -v wlan \
					| cut -d' ' -f1 )
else
	wlandev=wlan0
	if [[ $activessid || $activehostapd ]]; then
		if ! modprobe brcmfmac &> /dev/null; then
			echo wlan0 > /dev/shm/wlan
			pushstreamWiFi Removed
			pushRefresh
			exit
			
		fi
	fi
fi
echo $wlandev > /dev/shm/wlan
iw $wlandev set power_save off &> /dev/null

if [[ $profiles ]]; then
	for name in "${profiles[@]}"; do
		file="/etc/netctl/$name"
		! grep -q "Interface=$wlandev" $file && sed -i "s/^\(Interface=\).*/\1$wlandev/" "$file"
	done
fi
file=/etc/hostapd/hostapd.conf
! grep -q "interface=$wlandev" $file && sed -i -e "s/^\(interface=\).*/\1$wlandev/" $file

if [[ $activessid ]]; then
	pushstreamWiFi "Reconnect to $activessid ..."
	netctl stop "$ssid" &> /dev/null
	ifconfig $wlandev down
	netctl start "$ssid"
elif [[ $activehostapd ]]; then
	pushstreamWiFi 'Restart Access Point ...'
	systemctl restart hostapd
else
	[[ $wlandev == wlan0 ]] && state=Removed || state=Ready
	pushstreamWiFi $state
fi
pushRefresh
