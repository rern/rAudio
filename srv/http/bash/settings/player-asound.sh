#!/bin/bash

### included by < player-conf.sh

if [[ $asoundcard != -1 ]]; then # from player-devices.sh
########
	asound="\
defaults.pcm.card $asoundcard
defaults.ctl.card $asoundcard
"
else
	[[ -e $dirsystem/camilladsp ]] && $dirsettings/features.sh camilladsp
fi
[[ -e $dirshm/btreceiver ]] && bluetooth=$( < $dirshm/btreceiver )
if [[ -e $dirsystem/camilladsp ]]; then
	camilladsp=1
	modprobe snd_aloop
	fileconfig=$( getVar CONFIG /etc/default/camilladsp )
	channels=$( sed -n '/capture:/,/channels:/ {/channels:/ {s/^.* //; p}}' $fileconfig )
	format=$( sed -n '/capture:/,/format:/ {/format:/ {s/^.* //; p}}' $fileconfig )
	rate=$( awk '/^\s*samplerate:/ {print $NF}' $fileconfig )
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
	if [[ $bluetooth ]]; then
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
		if [[ $bluetooth ]]; then
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

alsactl store &> /dev/null
echo "$asound" > /etc/asound.conf
alsactl nrestore &> /dev/null # notify changes to running daemons

# ----------------------------------------------------------------------------
wm5102card=$( aplay -l 2> /dev/null | grep snd_rpi_wsp | cut -c 6 )
if [[ $wm5102card ]]; then
	[[ -e $dirsystem/hwmixer-wsp ]] && output=$( < $dirsystem/hwmixer-wsp ) || output='HPOUT2 Digital'
	$dirsettings/player-wm5102.sh $wm5102card $output
fi

if [[ $camilladsp ]]; then
	if [[ $bluetooth ]]; then
		! grep -q configs-bt /etc/default/camilladsp && $dirsettings/camilla-bluetooth.sh receiver
	else
		grep -q configs-bt /etc/default/camilladsp && mv -f /etc/default/camilladsp{.backup,}
		systemctl restart camilladsp
	fi
else
	if [[ $bluetooth ]]; then
		if [[ -e "$dirsystem/btvolume-$bluetooth" ]]; then
			btvolume=$( < "$dirsystem/btvolume-$bluetooth" )
			amixer -MqD bluealsa sset "$bluetooth" $btvolume% 2> /dev/null
		fi
	fi
	if [[ -e $dirsystem/equalizer ]]; then
		value=$( sed -E -n '/"current":/ {s/.*: "(.*)",/\1/; p}' $dirsystem/equalizer.json )
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
