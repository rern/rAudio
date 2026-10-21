#!/bin/bash

! mpc &> /dev/null && echo notrunning && exit

. /srv/http/bash/common.sh

##########
data+=$( dataEnabled \
			$dirsystem camilladsp custom dabradio devicewithbt equalizer soxr \
			$dirmpdconf autoupdate.conf buffer.conf normalization.conf outputbuffer.conf replaygain.conf )
			
mixers=$( getContent $dirshm/mixers )
[[ ! $mixers && -e $dirsystem/camilladsp ]] && mixers='[ "CamillaDSP" ]'
##########
data+='
, "counts"     : '$( < $dirmpd/counts )'
, "crossfade"  : '$( [[ $( mpc crossfade | cut -d' ' -f2 ) != 0 ]] && echo true )'
, "devices"    : '$( getContent $dirshm/devices )'
, "dop"        : '$( grep -qs dop.*yes $dirmpdconf/output.conf && echo true )'
, "lastupdate" : "'$( date -d "$( mpc stats | sed -n '/^DB Updated/ {s/.*: \+//; p }' )" '+%Y-%m-%d <gr>· %H:%M</gr>' )'"
, "lists"       : {
	  "albumignore" : '$( exists $dirmpd/albumignore )'
	, "mpdignore"   : '$( exists $dirmpd/mpdignorelist )'
	, "nonutf8"     : '$( exists $dirmpd/nonutf8 )'
}
, "mixers"     : '$mixers'
, "mixertype"  : '$( ! grep -q mixertype=none $dirshm/output && echo true )'
, "nosound"    : '$( exists $dirshm/nosound )'
, "output"     : '$( conf2json $dirshm/output )'
, "updatetime" : "'$( getContent $dirmpd/updatetime )'"
, "updating"   : '$( statusUpdating )'
, "version"    : "'$( pacman -Q mpd 2> /dev/null |  cut -d' ' -f2 )'"'
##########
data+=$( dataPlayback )

data2json "$data" $1
