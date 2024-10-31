#!/bin/bash

! mpc &> /dev/null && echo notrunning && exit

. /srv/http/bash/common.sh

data+=$( settingsEnabled \
			$dirsystem camilladsp devicewithbt equalizer soxr \
			$dirmpdconf autoupdate.conf buffer.conf custom.conf ffmpeg.conf normalization.conf outputbuffer.conf replaygain.conf )

crossfade=$( mpc crossfade | cut -d' ' -f2 )
[[ -e $dirshm/amixercontrol && ! ( -e $dirshm/btreceiver && ! -e $dirsystem/devicewithbt ) ]] && volume=( $( volumeGet valdb hw ) )

##########
data+='
, "asoundcard"       : '$( getContent $dirsystem/asoundcard )'
, "bluetooth"        : '$( exists $dirshm/btreceiver )'
, "btmixer"          : "'$( getContent $dirshm/btmixer )'"
, "btvolume"         : '$( [[ -e $dirshm/btreceiver ]] && volumeGet valdb )'
, "bufferconf"       : '$( cut -d'"' -f2 $dirmpdconf/conf/buffer.conf )'
, "counts"           : '$( < $dirmpd/counts )'
, "crossfade"        : '$( [[ $crossfade != 0 ]] && echo true )'
, "crossfadeconf"    : { "SEC": '$crossfade' }
, "dabradio"         : '$( systemctl -q is-active mediamtx && echo true )'
, "devices"          : '$( getContent $dirshm/devices )'
, "dop"              : '$( grep -q dop.*yes $dirmpdconf/output.conf && echo true )'
, "lastupdate"       : "'$( date -d "$( mpc stats | sed -n '/^DB Updated/ {s/.*: \+//; p }' )" '+%Y-%m-%d <gr>• %H:%M</gr>' )'"
, "lists"            : {
	  "albumignore" : '$( exists $dirmpd/albumignore )'
	, "mpdignore"   : '$( exists $dirmpd/mpdignorelist )'
	, "nonutf8"     : '$( exists $dirmpd/nonutf8 )'
}
, "mixers"           : '$( getContent $dirshm/mixers )'
, "mixertype"        : '$( [[ $( getVar mixertype $dirshm/output ) != none ]] && echo true )'
, "output"           : '$( conf2json -nocap $dirshm/output )'
, "outputbufferconf" : '$( cut -d'"' -f2 $dirmpdconf/conf/outputbuffer.conf )'
, "player"           : "'$( < $dirshm/player )'"
, "pllength"         : '$( mpc status %length% )'
, "replaygainconf"   : {
	  "MODE"     : "'$( getVar replaygain $dirmpdconf/conf/replaygain.conf )'"
	, "HARDWARE" : '$( exists $dirsystem/replaygain-hw )'
}
, "soxrconf"         : '$( conf2json $dirmpdconf/conf/soxr.conf )'
, "soxrcustomconf"   : '$( conf2json $dirmpdconf/conf/soxr-custom.conf )'
, "soxrquality"      : "'$( getContent $dirsystem/soxr )'"
, "state"            : "'$( mpcState )'"
, "updatetime"       : "'$( getContent $dirmpd/updatetime )'"
, "updating_db"      : '$( [[ -e $dirmpd/listing || -e $dirmpd/updating ]] && echo true )'
, "version"          : "'$( pacman -Q mpd 2> /dev/null |  cut -d' ' -f2 )'"
, "volume"           : '${volume[0]}'
, "volumedb"         : '${volume[1]}'
, "volumemax"        : '$( volumeMaxGet )

data2json "$data" $1
