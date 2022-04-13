#!/bin/bash

if [[ $1 == add ]]; then
	wlandev=$( ip -br link \
					| grep ^w \
					| grep -v wlan \
					| cut -d' ' -f1 )
else
	wlandev=wlan0
	if ! modprobe brcmfmac &> /dev/null; then
		echo wlan0 > $dirshm/wlan
		pushstreamNotify 'USB Wi-Fi' Removed wifi
		pushRefresh
		exit
		
	fi
fi
echo $wlandev > $dirshm/wlan
iw $wlandev set power_save off &> /dev/null

# profiles
readarray -t profiles <<< $( ls -1p /etc/netctl | grep -v /$ )
if [[ $profile ]]; then
	for name in "${profiles[@]}"; do
		file="/etc/netctl/$name"
		! grep -q "Interface=$wlandev" $file && sed -i "s/^\(Interface=\).*/\1$wlandev/" "$file"
	done
fi
# hostapd
file=/etc/hostapd/hostapd.conf
! grep -q "interface=$wlandev" $file && sed -i -e "s/^\(interface=\).*/\1$wlandev/" $file

readarray -t ssids <<< $( netctl list | sed 's/^* \|^+ //' )
if [[ $ssids ]]; then
	for ssid in "${ssids[@]}"; do
		netctl is-enabled "$ssid" && activessid=$ssid && break
	done
fi

if [[ $activessid ]]; then
	pushstreamNotify 'USB Wi-Fi' "Reconnect to $activessid ..." wifi
	netctl restart "$activessid"
elif systemctl -q is-enabled hostapd; then
	pushstreamNotify 'USB Wi-Fi' 'Restart Access Point ...' wifi
	systemctl restart hostapd
else
	if [[ $wlandev == wlan0 ]]; then
		rmmod brcmfmac
		status=Removed
	else
		status=Ready
	fi
	pushstreamNotify 'USB Wi-Fi' $status wifi
fi
pushRefresh
