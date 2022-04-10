#!/bin/bash

camillaStart() {
	camilladsp /srv/http/data/camilladsp/configs/camilladsp.yml &> /dev/null &
	if pgrep -x camilladsp &> /dev/null; then
		pkill -x camilladsp &> /dev/null
		systemctl restart camilladsp
		pushRefresh
		exit
	fi
}
pushRefresh() {
	data=$( /srv/http/bash/features-data.sh )
	curl -s -X POST http://127.0.0.1/pub?id=refresh -d "$data"
}

fileyml=/srv/http/data/camilladsp/configs/camilladsp.yml
linedevice=$( sed -n '/playback:/,/device:/=' $fileyml | tail -1 )
card=$( cat /srv/http/data/shm/asoundcard )
sed -i "$linedevice s/\(device: hw:\).*/\1$card,0/" $fileyml

camillaStart

lineformat=$( sed -n '/playback:/,/format:/=' $fileyml | tail -1 )
for format in FLOAT64LE FLOAT32LE S32LE S24LE3 S24LE S16LE; do
	sed -i "$lineformat s/\(format: \).*/\1$format/" $fileyml
	camillaStart
done

pushRefresh # if failed
