#!/bin/bash

### included by < player-conf.sh

if [[ $asoundcard != -1 ]]; then # from player-devices.sh
########
	asound="\
defaults.pcm.card $asoundcard
defaults.ctl.card $asoundcard
"
fi
if [[ -e $dirsystem/camilladsp ]]; then
	dsp=1
	modprobe snd_aloop
	camilladspyml=$dircamilladsp/configs/camilladsp.yml
	channels=$( sed -n '/capture:/,/channels:/ {/channels:/ {s/^.* //; p}}' $camilladspyml )
	format=$( sed -n '/capture:/,/format:/ {/format:/ {s/^.* //; p}}' $camilladspyml )
	rate=$( awk '/^\s*samplerate:/ {print $NF}' $camilladspyml )
########
	asound+='
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
		btmixer=$( < $dirshm/btreceiver )
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
		if [[ $btmixer ]]; then
			slavepcm=bluealsa
		elif [[ $asoundcard != -1 ]]; then
			slavepcm='"plughw:'$asoundcard',0"'
		fi
		if [[ $slavepcm ]]; then
			equalizer=1
########
			asound+='
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

echo "$asound" > /etc/asound.conf
alsactl store &> /dev/null
alsactl nrestore &> /dev/null # notify changes to running daemons

# ----------------------------------------------------------------------------
wm5102card=$( aplay -l 2> /dev/null | grep snd_rpi_wsp | cut -c 6 )
if [[ $wm5102card ]]; then
	[[ -e $dirsystem/hwmixer-wsp ]] && output=$( < $dirsystem/hwmixer-wsp ) || output='HPOUT2 Digital'
	$dirsettings/player-wm5102.sh $wm5102card $output
fi

if [[ $dsp ]]; then
	$dirsettings/camilla.sh setformat
else
	if [[ $btmixer ]]; then
		if [[ -e "$dirsystem/btvolume-$btmixer" ]]; then
			btvolume=$( < "$dirsystem/btvolume-$btmixer" )
			amixer -MqD bluealsa sset "$btmixer" $btvolume% 2> /dev/null
		fi
		systemctl -q is-active localbrowser && action=stop || action=start
		systemctl $action bluetoothbutton
	else
		systemctl stop bluetoothbutton
	fi
	if [[ -e $dirsystem/equalizer ]]; then
		value=$( sed -E -n '/"current":/ {s/.*: "(.*)",/\1/; p}' $dirsystem/equalizer.json )
		player=$( < $dirshm/player )
		[[ $player == airplay || $player == spotify ]] && user=root || user=mpd
		$dirbash/cmd.sh "equalizer
$value
$user
CMD VALUE USER"
	fi
fi
