#!/bin/bash

. /srv/http/bash/common.sh

dircoeffs=$dircamilladsp/coeffs
dirconfigs=$dircamilladsp/configs

args2var "$1"

case $CMD in

camilla )
	pushstream camilla $( conf2json camilla.conf )
	;;
clippedreset )
	echo $CLIPPED > $dirshm/clipped
	pushRefresh
	;;
coefdelete )
	rm -f $dircoeffs/"$NAME"
	pushRefresh
	;;
coefrename )
	mv -f $dircoeffs/{"$NAME","$NEWNAME"}
	pushRefresh
	;;
confcopy )
	[[ $BT == true ]] && dirconfig+=-bt
	cp -f $dirconfigs/{"$NAME","$NEWNAME"}
	pushRefresh
	;;
confdelete )
	[[ $BT == true ]] && dirconfig+=-bt
	rm -f $dirconfigs/"$NAME"
	pushRefresh
	;;
confrename )
	[[ $BT == true ]] && dirconfig+=-bt
	mv -f $dirconfigs/{"$NAME","$NEWNAME"}
	pushRefresh
	;;
confswitch )
	sed -i -E "s|^(CONFIG.*/).*|\1$NAME.yml|" /etc/default/camilladsp
	pushRefresh
	;;
restart )
	systemctl restart camilladsp
	;;
setformat )
	systemctl stop camilladsp
	killall camilladsp &> /dev/null

	card=$( < $dirsystem/asoundcard )
	configfile=$( getVar CONFIG /etc/default/camilladsp )
	sed -i -E "/playback:/,/device:/ s/(device: hw:).*/\1$card,0/" $configfile
	camilladsp $configfile &> /dev/null &
	pgrep -x camilladsp &> /dev/null && killall camilladsp && exit

	notify -blink camilladsp CamillaDSP "Set Playback format ..."
	for format in FLOAT64LE FLOAT32LE S32LE S24LE3 S24LE S16LE; do
		sed -i -E '/playback:/,/format:/ {/format:/ {s/(.*: ).*/\1'$format'/}}' $configfile
		camilladsp $configfile &> /dev/null &
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
statuslog )
	cat /var/log/camilladsp.log
	;;
volume|volumepushstream )
	$dirbash/cmd.sh "$1"
	;;
	
esac

