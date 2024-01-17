#!/bin/bash

# shareddata:
#    $nfsserver                            = server rAudio
#    [[ -L $dirmpd && ! $nfsserver ]]      = clients
#    grep -q -m1 :/mnt/MPD/NAS /etc/fstab  = clients with server rAudio
#    [[ -e $dirdata/sharedip ]]            = server + clients

. /srv/http/bash/common.sh

packageActive camilladsp iwd localbrowser mediamtx nfs-server shairport-sync smb snapclient spotifyd upmpdcli
if [[ $iwd == true ]]; then
	! iwctl ap list | grep -q "$( < $dirshm/wlan ).*yes" && iwd=false
fi
##########
data='
, "autoplay"         : '$( exists $dirsystem/autoplay )'
, "autoplayconf"     : '$( conf2json $dirsystem/autoplay.conf )'
, "camilladsp"       : '$camilladsp'
, "equalizer"        : '$( exists $dirsystem/equalizer )'
, "hostname"         : "'$( hostname )'"
, "hostip"           : "'$( ipAddress )'"
, "httpd"            : '$( exists $dirmpdconf/httpd.conf )'
, "ipsub"            : "'$( ipSub )'"
, "latest"           : '$( exists $dirsystem/latest )'
, "lcd"              : '$( grep -E -q 'waveshare|tft35a' /boot/config.txt 2> /dev/null && echo true )'
, "login"            : '$( exists $dirsystem/login )'
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
, "stoptimer"        : '$( exists $dirshm/pidstoptimer )'
, "stoptimerconf"    : '$( conf2json stoptimer.conf )
if [[ -e /usr/bin/iwctl ]]; then
	fileap=/var/lib/iwd/ap/$( hostname ).ap
##########
	data+='
, "iwd"              : '$iwd'
, "iwdconf"          : { "IP": "'$( getVar Address $fileap )'", "PASSPHRASE": "'$( getVar Passphrase $fileap )'" }
, "wlan"             : '$( lsmod | grep -q -m1 brcmfmac && echo true )'
, "wlanconnected"    : '$( ip r | grep -q -m1 "^default.*wlan0" && echo true )
fi
##########
[[ -e /usr/bin/shairport-sync ]] && data+='
, "shairport-sync"   : '$shairportsync
##########
[[ -e /usr/bin/snapserver ]] && data+='
, "snapclientactive" : '$snapclient'
, "snapserver"       : '$( exists $dirmpdconf/snapserver.conf )'
, "snapserveractive" : '$( [[ -e $dirshm/clientip ]] || ( [[ -e $dirsystem/snapclientserver ]] && systemctl -q is-active snapclient ) && echo true )'
, "snapclient"       : '$( exists $dirsystem/snapclient )'
, "snapclientconf"   : { "LATENCY": '$( grep latency /etc/default/snapclient | tr -d -c 0-9 )' }'
##########
[[ -e /usr/bin/spotifyd ]] && data+='
, "spotifyd"         : '$spotifyd'
, "spotifytoken"     : '$( grep -q -m1 refreshtoken $dirsystem/spotifykey 2> /dev/null && echo true )
##########
[[ -e /usr/bin/upmpdcli ]] && data+='
, "upmpdcli"         : '$upmpdcli
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
if [[ -e /usr/bin/mediamtx ]]; then
	timeout 1 rtl_test -t &> /dev/null && dabdevice=true || systemctl disable --now mediamtx
##########
	data+='
, "dabdevice"        : '$dabdevice'
, "dabradio"         : '$mediamtx
fi
data2json "$data" $1
