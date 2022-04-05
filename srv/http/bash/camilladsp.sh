#!/bin/bash

ccv=$( /srv/http/bash/cmd.sh volumecontrolget )
card=${ccv/^*}
control=$( echo $ccv | cut -d^ -f2 ) # keep trailing space if any
volume=${ccv/*^}
[[ ! $control ]] && exit

amixer -c $card -Mq sset "$control" 0% # mute

cardl=$( aplay -l \
			| grep 'Loopback.*device 0' \
			| sed 's/^card \(.\):.*$/\1/' )
aplay -D hw:$cardl,0 /srv/http/assets/sound/3seconds.wav  &> /dev/null &
sleep 2
format=$( grep -r ^format: /proc/asound/card$cardl/pcm*p \
			| awk '{print $NF}' \
			| tr -d _ )
			
amixer -c $card -Mq sset "$control" $volume% # unmute

[[ ! $format ]] && exit

fileyml=/srv/http/data/camilladsp/configs/camilladsp.yml
linedevice=$( sed -n '/playback:/,/device:/=' $fileyml | tail -1 )
lineformat=$( sed -n '/playback:/,/format:/=' $fileyml | tail -1 )
sed -i -e "$linedevice s/\(device: \).*/\1hw:$card,0/
" -e "$lineformat s/\(format: \).*/\1$format/
" $fileyml

systemctl restart camilladsp
