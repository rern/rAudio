#!/bin/bash

. /srv/http/bash/common.sh

dircoeffs=$dircamilladsp/coeffs
dirconfigs=$dircamilladsp/configs
[[ $BT == true ]] && dirconfig+=-bt

args2var "$1"

case $CMD in

clippedreset )
	echo $CLIPPED > $dirshm/clipped
	;;
coefdelete )
	rm -f $dircoeffs/"$NAME"
	;;
coefrename )
	mv -f $dircoeffs/{"$NAME","$NEWNAME"}
	;;
confcopy )
	cp -f $dirconfigs/{"$NAME","$NEWNAME"}
	;;
confdelete )
	rm -f $dirconfigs/"$NAME"
	;;
confrename )
	mv -f $dirconfigs/{"$NAME","$NEWNAME"}
	;;
confswitch )
	sed -i -E "s|^(CONFIG=).*|\1$CONFIG|" /etc/default/camilladsp
	;;
devices )
	declare -A CHANNELS DEVICES FORMATS SAMPLINGS
	# capture
	if [[ -e $dirshm/btsource ]]; then # send from source client
		DEVICES[c]='{ "BlueALSA": "Bluez" }'
		DEV=bluealsa
	else
		DEVICES[c]='{ "Loopback": "hw:Loopback,0" }'
		DEV=Loopback
	fi
	# playback
	if [[ -e $dirshm/btmixer ]]; then # send from rAudio
		DEVICES[p]='{ "BlueALSA": "bluealsa" }'
		DEV+=' bluealsa'
	else
		DEVICES[p]=$( < $dirshm/devices )
		DEV+=" $( getVar card $dirshm/output )"
	fi

	for D in $DEV; do
		[[ ! $c_p ]] && c_p=c || c_p=p
		if [[ $D == bluealsa ]] then
			DEVICE=$D
			read formats channels sampling < <( bluealsa-aplay -L | sed -n -E '/channel.*Hz$/ {s/.*: | channels*| Hz//g; p}' )
			CHANNELS[$c_p]=$channels
			SAMPLINGS[$c_p]=', "'$( sed 's/...$/,&/' <<< $sampling )'": '$sampling
		else
			DEVICE=hw:$D
			lines=$( timeout 0.1 aplay --dump-hw-params -D $DEVICE /dev/zero 2>&1 | sed -n '/^ACCESS.*MMAP/,/^TICK/ p' )
			formats=$( awk -F':' '/^FORMAT/ {print $2}' <<< $lines )
			CHANNELS[$c_p]=$( awk '/^CHANNELS/ {print $NF}' <<< $lines | tr -d ']' )
			ratemax=$( awk -F'[][ ]+' '/^RATE/ {print $3}' <<< $lines )
			for r in 44100 48000 88200 96000 176400 192000 352800 384000 705600 768000; do
				(( $r > $ratemax )) && break || SAMPLINGS[$c_p]+=', "'$( sed 's/...$/,&/' <<< $r )'": '$r
			done
		fi
		list_f=
		list_s=
		for f in $formats; do # S16_LE S24_3_LE S24_4_LE S32_LE F32_LE F64_LE
			[[ $f == *BE || ( $f != F* && $f != S* ) ]] && continue
			
			case $f in
				FLOAT_LE )   f=F32_LE;;
				FLOAT64_LE ) f=F64_LE;;
				S24_3LE )    f=S24_3_LE;;
				S24_LE )     f=S24_4_LE;;
			esac
			format_list+="$f "
			lbl="$f (${f:1:2}bit "
			case ${f:4:1} in
				3 ) lbl+='int-packed)';;
				4 ) lbl+='int-padded)';;
				* ) lbl+='integer)';;
			esac
			list=$'\n, "'$lbl'": "'$f'"'
			[[ $f == F* ]] && list_f+=$list || list_s+=$list
		done
		FORMATS[$c_p]="{ \"Auto\": null $( sort -d <<< $list_s ) $( sort -d <<< $list_f ) }"
	done
	######## >
	data='
	  "capture"  : {
		  "device"    : '${DEVICES[c]}'
		, "channels"  : '${CHANNELS[c]}'
		, "formats"   : '${FORMATS[c]}'
		, "samplings" : { '${SAMPLINGS[c]:1}' }
	}
	, "playback" : {
		  "device"    : '${DEVICES[p]}'
		, "channels"  : '${CHANNELS[p]}'
		, "formats"   : '${FORMATS[p]}'
		, "samplings" : { '${SAMPLINGS[p]:1}' }
	}'
	echo "{ $data }"
	;;
mixer.* ) # hw volume
	$CMD
	;;
mute )
	file_volumemute=$dirsystem/volumemute
	(( $VOLUME > 0 )) && echo $VOLUME > $file_volumemute || rm -f $file_volumemute
	;;
saveconfig )
	$dirbash/status -c GetConfig | jq -r .GetConfig.value > "$FILECONFIG"
	;;
	
esac

[[ ${CMD:0:1} == c ]] && pushRefresh
