#!/bin/bash

# shareddata:
#    $nfsserver                            = server rAudio
#    [[ -L $dirmpd && ! $nfsserver ]]      = clients
#    grep -q -m1 :/mnt/MPD/NAS /etc/fstab  = clients with server rAudio
#    [[ -e $dirdata/sharedip ]]            = server + clients

. /srv/http/bash/common.sh

data+=$( settingsActive camilladsp localbrowser nfs-server shairport-sync smb snapserver spotifyd upmpdcli )
data+=$( settingsEnabled \
			$dirmpdconf httpd.conf \
			$dirsystem ap autoplay equalizer login lyrics multiraudio scrobble snapclient volumelimit \
			$dirshm nosound )

##########
data+='
, "hostname"      : "'$( hostname )'"
, "ip"            : "'$( ipAddress )'"
, "nfsconnected"  : '$( [[ -e $filesharedip && $( lineCount $filesharedip ) > 1 ]] && echo true )'
, "shareddata"    : '$( [[ -L $dirmpd && ! $nfsserver ]] && echo true )'
, "stoptimer"     : '$( exists $dirshm/pidstoptimer )
##########
[[ -e /usr/bin/mediamtx ]] && data+='
, "dabradio"      : '$( systemctl -q is-active mediamtx && echo true )
##########
[[ -e $dirshm/wlan ]] && data+='
, "wlan"          : true
, "wlanconnected" : '$( ip r | grep -q -m1 "^default.*$( < $dirshm/wlan )" && echo true )

data2json "$data" $1
