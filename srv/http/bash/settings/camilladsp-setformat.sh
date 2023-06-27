#!/bin/bash

. /srv/http/bash/common.sh

systemctl stop camilladsp

dirconfigs=$dircamilladsp/configs
camilladspyml=$dirconfigs/camilladsp.yml
card=$( < $dirsystem/asoundcard )
sed -i -E "/playback:/,/device:/ s/(device: hw:).*/\1$card,0/" $camilladspyml

killProcess camilladsp
camilladsp $camilladspyml &> /dev/null &
echo $! > $dirshm/pidcamilladsp
sleep 1
if pgrep -x camilladsp &> /dev/null; then
	formatok=1
else
	notify -blink camilladsp CamillaDSP "Set Playback format ..."
	lineformat=$( sed -n '/playback:/,/format:/ {/format:/ =}' $camilladspyml )
	for format in FLOAT64LE FLOAT32LE S32LE S24LE3 S24LE S16LE; do
		sed -i -E "$lineformat s/(format: ).*/\1$format/" $camilladspyml
		killProcess camilladsp
		camilladsp $camilladspyml &> /dev/null &
		echo $! > $dirshm/pidcamilladsp
		sleep 1
		if pgrep -x camilladsp &> /dev/null; then
			formatok=1
			break
		fi
	done
fi
if [[ $formatok ]]; then
	if [[ $format ]]; then
		notify camilladsp CamillaDSP "Playback format: <wh>$format</wh>"
		defaultyml=$dirconfigs/default_config.yml
		lineformat=$( sed -n '/playback:/,/format:/ {/format:/ =}' $defaultyml )
		sed -i -E "$lineformat s/(format: ).*/\1$format/" $defaultyml
	fi
	sleep 1
	systemctl start camilladsp
	camilladsp-gain.py set
else
	notify camilladsp CamillaDSP "Playback format: <wh>Setting required</wh>" 10000
fi
killProcess camilladsp
