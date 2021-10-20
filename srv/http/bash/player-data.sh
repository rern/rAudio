#!/bin/bash

dirsystem=/srv/http/data/system

. /srv/http/bash/mpd-devices.sh

exists() {
	[[ -e $1 ]] && echo true || echo false
}

active=$( mpc &> /dev/null && echo true )
if [[ -e $dirsystem/soxr.conf ]]; then
	soxrconf="[ $( grep -v 'quality\|}' $dirsystem/soxr.conf | cut -d'"' -f2 | xargs | tr ' ' , ) ]"
else
	soxrconf='[ 20, 50, 91.3, 100, 0, 0 ]'
fi

data='
  "page"             : "player"
, "devices"          : '$devices'
, "active"           : '$active'
, "asoundcard"       : '$i'
, "audioaplayname"   : "'$aplayname'"
, "audiooutput"      : "'$output'"
, "autoupdate"       : '$( grep -q '^auto_update.*yes' /etc/mpd.conf && echo true )'
, "btaplayname"      : "'$( amixer -D bluealsa scontrols 2> /dev/null | cut -d"'" -f2 )'"
, "buffer"           : '$( grep -q '^audio_buffer_size' /etc/mpd.conf && echo true )'
, "bufferconf"       : '$( cat $dirsystem/buffer.conf 2> /dev/null || echo 4096 )'
, "bufferoutput"     : '$( grep -q '^max_output_buffer_size' /etc/mpd.conf && echo true )'
, "bufferoutputconf" : '$( cat $dirsystem/bufferoutput.conf 2> /dev/null || echo 8192 )'
, "counts"           : '$( cat /srv/http/data/mpd/counts 2> /dev/null )'
, "crossfade"        : '$( [[ $active == true && $( mpc crossfade | cut -d' ' -f2 ) != 0 ]] && echo true )'
, "crossfadeconf"    : '$( cat $dirsystem/crossfade.conf 2> /dev/null || echo 1 )'
, "custom"           : '$( exists $dirsystem/custom )'
, "equalizer"        : '$( exists $dirsystem/equalizer )'
, "ffmpeg"           : '$( grep -A1 'plugin.*ffmpeg' /etc/mpd.conf | grep -q yes && echo true )'
, "normalization"    : '$( grep -q 'volume_normalization.*yes' /etc/mpd.conf && echo true )'
, "replaygain"       : '$( ! grep -q '^replaygain.*off' /etc/mpd.conf && echo true )'
, "replaygainconf"   : "'$( cat $dirsystem/replaygain.conf 2> /dev/null || echo auto )'"
, "soxr"             : '$( sed -n '/^resampler/,/}/ p' /etc/mpd.conf | grep -q 'quality.*custom' && echo true )'
, "soxrconf"         : '$soxrconf'
, "version"          : "'$( pacman -Q mpd 2> /dev/null |  cut -d' ' -f2 )'"'

echo {$data} \
	| sed  's/:\s*,/: false,/g
			s/:\s*}/: false }/g
			s/\[\s*,/[ false,/g
			s/,\s*,/, false,/g
			s/,\s*]/, false ]/g' # sed - null > false
