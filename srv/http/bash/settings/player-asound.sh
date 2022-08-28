#!/bin/bash

### includedby < player-conf.sh

########
asound="\
defaults.pcm.card $i
defaults.ctl.card $i
"
if [[ -e $dirsystem/camilladsp ]]; then
	dsp=1
	modprobe snd-aloop
	camilladspyml=$dircamilladsp/configs/camilladsp.yml
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
	if [[ -e $dirshm/btreceiver ]]; then
		btmixer=$( cat $dirshm/btreceiver )
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
	$dirbash/settings/player-wm5102.sh $wm5102card $output
fi

if [[ $dsp ]]; then
	$dirbash/settings/camilladsp-setformat.sh
else
	if [[ $btmixer ]]; then
		btvolume=$( cat "$dirsystem/btvolume-$btmixer" 2> /dev/null )
		[[ $btvolume ]] && amixer -MqD bluealsa sset "$btmixer" $btvolume% 2> /dev/null
		systemctl -q is-active localbrowser && action=stop || action=start
		systemctl $action bluetoothbutton
	else
		systemctl stop bluetoothbutton
	fi
	[[ $preset ]] && $dirbash/cmd.sh "equalizer
preset
$preset"
fi