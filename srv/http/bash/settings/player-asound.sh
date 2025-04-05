#!/bin/bash

### included by <<< player-conf.sh
if [[ ! $dirbash ]]; then # if run directly
	. /srv/http/bash/common.sh 
	. $dirshm/output
	CARD=$card
	NAME=$name
fi

if [[ -e $dirshm/btreceiver ]]; then
	BLUETOOTH=1
	systemctl -q is-active localbrowser && action=stop || action=start
	systemctl $action bluetoothbutton
else
	systemctl stop bluetoothbutton
fi
if [[ -e $dirsystem/camilladsp ]]; then
	modprobe snd_aloop
	fileconf=$( getVar CONFIG /etc/default/camilladsp )
	channels=$( getVar capture.channels "$fileconf" )
	format=$( getVar capture.format "$fileconf" )
	rate=$( getVar devices.samplerate "$fileconf" )
	CAMILLADSP=1
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
	systemctl stop camilladsp &> /dev/null
	rmmod snd-aloop &> /dev/null
	if [[ $BLUETOOTH ]]; then
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
		if [[ $BLUETOOTH ]]; then
			slavepcm=bluealsa
		elif [[ $CARD != -1 ]]; then
			slavepcm='"plughw:'$CARD',0"'
		fi
		if [[ $slavepcm ]]; then
			EQUALIZER=1
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
	if [[ -e $dirmpdconf/snapserver.conf ]]; then
		ASOUNDCONF+='
pcm.!default {
	type plug
	slave.pcm rate48000Hz
}
pcm.rate48000Hz {
	type rate
	slave {
		pcm writeFile
		format S16_LE
		rate 48000
	}
}
pcm.writeFile {
	type file
	slave.pcm null
	file "/tmp/snapfifo"
	format "raw"
}'
	fi
fi
######## >
echo "$ASOUNDCONF" >> /etc/asound.conf # append after default lines set by player-devices.sh
