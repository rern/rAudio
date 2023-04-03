#!/bin/bash

! mpc &> /dev/null && echo mpdnotrunning && exit

. /srv/http/bash/common.sh
. $dirsettings/player-devices.sh

camilladsp=$( exists $dirsystem/camilladsp )
crossfadesec=$( mpc crossfade | cut -d' ' -f2 )
crossfade=$( [[ $crossfadesec != 0 ]] && echo true )
equalizer=$( exists $dirsystem/equalizer )
normalization=$( exists $dirmpdconf/normalization.conf )
replaygain=$( exists $dirmpdconf/replaygain.conf )
replaygainconf='{
  "type"     : "'$( getVar replaygain $dirmpdconf/conf/replaygain.conf )'"
, "hardware" : '$( exists $dirsystem/replaygain-hw )'
}'
soxr=$( exists $dirsystem/soxr )
resampled=$( [[ $camilladsp == true \
				|| $crossfade == true \
				|| $equalizer == true \
				|| $normalization == true \
				|| $replaygain == true \
				|| $soxr == true \
					]] && echo true );
lists='{
  "albumignore" : '$( exists $dirmpd/albumignore )'
, "mpdignore"   : '$( exists $dirmpd/mpdignorelist )'
, "nonutf8"     : '$( exists $dirmpd/nonutf8 )'
}'

data='
  "page"             : "player"
, "devices"          : '$devices'
, "asoundcard"       : '$asoundcard'
, "audioaplayname"   : "'$aplayname'"
, "audiooutput"      : "'$output'"
, "autoupdate"       : '$( exists $dirmpdconf/autoupdate.conf )'
, "btaplayname"      : "'$( getContent $dirshm/btreceiver )'"
, "btoutputall"      : '$( exists $dirsystem/btoutputall )'
, "buffer"           : '$( exists $dirmpdconf/buffer.conf )'
, "bufferconf"       : '$( conf2json $dirmpdconf/conf/buffer.conf )'
, "camilladsp"       : '$camilladsp'
, "counts"           : '$( getContent $dirmpd/counts )'
, "crossfade"        : '$crossfade'
, "crossfadeconf"    : { "sec": '$crossfadesec' }
, "custom"           : '$( exists $dirmpdconf/custom.conf )'
, "dabradio"         : '$( systemctl -q is-active rtsp-simple-server && echo true )'
, "dop"              : '$( exists "$dirsystem/dop-$aplayname" )'
, "equalizer"        : '$equalizer'
, "ffmpeg"           : '$( exists $dirmpdconf/ffmpeg.conf )'
, "lists"            : '$lists'
, "normalization"    : '$normalization'
, "novolume"         : '$( [[ $mixertype == none && ! $resampled ]] && echo true )'
, "outputbuffer"     : '$( exists $dirmpdconf/outputbuffer.conf )'
, "outputbufferconf" : '$( conf2json $dirmpdconf/conf/outputbuffer.conf )'
, "player"           : "'$( < $dirshm/player )'"
, "replaygain"       : '$replaygain'
, "replaygainconf"   : '$replaygainconf'
, "soxr"             : '$soxr'
, "soxrconf"         : '$( conf2json $dirmpdconf/conf/soxr.conf )'
, "soxrcustomconf"   : '$( conf2json $dirmpdconf/conf/soxr-custom.conf )'
, "soxrquality"      : "'$( getContent $dirsystem/soxr )'"
, "state"            : "'$( grep -m1 ^state= $dirshm/status | cut -d= -f2 | tr -d '"' )'"
, "version"          : "'$( pacman -Q mpd 2> /dev/null |  cut -d' ' -f2 )'"'

data2json "$data" $1
