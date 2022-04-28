#!/bin/bash

### includedby < mpd-conf.sh

########
asound="\
defaults.pcm.card $i
defaults.ctl.card $i
"
if [[ -e $dirsystem/camilladsp ]]; then
	modprobe snd-aloop
	camilladspyml=$dirdata/camilladsp/configs/camilladsp.yml
	channels=$( sed -n '/capture:/,/channels:/ p' $camilladspyml | tail -1 | awk '{print $NF}' )
	format=$( sed -n '/capture:/,/format:/ p' $camilladspyml | tail -1 | awk '{print $NF}' )
	rate=$( grep '^\s*samplerate:' $camilladspyml | awk '{print $NF}' )
########
	asound+='
pcm.!default { 
	type plug 
	slave.pcm camilladsp
}
pcm.camilladsp {
	slave {
		pcm {
			type     hw
			card     Loopback
			device   0
			channels '$channels'
			format   '$format'
			rate     '$rate'
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
	if [[ -e $dirshm/btclient ]]; then
		btmixer=$( cat $dirshm/btclient )
########
		asound+='
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
		filepresets=$dirsystem/equalizer.presets
		if [[ $btmixer ]]; then
			slavepcm=bluealsa
			filepresets+="-$btmixer"
		else
			slavepcm='"plughw:'$i',0"'
		fi
		preset=$( head -1 "$filepresets" 2> /dev/null || echo Flat )
########
		asound+='
pcm.!default {
	type plug
	slave.pcm plugequal
}
ctl.equal {
	type equal
}
pcm.plugequal {
	type equal
	slave.pcm '$slavepcm'
}'
	fi
fi

echo "$asound" > /etc/asound.conf
alsactl nrestore &> /dev/null # notify changes to running daemons

# ----------------------------------------------------------------------------
wm5102card=$( aplay -l | grep snd_rpi_wsp | cut -c 6 )
if [[ $wm5102card ]]; then
	output=$( cat $dirsystem/hwmixer-wsp 2> /dev/null || echo HPOUT2 Digital )
	$dirbash/mpd-wm5102.sh $wm5102card $output
fi

[[ $preset ]] && $dirbash/cmd.sh "equalizer
preset
$preset"

if [[ -e $dirsystem/camilladsp ]]; then
	card=$( cat $dirshm/asoundcard )
	lineplayback=$( sed -n '/playback:/,/device:/=' $camilladspyml | tail -1 )
	sed -i "$lineplayback s/\(device: hw:\).*/\1$card,0/" $camilladspyml
	camilladsp $camilladspyml &> /dev/null &
	sleep 1
	if pgrep -x camilladsp &> /dev/null; then
		pkill -x camilladsp
		camilladsp=1
	else
		lineformat=$( sed -n '/playback:/,/format:/=' $camilladspyml | tail -1 )
		for format in FLOAT64LE FLOAT32LE S32LE S24LE3 S24LE S16LE; do
			sed -i "$lineformat s/\(format: \).*/\1$format/" $camilladspyml
			camilladsp $camilladspyml &> /dev/null &
			sleep 1
			if pgrep -x camilladsp &> /dev/null; then
				pkill -x camilladsp
				camilladsp=1
				break
			fi
		done
	fi
	[[ $camilladsp ]] && systemctl start camilladsp || systemctl stop camilladsp
	pushstream refresh "$( $dirbash/settings/features-data.sh )"
elif [[ $btmixer ]]; then
	btvolume=$( cat "$dirsystem/btvolume-$btmixer" 2> /dev/null )
	[[ $btvolume ]] && amixer -MqD bluealsa sset "$btmixer" $btvolume% 2> /dev/null
	systemctl -q is-active localbrowser || systemctl start bluetoothbutton
fi
