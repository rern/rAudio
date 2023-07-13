#!/bin/bash

file=/srv/http/data/system/camilla.conf
if [[ -e $file ]]; then
	. $file
	[[ ! $controls ]] && controls=false
	[[ ! $capture_playback ]] && capture_playback=false
else
	controls=false
	capture_playback=false
fi
display='"camillaconf": { "controls": '$controls', "capture_playback": '$capture_playback' }'
[[ $1 ]] && echo '{ "page": "camilla", '$display' }' && exit

data=$( /srv/http/bash/settings/camilla.py data )

echo ${data:0:-1}', '$display' }'
