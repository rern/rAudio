#!/bin/bash

# shareddata:
#    [[ -e $filesharedip ]]                   = server + clients
#    nfsServerActive                          = Server rAudio
#    grep -m1 "$dirnas \+$dirnas" /etc/fstab  = client - Server rAudio
#    [[ -e $dirshareddata/source ]]           = client - other

. /srv/http/bash/common.sh

data+=$( settingsActive camilladsp nfs-server shairport-sync smb snapserver spotifyd upmpdcli )
data+=$( settingsEnabled \
			$dirmpdconf httpd.conf \
			$dirsystem ap audiocd autoplay equalizer login loginsetting lyrics dabradio multiraudio scrobble snapclientserver volumelimit \
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
, "shareddata"   : '$( sharedData )'
, "snapclient"   : '$( compgen -G $dirsystem/snapclien* && echo true  )'
, "ssid"         : "'$( iwgetid -r )'"
, "stoptimer"    : '$( [[ -e $dirsystem/stoptimer || -e $dirshm/pidstoptimer ]] && echo true )'
, "wlan"         : '$( exists $dirshm/wlan )

data2json "$data" $1
