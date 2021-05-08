#!/bin/bash

dirsystem=/srv/http/data/system

. /srv/http/bash/mpd-devices.sh

active=$( mpc &> /dev/null && echo true || echo false )

data='
	  "devices"         : ['$devices']
	, "active"          : '$active'
	, "asoundcard"      : '$i'
	, "audiocd"         : '$( grep -q cdio_paranoia /etc/mpd.conf && echo true || echo false )'
	, "audioaplayname"  : "'${Aaplayname[$i]}'"
	, "audiooutput"     : "'${Aname[$i]}'"
	, "autoupdate"      : '$( grep -q '^auto_update.*yes' /etc/mpd.conf && echo true || echo false )'
	, "buffer"          : '$( grep -q '^audio_buffer_size' /etc/mpd.conf && echo true || echo false )'
	, "bufferval"       : '$( cat $dirsystem/bufferset 2> /dev/null || echo false )'
	, "bufferoutput"    : '$( grep -q '^max_output_buffer_size' /etc/mpd.conf && echo true || echo false )'
	, "bufferoutputval" : '$( cat $dirsystem/bufferoutputset 2> /dev/null || echo false )'
	, "counts"          : '$( cat /srv/http/data/mpd/counts 2> /dev/null || echo false )'
	, "crossfade"       : '$( [[ $active == true && $( mpc crossfade | cut -d' ' -f2 ) != 0 ]] && echo true || echo false )'
	, "crossfadeval"    : '$( cat $dirsystem/crossfadeset 2> /dev/null || echo false )'
	, "custom"          : '$( grep -q '#custom$' /etc/mpd.conf && echo true || echo false )'
	, "ffmpeg"          : '$( grep -A1 'plugin.*ffmpeg' /etc/mpd.conf | grep -q yes && echo true || echo false )'
	, "normalization"   : '$( grep -q 'volume_normalization.*yes' /etc/mpd.conf && echo true || echo false )'
	, "reboot"          : "'$( cat /srv/http/data/shm/reboot 2> /dev/null )'"
	, "replaygain"      : '$( grep -q '^replaygain.*off' /etc/mpd.conf && echo false || echo true )'
	, "replaygainval"   : "'$( cat $dirsystem/replaygainset 2> /dev/null )'"
	, "soxr"            : '$( grep -q "quality.*custom" /etc/mpd.conf && echo true || echo false )'
	, "soxrval"         : "'$( grep -v 'quality\|}' $dirsystem/soxrset 2> /dev/null | cut -d'"' -f2 )'"
	, "version"         : "'$( pacman -Q mpd 2> /dev/null |  cut -d' ' -f2 )'"
'
echo {$data}
