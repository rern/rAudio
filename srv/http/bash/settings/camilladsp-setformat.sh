#!/bin/bash

. /srv/http/bash/common.sh

systemctl stop camilladsp
killall camilladsp &> /dev/null

dirconfigs=$dircamilladsp/configs
camilladspyml=$dirconfigs/camilladsp.yml
card=$( < $dirsystem/asoundcard )
sed -i -E "/playback:/,/device:/ s/(device: hw:).*/\1$card,0/" $camilladspyml

camilladsp $camilladspyml &> /dev/null &
sleep 1
if pgrep -x camilladsp &> /dev/null; then
	formatok=1
else
	notify -blink camilladsp CamillaDSP "Set Playback format ..."
	lineformat=$( sed -n '/playback:/,/format:/ {/format:/ =}' $camilladspyml )
	for format in FLOAT64LE FLOAT32LE S32LE S24LE3 S24LE S16LE; do
		sed -i -E "$lineformat s/(format: ).*/\1$format/" $camilladspyml
		camilladsp $camilladspyml &> /dev/null &
		sleep 1
		if pgrep -x camilladsp &> /dev/null; then
			formatok=1
			break
		fi
	done
fi
if [[ $formatok ]]; then
	killall camilladsp
	if [[ $format ]]; then
		notify camilladsp CamillaDSP "Playback format: <wh>$format</wh>"
		sed -i -n '/playback:/,/format:/ {/format:/ {s/:.*/: '$format'/; p}}' $dirconfigs/default_config.yml
	fi
else
	dsp=
	notify camilladsp CamillaDSP "Setting failed: <wh>Playback format</wh>" 10000
	rm -f $dirsystem/camilladsp
	sed -i '/pcm.!default/,$ d' /etc/asound.conf
	rmmod snd_aloop
	alsactl store &> /dev/null
	alsactl nrestore &> /dev/null
fi
