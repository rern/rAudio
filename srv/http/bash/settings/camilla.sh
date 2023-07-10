#!/bin/bash

. /srv/http/bash/common.sh

args2var "$1"

pushData() {
	killall -s SIGHUP camilladsp
	sleep 4
	data=$( $dirsettings/camilla.py data ) 
	pushstream refresh "$data"
}

case $CMD in

save )
	filejson=$dirsystem/$CMD.json
	$dirsettings/camilla.py save $filejson
	rm $filejson
	pushData
	;;
stop_on_rate_change )
	file=$( $dirsettings/camilla.py configname | cut -d'"' -f4 )
	sed -E -i "s/(stop_on_rate_change: ).*/\1$TF/" "$dircamilladsp/configs/$file"
	pushData
	;;
setformat )
	systemctl stop camilladsp
	killall camilladsp &> /dev/null

	dirconfigs=$dircamilladsp/configs
	camilladspyml=$dirconfigs/camilladsp.yml
	card=$( < $dirsystem/asoundcard )
	sed -i -E "/playback:/,/device:/ s/(device: hw:).*/\1$card,0/" $camilladspyml
	camilladsp $camilladspyml &> /dev/null &
	pgrep -x camilladsp &> /dev/null && killall camilladsp && exit

	notify -blink camilladsp CamillaDSP "Set Playback format ..."
	for format in FLOAT64LE FLOAT32LE S32LE S24LE3 S24LE S16LE; do
		sed -i -E '/playback:/,/format:/ {/format:/ {s/(.*: ).*/\1'$format'/}}' $camilladspyml
		camilladsp $camilladspyml &> /dev/null &
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
	;;
* )
	settings/camilla.py $CMD "${args[2]}"
	;;
	
esac

