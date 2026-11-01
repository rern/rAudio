#!/bin/bash

# Bluez always reads connected device volume

# normal: CONTROL: volumeMpd
#	- mixer hardware - default
#	- mixer software - alsa/mpd = 0dB
# normal + camilladsp: CONTROL: volumeCamilla
#	- mixer hardware - alsa/mpd = 0dB

# bluetooth: CONTROL - device volume == volumeBlueAlsa (synced by bluez-volume)
#	- as sender
#		- on connect:    sink < $dirsystem/$MAC, alsa/mpd [--]
#		- on disconnect: sink > $dirsystem/$MAC, alsa/mpd [--]
#	- as receiver
#		- on connect:    source < $dirsystem/$MAC, alsa/mpd = 0dB
#		- on disconnect: source > $dirsystem/$MAC, alsa/mpd < $dirsystem/volume
#		- bluealsa-aplay: stream
#		- bluez-dbus    : state/changes

# bluetooth + camilladsp: CONTROL - device volume != volumeCamilla (no sync)
#	- as sender
#		- on connect:    sink = 100, alsa/mpd = 0dB
#		- on disconnect: sink [--],  alsa/mpd [--]
#	- as receiver
#		- on connect:    source [--], alsa/mpd = 0dB
#		- on disconnect: source [--], alsa/mpd [--]
#		- bluez      : dbus stream
#		- bluez-dbus : state/changes

### included by <<< player-conf.sh
if [[ ! $dirbash ]]; then # if run directly
	. /srv/http/bash/common.sh 
	. $dirshm/output
	CARD=$card
	NAME=$name
fi

if [[ -e $dirshm/sink ]]; then
	BT_SINK=1
########
	ASOUNDCONF+='
pcm.bluealsa {
	type plug
	slave.pcm {
		type bluealsa
		device 00:00:00:00:00:00
		profile "a2dp"
	}
}
'
fi
if [[ -e $dirsystem/camilladsp ]] && $dirsettings/camilla-conf.sh; then
	CAMILLADSP=1
	file_config=$( getVar CONFIG /etc/default/camilladsp )
	if grep -q device: hw:Loopback "$file_config"; then
		modprobe snd_aloop
		for i in {0..3}; do
			lsmod | grep -q snd_aloop && break || sleep 1
		done
	fi
	channels=$( getVar capture.channels "$file_config" )
	format=$( getVar capture.format "$file_config" )
	rate=$( getVar devices.samplerate "$file_config" )
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
	card '$CARD'
}
ctl.camilladsp {
	type hw
	card Loopback
}
'
else
	ASOUNDCONF+='
defaults.pcm.card '$CARD'
defaults.ctl.card '$CARD'
'
	systemctl stop camilladsp &> /dev/null
	rmmod snd-aloop &> /dev/null
	if [[ -e $dirsystem/equalizer ]]; then
		if [[ $BT_SINK ]]; then
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
}
'
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
}
'
	fi
fi
######## >
echo "$ASOUNDCONF" > /etc/asound.conf
