#!/bin/bash

. /srv/http/bash/common.sh

systemctl stop camilladsp
killall camilladsp &> /dev/null

dirconfigs=$dircamilladsp/configs
camilladspyml=$dirconfigs/camilladsp.yml
card=$( < $dirsystem/asoundcard )
sed -i -E "/playback:/,/device:/ s/(device: hw:).*/\1$card,0/" $camilladspyml

notify -blink camilladsp CamillaDSP "Set Playback format ..."
for format in FLOAT64LE FLOAT32LE S32LE S24LE3 S24LE S16LE; do
	sed -i -E '/playback:/,/format:/ {/format:/ {s/(.*: ).*/\1'$format'/}}' $camilladspyml
	camilladsp $camilladspyml &> /dev/null &
	sleep 1
	pgrep -x camilladsp &> /dev/null && break || format=
done
if [[ $format ]]; then
	killall camilladsp
	notify camilladsp CamillaDSP "Playback format: <wh>$format</wh>"
else
	dsp=
	notify camilladsp CamillaDSP "Setting failed: <wh>Playback format</wh>" 10000
	rm -f $dirsystem/camilladsp
	sed -i '/pcm.!default/,$ d' /etc/asound.conf
	rmmod snd_aloop
	alsactl store &> /dev/null
	alsactl nrestore &> /dev/null
fi
