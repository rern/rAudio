#!/bin/bash

. /srv/http/bash/common.sh

$dirbash/cmd.sh volumetempmute
mpc -q play

loopbackcard=$( aplay -l \
					| grep Loopback \
					| head -1 \
					| sed 's/^card \(.\):.*$/\1/' )
sleep 3
format=$( grep -r ^format: /proc/asound/card$loopbackcard/pcm*p \
			| awk '{print $NF}' \
			| tr -d _ )

mpc -q stop
[[ ! $format ]] && exit

fileyml=$dirdata/camilladsp/configs/camilladsp.yml
linedevice=$( sed -n '/playback:/,/device:/=' $fileyml | tail -1 )
lineformat=$( sed -n '/playback:/,/format:/=' $fileyml | tail -1 )
sed -i -e "$linedevice s/\(device: \).*/\1hw:$card,0/
" -e "$lineformat s/\(format: \).*/\1$format/
" $fileyml

systemctl restart camilladsp
