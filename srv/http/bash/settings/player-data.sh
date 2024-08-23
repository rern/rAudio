#!/bin/bash

! mpc &> /dev/null && echo notrunning && exit

. /srv/http/bash/common.sh

crossfade=$( mpc crossfade | cut -d' ' -f2 )
[[ -e $dirshm/amixercontrol && ! ( -e $dirshm/btreceiver && ! -e $dirsystem/devicewithbt ) ]] && volume=$( volumeGet valdb hw )

##########
data='
, "asoundcard"     : '$( getContent $dirsystem/asoundcard )'
, "autoupdate"     : '$( exists $dirmpdconf/autoupdate.conf )'
, "bluetooth"      : '$( exists $dirshm/btreceiver )'
, "btmixer"        : "'$( getContent $dirshm/btmixer )'"
, "btvolume"       : '$( [[ -e $dirshm/btreceiver ]] && volumeGet valdb )'
, "camilladsp"     : '$( exists $dirsystem/camilladsp )'
, "counts"         : '$( < $dirmpd/counts )'
, "crossfade"      : '$( [[ $crossfade != 0 ]] && echo true )'
, "crossfadeconf"  : { "SEC": '$crossfade' }
, "custom"         : '$( exists $dirmpdconf/custom.conf )'
, "dabradio"       : '$( systemctl -q is-active mediamtx && echo true )'
, "devices"        : '$( getContent $dirshm/devices )'
, "devicewithbt"   : '$( exists $dirsystem/devicewithbt )'
, "dop"            : '$( exists "$dirsystem/dop-$name" )'
, "equalizer"      : '$( exists $dirsystem/equalizer )'
, "ffmpeg"         : '$( exists $dirmpdconf/ffmpeg.conf )'
, "lastupdate"     : "'$( date -d "$( mpc stats | sed -n '/^DB Updated/ {s/.*: \+//; p }' )" '+%Y-%m-%d <gr>• %H:%M</gr>' )'"
, "lists"          : {
	  "albumignore" : '$( exists $dirmpd/albumignore )'
	, "mpdignore"   : '$( exists $dirmpd/mpdignorelist )'
	, "nonutf8"     : '$( exists $dirmpd/nonutf8 )'
}
, "mixers"         : '$( getContent $dirshm/mixers )'
, "mixertype"      : '$( [[ $( getVar mixertype $dirshm/output ) != none ]] && echo true )'
, "normalization"  : '$( exists $dirmpdconf/normalization.conf )'
, "output"         : '$( conf2json -nocap $dirshm/output )'
, "player"         : "'$( < $dirshm/player )'"
, "pllength"       : '$( mpc status %length% )'
, "replaygain"     : '$( exists $dirmpdconf/replaygain.conf )'
, "replaygainconf" : {
	  "MODE"     : "'$( getVar replaygain $dirmpdconf/conf/replaygain.conf )'"
	, "HARDWARE" : '$( exists $dirsystem/replaygain-hw )'
}
, "soxr"           : '$( exists $dirsystem/soxr )'
, "soxrconf"       : '$( conf2json $dirmpdconf/conf/soxr.conf )'
, "soxrcustomconf" : '$( conf2json $dirmpdconf/conf/soxr-custom.conf )'
, "soxrquality"    : "'$( getContent $dirsystem/soxr )'"
, "state"          : "'$( mpcState )'"
, "updatetime"     : "'$( getContent $dirmpd/updatetime )'"
, "updating_db"    : '$( [[ -e $dirmpd/listing || -e $dirmpd/updating ]] && echo true )'
, "version"        : "'$( pacman -Q mpd 2> /dev/null |  cut -d' ' -f2 )'"
, "volume"         : '$volume

for key in buffer outputbuffer; do
	data+='
, "'$key'"        : '$( exists $dirmpdconf/$key.conf )'
, "'$key'conf"    : '$( cut -d'"' -f2 $dirmpdconf/conf/$key.conf )
done

data2json "$data" $1
