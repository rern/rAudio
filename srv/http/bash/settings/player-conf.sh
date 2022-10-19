#!/bin/bash

# remove all output the reinstate each output:
# - get devices data from 'playerdevices.sh'
# - assign common paramters
# - mixer_type    - from file if manually set | hardware if hwmixer | software
# - mixer_control - from file if manually set | hwmixer | null
# - mixer_device  - card index

usbdac=$1

. /srv/http/bash/common.sh
. $dirsettings/player-devices.sh
. $dirsettings/player-asound.sh

# outputs -----------------------------------------------------------------------------
if [[ $i != -1 ]]; then # $i - current card number
	aplayname=${Aaplayname[i]}
	hw=${Ahw[i]}
	hwmixer=${Ahwmixer[i]}
	mixertype=${Amixertype[i]}
	name=${Aname[i]}
	if [[ $dsp ]]; then
		cardloopback=$( aplay -l | grep '^card.*Loopback.*device 0' | cut -c 6 )
		hw=hw:$cardloopback,1
#---------------<
		audiooutput+='
	name           "CamillaDSP (Loopback)"
	device         "'$hw'"
	type           "alsa"
	auto_resample  "no"
	mixer_type     "none"'
#--------------->
	elif [[ -e $dirsystem/equalizer ]]; then
		[[ -e $dirshm/btreceiver ]] && mixertype=software
#---------------<
		audiooutput+='
	name           "ALSAEqual"
	device         "plug:plugequal"
	type           "alsa"
	auto_resample  "no"
	mixer_type     "'$mixertype'"'
#--------------->
	elif [[ $btmixer ]]; then
		# no mac address needed - bluealsa already includes mac of latest connected device
#---------------<
		audiooutput+='
	name           "'$btmixer'"
	device         "bluealsa"
	type           "alsa"
	mixer_type     "hardware"'
		[[ -e $dirsystem/btformat ]] && audiooutput+='
	format         "44100:16:2"'
#--------------->
	elif [[ ! -e $dirshm/snapclientactive ]]; then
#---------------<
		audiooutput+='
	name           "'$name'"
	device         "'$hw'"
	type           "alsa"
	auto_resample  "no"
	auto_format    "no"
	mixer_type     "'$mixertype'"'
		if [[ $mixertype == hardware ]]; then # mixer_device must be card index
			audiooutput+='
	mixer_control  "'$hwmixer'"
	mixer_device   "hw:'$i'"'
			grep -q replaygain $mpdconf && audiooutput+='
	replay_gain_handler "mixer"'
		fi
		[[ -e "$dirsystem/dop-$aplayname" ]] && audiooutput+='
	dop            "yes"'
		if [[ $dirsystem/custom ]]; then
			customfile="$dirsystem/custom-output-$aplayname"
			[[ -e "$customfile" ]] && audiooutput+="
$( sed 's/^/\t/' "$customfile" )"
		fi
#--------------->
		[[ $mixertype == none ]] && touch $dirshm/mixernone || rm -f $dirshm/mixernone
	fi
fi
if [[ $audiooutput ]]; then
########
	audiooutput="\
audio_output {
$( echo "$audiooutput" | sed 's/  *"/@"/' | column -t -s@ )
}"
#-------
fi

if systemctl -q is-active snapserver; then
########
	audiooutput+='
audio_output {
	name           "Snapcast"
	type           "fifo"
	path           "/tmp/snapfifo"
	format         "48000:16:2"
	mixer_type     "software"
}'
#-------
fi
if [[ -e $dirsystem/streaming ]]; then
########
	audiooutput+='
audio_output {
	type           "httpd"
	name           "Streaming"
	encoder        "flac"
	port           "8000"
	quality        "5.0"
	format         "44100:16:2"
	always_on      "yes"
}'
#-------
fi
if [[ ! $audiooutput || -e $dirsystem/vumeter || -e $dirsystem/vuled || -e $dirsystem/mpdoled ]]; then
########
		audiooutput+='
audio_output {
	name           "'$( [[ ! $audiooutput ]] && echo '(no sound device)' || echo '(visualizer)' )'"
	type           "fifo"
	path           "/tmp/mpd.fifo"
	format         "44100:16:1"
}'
#-------
fi

global=$( sed -n '1,/^user/ p' $mpdconf | sed 's/  *"/@"/' | column -t -s@ )
[[ -e $dirsystem/custom && -e $dirmpd/mpd-custom.conf ]] && custom='include "mpd-custom.conf"'
[[ -e $dirsystem/soxr ]] && soxrcustom='-custom'
soxr='include "mpd-soxr'$soxrcustom'.conf"'
[[ -e $dirshm/audiocd ]] && cdio='include "mpd-cdio.conf"'
[[ -e $dirsystem/ffmpeg ]] && ffmpeg='include "mpd-ffmpeg.conf"'
cat << EOF | awk NF > $mpdconf
$global
$custom
input {
	plugin         "curl"
}
$soxr
$cdio
$ffmpeg
$audiooutput
EOF

# usbdac.rules -------------------------------------------------------------------------
if [[ $usbdac == add || $usbdac == remove ]]; then
	$dirbash/cmd.sh playerstop
	if [[ $mixertype == none ]]; then
		data='{"volumenone":'$volumenone'}'
		pushstream display "$data"
	fi
	pushstreamNotify 'Audio Output' "$name" output
fi

### mpd restart ##########################################################################
systemctl restart mpd
for pid in $( pgrep mpd ); do # set priority
	ionice -c 0 -n 0 -p $pid &> /dev/null 
	renice -n -19 -p $pid &> /dev/null
done

[[ -e $dirsystem/crossfade ]] && mpc -q crossfade $( cat $dirsystem/crossfade.conf )

if [[ -e $dirmpd/updating ]]; then
	path=$( < $dirmpd/updating )
	[[ $path == rescan ]] && mpc rescan || mpc update "$path"
fi
if [[ -e $dirsystem/autoplaybt && -e $dirshm/btreceiver ]]; then
	mpc | grep -q '\[playing' || $dirbash/cmd.sh mpcplayback$'\n'play
fi
data=$( $dirbash/status.sh )
pushstream mpdplayer "$data"
$dirsettings/player-data.sh pushrefresh
( sleep 2 && systemctl try-restart rotaryencoder snapclient ) &> /dev/null &

[[ ! $Acard && ! $btmixer ]] && exit

# renderers -----------------------------------------------------------------------------
if [[ -e /usr/bin/shairport-sync ]]; then
########
	conf="$( sed '/^alsa/,/}/ d' /etc/shairport-sync.conf )
alsa = {"
	if [[ $dsp ]]; then
		conf+='
	output_device = "hw:'$cardloopback',0";'
	elif [[ $btmixer ]]; then
		conf+='
	output_device = "bluealsa";'
	else
		conf+='
	output_device = "hw:'$i'";'
	[[ $hwmixer ]] && conf+='
	mixer_control_name = "'$hwmixer'";'
	fi
	conf+='
}'
#-------
	echo "$conf" > /etc/shairport-sync.conf
	data='{"stop":"switchoutput"}'
	pushstream airplay "$data"
	systemctl try-restart shairport-sync shairport-meta
fi

if [[ -e /usr/bin/spotifyd ]]; then
	if [[ $dsp ]]; then
		device='sysdefault:CARD=Loopback'
	elif [[ $btmixer ]]; then
		device=$( bluealsa-aplay -L | head -1 )
	else
		cardname=$( aplay -l 2> /dev/null \
						| grep "^card $i" \
						| head -1 \
						| cut -d' ' -f3 )
		[[ $cardname ]] && device=$( aplay -L | grep -m1 "^default.*$cardname" )
	fi
########
	conf='[global]
bitrate = 320
onevent = "/srv/http/bash/spotifyd.sh"
use_mpris = false
backend = "alsa"
device = "'$device'"'
	if [[ ! $dsp && ! $btmixer && $hwmixer != '( not available )' ]]; then
		conf+='
mixer = "'$hwmixer'"
control = "hw:'$i'"
volume_controller = "alsa"'
#-------
	fi
	echo "$conf" > /etc/spotifyd.conf
	systemctl try-restart spotifyd
fi
