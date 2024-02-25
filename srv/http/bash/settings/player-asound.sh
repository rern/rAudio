#!/bin/bash

### included by <<< player-conf.sh
[[ ! $dirbash ]] && . /srv/http/bash/common.sh     # if run directly
[[ ! $CARD ]] && CARD=$( < $dirsystem/asoundcard ) # if run directly

bluetooth=$( getContent $dirshm/btreceiver )
if [[ -e $dirsystem/camilladsp ]]; then
	modprobe snd_aloop
	if ! aplay -l | grep -q Loopback; then
		error='<c>Loopback</c> not available &emsp;'
		rmmod snd-aloop &> /dev/null
	fi
	fileconf=$( getVar CONFIG /etc/default/camilladsp )
	! camilladsp -c "$fileconf" &> /dev/null && error+="<c>$fileconf</c> not valid"
	if [[ $error ]]; then
		notify 'warning yl' CamillaDSP "Error: $error" -1
		rm $dirsystem/camilladsp
		$dirsettings/player-conf.sh
		exit
	fi
	
	camilladsp=1
	channels=$( getVarColon capture channels "$fileconf" )
	format=$( getVarColon capture format "$fileconf" )
	samplerate=$( getVarColon samplerate "$fileconf" )
########
	ASOUNDCONF+='
pcm.!default { 
	type plug 
	slave.pcm camilladsp
}
pcm.camilladsp {
	type plug
	slave {
		pcm {
			type     hw
			card     Loopback
			device   0
			channels '$channels'
			format   '$format'
			rate     '$samplerate'
		}
	}
}
ctl.!default {
	type hw
	card Loopback
}
ctl.camilladsp {
	type hw
	card Loopback
}'
else
	systemctl stop camilladsp
	rmmod snd-aloop &> /dev/null
	if [[ $bluetooth ]]; then
########
		ASOUNDCONF+='
pcm.bluealsa {
	type plug
	slave.pcm {
		type bluealsa
		device 00:00:00:00:00:00
		profile "a2dp"
	}
}'
	fi
	if [[ -e $dirsystem/equalizer ]]; then
		if [[ $bluetooth ]]; then
			slavepcm=bluealsa
		elif [[ $CARD != -1 ]]; then
			slavepcm='"plughw:'$CARD',0"'
		fi
		if [[ $slavepcm ]]; then
			equalizer=1
########
			ASOUNDCONF+='
pcm.!default {
	type plug
	slave.pcm plugequal
}
pcm.plugequal {
	type equal
	slave.pcm '$slavepcm'
}
ctl.equal {
	type equal
}'
		fi
	fi
fi

alsactl store &> /dev/null
echo "$ASOUNDCONF" >> /etc/asound.conf # append after set default by player-devices.sh
alsactl nrestore &> /dev/null # notify changes to running daemons

# ----------------------------------------------------------------------------
if [[ $( getContent $dirsystem/audio-aplayname ) == cirrus-wm5102 ]]; then
	output=$( getContent $dirsystem/mixer-cirrus-wm5102 'HPOUT2 Digital' )
	$dirsettings/player-wm5102.sh $CARD "$output"
fi

if [[ $camilladsp ]]; then
	if systemctl -q is-active camilladsp; then
		active=1
		systemctl stop camilladsp # must be stop for probing
	fi
	for c in $CARD Loopback; do
		[[ $c == Loopback ]] && type=-c || type=-p
		file=$dirshm/listformat$type
		script -c "timeout 0.1 aplay -D hw:$c /dev/zero --dump-hw-params" > $file
		if [[ $c == Loopback ]]; then
			ratemax=$( awk '/^RATE/ {print $NF}' $file | tr -d ']\r' )
			for r in 44100 48000 88200 96000 176400 192000 352800,384000 705600 768000; do
				(( $r > $ratemax )) && break || listsample+=', "'$( sed 's/...$/,&/' <<< $r )'": '$r
			done
			echo "{ ${listsample:1} }" > $dirshm/listsample
			awk '/^CHANNELS/ {print $NF}' $file | tr -d ']\r' > $dirshm/channels-c
		else
			awk '/^CHANNELS/ {print $NF}' $file | tr -d ']\r' > $dirshm/channels-p
		fi
		formats=$( sed -n '/^FORMAT/ {s/_3LE/LE3/; s/FLOAT_LE/FLOAT32LE/; s/^.*: *\|[_\r]//g; s/ /\n/g; p}' $file )
		for f in FLOAT64LE FLOAT32LE S32LE S24LE3 S24LE S16LE; do
			grep -q $f <<< $formats && listformat+=', "'$f'"'
		done
		echo "[ ${listformat:1} ]" > $file
	done
	if [[ $bluetooth ]]; then
		! grep -q configs-bt /etc/default/camilladsp && $dirsettings/camilla-bluetooth.sh receiver
	else
		grep -q configs-bt /etc/default/camilladsp && mv -f /etc/default/camilladsp{.backup,}
		fileformat="$dirsystem/camilla-$NAME"
		[[ -e $fileformat ]] && FORMAT=$( getContent "$fileformat" ) || FORMAT=$( cut -d'"' -f2 $dirshm/listformatp )
		format0=$( getVarColon playback format "$fileconf" )
		if [[ $format0 != $FORMAT ]]; then
			sed -i -E '/playback:/,/format:/ s/^(\s*format: ).*/\1'$FORMAT'/' "$fileconf"
			echo $FORMAT > "$fileformat"
		fi
		card0=$( getVarColon playback device "$fileconf" | cut -c4 )
		[[ $card0 != $CARD ]] && sed -i -E '/playback:/,/device:/ s/(device: "hw:).*/\1'$CARD',0"/' "$fileconf"
	fi
	systemctl start camilladsp
	[[ $active ]] && $dirsettings/camilla-data.sh push
else
	if [[ $bluetooth ]]; then
		if [[ -e "$dirsystem/btvolume-$bluetooth" ]]; then
			btvolume=$( < "$dirsystem/btvolume-$bluetooth" )
			amixer -MqD bluealsa sset "$bluetooth" $btvolume% 2> /dev/null
		fi
	fi
	if [[ -e $dirsystem/equalizer && -e $dirsystem/equalizer.json ]]; then
		value=$( getVarColon current $dirsystem/equalizer.json )
		[[ $( < $dirshm/player ) =~ (airplay|spotify) ]] && user=root || user=mpd
		$dirbash/cmd.sh "equalizer
$value
$user
CMD VALUE USER"
	fi
fi

if [[ $bluetooth ]]; then
	systemctl -q is-active localbrowser && action=stop || action=start
	systemctl $action bluetoothbutton
else
	systemctl stop bluetoothbutton
fi
