#!/bin/bash

### included by <<< player-conf.sh
[[ ! $dirbash ]] && . /srv/http/bash/common.sh     # if run directly
[[ ! $CARD ]] && CARD=$( < $dirsystem/asoundcard ) # if run directly

if [[ -e $dirshm/btreceiver ]]; then
	bluetooth=$( < $dirshm/btreceiver )
	systemctl -q is-active localbrowser && action=stop || action=start
	systemctl $action bluetoothbutton
else
	systemctl stop bluetoothbutton
fi
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

echo "$ASOUNDCONF" >> /etc/asound.conf # append after default lines set by player-devices.sh

# ----------------------------------------------------------------------------
if [[ $( getContent $dirsystem/audio-aplayname ) == cirrus-wm5102 ]]; then
	output=$( getContent $dirsystem/mixer-cirrus-wm5102 'HPOUT2 Digital' )
	$dirsettings/player-wm5102.sh $CARD "$output"
fi

if [[ $camilladsp ]]; then
	# must stop for exclusive device access - aplay probing
	$dirbash/cmd.sh playerstop
	if systemctl -q is-active camilladsp; then
		active=1
		systemctl stop camilladsp
	fi
	
	filedump=$dirshm/aplaydump
	for c in Loopback $CARD; do
		script -qc "timeout 0.1 aplay -D hw:$c /dev/zero --dump-hw-params" > $filedump
		lines=$( < $filedump )
		rm $filedump
		CHANNELS+=( $( awk '/^CHANNELS/ {print $NF}' <<< $lines | tr -d ']\r' ) )
		formats=$( sed -n '/^FORMAT/ {s/_3LE/LE3/; s/FLOAT_LE/FLOAT32LE/; s/^.*: *\|[_\r]//g; s/ /\n/g; p}' <<< $lines )
		listformat=
		for f in FLOAT64LE FLOAT32LE S32LE S24LE3 S24LE S16LE; do
			grep -q $f <<< $formats && listformat+=', "'$f'"'
		done
		FORMATS+=( "[ ${listformat:1} ]" )
		if [[ $c == Loopback ]]; then
			ratemax=$( awk '/^RATE/ {print $NF}' <<< $lines | tr -d ']\r' )
			for r in 44100 48000 88200 96000 176400 192000 352800,384000 705600 768000; do
				(( $r > $ratemax )) && break || SAMPLINGS+=', "'$( sed 's/...$/,&/' <<< $r )'": '$r
			done
		fi
	done
########
	echo '{
	  "capture"  : '${CHANNELS[0]}'
	, "playback" : '${CHANNELS[1]}'
}' > $dirshm/channels
	echo '{
	  "capture"  : '${FORMATS[0]}'
	, "playback" : '${FORMATS[1]}'
}' > $dirshm/formats
	echo "{ ${SAMPLINGS:1} }" > $dirshm/samplings
########
	if [[ ! $bluetooth ]]; then
		mv -f /etc/default/camilladsp{.backup,}
		fileformat="$dirsystem/camilla-$NAME"
		[[ -e $fileformat ]] && FORMAT=$( getContent "$fileformat" ) || FORMAT=$( jq -r .playback[0] $dirshm/formats )
		format0=$( getVarColon playback format "$fileconf" )
		if [[ $format0 != $FORMAT ]]; then
			sed -i -E '/playback:/,/format:/ s/^(\s*format: ).*/\1'$FORMAT'/' "$fileconf"
			echo $FORMAT > "$fileformat"
		fi
		card0=$( getVarColon playback device "$fileconf" | cut -c4 )
		[[ $card0 != $CARD ]] && sed -i -E '/playback:/,/device:/ s/(device: "hw:).*/\1'$CARD',0"/' "$fileconf"
	fi
	systemctl start camilladsp
	[[ $active ]] && $dirsettings/camilla-data.sh pushrefresh
else
	if [[ -e $dirsystem/equalizer && -e $dirsystem/equalizer.json ]]; then
		value=$( getVarColon current $dirsystem/equalizer.json )
		[[ $( < $dirshm/player ) =~ (airplay|spotify) ]] && user=root || user=mpd
		$dirbash/cmd.sh "equalizer
$value
$user
CMD VALUE USER"
	fi
fi
