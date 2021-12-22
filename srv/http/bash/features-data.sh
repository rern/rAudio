#!/bin/bash

. /srv/http/bash/common.sh
spotifyredirect=https://rern.github.io/raudio/spotify

dirscrobble=$dirsystem/scrobble.conf
for key in airplay bluetooth spotify upnp notify; do
	scrobbleconf+=$( [[ -e $dirscrobble/$key ]] && echo true, || echo false, )
done
scrobbleconf+='"'$( cat $dirscrobble/user 2> /dev/null )'", ""'

data+='
  "page"             : "features"
, "autoplay"         : '$( ls $dirsystem/autoplay* &> /dev/null && echo true )'
, "autoplayconf"     : [ '$( exists $dirsystem/autoplaybt )', '$( exists $dirsystem/autoplaycd )', '$( exists $dirsystem/autoplay )' ]
, "hostname"         : "'$( hostname )'"
, "lcd"              : '$( grep -q 'waveshare\|tft35a' /boot/config.txt 2> /dev/null && echo true )'
, "login"            : '$( exists $dirsystem/login )'
, "lyricsembedded"   : '$( [[ -e $dirsystem/lyricsembedded ]] && echo true )'
, "scrobble"         : '$( [[ -e $dirsystem/scrobble ]] && echo true )'
, "scrobbleconf"     : ['$scrobbleconf']
, "scrobblekey"      : '$( [[ -e $dirsystem/scrobble.conf/key ]] && echo true )'
, "stoptimer"        : '$( [[ -e $dirshm/stoptimer ]] && echo true )'
, "stoptimerconf"    : '$( cat $dirshm/stoptimer 2> /dev/null || echo [ false, false ] )'
, "streaming"        : '$( grep -q 'type.*"httpd"' /etc/mpd.conf && echo true )
# hostapd
if [[ -e /usr/bin/hostapd ]]; then
	data+='
, "hostapd"          : '$( systemctl -q is-active hostapd && echo true )'
, "hostapdconf"      : '$( $dirbash/features.sh hostapdget )'
, "ssid"             : "'$( awk -F'=' '/^ssid/ {print $2}' /etc/hostapd/hostapd.conf | sed 's/"/\\"/g' )'"
, "wlanconnected"    : '$( ip r | grep -q "^default.*wlan0" && echo true )
fi
# renderer
[[ -e /usr/bin/shairport-sync ]] && data+='
, "shairport-sync"   : '$( systemctl -q is-active shairport-sync && echo true )'
, "shairportactive"  : '$( [[ $( cat $dirshm/player ) == airplay ]] && echo true )
[[ -e /usr/bin/snapserver ]] && data+='
, "snapserver"       : '$( systemctl -q is-active snapserver && echo true )'
, "snapserveractive" : '$( [[ -e $dirshm/clientip ]] && echo true )'
, "snapclient"       : '$( exists $dirsystem/snapclient )'
, "snapclientactive" : '$( systemctl -q is-active snapclient && echo true )'
, "snapcastconf"     : '$( grep OPTS= /etc/default/snapclient | sed 's/.*latency=\(.*\)"/\1/' 2> /dev/null )
if [[ -e /usr/bin/spotifyd ]]; then
	data+='
, "spotifyd"         : '$( systemctl -q is-active spotifyd && echo true )'
, "spotifydactive"   : '$( [[ $( cat $dirshm/player ) == spotify ]] && echo true )'
, "spotifyredirect"  : "'$spotifyredirect'"
, "spotifytoken"     : '$( grep -q refreshtoken $dirsystem/spotify 2> /dev/null && echo true )
fi
[[ -e /usr/bin/upmpdcli ]] && data+='
, "upmpdcli"         : '$( systemctl -q is-active upmpdcli && echo true )'
, "upmpdcliactive"   : '$( [[ $( cat $dirshm/player ) == upnp ]] && echo true )'
, "upmpdcliownqueue" : '$( grep -q 'ownqueue = 1' /etc/upmpdcli.conf && echo true )
if [[ -e /etc/X11/xinit/xinitrc ]]; then
	brightnessfile=/sys/class/backlight/rpi_backlight/brightness
	[[ -e $brightnessfile ]] && brightness=$( cat $brightnessfile )
	if [[ -e $dirsystem/localbrowser.conf ]]; then
		conf=$( grep . $dirsystem/localbrowser.conf \
				| sed 's/^/,"/; s/=/":/' \
				| sed 's/\(.*rotate.*:\)\(.*\)/\1"\2"/' )
		conf+=', "brightness" : '$brightness
		localbrowserconf="{${conf:1}}"
	else
		localbrowserconf='{ "rotate": "NORMAL", "zoom": 100, "screenoff": 0, "playon": false, "cursor": false, "brightness": '$brightness' }'
	fi
	data+='
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

data2json "$data"
