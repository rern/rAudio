#!/bin/bash

. /srv/http/bash/common.sh

dirconfigs=$dircamilladsp/configs
camilladspyml=$dirconfigs/camilladsp.yml

switchConfig() {
	$dirsettings/camilla.py switch "$1"
	pushData
}

args2var "$1"

pushData() {
	killall -s SIGHUP camilladsp # instead of systemctl restart camilladsp
	data=$( $dirsettings/camilla.py data )
	pushstream refresh $( $dirsettings/camilla.py data )
	sleep 5 # wait for starting ready
	pushstream refresh $( $dirsettings/camilla.py status )
}

case $CMD in

confcopy )
	cp -f $dirconfigs/{"$NAME","$NEWNAME"}.yml
	switchConfig "$NEWNAME"
	;;
confdelete )
	rm -f $dirconfigs/"$NAME".yml
	[[ ! -e $dirconfigs ]] && cp $dirconfigs/{default_config,camilladsp}.yml
	switchConfig camilladsp
	;;
confrename )
	mv -f $dirconfigs/{"$NAME","$NEWNAME"}.yml
	switchConfig "$NEWNAME"
	;;
confsave )
	$dirsettings/camilla.py save "$JSON"
	pushData
	;;
confswitch )
	switchConfig "$NAME"
	;;
enable_rate_adjust | enable_resampling | stop_on_rate_change )
	file=$( $dirsettings/camilla.py configfile | cut -d'"' -f4 )
	sed -E -i "s/($CMD: ).*/\1$TF/" "$dirconfigs/$file"
	pushData
	;;
setformat )
	systemctl stop camilladsp
	killall camilladsp &> /dev/null

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
	
esac

