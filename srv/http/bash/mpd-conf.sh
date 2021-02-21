#!/bin/bash

# remove all output the reinstate each output:
# - get devices data from 'mpd-devices.sh'
# - assign common paramters
# - mixer_type    - from file if manually set | hardware if hwmixer | software
# - mixer_control - from file if manually set | hwmixer | null
# - mixer_device  - card index
# - dop           - if set

dirsystem=/srv/http/data/system

! systemctl -q is-active nginx && exit 0 # udev rule trigger on startup

pushstream() {
	curl -s -X POST http://127.0.0.1/pub?id=$1 -d "$2"
}
restartMPD() {
	systemctl restart mpd
	pushstream mpdplayer "$( /srv/http/bash/status.sh )"
	pushstream refresh '{"page":"mpd"}'
	if [[ -e $dirsystem/updating ]]; then
		path=$( cat $dirsystem/updating )
		[[ $path == rescan ]] && mpc rescan || mpc update "$path"
	fi
}

if [[ $1 == bt ]]; then
	lines=$( bluetoothctl paired-devices )
	[[ -z $lines ]] && sleep 3 && lines=$( bluetoothctl paired-devices )
	[[ -z $lines ]] && exit
	
	readarray -t paired <<< "$lines"
	for device in "${paired[@]}"; do
		mac=$( cut -d' ' -f2 <<< "$device" )
		(( $( bluetoothctl info $mac | grep 'Connected: yes\|Audio Sink' | wc -l ) != 2 )) && continue
		btoutput='

audio_output {
	name           "'$( cut -d' ' -f3- <<< "$device" )'"
	device         "bluealsa:DEV='$mac',PROFILE=a2dp"
	type           "alsa"
	mixer_type     "software"'
		[[ -e /srv/http/data/system/btformat ]] && btoutput+='
	format         "44100:16:2"'
		btoutput+='
}'
		
	done
	if [[ -z $btoutput ]]; then
		pushstream refresh '{"page":"network"}' # bluetooth status
		exit # no Audio Sink bluetooth
	fi
fi
pushstream refresh '{"page":"network"}'

mpdfile=/etc/mpd.conf
mpdconf=$( sed '/audio_output/,/}/ d' $mpdfile ) # remove all outputs

. /srv/http/bash/mpd-devices.sh

if [[ $i != -1 ]]; then
	[[ $1 == add ]] && i=-1
	aplayname=${Aaplayname[$i]}
	card=${Acard[$i]}
	dop=${Adop[$i]}
	hw=${Ahw[$i]}
	hwmixer=${Ahwmixer[$i]}
	mixertype=${Amixertype[$i]}
	name=${Aname[$i]}
########
	mpdconf+='

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
		mpdconf+='
	mixer_control  "'$mixercontrol'"
	mixer_device   "hw:'$card'"'
	fi
	if [[ $dop == 1 ]]; then
########
		mpdconf+='
	dop            "yes"'
	fi
	mpdcustom=$dirsystem/custom
	customfile="$mpdcustom-output-$aplayname"
	if [[ -e $mpdcustom && -e "$customfile" ]]; then
########
		mpdconf+="
$( cat "$customfile" | tr ^ '\n' | sed 's/^/\t/; s/$/ #custom/' )"
	fi
########
	mpdconf+='
}'
fi
if [[ $i == -1 || -e /usr/bin/mpd_oled ]]; then
########
	[[ -e /usr/bin/mpd_oled ]] && name=mpd_oled_FIFO || name='(No sound device)'
	mpdconf+='

audio_output {
	name           "'$name'"
	type           "fifo"
	path           "/tmp/mpd_oled_fifo"
	format         "44100:16:2"
}'
fi

if systemctl -q is-active snapserver; then
########
	mpdconf+='

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
	mpdconf+='

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

mpdconf+=$btoutput

echo "$mpdconf" > $mpdfile

# usbdac.rules
if [[ $1 == add || $1 == remove ]]; then
	mpc -q stop
	[[ $1 == add && $mixertype == hardware ]] && alsactl restore
	pushstream notify '{"title":"Audio Output","text":"'"$name"'","icon": "output"}'
	pushstream display "$( /srv/http/bash/cmd.sh displayget )"
fi

sed -i "s/.$/$card/" /etc/asound.conf

if [[ -z $Acard ]]; then
	restartMPD
	exit
fi

wm5102card=$( aplay -l | grep snd_rpi_wsp | cut -c 6 )
if [[ -n $wm5102card ]]; then
	output=$( cat $dirsystem/hwmixer-wsp 2> /dev/null || echo HPOUT2 Digital )
	/srv/http/bash/mpd-wm5102.sh $wm5102card $output
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
	sed -i '/^alsa =/,$ d' /etc/shairport-sync.conf
	echo "$alsa" >> /etc/shairport-sync.conf
	pushstream airplay '{"stop":"switchoutput"}'
	systemctl try-restart shairport-sync
fi

if [[ -e /usr/bin/spotifyd ]]; then
	if [[ -e $dirsystem/spotifydset ]]; then
		device=$( cat $dirsystem/spotifydset )
	else
		cardname=$( aplay -l | grep "^card $card" | head -1 | cut -d' ' -f3 )
		device=$( aplay -L | grep "^default.*$cardname" )
	fi
	sed -i 's/^\(device = \).*/\1'$device'/' /etc/spotifyd.conf
	systemctl try-restart spotifyd
fi
