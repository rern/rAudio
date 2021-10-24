#!/bin/bash

dirsystem=/srv/http/data/system

exists() {
	[[ -e $1 ]] && echo true || echo false
}

readarray -t lines <<< $( grep '^username\|^password' /etc/mpdscribble.conf | cut -d' ' -f3- )
mpdscribbleconf="[ \"${lines[0]}\", \"${lines[1]}\" ]"

data+='
  "page"             : "features"
, "autoplay"         : '$( exists $dirsystem/autoplay )'
, "autoplaycd"       : '$( exists $dirsystem/autoplaycd )'
, "hostname"         : "'$( hostname )'"
, "lcd"              : '$( grep -q 'waveshare\|tft35a' /boot/config.txt 2> /dev/null && echo true )'
, "login"            : '$( exists $dirsystem/login )'
, "mpdscribble"      : '$( systemctl -q is-active mpdscribble@mpd && echo true )'
, "mpdscribbleconf"  : '$mpdscribbleconf'
, "streaming"        : '$( grep -q 'type.*"httpd"' /etc/mpd.conf && echo true )
# hostapd
if [[ -e /usr/bin/hostapd ]]; then
	data+='
, "hostapd"          : '$( systemctl -q is-active hostapd && echo true )'
, "hostapdconf"      : '$( /srv/http/bash/features.sh hostapdget )'
, "ssid"             : "'$( awk -F'=' '/^ssid/ {print $2}' /etc/hostapd/hostapd.conf | sed 's/"/\\"/g' )'"
, "wlanconnected"    : '$( ip r | grep -q "^default.*wlan0" && echo true )
fi
# renderer
[[ -e /usr/bin/shairport-sync ]] && data+='
, "shairport-sync"   : '$( systemctl -q is-active shairport-sync && echo true )
[[ -e /usr/bin/snapserver ]] && data+='
, "snapserver"       : '$( systemctl -q is-active snapserver && echo true )'
, "snapclient"       : '$( exists $dirsystem/snapclient )'
, "snapcastconf"     : '$( grep OPTS= /etc/default/snapclient | sed 's/.*latency=\(.*\)"/\1/' 2> /dev/null )
[[ -e /usr/bin/spotifyd ]] && data+='
, "spotifyd"         : '$( systemctl -q is-active spotifyd && echo true )
[[ -e /usr/bin/upmpdcli ]] && data+='
, "upmpdcli"         : '$( systemctl -q is-active upmpdcli && echo true )
# features
xinitrc=/etc/X11/xinit/xinitrc
if [[ -e $xinitrc ]]; then
	if [[ -e $dirsystem/localbrowser.conf ]]; then
		conf=$( grep . $dirsystem/localbrowser.conf \
				| sed 's/^/,"/; s/=/":/' \
				| sed 's/\(.*rotate.*:\)\(.*\)/\1"\2"/' )
		localbrowserconf="{${conf:1}}"
	else
		localbrowserconf='{ "rotate": "NORMAL", "zoom": 100, "screenoff": 0, "playon": false, "cursor": false }'
	fi
	data+='
, "browser"          : "'$( [[ -e /usr/bin/firefox ]] && echo firefox || echo chromium )'"
, "localbrowser"     : '$( systemctl -q is-active localbrowser && echo true )'
, "localbrowserconf" : '$localbrowserconf
fi
if [[ -e /usr/bin/smbd ]]; then
	grep -A1 /mnt/MPD/SD /etc/samba/smb.conf | grep -q 'read only = no' && writesd=true || writesd=false
	grep -A1 /mnt/MPD/USB /etc/samba/smb.conf | grep -q 'read only = no' && writeusb=true || writeusb=false
	smbconf="[ $writesd, $writeusb ]"
	data+='
, "smb"              : '$( systemctl -q is-active smb && echo true )'
, "smbconf"          : '$smbconf
fi

echo {$data} \
	| sed  's/:\s*,/: false,/g
			s/:\s*}/: false }/g
			s/\[\s*,/[ false,/g
			s/,\s*,/, false,/g
			s/,\s*]/, false ]/g' # sed - null > false
