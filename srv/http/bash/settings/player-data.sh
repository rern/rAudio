#!/bin/bash

! mpc &> /dev/null && echo notrunning && exit

. /srv/http/bash/common.sh
. $dirsettings/player-devices.sh

camilladsp=$( exists $dirsystem/camilladsp )
crossfadesec=$( mpc crossfade | cut -d' ' -f2 )
crossfade=$( [[ $crossfadesec != 0 ]] && echo true )
equalizer=$( exists $dirsystem/equalizer )
normalization=$( exists $dirmpdconf/normalization.conf )
[[ $( getVar mixertype $dirsystem/player-device ) == none \
	&& ! $( ls $dirsystem/{camilladsp,crossfade,equalizer} 2> /dev/null ) \
	&& ! $( ls $dirmpdconf/{normalization,replaygain,soxr}.conf 2> /dev/null ) ]] \
		&& novolume=true
replaygain=$( exists $dirmpdconf/replaygain.conf )
replaygainconf='{
  "TYPE"     : "'$( getVar replaygain $dirmpdconf/conf/replaygain.conf )'"
, "HARDWARE" : '$( exists $dirsystem/replaygain-hw )'
}'
soxr=$( exists $dirsystem/soxr )
resampled=$( [[ $camilladsp == true \
				|| $crossfade == true \
				|| $equalizer == true \
				|| $normalization == true \
				|| $replaygain == true \
				|| $soxr == true \
					]] && echo true );
volumempd=$( mpc status %volume% | tr -dc [0-9] )
lists='{
  "albumignore" : '$( exists $dirmpd/albumignore )'
, "mpdignore"   : '$( exists $dirmpd/mpdignorelist )'
, "nonutf8"     : '$( exists $dirmpd/nonutf8 )'
}'
if [[ -e $dirmpd/listing ]] || mpc | grep -q ^Updating; then
	updating_db=true
fi

. $dirshm/status
##########
data='
, "devices"          : '$devices'
, "asoundcard"       : '$asoundcard'
, "autoupdate"       : '$( exists $dirmpdconf/autoupdate.conf )'
, "btaplayname"      : "'$( getContent $dirshm/btreceiver )'"
, "btoutputall"      : '$( exists $dirsystem/btoutputall )'
, "buffer"           : '$( exists $dirmpdconf/buffer.conf )'
, "bufferconf"       : { "KB": '$( cut -d'"' -f2 $dirmpdconf/conf/buffer.conf )' }
, "camilladsp"       : '$camilladsp'
, "card"             : '$card'
, "control"          : "'$control'"
, "counts"           : '$( < $dirmpd/counts )'
, "crossfade"        : '$crossfade'
, "crossfadeconf"    : { "SEC": '$crossfadesec' }
, "custom"           : '$( exists $dirmpdconf/custom.conf )'
, "dabradio"         : '$( systemctl -q is-active mediamtx && echo true )'
, "device"           : '$( conf2json -nocap player-device )'
, "dop"              : '$( exists "$dirsystem/dop-$aplayname" )'
, "equalizer"        : '$equalizer'
, "ffmpeg"           : '$( exists $dirmpdconf/ffmpeg.conf )'
, "lastupdate"       : "'$( date -d "$( mpc stats | sed -n '/^DB Updated/ {s/.*: \+//; p }' )" '+%Y-%m-%d <gr>• %H:%M</gr>' )'"
, "lists"            : '$lists'
, "normalization"    : '$normalization'
, "novolume"         : '$novolume'
, "outputbuffer"     : '$( exists $dirmpdconf/outputbuffer.conf )'
, "outputbufferconf" : { "KB": '$( cut -d'"' -f2 $dirmpdconf/conf/outputbuffer.conf )' }
, "player"           : "'$player'"
, "pllength"         : '$( mpc status %length% )'
, "replaygain"       : '$replaygain'
, "replaygainconf"   : '$replaygainconf'
, "soxr"             : '$soxr'
, "soxrconf"         : '$( conf2json $dirmpdconf/conf/soxr.conf )'
, "soxrcustomconf"   : '$( conf2json $dirmpdconf/conf/soxr-custom.conf )'
, "soxrquality"      : "'$( getContent $dirsystem/soxr )'"
, "state"            : "'$state'"
, "updatetime"       : "'$( getContent $dirmpd/updatetime )'"
, "updating_db"      : '$updating_db'
, "version"          : "'$( pacman -Q mpd 2> /dev/null |  cut -d' ' -f2 )'"
, "volumempd"        : '$volumempd
[[ -e $dirshm/amixercontrol || -e $dirshm/btreceiver ]] && data+='
, "volume"           : '$( volumeGet valdb hw )

data2json "$data" $1
