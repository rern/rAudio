#!/bin/bash

# shareddata:
#    $nfsserver                            = server rAudio
#    [[ -L $dirmpd && ! $nfsserver ]]      = clients
#    grep -q -m1 :/mnt/MPD/NAS /etc/fstab  = clients with server rAudio
#    [[ -e $dirdata/sharedip ]]            = server + clients

. /srv/http/bash/common.sh

data+=$( settingsActive camilladsp nfs-server shairport-sync smb snapserver spotifyd upmpdcli )
data+=$( settingsEnabled \
			$dirmpdconf httpd.conf \
			$dirsystem ap autoplay equalizer login loginsetting lyrics dabradio multiraudio scrobble snapclientserver volumelimit \
			$dirshm nosound )
if systemctl -q is-enabled localbrowser; then
	systemctl -q is-active localbrowser && localbrowser=true || localbrowser=-1
fi
##########
data+='
, "hostname"     : "'$( hostname )'"
, "ip"           : "'$( ipAddress )'"
, "localbrowser" : '$localbrowser'
, "nfsconnected" : '$( [[ -e $filesharedip && $( lineCount $filesharedip ) > 1 ]] && echo true )'
, "shareddata"   : '$( sharedDataEnabled )'
, "snapclient"   : '$( ls $dirsystem/snapclien* &> /dev/null && echo true  )'
, "ssid"         : "'$( iwgetid -r )'"
, "stoptimer"    : '$( [[ -e $dirsystem/stoptimer || -e $dirshm/pidstoptimer ]] && echo true )'
, "wlan"         : '$( exists $dirshm/wlan )

data2json "$data" $1
