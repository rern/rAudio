#!/bin/bash

# shareddata:
#    $nfsserver                            = server rAudio
#    [[ -L $dirmpd && ! $nfsserver ]]      = clients
#    grep -q -m1 :/mnt/MPD/NAS /etc/fstab  = clients with server rAudio
#    [[ -e $dirdata/sharedip ]]            = server + clients

. /srv/http/bash/common.sh

if [[ ! -e $dirsystem/ap ]]; then
	wlanconnected=$( ifconfig $( < $dirshm/wlan ) \
						| awk '/inet/ {print $2}' \
						| grep -qv 127.0.0.1 && echo true )
fi
data+=$( settingsActive camilladsp nfs-server shairport-sync smb snapserver spotifyd upmpdcli )
data+=$( settingsEnabled \
			$dirmpdconf httpd.conf \
			$dirsystem ap autoplay equalizer login loginsetting lyrics dabradio multiraudio scrobble snapclientserver volumelimit \
			$dirshm nosound )
##########
data+='
, "hostname"      : "'$( hostname )'"
, "ip"            : "'$( ipAddress )'"
, "localbrowser"  : '$( systemctl -q is-enabled localbrowser && echo true )'
, "nfsconnected"  : '$( [[ -e $filesharedip && $( lineCount $filesharedip ) > 1 ]] && echo true )'
, "shareddata"    : '$( [[ -L $dirmpd && ! $nfsserver ]] && echo true )'
, "snapclient"    : '$( ls $dirsystem/snapclien* &> /dev/null && echo true  )'
, "stoptimer"     : '$( exists $dirshm/pidstoptimer )
##########
[[ -e $dirshm/wlan ]] && data+='
, "wlan"          : true
, "wlanconnected" : '$wlanconnected

data2json "$data" $1
