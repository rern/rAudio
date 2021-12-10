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
	if [[ -e $dirsystem/updating ]]; then
		path=$( cat $dirsystem/updating )
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
	asoundbt='
pcm.bluealsa {
	type plug
	slave.pcm {
		type bluealsa
		device 00:00:00:00:00:00
		profile "a2dp"
	}
}'
	btmixer=$( amixer -D bluealsa scontrols \
				| head -1 \
				| cut -d"'" -f2 )
	btvolumefile="$dirsystem/btvolume-$btmixer"
	[[ -e $btvolumefile ]] && amixer -D bluealsa -q sset "$btmixer" $( cat "$btvolumefile" )%
	echo $btmixer > $dirshm/btclient
	pushstream btclient true
	$dirbash/networks-data.sh bt
	systemctl -q is-active localbrowser || systemctl start bluetoothbutton
elif [[ $1 == btoff ]]; then
	$dirbash/cmd.sh mpcplayback$'\n'stop
	rm -f $dirshm/btclient
	pushstream btclient false
	$dirbash/networks-data.sh bt
	systemctl stop bluetoothbutton
fi

. $dirbash/mpd-devices.sh

output=
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
########
		output+='
audio_output {
	name           "ALSAEqual"
	device         "plug:plugequal"
	type           "alsa"
	auto_resample  "no"
	mixer_type     "'$mixertype'"'
	elif [[ $btmixer ]]; then
		# no mac address needed - bluealsa already includes mac of latest connected device
########
		output+='
audio_output {
	name           "'$btalias'"
	device         "bluealsa"
	type           "alsa"
	mixer_type     "software"'
		if [[ -e $dirsystem/btformat ]]; then
########
		output+='
	format         "44100:16:2"'
		fi
	else
########
		output+='
audio_output {
	name           "'$name'"
	device         "'$hw'"
	type           "alsa"
	auto_resample  "no"
	auto_format    "no"
	mixer_type     "'$mixertype'"'
		if [[ $mixertype == hardware ]]; then # mixer_device must be card index
########
			output+='
	mixer_control  "'$hwmixer'"
	mixer_device   "hw:'$card'"'
		fi
		if [[ $dop == 1 ]]; then
########
			output+='
	dop            "yes"'
		fi
		mpdcustom=$dirsystem/custom
		customfile="$mpdcustom-output-$aplayname"
		if [[ -e $mpdcustom && -e "$customfile" ]]; then
########
			output+="
$( sed 's/^/\t/; s/$/ # custom/' "$customfile" )"
		fi
	fi
########
	output+='
}'
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
if [[ $1 == add || $1 == remove ]]; then
	mpc -q stop
	[[ $1 == add && $mixertype == hardware ]] && alsactl restore
	[[ ! $name ]] && name='(No sound device)'
	pushstream notify '{"title":"Audio Output","text":"'"$name"'","icon": "output"}'
	prevvolumenone=$( echo "$conf" \
					| sed -n "$line,$ p" \
					| grep -q 'mixer_type.*none' && echo true || echo false )
	volumenone=$( echo "$output" | grep -q 'mixer_type.*none' && echo true || echo false )
	[[ $volumenone != $prevvolumenone ]] && pushstream display '{"volumenone":'$volumenone'}'
fi
[[ ! $Acard && ! $btmixer ]] && restartMPD && exit

[[ $Acard ]] && card=$card || card=0

if [[ -e $dirsystem/equalizer ]]; then
	filepresets=$dirsystem/equalizer.presets
	if [[ $btmixer ]]; then
		slavepcm=bluealsa
		filepresets+="-$btalias"
	else
		slavepcm='"plughw:'$card',0"'
	fi
	preset=$( head -1 "$filepresets" 2> /dev/null || echo Flat )
	asoundeq="
pcm.!default {
	type plug
	slave.pcm plugequal
}
ctl.equal {
	type equal
}
pcm.plugequal {
	type equal
	slave.pcm $slavepcm
}"
fi

asound="\
defaults.pcm.card $card
defaults.ctl.card $card"
[[ $asoundbt ]] && asound+="
$asoundbt"
[[ $asoundeq ]] && asound+="
$asoundeq"
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
	conf="$( sed '/^alsa/,/}/ d' /etc/shairport-sync.conf )
alsa = {"
	if [[ $btmixer ]]; then
		conf+='
	output_device = "bluealsa";'
	else
		conf+='
	output_device = "hw:'$card'";'
	[[ $hwmixer ]] && conf+='
	mixer_control_name = "'$hwmixer'";'
	fi
	conf+='
}'
	echo "$conf" > /etc/shairport-sync.conf
	pushstream airplay '{"stop":"switchoutput"}'
	systemctl try-restart shairport-sync
fi

if [[ -e /usr/bin/spotifyd ]]; then
	if [[ $btmixer ]]; then
		device=bluealsa
	else
		cardname=$( aplay -l \
						| grep "^card $card" \
						| head -1 \
						| cut -d' ' -f3 )
		device=$( aplay -L | grep "^default.*$cardname" )
	fi
	cat << EOF > /etc/spotifyd.conf
[global]
backend = "alsa"
device = "$device"
mixer = "$hwmixer"
control = "hw:$card"
volume_controller = "alsa"
bitrate = 320
onevent = "/srv/http/bash/spotifyd.sh"
use_mpris = false
EOF
	systemctl try-restart spotifyd
fi
