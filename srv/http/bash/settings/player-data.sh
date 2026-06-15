#!/bin/bash

! mpc &> /dev/null && echo notrunning && exit

. /srv/http/bash/common.sh

data+=$( settingsEnabled \
			$dirsystem camilladsp custom dabradio devicewithbt equalizer soxr \
			$dirmpdconf autoupdate.conf buffer.conf ffmpeg.conf normalization.conf outputbuffer.conf replaygain.conf )
			
volumemax=$( volumeMaxGet )
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
, "mixertype"   : '$( ! grep -q mixertype=none $dirshm/output && echo true )'
, "output"      : '$( conf2json $dirshm/output )'
, "player"      : "'$( < $dirshm/player )'"
, "pllength"    : '$( mpc status %length% )'
, "state"       : "'$( mpcState )'"
, "updatetime"  : "'$( getContent $dirmpd/updatetime )'"
, "updating"    : '$( statusUpdating )'
, "version"     : "'$( pacman -Q mpd 2> /dev/null |  cut -d' ' -f2 )'"
, "volumelimit" : '$( [[ $volumemax -lt 100 && -e $dirsystem/volumelimit ]] && echo true )'
, "volumemax"   : '$volumemax

data2json "$data" $1
