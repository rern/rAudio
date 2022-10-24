#!/bin/bash

! mpc &> /dev/null && echo mpdnotrunning && exit

. /srv/http/bash/common.sh
. $dirsettings/player-devices.sh

data='
  "page"             : "player"
, "devices"          : '$devices'
, "asoundcard"       : '$i'
, "audioaplayname"   : "'$aplayname'"
, "audiooutput"      : "'$output'"
, "autoupdate"       : '$( exists $dirmpdconf/autoupdate.conf )'
, "btaplayname"      : "'$( getContent $dirshm/btreceiver )'"
, "buffer"           : '$( exists $dirmpdconf/buffer.conf )'
, "bufferconf"       : '$( cut -d'"' -f2 $dirmpdconf/conf/buffer.conf )'
, "camilladsp"       : '$( exists $dirsystem/camilladsp )'
, "counts"           : '$( getContent $dirmpd/counts )'
, "crossfade"        : '$( [[ $( mpc crossfade | tr -dc [0-9] ) != 0 ]] && echo true )'
, "crossfadeconf"    : '$( getContent $dirsystem/crossfade.conf )'
, "custom"           : '$( exists $dirmpdconf/custom.conf )'
, "dabradio"         : '$( isactive rtsp-simple-server )'
, "dop"              : '$( exists "$dirsystem/dop-$aplayname" )'
, "equalizer"        : '$( exists $dirsystem/equalizer )'
, "ffmpeg"           : '$( exists $dirmpdconf/ffmpeg.conf )'
, "lists"            : ['$( exists $dirmpd/albumignore )','$( exists $dirmpd/pdignorelist )','$( exists $dirmpd/nonutf8 )']
, "normalization"    : '$( exists $dirmpdconf/normalization.conf )'
, "outputbuffer"     : '$( exists $dirmpdconf/outputbuffer.conf )'
, "outputbufferconf" : '$( cut -d'"' -f2 $dirmpdconf/conf/outputbuffer.conf )'
, "player"           : "'$( cat $dirshm/player )'"
, "playing"          : '$( grep -q '^state="play"' $dirshm/status && echo true )'
, "replaygain"       : '$( exists $dirmpdconf/replaygain.conf )'
, "replaygainconf"   : "'$( cut -d'"' -f2 $dirmpdconf/conf/replaygain.conf )'"
, "soxr"             : '$( exists $dirsystem/soxr )'
, "soxrconf"         : ['$( sed -E '/resampler|plugin|}/ d; s/.*quality.*(".*")/\1/; s/.*thread.*"(.*)"/,\1/' $dirmpdconf/conf/soxr.conf )']
, "soxrcustomconf"   : ['$( sed -E '/resampler|plugin|quality|}/ d; s/.*"(.*)"/\1/' $dirmpdconf/conf/soxr-custom.conf | xargs | tr ' ' , )']
, "soxrquality"      : "'$( getContent $dirsystem/soxr )'"
, "version"          : "'$( pacman -Q mpd 2> /dev/null |  cut -d' ' -f2 )'"'

data2json "$data" $1
