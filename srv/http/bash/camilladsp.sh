#!/bin/bash

camillaRestart() {
	systemctl start camilladsp
	sleep 2
	systemctl -q is-active camilladsp && exit
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
