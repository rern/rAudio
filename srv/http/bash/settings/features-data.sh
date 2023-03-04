#!/bin/bash

# shareddata:
#    [[ -L $dirshareddata ]]       = server rAudio
#    [[ -L $dirmpd ]]              = clients
#    grep -q -m1 ":$dirsd" /etc/fstab  = clients with server rAudio
#    [[ -e $filesharedip ]]        = server + clients

. /srv/http/bash/common.sh

spotifyredirect=https://rern.github.io/raudio/spotify
scrobbleconf=$( sed 's/^.*=/,/' $dirsystem/scrobble.conf 2> /dev/null )

packageActive hostapd rtsp-simple-server shairport-sync smb snapclient spotifyd upmpdcli

data+='
  "page"             : "features"
, "autoplay"         : '$( ls $dirsystem/autoplay* &> /dev/null && echo true )'
, "autoplayconf"     : [ '$( exists $dirsystem/autoplaybt )', '$( exists $dirsystem/autoplaycd )', '$( exists $dirsystem/autoplay )' ]
, "camilladsp"       : '$( exists $dirsystem/camilladsp )'
, "camillarefresh"   : '$( grep 'status_update_interval' /srv/http/settings/camillagui/config/gui-config.yml | cut -d' ' -f2 )'
, "equalizer"        : '$( exists $dirsystem/equalizer )'
, "hostname"         : "'$( hostname )'"
, "httpd"            : '$( exists $dirmpdconf/httpd.conf )'
, "latest"           : '$( exists $dirsystem/latest )'
, "lcd"              : '$( grep -E -q 'waveshare|tft35a' /boot/config.txt 2> /dev/null && echo true )'
, "login"            : '$( exists $dirsystem/login )'
, "lyricsembedded"   : '$( exists $dirsystem/lyricsembedded )'
, "multiraudio"      : '$( exists $dirsystem/multiraudio )'
, "multiraudioconf"  : [ '$( sed 's/^/"/; s/$/", /' $dirsystem/multiraudio.conf 2> /dev/null | sed '$ s/,//' )' ]
, "nfsconnected"     : '$( [[ $( ls /proc/fs/nfsd/clients 2> /dev/null ) ]] && echo true )'
, "nfsserver"        : '$( [[ -L $dirshareddata ]] && systemctl -q is-active nfs-server && echo true )'
, "nosound"          : '$( exists $dirshm/nosound )'
, "scrobble"         : '$( exists $dirsystem/scrobble )'
, "scrobbleconf"     : [ '${scrobbleconf:1}' ]
, "scrobblekey"      : '$( exists $dirsystem/scrobblekey )'
, "stoptimerconf"    : '$( getContent $dirshm/stoptimer )'
, "shareddata"       : '$( [[ -L $dirmpd ]] && echo true )'
, "state"            : "'$( grep -m1 state $dirshm/status | cut -d= -f2 | tr -d '"' )'"
, "stoptimer"        : '$( exists $dirshm/stoptimer )'
, "stoptimerconf"    : '$( getContent $dirshm/stoptimer )
[[ -e /usr/bin/hostapd ]] && data+='
, "hostapd"          : '$hostapd'
, "hostapdconf"      : '$( $dirsettings/features.sh hostapdget )'
, "wlan"             : '$( lsmod | grep -q -m1 brcmfmac && echo true )'
, "wlanconnected"    : '$( ip r | grep -q -m1 "^default.*wlan0" && echo true )
[[ -e /usr/bin/shairport-sync ]] && data+='
, "shairport-sync"   : '$shairportsync
[[ -e /usr/bin/snapserver ]] && data+='
, "snapclientactive" : '$snapclient'
, "snapserver"       : '$( exists $dirmpdconf/snapserver.conf )'
, "snapserveractive" : '$( [[ -e $dirshm/clientip ]] || ( [[ -e $dirsystem/snapclientserver ]] && systemctl -q is-active snapclient ) && echo true )'
, "snapclient"       : '$( exists $dirsystem/snapclient )'
, "snapcastconf"     : '$( grep -q -m1 latency /etc/default/snapclient && grep latency /etc/default/snapclient | tr -d -c 0-9 || echo 800 )
[[ -e /usr/bin/spotifyd ]] && data+='
, "spotifyd"         : '$spotifyd'
, "spotifyredirect"  : "'$spotifyredirect'"
, "spotifytoken"     : '$( grep -q -m1 refreshtoken $dirsystem/spotify 2> /dev/null && echo true )
[[ -e /usr/bin/upmpdcli ]] && data+='
, "upmpdcli"         : '$upmpdcli'
, "upmpdcliownqueue" : '$( grep -q -m1 'ownqueue = 1' /etc/upmpdcli.conf && echo true )
if [[ -e $dirsystem/localbrowser.conf ]]; then
	[[ ! -e /tmp/localbrowser.conf  ]] && cp $dirsystem/localbrowser.conf /tmp
	conf=$( sed -e '/=/ {s/^/,"/; s/=/":/}' -e 's/.*rotate.*:\(.*\)/"rotate":"\1"/; s/:yes/:true/; s/:no/:false/' $dirsystem/localbrowser.conf )
	brightnessfile=/sys/class/backlight/rpi_backlight/brightness
	[[ -e $brightnessfile ]] && brightness=$( < $brightnessfile ) || brightness=false
	localbrowserconf='{ '$conf', "brightness" : '$brightness' }'
	if systemctl -q is-active localbrowser; then
		localbrowser=true
	else
		systemctl -q is-enabled localbrowser && $dirsettings/features.sh localbrowser$'\n'false
	fi
	data+='
, "hdmi"             : '$( grep -q hdmi_force_hotplug=1 /boot/config.txt && echo true )'
, "localbrowser"     : '$localbrowser'
, "localbrowserconf" : '$localbrowserconf
fi
if [[ -e /usr/bin/smbd ]]; then
	grep -A1 $dirsd /etc/samba/smb.conf | grep -q -m1 'read only = no' && writesd=true || writesd=false
	grep -A1 $dirusb /etc/samba/smb.conf | grep -q -m1 'read only = no' && writeusb=true || writeusb=false
	smbconf="[ $writesd, $writeusb ]"
	data+='
, "smb"              : '$smb'
, "smbconf"          : '$smbconf
fi
if [[ -e /usr/bin/rtsp-simple-server ]]; then
	timeout 1 rtl_test -t &> /dev/null && dabdevice=true || systemctl disable --now rtsp-simple-server
	data+='
, "dabdevice"        : '$dabdevice'
, "dabradio"         : '$rtspsimpleserver
fi
data2json "$data" $1
