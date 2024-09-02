#!/bin/bash

# shareddata:
#    $nfsserver                            = server rAudio
#    [[ -L $dirmpd && ! $nfsserver ]]      = clients
#    grep -q -m1 :/mnt/MPD/NAS /etc/fstab  = clients with server rAudio
#    [[ -e $dirdata/sharedip ]]            = server + clients

. /srv/http/bash/common.sh

packageActive camilladsp localbrowser mediamtx nfs-server shairport-sync smb snapserver spotifyd upmpdcli
##########
data='
, "autoplay"         : '$( exists $dirsystem/autoplay )'
, "autoplayconf"     : '$( conf2json $dirsystem/autoplay.conf )'
, "camilladsp"       : '$camilladsp'
, "dabradio"         : '$mediamtx'
, "equalizer"        : '$( exists $dirsystem/equalizer )'
, "hostname"         : "'$( hostname )'"
, "hostip"           : "'$( ipAddress )'"
, "httpd"            : '$( exists $dirmpdconf/httpd.conf )'
, "ipsub"            : "'$( ipAddress sub )'"
, "latest"           : '$( exists $dirsystem/latest )'
, "lcd"              : '$( grep -E -q 'waveshare|tft35a' /boot/config.txt 2> /dev/null && echo true )'
, "login"            : '$( exists $dirsystem/login )'
, "loginsetting"     : '$( exists $dirsystem/loginsetting )'
, "lyrics"           : '$( exists $dirsystem/lyrics )'
, "lyricsconf"       : '$( conf2json lyrics.conf )'
, "multiraudio"      : '$( exists $dirsystem/multiraudio )'
, "multiraudioconf"  : '$( getContent $dirsystem/multiraudio.json )'
, "nfsconnected"     : '$( [[ -e $filesharedip && $( lineCount $filesharedip ) > 1 ]] && echo true )'
, "nfsserver"        : '$nfsserver'
, "nosound"          : '$( exists $dirshm/nosound )'
, "scrobble"         : '$( exists $dirsystem/scrobble )'
, "scrobbleconf"     : '$( conf2json scrobble.conf )'
, "scrobblekey"      : '$( exists $dirsystem/scrobblekey )'
, "shareddata"       : '$( [[ -L $dirmpd && ! $nfsserver ]] && echo true )'
, "shairport-sync"   : '$shairportsync'
, "stoptimer"        : '$( exists $dirshm/pidstoptimer )'
, "stoptimerconf"    : '$( conf2json stoptimer.conf )'
, "upmpdcli"         : '$upmpdcli

if [[ -e /usr/bin/iwctl ]]; then
	. <( grep -E '^Pass|^Add' /var/lib/iwd/ap/$( hostname ).ap )
##########
	data+='
, "ap"               : '$( exists $dirsystem/ap )'
, "apconf"           : { "IP": "'$Address'", "PASSPHRASE": "'$Passphrase'" }'
fi

if [[ -e /etc/systemd/system/localbrowser.service ]]; then
	[[ ! -e /tmp/localbrowser.conf && -e $dirsystem/localbrowser.conf ]] && cp $dirsystem/localbrowser.conf /tmp
##########
	data+='
, "brightness"       : '$( getContent /sys/class/backlight/rpi_backlight/brightness )'
, "localbrowser"     : '$localbrowser'
, "localbrowserconf" : '$( conf2json $dirsystem/localbrowser.conf )
fi

if [[ -e /usr/bin/smbd ]]; then
	file=/etc/samba/smb.conf
	sed -n '/\[SD]/,/^\[/ p' $file | grep -q 'read only = no' && sd=true || sd=false
	sed -n '/\[USB]/,/^\[/ p' $file | grep -q 'read only = no' && usb=true || usb=false
	smbconf='{ "SD": '$sd', "USB": '$usb' }'
##########
	data+='
, "smb"              : '$smb'
, "smbconf"          : '$smbconf
fi

##########
[[ -e /usr/bin/snapclient ]] && data+='
, "snapclient"       : '$( ls $dirsystem/snapclient* &> /dev/null && echo true )'
, "snapserver"       : '$snapserver'
, "snapserveractive" : '$( [[ $( snapclientIP ) ]] && echo true )

##########
[[ -e /usr/bin/spotifyd ]] && data+='
, "spotifyd"         : '$spotifyd'
, "spotifytoken"     : '$( grep -q -m1 refreshtoken $dirsystem/spotifykey 2> /dev/null && echo true )

##########
[[ -e $dirshm/wlan ]] && data+='
, "wlan"             : true
, "wlanconnected"    : '$( ip r | grep -q -m1 "^default.*$( < $dirshm/wlan )" && echo true )

data2json "$data" $1
