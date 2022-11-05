#!/bin/bash

# output:
# - get devices data - player-devices.sh
# - set asound.conf  - player-asound.sh
# - mixer_type    - from file if manually set | hardware if hwmixer | software
# - mixer_control - from file if manually set | hwmixer | null
# - mixer_device  - card index

. /srv/http/bash/common.sh
usbdac=$1 # from usbdac.rules for player-devices.sh

. $dirsettings/player-devices.sh # $i, $A...
. $dirsettings/player-asound.sh

# outputs -----------------------------------------------------------------------------
if [[ $i == -1 ]]; then # $i - current card number
	rm -f $dirmpdconf/output.conf
else
	aplayname=${Aaplayname[i]}
	hw=${Ahw[i]}
	hwmixer=${Ahwmixer[i]}
	mixertype=${Amixertype[i]}
	name=${Aname[i]}
	# usbdac.rules
	if [[ $usbdac ]]; then
		$dirbash/cmd.sh playerstop
		[[ $mixertype == none ]] && pushstream display '{"volumenone":true}'
		pushstreamNotify output 'Audio Output' "$name"
		[[ $usbdac == remove ]] && sleep 2
	fi
	if [[ $dsp ]]; then
		cardloopback=$( aplay -l | grep '^card.*Loopback.*device 0' | cut -c 6 )
		hw=hw:$cardloopback,1
#---------------< 1 dsp
		audiooutput+='
	name           "CamillaDSP (Loopback)"
	device         "'$hw'"
	type           "alsa"
	auto_resample  "no"
	mixer_type     "none"'
#--------------->
	elif [[ $equalizer ]]; then
		[[ -e $dirshm/btreceiver ]] && mixertype=software
#---------------< 2 equalizer
		audiooutput+='
	name           "ALSAEqual"
	device         "plug:plugequal"
	type           "alsa"
	auto_resample  "no"
	mixer_type     "'$mixertype'"'
#--------------->
	elif [[ $btmixer ]]; then
		# no mac address needed - bluealsa already includes mac of latest connected device
#---------------< 3 bluetooth
		audiooutput+='
	name           "'$btmixer'"
	device         "bluealsa"
	type           "alsa"
	mixer_type     "hardware"'
		[[ -e $dirsystem/btformat ]] && audiooutput+='
	format         "44100:16:2"'
#--------------->
	elif [[ ! -e $dirshm/snapclientactive ]]; then
#---------------< 4 normal
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
			[[ -e $dirmpdconf/replaygain.conf ]] && audiooutput+='
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
########
	echo "\
audio_output {
$( sed 's/  *"/^"/' <<< $audiooutput | column -t -s^ )
}
" > $dirmpdconf/output.conf
########
fi

if [[ ! $audiooutput || -e $dirsystem/vumeter || -e $dirsystem/vuled || -e $dirsystem/mpdoled ]]; then
	ln -sf $dirmpdconf/{conf/,}fifo.conf
else
	rm -f $dirmpdconf/fifo.conf
fi

### mpd restart ##########################################################################
systemctl restart mpd
for pid in $( pgrep mpd ); do # set priority
	ionice -c 0 -n 0 -p $pid &> /dev/null 
	renice -n -19 -p $pid &> /dev/null
done

if [[ -e $dirmpd/updating ]]; then
	path=$( < $dirmpd/updating )
	[[ $path == rescan ]] && mpc rescan || mpc update "$path"
fi
if [[ -e $dirsystem/autoplaybt && -e $dirshm/btreceiver ]]; then
	mpc | grep -q -m1 '\[playing' || $dirbash/cmd.sh mpcplayback$'\n'play
fi
pushstream mpdplayer $( $dirbash/status.sh )
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
	pushstream airplay '{"stop":"switchoutput"}'
	systemctl try-restart shairport-sync shairport-meta
fi

if [[ -e /usr/bin/spotifyd ]]; then
	if [[ $dsp ]]; then
		device='sysdefault:CARD=Loopback'
	elif [[ $btmixer ]]; then
		device=$( bluealsa-aplay -L | head -1 )
	else
		cardname=$( aplay -l 2> /dev/null | awk '/^card '$1'/ {print $3;exit}' )
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
