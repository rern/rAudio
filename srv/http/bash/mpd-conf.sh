#!/bin/bash

# remove all output the reinstate each output:
# - get devices data from 'mpd-devices.sh'
# - assign common paramters
# - mixer_type    - from file if manually set | hardware if hwmixer | software
# - mixer_control - from file if manually set | hwmixer | null
# - mixer_device  - card index
# - dop           - if set

dirbash=/srv/http/bash
dirsystem=/srv/http/data/system
dirtmp=/srv/http/data/shm

! systemctl -q is-active nginx && exit 0 # udev rule trigger on startup

pushstream() {
	curl -s -X POST http://127.0.0.1/pub?id=$1 -d "$2"
}
restartMPD() {
	systemctl restart mpd
	pushstream refresh "$( $dirbash/player-data.sh )"
	if [[ -e $dirsystem/updating ]]; then
		path=$( cat $dirsystem/updating )
		[[ $path == rescan ]] && mpc rescan || mpc update "$path"
	fi
}

if [[ $1 == bt ]]; then
	for i in {1..5}; do # wait for list available
		sleep 1
		btaplay=$( bluealsa-aplay -L )
		[[ -n $btaplay ]] && break
	done
	[[ -z $btaplay ]] && exit # not bluetooth audio device
	
	[[ ! -e $dirtmp/player-bluetooth ]] && touch $dirtmp/btclient
	pushstream btclient true
	btname=$( amixer -D bluealsa scontrols | cut -d"'" -f2 )
	btvolumefile="$dirsystem/btvolume-$btname"
	[[ -e $btvolumefile ]] && amixer -D bluealsa -q sset "$btname" $( cat "$btvolumefile" )%
fi

. $dirbash/mpd-devices.sh

output=
if [[ $i != -1 ]]; then
	if [[ $1 == add ]]; then
		i=-1
		head -1 /etc/asound.conf | cut -d' ' -f2 > $dirtmp/asound
	elif [[ $1 == remove ]]; then
		i=$( cat $dirtmp/asound )
	fi
	aplayname=${Aaplayname[$i]}
	card=${Acard[$i]}
	dop=${Adop[$i]}
	hw=${Ahw[$i]}
	hwmixer=${Ahwmixer[$i]}
	mixertype=${Amixertype[$i]}
	name=${Aname[$i]}
	if [[ -e $dirsystem/equalizer ]]; then
		[[ -n $btname ]] && mixertype=software
########
		output+='
audio_output {
	name           "ALSAEqual"
	device         "plug:plugequal"
	type           "alsa"
	auto_resample  "no"
	mixer_type     "'$mixertype'"'
	elif [[ -n $btname ]]; then
		# no mac address needed - bluealsa already includes mac of latest connected device
########
		output+='
audio_output {
	name           "'$btname'"
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
			mixercontrol=$hwmixer
########
			output+='
	mixer_control  "'$mixercontrol'"
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
if [[ -z $output || -e $dirsystem/vumeter || -e $dirsystem/vuled || -e $dirsystem/mpdoled ]]; then
########
		output+='
audio_output {
	name           "'$( [[ -z $output ]] && echo '(no sound device)' || echo '(visualizer)' )'"
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
	[[ -z $name ]] && name='(No sound device)'
	pushstream notify '{"title":"Audio Output","text":"'"$name"'","icon": "output"}'
	prevvolumenone=$( echo "$conf" \
					| sed -n "$line,$ p" \
					| grep -q 'mixer_type.*none' && echo true || echo false )
	volumenone=$( echo "$output" | grep -q 'mixer_type.*none' && echo true || echo false )
	[[ $volumenone != $prevvolumenone ]] && pushstream display '{"volumenone":'$volumenone'}'
fi
[[ -z $Acard ]] && restartMPD && exit

[[ -n $Acard ]] && card=$card || card=0
asound="\
defaults.pcm.card $card
defaults.ctl.card $card"
if [[ -e $dirsystem/equalizer ]]; then
	preset=$( cat $dirsystem/equalizer )
	asound+='
pcm.!default {
	type plug;
	slave.pcm plugequal;
}
ctl.equal {
	type equal;
}
pcm.plugequal {
	type equal;'
	if [[ -z $btname ]]; then
		asound+='
	slave.pcm "plughw:'$card',0";'
	else
		asound+='
	slave.pcm {
 		type plug
 		slave.pcm {
 			type bluealsa;
 			device "00:00:00:00:00:00";
 			profile "a2dp";
 			delay 20000;
 		}
 	}'
	fi
	asound+='
}'
fi
echo "$asound" > /etc/asound.conf
if [[ $preset == enable ]]; then
	echo Flat > $dirsystem/equalizer
	$dirbash/cmd.sh equalizer$'\n'preset$'\n'Flat
fi
wm5102card=$( aplay -l \
				| grep snd_rpi_wsp \
				| cut -c 6 )
if [[ -n $wm5102card ]]; then
	output=$( cat $dirsystem/hwmixer-wsp 2> /dev/null || echo HPOUT2 Digital )
	$dirbash/mpd-wm5102.sh $wm5102card $output
fi

restartMPD

if [[ -e /usr/bin/shairport-sync ]]; then
	hwmixer="${Ahwmixer[$card]}"
	if [[ -n $hwmixer ]]; then
		alsa='alsa = {
	output_device = "hw:'$card'";
	mixer_control_name = "'$hwmixer'";
}'
	else
		alsa='alsa = {
	output_device = "hw:'$card'";
}'
	fi
	conf=$( sed '/^alsa/,/}/ d' /etc/shairport-sync.conf )
	echo "\
$conf
$alsa" > /etc/shairport-sync.conf
	pushstream airplay '{"stop":"switchoutput"}'
	systemctl try-restart shairport-sync
fi

if [[ -e /usr/bin/spotifyd ]]; then
	cardname=$( aplay -l \
					| grep "^card $card" \
					| head -1 \
					| cut -d' ' -f3 )
	aplaydevice=$( aplay -L | grep "^default.*$cardname" )
	sed -i 's/^device =.*/device = "'$aplaydevice'"/' /etc/spotifyd.conf
	systemctl try-restart spotifyd
fi
