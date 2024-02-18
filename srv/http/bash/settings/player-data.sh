#!/bin/bash

! mpc &> /dev/null && echo notrunning && exit

. /srv/http/bash/common.sh

crossfade=$( mpc crossfade | cut -d' ' -f2 )
lists='{
  "albumignore" : '$( exists $dirmpd/albumignore )'
, "mpdignore"   : '$( exists $dirmpd/mpdignorelist )'
, "nonutf8"     : '$( exists $dirmpd/nonutf8 )'
}'
[[ $( getVar mixertype $dirshm/output ) == none ]] && mixernone=true
if [[ $mixernone \
	&& $crossfade == 0 \
	&& ! $( ls $dirsystem/{camilladsp,equalizer} 2> /dev/null ) \
	&& ! $( ls $dirmpdconf/{normalization,replaygain,soxr}.conf 2> /dev/null ) ]]; then
	novolume=true
else
	[[ -e $dirshm/amixercontrol || -e $dirshm/btreceiver ]] && volume=$( volumeGet valdb hw )
fi
replaygainconf='{
  "TYPE"     : "'$( getVar replaygain $dirmpdconf/conf/replaygain.conf )'"
, "HARDWARE" : '$( exists $dirsystem/replaygain-hw )'
}'

. <( grep -E '^player|^state' $dirshm/status )
##########
data='
, "asoundcard"       : '$( getContent $dirsystem/asoundcard )'
, "autoupdate"       : '$( exists $dirmpdconf/autoupdate.conf )'
, "bluetooth"        : '$( rfkill | grep -q bluetooth && echo true )'
, "btaplayname"      : "'$( getContent $dirshm/btreceiver )'"
, "buffer"           : '$( exists $dirmpdconf/buffer.conf )'
, "bufferconf"       : { "KB": '$( cut -d'"' -f2 $dirmpdconf/conf/buffer.conf )' }
, "camilladsp"       : '$( exists $dirsystem/camilladsp )'
, "counts"           : '$( < $dirmpd/counts )'
, "crossfade"        : '$( [[ $crossfade != 0 ]] && echo true )'
, "crossfadeconf"    : { "SEC": '$crossfade' }
, "custom"           : '$( exists $dirmpdconf/custom.conf )'
, "dabradio"         : '$( systemctl -q is-active mediamtx && echo true )'
, "devicewithbt"     : '$( exists $dirsystem/devicewithbt )'
, "dop"              : '$( exists "$dirsystem/dop-$aplayname" )'
, "equalizer"        : '$( exists $dirsystem/equalizer )'
, "ffmpeg"           : '$( exists $dirmpdconf/ffmpeg.conf )'
, "lastupdate"       : "'$( date -d "$( mpc stats | sed -n '/^DB Updated/ {s/.*: \+//; p }' )" '+%Y-%m-%d <gr>• %H:%M</gr>' )'"
, "lists"            : '$lists'
, "listdevice"       : '$( getContent $dirshm/listdevice )'
, "listmixer"        : '$( getContent $dirshm/listmixer )'
, "mixertype"        : '$( [[ ! $mixernone ]] && echo true )'
, "normalization"    : '$( exists $dirmpdconf/normalization.conf )'
, "novolume"         : '$novolume'
, "output"           : '$( conf2json -nocap $dirshm/output )'
, "outputbuffer"     : '$( exists $dirmpdconf/outputbuffer.conf )'
, "outputbufferconf" : { "KB": '$( cut -d'"' -f2 $dirmpdconf/conf/outputbuffer.conf )' }
, "player"           : "'$player'"
, "pllength"         : '$( mpc status %length% )'
, "replaygain"       : '$( exists $dirmpdconf/replaygain.conf )'
, "replaygainconf"   : '$replaygainconf'
, "soxr"             : '$( exists $dirsystem/soxr )'
, "soxrconf"         : '$( conf2json $dirmpdconf/conf/soxr.conf )'
, "soxrcustomconf"   : '$( conf2json $dirmpdconf/conf/soxr-custom.conf )'
, "soxrquality"      : "'$( getContent $dirsystem/soxr )'"
, "state"            : "'$state'"
, "updatetime"       : "'$( getContent $dirmpd/updatetime )'"
, "updating_db"      : '$( [[ -e $dirmpd/listing ]] || mpc | grep -q ^Updating && echo true )'
, "version"          : "'$( pacman -Q mpd 2> /dev/null |  cut -d' ' -f2 )'"
, "volume"           : '$volume

data2json "$data" $1
