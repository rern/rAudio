#!/bin/bash

dirsystem=/srv/http/data/system

. /srv/http/bash/mpd-devices.sh

for (( i=0; i < cardL; i++ )); do
	# json inside array needs "escaped double quotes"
	devices+='{
		  "aplayname"   : "'${Aaplayname[i]}'"
		, "card"        : '${Acard[i]}'
		, "device"      : '${Adevice[i]}'
		, "dop"         : '${Adop[i]}'
		, "format"      : "'${Aformat[i]}'"
		, "mixers"      : '${Amixers[i]}'
		, "mixertype"   : "'${Amixertype[i]}'"
		, "name"        : "'${Aname[i]}'"
		, "hw"          : "'${Ahw[i]}'"
		, "hwmixer"     : "'${Ahwmixer[i]}'"
	},'
done
devices=${devices:0:-1}
card=$( [[ -e /etc/asound.conf ]] && head -1 /etc/asound.conf | cut -d' ' -f2 || echo 0 )

data='
	  "devices"         : ['$devices']
	, "audioaplayname"  : "'${Aaplayname[$card]}'"
	, "audiooutput"     : "'${Aname[$card]}'"
	, "autoupdate"      : '$( grep -q '^auto_update.*yes' /etc/mpd.conf && echo true || echo false )'
	, "buffer"          : '$( grep -q '^audio_buffer_size' /etc/mpd.conf && echo true || echo false )'
	, "bufferval"       : '$( cat $dirsystem/bufferset 2> /dev/null || echo false )'
	, "bufferoutput"    : '$( grep -q '^max_output_buffer_size' /etc/mpd.conf && echo true || echo false )'
	, "bufferoutputval" : '$( cat $dirsystem/bufferoutputset 2> /dev/null || echo false )'
	, "crossfade"       : '$( [[ $( mpc crossfade | cut -d' ' -f2 ) != 0 ]] && echo true || echo false )'
	, "crossfadeval"    : '$( cat $dirsystem/crossfadeset 2> /dev/null || echo false )'
	, "custom"          : '$( grep -q '#custom$' /etc/mpd.conf && echo true || echo false )'
	, "ffmpeg"          : '$( grep -A1 'plugin.*ffmpeg' /etc/mpd.conf | grep -q yes && echo true || echo false )'
	, "normalization"   : '$( grep -q 'volume_normalization.*yes' /etc/mpd.conf && echo true || echo false )'
	, "reboot"          : "'$( cat /srv/http/data/shm/reboot 2> /dev/null )'"
	, "replaygain"      : '$( grep -q '^replaygain.*off' /etc/mpd.conf && echo false || echo true )'
	, "replaygainval"   : "'$( cat $dirsystem/replaygainset 2> /dev/null )'"
	, "soxr"            : '$( grep -q "quality.*custom" /etc/mpd.conf && echo true || echo false )'
	, "soxrval"         : "'$( grep -v 'quality\|}' $dirsystem/soxrset 2> /dev/null | cut -d'"' -f2 )'"
	, "usbdac"          : "'$( cat /srv/http/data/shm/usbdac 2> /dev/null )'"
'
echo {$data}
