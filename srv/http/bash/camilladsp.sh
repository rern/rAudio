#!/bin/bash

camillaRestart() {
	camilladsp /srv/http/data/camilladsp/configs/camilladsp.yml &> /dev/null &
	if pgrep -x camilladsp &> /dev/null; then
		pkill -x camilladsp &> /dev/null
		systemctl start camilladsp
		touch /srv/http/data/system/camilladsp
		data=$( /srv/http/bash/features-data.sh )
		curl -s -X POST http://127.0.0.1/pub?id=refresh -d "$data"
		exit
	fi
}

fileyml=/srv/http/data/camilladsp/configs/camilladsp.yml
linedevice=$( sed -n '/playback:/,/device:/=' $fileyml | tail -1 )
card=$( cat /srv/http/data/shm/asoundcard )
sed -i "$linedevice s/\(device: hw:\).*/\1$card,0/" $fileyml

camillaRestart

lineformat=$( sed -n '/playback:/,/format:/=' $fileyml | tail -1 )
for format in S16LE S24LE S24LE3 S32LE FLOAT32LE FLOAT64LE; do
	sed -i "$lineformat s/\(format: \).*/\1$format/" $fileyml
	camillaRestart
done

# if failed
/srv/http/bash/features.sh camilladsp
