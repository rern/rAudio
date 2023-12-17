#!/bin/bash

. /srv/http/bash/common.sh

dircoeffs=$dircamilladsp/coeffs
dirconfigs=$dircamilladsp/configs

saveConfig() {
	configfile=$( getVar CONFIG /etc/default/camilladsp )
	config=$( echo '"GetConfig"' | websocat ws://127.0.0.1:1234 )
	echo -e "$config " | sed 's/.*GetConfig.*/---/; $d; s/\\"/"/g' > "$configfile"
}

args2var "$1"

case $CMD in

camilla )
	pushData camilla $( conf2json camilla.conf )
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
	saveConfig
	sed -i -E "s|^(CONFIG=).*|\1$PATH|" /etc/default/camilladsp
	
	;;
restart )
	systemctl restart camilladsp
	;;
saveconfig )
	saveConfig
	;;
setformat )
	card=$( < $dirsystem/asoundcard )
	configfile=$( getVar CONFIG /etc/default/camilladsp )
	sed -i -E "/playback:/,/device:/ s/(device: hw:).*/\1$card,0/" $configfile
	notify 'camilladsp blink' CamillaDSP "Set Playback format ..."
	formats=( FLOAT64LE FLOAT32LE S32LE S24LE3 S24LE S16LE )
	for (( i=0; i < 6; i++ )); do
		format=${formats[i]}
		sed -i -E '/playback:/,/format:/ {/format:/ {s/(.*: ).*/\1'$format'/}}' $configfile
		camilladsp $configfile &> /dev/null &
		sleep 1
		if pgrep -x camilladsp &> /dev/null; then
			killall camilladsp
			break
		else
			format=
		fi
	done
	if [[ $format ]]; then
		notify camilladsp CamillaDSP "Playback format: <wh>$format</wh>"
		sed -E 's/ /" "/g; s/^|$/"/g' <<< ${formats[@]:i} > $dirsystem/camilladsp
	else
		notify camilladsp CamillaDSP "Setting failed: <wh>Playback format</wh>" 10000
		$dirsettings/features.sh camilladsp
		exit
	fi
	;;
statusconfiguration )
	[[ ! $FILE ]] && FILE=$( getVar CONFIG /etc/default/camilladsp )
	cat "$FILE"
	;;
statuslog )
	cat /var/log/camilladsp.log
	;;
volume )
	$dirbash/cmd.sh "$1"
	;;
	
esac

