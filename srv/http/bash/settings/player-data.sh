#!/bin/bash

! mpc &> /dev/null && echo mpddead && exit

. /srv/http/bash/common.sh
. $dirsettings/player-devices.sh

conf=$( sed -E -e '/resampler|plugin|quality|}/ d' -e 's/.*"(.*)"/\1/' $dirmpdconf/conf/soxr-custom.conf | tr '\n' , )
state=$( grep ^state $dirshm/status 2> /dev/null | cut -d'"' -f2 )
[[ ! $state ]] && state=stop

data='
  "page"             : "player"
, "devices"          : '$devices'
, "asoundcard"       : '$i'
, "audioaplayname"   : "'$aplayname'"
, "audiooutput"      : "'$output'"
, "autoupdate"       : '$( exists $dirmpdconf/autoupdate.conf )'
, "btaplayname"      : "'$( cat $dirshm/btreceiver 2> /dev/null )'"
, "buffer"           : '$( exists $dirmpdconf/buffer.conf )'
, "bufferconf"       : '$( cut -d'"' -f2 $dirmpdconf/conf/buffer.conf )'
, "bufferoutput"     : '$( exists $dirmpdconf/outputbuffer.conf )'
, "bufferoutputconf" : '$( cut -d'"' -f2 $dirmpdconf/conf/outputbuffer.conf )'
, "camilladsp"       : '$( exists $dirsystem/camilladsp )'
, "counts"           : '$( cat $dirmpd/counts 2> /dev/null )'
, "crossfade"        : '$( [[ $( mpc crossfade | tr -dc [0-9] ) != 0 ]] && echo true )'
, "crossfadeconf"    : '$( cat $dirsystem/crossfade.conf 2> /dev/null || echo 1 )'
, "custom"           : '$( exists $dirmpdconf/custom.conf )'
, "dabradio"         : '$( isactive rtsp-simple-server )'
, "dop"              : '$( exists "$dirsystem/dop-$aplayname" )'
, "equalizer"        : '$( exists $dirsystem/equalizer )'
, "ffmpeg"           : '$( exists $dirmpdconf/ffmpeg.conf )'
, "lists"            : ['$( exists $dirmpd/albumignore )','$( exists $dirmpd/pdignorelist )','$( exists $dirmpd/nonutf8 )']
, "normalization"    : '$( exists $dirmpdconf/normalization.conf )'
, "player"           : "'$( cat $dirshm/player )'"
, "replaygain"       : '$( exists $dirmpdconf/replaygain.conf )'
, "replaygainconf"   : "'$( cut -d'"' -f2 $dirmpdconf/conf/replaygain.conf )'"
, "soxr"             : '$( grep -q quality.*custom $dirmpdconf/soxr.conf && echo true )'
, "soxrconf"         : ['${conf:0:-1}']
, "state"            : "'$state'"
, "version"          : "'$( pacman -Q mpd 2> /dev/null |  cut -d' ' -f2 )'"'

data2json "$data" $1
