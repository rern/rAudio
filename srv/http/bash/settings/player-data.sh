#!/bin/bash

! mpc &> /dev/null && echo mpdnotrunning && exit

. /srv/http/bash/common.sh
. $dirsettings/player-devices.sh

data='
  "page"             : "player"
, "devices"          : '$devices'
, "asoundcard"       : '$asoundcard'
, "audioaplayname"   : "'$aplayname'"
, "audiooutput"      : "'$output'"
, "autoupdate"       : '$( exists $dirmpdconf/autoupdate.conf )'
, "btaplayname"      : "'$( getContent $dirshm/btreceiver )'"
, "btoutputonly"     : '$( exists $dirsystem/btoutputonly )'
, "buffer"           : '$( exists $dirmpdconf/buffer.conf )'
, "bufferconf"       : '$( cut -d'"' -f2 $dirmpdconf/conf/buffer.conf )'
, "camilladsp"       : '$( exists $dirsystem/camilladsp )'
, "counts"           : '$( getContent $dirmpd/counts )'
, "crossfade"        : '$( [[ $( mpc crossfade | tr -dc [0-9] ) != 0 ]] && echo true )'
, "crossfadeconf"    : '$( getContent $dirsystem/crossfade.conf )'
, "custom"           : '$( exists $dirmpdconf/custom.conf )'
, "dabradio"         : '$( systemctl -q is-active rtsp-simple-server && echo true )'
, "dop"              : '$( exists "$dirsystem/dop-$aplayname" )'
, "equalizer"        : '$( exists $dirsystem/equalizer )'
, "ffmpeg"           : '$( exists $dirmpdconf/ffmpeg.conf )'
, "lists"            : ['$( exists $dirmpd/albumignore )','$( exists $dirmpd/pdignorelist )','$( exists $dirmpd/nonutf8 )']
, "normalization"    : '$( exists $dirmpdconf/normalization.conf )'
, "outputbuffer"     : '$( exists $dirmpdconf/outputbuffer.conf )'
, "outputbufferconf" : '$( cut -d'"' -f2 $dirmpdconf/conf/outputbuffer.conf )'
, "player"           : "'$( < $dirshm/player )'"
, "replaygain"       : '$( exists $dirmpdconf/replaygain.conf )'
, "replaygainconf"   : [ "'$( cut -d'"' -f2 $dirmpdconf/conf/replaygain.conf )'", '$( exists $dirsystem/replaygain-hw )' ]
, "soxr"             : '$( exists $dirsystem/soxr )'
, "soxrconf"         : ['$( sed -E '/\{|plugin|}/ d; s/.*quality.*(".*")/\1/; s/.*thread.*"(.*)"/,\1/' $dirmpdconf/conf/soxr.conf )']
, "soxrcustomconf"   : ["custom"'$( sed -E '/\{|plugin|quality|}/ d; s/.*"(.*)"/,\1/' $dirmpdconf/conf/soxr-custom.conf )']
, "soxrquality"      : "'$( getContent $dirsystem/soxr )'"
, "state"            : "'$( grep -m1 ^state= $dirshm/status | cut -d= -f2 | tr -d '"' )'"
, "version"          : "'$( pacman -Q mpd 2> /dev/null |  cut -d' ' -f2 )'"'

data2json "$data" $1
