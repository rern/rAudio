#!/bin/bash

dirsystem=/srv/http/data/system

data+='
  "page"            : "features"
, "autoplay"        : '$( [[ -e $dirsystem/autoplay ]] && echo true || echo false )'
, "autoplaycd"      : '$( [[ -e $dirsystem/autoplaycd ]] && echo true || echo false )'
, "hostname"        : "'$( hostname )'"
, "lcd"             : '$( grep -q 'waveshare\|tft35a' /boot/config.txt 2> /dev/null && echo true || echo false )'
, "login"           : '$( [[ -e $dirsystem/login ]] && echo true || echo false )'
, "mpdscribble"     : '$( systemctl -q is-active mpdscribble@mpd && echo true || echo false )'
, "mpdscribbleval"  : "'$( grep '^username\|^password' /etc/mpdscribble.conf | cut -d' ' -f3- | tr '\n' ^ )'"
, "reboot"          : "'$( cat /srv/http/data/shm/reboot 2> /dev/null | sed 's/"/\\"/g' )'"
, "streaming"       : '$( grep -q 'type.*"httpd"' /etc/mpd.conf && echo true || echo false )
# hostapd
if [[ -e /usr/bin/hostapd ]]; then
	data+='
, "hostapd"         : '$( systemctl -q is-active hostapd && echo true || echo false )'
, "hostapdip"       : "'$( awk -F',' '/router/ {print $2}' /etc/dnsmasq.conf )'"
, "hostapdpwd"      : "'$( awk -F'=' '/^#*wpa_passphrase/ {print $2}' /etc/hostapd/hostapd.conf | sed 's/"/\\"/g' )'"
, "ssid"            : "'$( awk -F'=' '/^ssid/ {print $2}' /etc/hostapd/hostapd.conf | sed 's/"/\\"/g' )'"
, "wlanconnect"     : '$( ip r | grep -q "^default.*wlan0" && echo true || echo false )
fi
# renderer
[[ -e /usr/bin/shairport-sync ]] && data+='
, "shairport-sync"  : '$( systemctl -q is-active shairport-sync && echo true || echo false )
[[ -e /usr/bin/snapserver ]] && data+='
, "snapserver"      : '$( systemctl -q is-active snapserver && echo true || echo false )'
, "snapclient"      : '$( [[ -e $dirsystem/snapclient ]] && echo true || echo false )'
, "snaplatency"     : '$( grep OPTS= /etc/default/snapclient | sed 's/.*latency=\(.*\)"/\1/' 2> /dev/null || echo false )
[[ -e /usr/bin/spotifyd ]] && data+='
, "spotifyd"        : '$( systemctl -q is-active spotifyd && echo true || echo false )
[[ -e /usr/bin/upmpdcli ]] && data+='
, "upmpdcli"        : '$( systemctl -q is-active upmpdcli && echo true || echo false )
# features
xinitrc=/etc/X11/xinit/xinitrc
if [[ -e $xinitrc ]]; then
	if [[ -e $dirsystem/localbrowserval ]]; then
		conf=$( cat $dirsystem/localbrowserval )
	else
		conf=( NORMAL 0 false 1 )
	fi
	data+='
, "localbrowser"    : '$( systemctl -q is-active localbrowser && echo true || echo false )'
, "localscreenoff"  : '$(( $( grep screenoff <<< "$conf" | cut -d= -f2 ) / 60 ))'
, "localzoom"       : '$( grep zoom <<< "$conf" | cut -d= -f2 )'
, "localrotate"     : "'$( grep rotate <<< "$conf" | cut -d= -f2 )'"
, "localcursor"     : '$( grep cursor <<< "$conf" | cut -d= -f2 )
fi
[[ -e /usr/bin/smbd ]] && data+='
, "smb"             : '$( systemctl -q is-active smb && echo true || echo false )'
, "smbwritesd"      : '$( grep -A1 /mnt/MPD/SD /etc/samba/smb.conf | grep -q 'read only = no' && echo true || echo false )'
, "smbwriteusb"     : '$( grep -A1 /mnt/MPD/USB /etc/samba/smb.conf | grep -q 'read only = no' && echo true || echo false )
	
echo {$data}
