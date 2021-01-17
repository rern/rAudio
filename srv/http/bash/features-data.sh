#!/bin/bash

dirsystem=/srv/http/data/system

data+='
	  "autoplay"        : '$( [[ -e $dirsystem/autoplay ]] && echo true || echo false )'
	, "hostname"        : "'$( hostname )'"
	, "lcd"             : '$( grep -q dtoverlay=tft35a /boot/config.txt && echo true || echo false )'
	, "login"           : '$( [[ -e $dirsystem/login ]] && echo true || echo false )'
	, "mpdscribble"     : '$( systemctl -q is-active mpdscribble@mpd && echo true || echo false )'
	, "mpdscribbleval"  : "'$( grep '^username\|^password' /etc/mpdscribble.conf | cut -d' ' -f3- | tr '\n' ^ )'"
	, "reboot"          : "'$( cat /srv/http/data/shm/reboot 2> /dev/null )'"
	, "snapserver"      : '$( systemctl -q is-active snapserver && echo true || echo false )'
	, "snapclient"      : '$( systemctl -q is-active snapclient && echo true || echo false )'
	, "snaplatency"     : '$( grep OPTS= /etc/default/snapclient | sed 's/.*latency=\(.*\)"/\1/' )'
	, "snappassword"    : "'$( cat $dirsystem/snapclientpw 2> /dev/null )'"
	, "streaming"       : '$( grep -q 'type.*"httpd"' /etc/mpd.conf && echo true || echo false )'
	, "wlan"            : '$( rfkill | grep -q wlan && echo true || echo false )
# hostapd
if [[ -e /usr/bin/hostapd ]]; then
	data+='
	, "hostapd"         : '$( systemctl -q is-active hostapd && echo true || echo false )'
	, "hostapdip"       : "'$( awk -F',' '/router/ {print $2}' /etc/dnsmasq.conf )'"
	, "hostapdpwd"      : "'$( awk -F'=' '/^wpa_passphrase/ {print $2}' /etc/hostapd/hostapd.conf | sed 's/"/\\"/g' )'"
	, "ssid"            : "'$( awk -F'=' '/^ssid/ {print $2}' /etc/hostapd/hostapd.conf | sed 's/"/\\"/g' )'"
	, "wlanconnect"     : '$( ifconfig wlan0 | grep -q inet && echo true || echo false )
fi
# renderer
[[ -e /usr/bin/shairport-sync ]] && data+='
	, "shairport-sync"  : '$( systemctl -q is-active shairport-sync && echo true || echo false )
[[ -e /usr/bin/spotifyd ]] && data+='
	, "spotifyd"        : '$( systemctl -q is-active spotifyd && echo true || echo false )
[[ -e /usr/bin/upmpdcli ]] && data+='
	, "upmpdcli"        : '$( systemctl -q is-active upmpdcli && echo true || echo false )
# features
[[ -e /usr/bin/smbd ]] && data+='
	, "smb"             : '$( systemctl -q is-active smb && echo true || echo false )'
	, "smbwritesd"      : '$( grep -A1 /mnt/MPD/SD /etc/samba/smb.conf | grep -q 'read only = no' && echo true || echo false )'
	, "smbwriteusb"     : '$( grep -A1 /mnt/MPD/USB /etc/samba/smb.conf | grep -q 'read only = no' && echo true || echo false )
[[ -e /usr/bin/aria2 ]] && data+='
	, "aria2"           : '$( systemctl -q is-active aria2 && echo true || echo false )
[[ -e /usr/bin/transmission-cli ]] && data+='
	, "transmission"    : '$( systemctl -q is-active transmission && echo true || echo false )
	
xinitrc=/etc/X11/xinit/xinitrc
if [[ -e $xinitrc ]]; then
	conf=( $( cat /etc/localbrowser.conf 2> /dev/null | cut -d= -f2 ) )
	[[ -z $conf ]] && conf=( NORMAL 0 false 1 )
	data+='
	, "localbrowser"    : '$( systemctl -q is-active localbrowser && echo true || echo false )'
	, "localcursor"     : '${conf[2]}'
	, "localrotate"     : "'${conf[0]}'"
	, "localscreenoff"  : '${conf[1]}'
	, "localzoom"       : '${conf[3]}
fi

echo {$data}
