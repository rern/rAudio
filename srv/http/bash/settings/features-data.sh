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
			$dirsystem ap autoplay dabradio equalizer login loginsetting lyrics multiraudio scrobble scrobblekey snapclient volumelimit \
			$dirshm nosound )
data+=$( settingsConf autoplay localbrowser lyrics scrobble stoptimer volumelimit )

if [[ -e $dirsystem/volumelimit ]]; then
	volumelimitconf=$( conf2json volumelimit.conf )
else
	volume=$( volumeGet )
	[[ $volume == 0 || ! $volume ]] && volume=50
	volumelimitconf='{ "STARTUP": '$volume', "MAX": 100 }'
fi

##########
data+='
, "hostname"         : "'$( hostname )'"
, "hostip"           : "'$( ipAddress )'"
, "ipsub"            : "'$( ipAddress sub )'"
, "lcd"              : '$( grep -E -q 'waveshare|tft35a' /boot/config.txt 2> /dev/null && echo true )'
, "multiraudioconf"  : '$( getContent $dirsystem/multiraudio.json )'
, "nfsconnected"     : '$( [[ -e $filesharedip && $( lineCount $filesharedip ) > 1 ]] && echo true )'
, "shareddata"       : '$( [[ -L $dirmpd && ! $nfsserver ]] && echo true )'
, "stoptimer"        : '$( exists $dirshm/pidstoptimer )'
, "volumelimitconf"   : '$volumelimitconf

if [[ -e /usr/bin/iwctl ]]; then
	. <( grep -E '^Pass|^Add' /var/lib/iwd/ap/$( hostname ).ap )
##########
	data+='
, "apconf"           : { "IP": "'$Address'", "PASSPHRASE": "'$Passphrase'" }'
fi

if [[ -e /etc/systemd/system/localbrowser.service ]]; then
	[[ ! -e /tmp/localbrowser.conf && -e $dirsystem/localbrowser.conf ]] && cp $dirsystem/localbrowser.conf /tmp
##########
	data+='
, "brightness"       : '$( getContent /sys/class/backlight/rpi_backlight/brightness )
fi

if [[ -e /usr/bin/smbd ]]; then
	file=/etc/samba/smb.conf
	sed -n '/\[SD]/,/^\[/ p' $file | grep -q 'read only = no' && sd=true || sd=false
	sed -n '/\[USB]/,/^\[/ p' $file | grep -q 'read only = no' && usb=true || usb=false
	smbconf='{ "SD": '$sd', "USB": '$usb' }'
##########
	data+='
, "smbconf"          : '$smbconf
fi

##########
[[ -e /usr/bin/snapclient ]] && data+='
, "snapserveractive" : '$( [[ $( snapclientIP ) ]] && echo true )

##########
[[ -e /usr/bin/spotifyd ]] && data+='
, "spotifytoken"     : '$( grep -q -m1 refreshtoken $dirsystem/spotifykey 2> /dev/null && echo true )

##########
[[ -e $dirshm/wlan ]] && data+='
, "wlan"             : true
, "wlanconnected"    : '$( ip r | grep -q -m1 "^default.*$( < $dirshm/wlan )" && echo true )

data2json "$data" $1
