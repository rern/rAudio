#!/bin/bash

! mpc &> /dev/null && echo notrunning && exit

. /srv/http/bash/common.sh

data+=$( settingsEnabled \
			$dirsystem camilladsp devicewithbt equalizer soxr \
			$dirmpdconf autoupdate.conf buffer.conf custom.conf ffmpeg.conf normalization.conf outputbuffer.conf replaygain.conf )

crossfade=$( mpc crossfade | cut -d' ' -f2 )
mixers=$( getContent $dirshm/mixers )
[[ $mixers == false ]] && mixer=false || mixer=true
[[ -e $dirshm/amixercontrol && ! ( -e $dirshm/btreceiver && ! -e $dirsystem/devicewithbt ) ]] && volume=( $( volumeGet valdb hw ) )

##########
data+='
, "asoundcard"  : '$( getContent $dirsystem/asoundcard )'
, "bluetooth"   : '$( exists $dirshm/btreceiver )'
, "btmixer"     : "'$( getContent $dirshm/btmixer )'"
, "counts"      : { '$( grep -E 'dabradio|song|webradio' < $dirmpd/counts )' }
, "crossfade"   : '$( [[ $( mpc crossfade | cut -d' ' -f2 ) != 0 ]] && echo true )'
, "dabradio"    : '$( systemctl -q is-active mediamtx && echo true )'
, "devices"     : '$( getContent $dirshm/devices )'
, "dop"         : '$( grep -q dop.*yes $dirmpdconf/output.conf && echo true )'
, "lastupdate"  : "'$( date -d "$( mpc stats | sed -n '/^DB Updated/ {s/.*: \+//; p }' )" '+%Y-%m-%d <gr>• %H:%M</gr>' )'"
, "lists"       : {
	  "albumignore" : '$( exists $dirmpd/albumignore )'
	, "mpdignore"   : '$( exists $dirmpd/mpdignorelist )'
	, "nonutf8"     : '$( exists $dirmpd/nonutf8 )'
}
, "mixer"       : '$mixer'
, "mixers"      : '$mixers'
, "mixertype"   : '$( [[ $( getVar mixertype $dirshm/output ) != none ]] && echo true )'
, "output"      : '$( conf2json -nocap $dirshm/output )'
, "player"      : "'$( < $dirshm/player )'"
, "pllength"    : '$( mpc status %length% )'
, "state"       : "'$( mpcState )'"
, "updatetime"  : "'$( getContent $dirmpd/updatetime )'"
, "updating_db" : '$( [[ -e $dirmpd/listing || -e $dirmpd/updating ]] && echo true )'
, "version"     : "'$( pacman -Q mpd 2> /dev/null |  cut -d' ' -f2 )'"
, "volume"      : '${volume[0]}'
, "volumedb"    : '${volume[1]}'
, "volumemax"   : '$( volumeMaxGet )

filter=$( echo 'camilladsp equalizer crossfade soxr normalization replaygain mixertype ' | sed 's/ /.*true|/g; s/|$//' )
if [[ ${volume[1]/.00} != 0 ]] || grep -q -m1 -E $filter <<< $data; then
	novolume=false
else
	novolume=true
fi
data+='
, "novolume"    : '$novolume

data2json "$data" $1
