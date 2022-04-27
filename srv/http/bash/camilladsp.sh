#!/bin/bash

. /srv/http/bash/common.sh

fileyml=$dirdata/camilladsp/configs/camilladsp.yml
linedevice=$( sed -n '/playback:/,/device:/=' $fileyml | tail -1 )
card=$( cat $dirshm/asoundcard )
sed -i "$linedevice s/\(device: hw:\).*/\1$card,0/" $fileyml
camilladsp $fileyml &> /dev/null &
sleep 1
if pgrep -x camilladsp &> /dev/null; then
	pkill -x camilladsp
else
	lineformat=$( sed -n '/playback:/,/format:/=' $fileyml | tail -1 )
	for format in FLOAT64LE FLOAT32LE S32LE S24LE3 S24LE S16LE; do
		sed -i "$lineformat s/\(format: \).*/\1$format/" $fileyml
		camilladsp $fileyml &> /dev/null &
		sleep 1
		if pgrep -x camilladsp &> /dev/null; then
			pkill -x camilladsp
			break
		fi
	done
fi
systemctl start camilladsp
pushstream refresh "$( $dirbash/settings/features-data.sh )"