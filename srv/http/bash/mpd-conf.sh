#!/bin/bash

# remove all output the reinstate each output:
# - get devices data from 'mpd-devices.sh'
# - assign common paramters
# - mixer_type    - from file if manually set | hardware if hwmixer | software
# - mixer_control - from file if manually set | hwmixer | null
# - mixer_device  - card index
# - dop           - if set

. /srv/http/bash/common.sh

! systemctl -q is-active nginx && exit 0 # udev rule trigger on startup

restartMPD() {
	systemctl restart mpd
	if [[ -e $dirsystem/autoplaybt && -e $dirshm/btclient ]]; then
		mpc | grep -q '\[playing' || $dirbash/cmd.sh mpcplayback$'\n'play
	fi
	pushstream mpdplayer "$( $dirbash/status.sh )"
	pushstream refresh "$( $dirbash/player-data.sh )"
	systemctl try-restart rotaryencoder
	if [[ -e $dirmpd/updating ]]; then
		path=$( cat $dirmpd/updating )
		[[ $path == rescan ]] && mpc rescan || mpc update "$path"
	fi
	( sleep 2 && systemctl try-restart snapclient ) &> /dev/null &
}

if [[ $1 == bton ]]; then # connected by bluetooth receiver (sender: bluezdbus.py)
	(( $( bluetoothctl info | grep 'Connected: yes\|Audio Sink' | wc -l ) < 2 )) && exit # not bluetooth audio device
	
	for i in {1..5}; do # wait for list available
		sleep 1
		btaplay=$( bluealsa-aplay -L )
		[[ $btaplay ]] && break
	done
	[[ ! $btaplay ]] && exit # no bluealsa device found
	
	btalias=$( bluetoothctl info | grep 'Alias: ' | sed 's/.*: //' )
	[[ ! $btalias ]] && btalias=$( bluetoothctl info | grep 'Name: ' | sed 's/.*: //' )
	pushstreamNotify 'Bluetooth' "$btalias" 'bluetooth'
	btmixer=$( amixer -D bluealsa scontrols \
				| head -1 \
				| cut -d"'" -f2 )
	btvolume=$( cat "$dirsystem/btvolume-$btmixer" 2> /dev/null )
	[[ $btvolume ]] && amixer -MqD bluealsa sset "$btmixer" $btvolume%
	echo $btmixer > $dirshm/btclient
	pushstream btclient true
	$dirbash/networks-data.sh bt
	systemctl -q is-active localbrowser || systemctl start bluetoothbutton
	[[ -e $dirshm/nosound ]] && pushstream display '{"volumenone":false}'
elif [[ $1 == btoff ]]; then
	$dirbash/cmd.sh mpcplayback$'\n'stop
	rm -f $dirshm/btclient
	pushstream btclient false
	$dirbash/networks-data.sh bt
	systemctl stop bluetoothbutton
	[[ -e $dirshm/nosound ]] && pushstream display '{"volumenone":true}'
fi

. $dirbash/mpd-devices.sh

output= # reset var from mpd-devices.sh
if [[ $i != -1 ]]; then
	if [[ $1 == add ]]; then
		i=-1
		head -1 /etc/asound.conf | cut -d' ' -f2 > $dirshm/asound
	elif [[ $1 == remove ]]; then
		i=$( cat $dirshm/asound )
	fi
	aplayname=${Aaplayname[$i]}
	card=${Acard[$i]}
	dop=${Adop[$i]}
	hw=${Ahw[$i]}
	hwmixer=${Ahwmixer[$i]}
	mixertype=${Amixertype[$i]}
	name=${Aname[$i]}
	if [[ -e $dirsystem/equalizer ]]; then
		[[ -e $dirshm/btclient ]] && mixertype=software
#---------------
		output+='
	name           "ALSAEqual"
	device         "plug:plugequal"
	type           "alsa"
	auto_resample  "no"
	mixer_type     "'$mixertype'"'
	
	elif [[ $btmixer ]]; then
		# no mac address needed - bluealsa already includes mac of latest connected device
#---------------
		output+='
	name           "'$btalias'"
	device         "bluealsa"
	type           "alsa"
	mixer_type     "hardware"'
		if [[ -e $dirsystem/btformat ]]; then
#---------------
			output+='
	format         "44100:16:2"'
		fi
		
	elif [[ ! -e $dirshm/snapclientactive ]]; then
#---------------
		output+='
	name           "'$name'"
	device         "'$hw'"
	type           "alsa"
	auto_resample  "no"
	auto_format    "no"
	mixer_type     "'$mixertype'"'
		if [[ $mixertype == hardware ]]; then # mixer_device must be card index
#---------------
			output+='
	mixer_control  "'$hwmixer'"
	mixer_device   "hw:'$card'"'
		fi
		if [[ $dop == 1 ]]; then
#---------------
			output+='
	dop            "yes"'
		fi
		mpdcustom=$dirsystem/custom
		customfile="$mpdcustom-output-$aplayname"
		if [[ -e $mpdcustom && -e "$customfile" ]]; then
#---------------
			output+="
$( sed 's/^/\t/; s/$/ # custom/' "$customfile" )"
		fi
		[[ $mixertype == none ]] && touch $dirshm/mixernone || rm -f $dirshm/mixernone
	fi
fi
if [[ $output ]]; then
########
	output="
audio_output {\
$output
}"
fi

if systemctl -q is-active snapserver; then
########
	output+='
audio_output {
	name           "Snapcast"
	type           "fifo"
	path           "/tmp/snapfifo"
	format         "48000:16:2"
	mixer_type     "software"
}'
fi
if [[ -e $dirsystem/streaming ]]; then
########
	output+='
audio_output {
	type           "httpd"
	name           "Streaming"
	encoder        "flac"
	port           "8000"
	quality        "5.0"
	format         "44100:16:2"
	always_on      "yes"
}'
fi
if [[ ! $output || -e $dirsystem/vumeter || -e $dirsystem/vuled || -e $dirsystem/mpdoled ]]; then
########
		output+='
audio_output {
	name           "'$( [[ ! $output ]] && echo '(no sound device)' || echo '(visualizer)' )'"
	type           "fifo"
	path           "/tmp/mpd.fifo"
	format         "44100:16:1"
}'
fi

linecdio=$( sed -n '/cdio_paranoia/ =' /etc/mpd.conf )
[[ $linecdio ]] && sed -i "$(( linecdio - 1 )),/^$/ d" /etc/mpd.conf

conf=$( cat /etc/mpd.conf )
line=$( echo "$conf" \
			| awk '/^resampler/,/}/ {print NR}' \
			| tail -1 )
global=$( echo "$conf" \
			| sed -n "1,$line p" \
			| sed '/# custom0/,/# custom1/ d' )
if [[ -e $dirsystem/custom && -e $dirsystem/custom-global ]]; then
	custom=$( echo "
# custom0
$( cat $dirsystem/custom-global )
# custom1" | sed '$!s/$/\\/' )
	global=$( echo "$global" | sed "/^user/ a$custom" )
fi
echo "\
$global
$output
$btoutput" > /etc/mpd.conf

# usbdac.rules
if [[ ! -e $dirshm/loopbackset && ( $1 == add || $1 == remove ) ]]; then
	mpc -q stop
	[[ $1 == add && $mixertype == hardware ]] && alsactl restore
	if [[ ! $name ]]; then
		name='(No sound device)'
		volumenone=true
	else
		volumenone=$( echo "$output" | grep -q 'mixer_type.*none' && echo true || echo false )
	fi
	pushstream display '{"volumenone":'$volumenone'}'
	pushstreamNotify 'Audio Output' "$name" output
fi
[[ ! $Acard && ! $btmixer ]] && restartMPD && exit

[[ $Acard ]] && card=$card || card=0
########
asound="\
defaults.pcm.card $card
defaults.ctl.card $card"
if [[ $btmixer ]]; then
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
		filepresets+="-$btalias"
	else
		slavepcm='"plughw:'$card',0"'
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

if [[ -e $dirsystem/camilladsp ]]; then
	modprobe snd-aloop
	deviceloopback=$( aplay -l \
						| grep Loopback \
						| head -1 \
						| sed 's/^card \(.\): .*/\1/' )
	. $dirsystem/camilladsp.conf
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
			device   '$deviceloopback'
			channels '$channel'
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
fi

echo "$asound" > /etc/asound.conf

[[ $preset ]] && $dirbash/cmd.sh "equalizer
preset
$preset"

wm5102card=$( aplay -l \
				| grep snd_rpi_wsp \
				| cut -c 6 )
if [[ $wm5102card ]]; then
	output=$( cat $dirsystem/hwmixer-wsp 2> /dev/null || echo HPOUT2 Digital )
	$dirbash/mpd-wm5102.sh $wm5102card $output
fi

restartMPD

if [[ -e /usr/bin/shairport-sync ]]; then
########
	conf="$( sed '/^alsa/,/}/ d' /etc/shairport-sync.conf )
alsa = {"
	if [[ $btmixer ]]; then
########
		conf+='
	output_device = "bluealsa";'
	else
########
		conf+='
	output_device = "hw:'$card'";'
	[[ $hwmixer ]] && conf+='
	mixer_control_name = "'$hwmixer'";'
	fi
########
	conf+='
}'
	echo "$conf" > /etc/shairport-sync.conf
	pushstream airplay '{"stop":"switchoutput"}'
	systemctl try-restart shairport-sync
fi

if [[ -e /usr/bin/spotifyd ]]; then
	if [[ $btmixer ]]; then
		device=$( bluealsa-aplay -L | head -1 )
	else
		cardname=$( aplay -l \
						| grep "^card $card" \
						| head -1 \
						| cut -d' ' -f3 )
		device=$( aplay -L | grep "^default.*$cardname" | head -1 )
	fi
########
	conf='[global]
bitrate = 320
onevent = "/srv/http/bash/spotifyd.sh"
use_mpris = false
backend = "alsa"
device = "'$device'"'
	if [[ ! $btmixer && $hwmixer != '( not available )' ]]; then
########
		conf+='
mixer = "'$hwmixer'"
control = "hw:'$card'"
volume_controller = "alsa"'
		echo "$conf" > /etc/spotifyd.conf
		systemctl try-restart spotifyd
	fi
fi
