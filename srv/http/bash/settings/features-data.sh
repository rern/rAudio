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
systemctl -q is-active localbrowser && localbrowser=true
[[ ! $localbrowser ]] && systemctl -q is-enabled localbrowser && localbrowser=-1
##########
data+='
, "hostname"     : "'$( hostname )'"
, "ip"           : "'$( ipAddress )'"
, "localbrowser" : '$localbrowser'
, "nfsconnected" : '$( [[ -e $filesharedip && $( lineCount $filesharedip ) > 1 ]] && echo true )'
, "shareddata"   : '$( [[ -L $dirmpd && ! $nfsserver ]] && echo true )'
, "snapclient"   : '$( ls $dirsystem/snapclien* &> /dev/null && echo true  )'
, "ssid"         : "'$( iwgetid -r )'"
, "wlan"         : '$( [[ -e $dirshm/wlan ]] && echo true )

data2json "$data" $1
