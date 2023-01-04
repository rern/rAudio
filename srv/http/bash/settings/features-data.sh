#!/bin/bash

# shareddata:
#    [[ -L $dirshareddata ]]       = server rAudio
#    [[ -L $dirmpd ]]              = clients
#    grep -q -m1 ":$dirsd" /etc/fstab  = clients with server rAudio
#    [[ -e $filesharedip ]]        = server + clients

. /srv/http/bash/common.sh

spotifyredirect=https://rern.github.io/raudio/spotify

dirscrobble=$dirsystem/scrobble.conf
for key in airplay bluetooth spotify upnp notify; do
	scrobbleconf+=$( [[ -e $dirscrobble/$key ]] && echo true, || echo false, )
done
scrobbleconf+='"'$( getContent $dirscrobble/user )'", ""'

data+='
  "page"             : "features"
, "autoplay"         : '$( ls $dirsystem/autoplay* &> /dev/null && echo true )'
, "autoplayconf"     : [ '$( exists $dirsystem/autoplaybt )', '$( exists $dirsystem/autoplaycd )', '$( exists $dirsystem/autoplay )' ]
, "bluetoothsink"    : '$( cut -d' ' -f2 $dirshm/btconnected 2> /dev/null | grep -q -m1 Sink && echo true )'
, "camilladsp"       : '$( exists $dirsystem/camilladsp )'
, "camillarefresh"   : '$( grep 'status_update_interval' /srv/http/settings/camillagui/config/gui-config.yml | cut -d' ' -f2 )'
, "equalizer"        : '$( exists $dirsystem/equalizer )'
, "hostname"         : "'$( hostname )'"
, "httpd"            : '$( exists $dirmpdconf/httpd.conf )'
, "latest"           : '$( exists $dirsystem/latest )'
, "lcd"              : '$( grep -E -q 'waveshare|tft35a' /boot/config.txt 2> /dev/null && echo true )'
, "login"            : '$( exists $dirsystem/login )'
, "lyricsembedded"   : '$( [[ -e $dirsystem/lyricsembedded ]] && echo true )'
, "multiraudio"      : '$( exists $dirsystem/multiraudio )'
, "multiraudioconf"  : [ '$( sed 's/^/"/; s/$/", /' $dirsystem/multiraudio.conf 2> /dev/null | sed '$ s/,//' )' ]
, "nfsconnected"     : '$( [[ $( ls /proc/fs/nfsd/clients 2> /dev/null ) ]] && echo true )'
, "nfsserver"        : '$( [[ -L $dirshareddata ]] && systemctl -q is-active nfs-server && echo true )'
, "nosound"          : '$( exists $dirshm/nosound )'
, "scrobble"         : '$( [[ -e $dirsystem/scrobble ]] && echo true )'
, "scrobbleconf"     : ['$scrobbleconf']
, "scrobblekey"      : '$( [[ -e $dirsystem/scrobble.conf/key ]] && echo true )'
, "shareddata"       : '$( [[ -L $dirmpd ]] && echo true )'
, "state"            : "'$( grep -m1 state $dirshm/status | cut -d= -f2 | tr -d '"' )'"
, "stoptimer"        : '$( [[ -e $dirshm/stoptimer ]] && echo true )'
, "stoptimerconf"    : '$( getContent $dirshm/stoptimer )
[[ -e /usr/bin/hostapd ]] && data+='
, "hostapd"          : '$( isactive hostapd )'
, "hostapdconf"      : '$( $dirsettings/features.sh hostapdget )'
, "wlan"             : '$( lsmod | grep -q -m1 brcmfmac && echo true )'
, "wlanconnected"    : '$( ip r | grep -q -m1 "^default.*wlan0" && echo true )
[[ -e /usr/bin/shairport-sync ]] && data+='
, "shairport-sync"   : '$( isactive shairport-sync )'
, "shairportactive"  : '$( [[ $( < $dirshm/player ) == airplay ]] && echo true )
[[ -e /usr/bin/snapserver ]] && data+='
, "snapserver"       : '$( exists $dirmpdconf/snapserver.conf )'
, "snapserveractive" : '$( [[ -e $dirshm/clientip ]] || ( [[ -e $dirsystem/snapclientserver ]] && systemctl -q is-active snapclient ) && echo true )'
, "snapclient"       : '$( exists $dirsystem/snapclient )'
, "snapclientactive" : '$( isactive snapclient )'
, "snapcastconf"     : '$( grep -q -m1 latency /etc/default/snapclient && grep latency /etc/default/snapclient | tr -d -c 0-9 || echo 800 )
[[ -e /usr/bin/spotifyd ]] && data+='
, "spotifyd"         : '$( isactive spotifyd )'
, "spotifydactive"   : '$( [[ $( < $dirshm/player ) == spotify ]] && echo true )'
, "spotifyredirect"  : "'$spotifyredirect'"
, "spotifytoken"     : '$( grep -q -m1 refreshtoken $dirsystem/spotify 2> /dev/null && echo true )
[[ -e /usr/bin/upmpdcli ]] && data+='
, "upmpdcli"         : '$( isactive upmpdcli )'
, "upmpdcliactive"   : '$( [[ $( < $dirshm/player ) == upnp ]] && echo true )'
, "upmpdcliownqueue" : '$( grep -q -m1 'ownqueue = 1' /etc/upmpdcli.conf && echo true )
if [[ -e /usr/bin/chromium ]]; then
	[[ ! -e /tmp/localbrowser.conf  ]] && cp $dirsystem/localbrowser.conf /tmp
	brightnessfile=/sys/class/backlight/rpi_backlight/brightness
	[[ -e $brightnessfile ]] && brightness=$( < $brightnessfile ) || brightness=false
	if [[ -e $dirsystem/localbrowser.conf ]]; then
		conf=$( sed -e '/=/ {s/^/,"/; s/=/":/}' -e 's/.*rotate.*:\(.*\)/"rotate":"\1"/' $dirsystem/localbrowser.conf )
		localbrowserconf='{ '$conf', "brightness" : '$brightness' }'
	else
		localbrowserconf='{ "rotate": "NORMAL", "zoom": 100, "screenoff": 0, "playon": false, "cursor": false, "brightness": '$brightness' }'
	fi
	if systemctl -q is-active localbrowser; then
		localbrowser=true
	else
		systemctl -q is-enabled localbrowser && systemctl -q disable --now localbrowser
	fi
	data+='
, "localbrowser"     : '$( isactive localbrowser )'
, "localbrowserconf" : '$localbrowserconf
fi
if [[ -e /usr/bin/smbd ]]; then
	grep -A1 $dirsd /etc/samba/smb.conf | grep -q -m1 'read only = no' && writesd=true || writesd=false
	grep -A1 $dirusb /etc/samba/smb.conf | grep -q -m1 'read only = no' && writeusb=true || writeusb=false
	smbconf="[ $writesd, $writeusb ]"
	data+='
, "smb"              : '$( isactive smb )'
, "smbconf"          : '$smbconf
fi
if [[ -e /usr/bin/rtsp-simple-server ]]; then
	timeout 1 rtl_test -t &> /dev/null && dabdevice=true || systemctl disable --now rtsp-simple-server
	data+='
, "dabdevice"        : '$dabdevice'
, "dabradio"         : '$( isactive rtsp-simple-server )
fi
data2json "$data" $1
