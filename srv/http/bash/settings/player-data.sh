#!/bin/bash

! mpc &> /dev/null && echo notrunning && exit

. /srv/http/bash/common.sh

data+=$( settingsEnabled \
			$dirsystem camilladsp custom dabradio devicewithbt equalizer soxr \
			$dirmpdconf autoupdate.conf buffer.conf ffmpeg.conf normalization.conf outputbuffer.conf replaygain.conf )
			
##########
data+='
, "asoundcard"  : '$( getContent $dirsystem/asoundcard )'
, "btmixer"     : '$( [[ -e $dirshm/btmixer ]] && echo '"'$( < $dirshm/btmixer )'"' )'
, "counts"      : '$( < $dirmpd/counts )'
, "crossfade"   : '$( [[ $( mpc crossfade | cut -d' ' -f2 ) != 0 ]] && echo true )'
, "devices"     : '$( getContent $dirshm/devices )'
, "dop"         : '$( grep -qs dop.*yes $dirmpdconf/output.conf && echo true )'
, "lastupdate"  : "'$( date -d "$( mpc stats | sed -n '/^DB Updated/ {s/.*: \+//; p }' )" '+%Y-%m-%d <gr>· %H:%M</gr>' )'"
, "lists"       : {
	  "albumignore" : '$( exists $dirmpd/albumignore )'
	, "mpdignore"   : '$( exists $dirmpd/mpdignorelist )'
	, "nonutf8"     : '$( exists $dirmpd/nonutf8 )'
}
, "mixers"      : '$( getContent $dirshm/mixers )'
, "mixertype"   : '$( [[ $( getVar mixertype $dirshm/output ) != none ]] && echo true )'
, "output"      : '$( conf2json -nocap $dirshm/output )'
, "player"      : "'$( < $dirshm/player )'"
, "pllength"    : '$( mpc status %length% )'
, "state"       : "'$( mpcState )'"
, "updatetime"  : "'$( getContent $dirmpd/updatetime )'"
, "updating_db" : '$( [[ -e $dirmpd/listing || -e $dirmpd/updating ]] && echo true )'
, "version"     : "'$( pacman -Q mpd 2> /dev/null |  cut -d' ' -f2 )'"
, "volumemax"   : '$( volumeMaxGet )

data2json "$data" $1
