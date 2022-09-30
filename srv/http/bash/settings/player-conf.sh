#!/bin/bash

# remove all output the reinstate each output:
# - get devices data from 'playerdevices.sh'
# - assign common paramters
# - mixer_type    - from file if manually set | hardware if hwmixer | software
# - mixer_control - from file if manually set | hwmixer | null
# - mixer_device  - card index
# - dop           - if set

usbdac=$1

. /srv/http/bash/common.sh
. $dirbash/settings/player-devices.sh
. $dirbash/settings/player-asound.sh

# outputs -----------------------------------------------------------------------------
output= # reset var from player-devices.sh
if [[ $i != -1 ]]; then # $i - current card number
	aplayname=${Aaplayname[i]}
	dop=${Adop[i]}
	hw=${Ahw[i]}
	hwmixer=${Ahwmixer[i]}
	mixertype=${Amixertype[i]}
	name=${Aname[i]}
	if [[ $dsp ]]; then
		cardloopback=$( aplay -l | grep '^card.*Loopback.*device 0' | cut -c 6 )
		hw=hw:$cardloopback,1
#---------------<
		output+='
	name           "CamillaDSP (Loopback)"
	device         "'$hw'"
	type           "alsa"
	auto_resample  "no"
	mixer_type     "none"'
#--------------->
	elif [[ -e $dirsystem/equalizer ]]; then
		[[ -e $dirshm/btreceiver ]] && mixertype=software
#---------------<
		output+='
	name           "ALSAEqual"
	device         "plug:plugequal"
	type           "alsa"
	auto_resample  "no"
	mixer_type     "'$mixertype'"'
#--------------->
	elif [[ $btmixer ]]; then
		# no mac address needed - bluealsa already includes mac of latest connected device
#---------------<
		output+='
	name           "'$btmixer'"
	device         "bluealsa"
	type           "alsa"
	mixer_type     "hardware"'
		if [[ -e $dirsystem/btformat ]]; then
			output+='
	format         "44100:16:2"'
		fi
#--------------->
	elif [[ ! -e $dirshm/snapclientactive ]]; then
#---------------<
		output+='
	name           "'$name'"
	device         "'$hw'"
	type           "alsa"
	auto_resample  "no"
	auto_format    "no"
	mixer_type     "'$mixertype'"'
		if [[ $mixertype == hardware ]]; then # mixer_device must be card index
			output+='
	mixer_control  "'$hwmixer'"
	mixer_device   "hw:'$i'"'
		fi
		if [[ $dop == 1 ]]; then
			output+='
	dop            "yes"'
		fi
		mpdcustom=$dirsystem/custom
		customfile="$mpdcustom-output-$aplayname"
		if [[ -e $mpdcustom && -e "$customfile" ]]; then
			output+="
$( sed 's/^/\t/; s/$/ # custom/' "$customfile" )"
		fi
#--------------->
		[[ $mixertype == none ]] && touch $dirshm/mixernone || rm -f $dirshm/mixernone
	fi
fi
if [[ $output ]]; then
########
	output="
audio_output {\
$output
}"
#-------
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
#-------
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
#-------
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
#-------
fi

linecdio=$( sed -n '/cdio_paranoia/ =' /etc/mpd.conf )
[[ $linecdio ]] && sed -i "$(( linecdio - 1 )),/^$/ d" /etc/mpd.conf

lastline=$(( $( sed -n '/^audio_output/ =' /etc/mpd.conf | head -1 ) - 1 ))
global=$( sed -n "1,$lastline p" /etc/mpd.conf | sed '/# custom0/,/# custom1/ d' )
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

# usbdac.rules -------------------------------------------------------------------------
if [[ $usbdac == add || $usbdac == remove ]]; then
	$dirbash/cmd.sh playerstop
	[[ $mixertype == none ]] && pushstream display '{"volumenone":'$volumenone'}'
	pushstreamNotify 'Audio Output' "$name" output
fi

### mpd start ##########################################################################
systemctl restart mpd
for pid in $( pgrep mpd ); do # set priority
	ionice -c 0 -n 0 -p $pid &> /dev/null 
	renice -n -19 -p $pid &> /dev/null
done

if [[ -e $dirmpd/updating ]]; then
	path=$( cat $dirmpd/updating )
	[[ $path == rescan ]] && mpc rescan || mpc update "$path"
fi
if [[ -e $dirsystem/autoplaybt && -e $dirshm/btreceiver ]]; then
	mpc | grep -q '\[playing' || $dirbash/cmd.sh mpcplayback$'\n'play
fi
pushstream mpdplayer "$( $dirbash/status.sh )"
pushstream refresh "$( $dirbash/settings/player-data.sh )"
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
	pushstream airplay '{"stop":"switchoutput"}'
	systemctl try-restart shairport-sync
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
