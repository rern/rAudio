#!/bin/bash

# output:
# - get devices data - player-devices.sh
# - set asound.conf  - player-asound.sh
# - mixer_type    - from file if manually set | hardware if mixer | software
# - mixer_control - from file if manually set | mixer | null
# - mixer_device  - card index
[[ -e /dev/shm/usbdacflag ]] && exit # $dirshm/usbdacflag

. /srv/http/bash/common.sh

usbDacVolume() { # fix - alsactl not maintain usb dac volume
	. $dirshm/output # card name mixer mixertype
	filevolume="$dirsystem/volume-$name"
	if [[ $1 == remove ]]; then
		[[ -s $dirshm/usbdac ]] && mv -f $dirshm/usbdac "$filevolume"
	else
		[[ -e "$filevolume" ]] && vol=$( < "$filevolume" ) || vol=$( getContent $dirshm/volume )
		[[ ! $vol ]] && vol=50
		amixer -c $card -Mq sset "$mixer" $vol%
		alsactl store
	fi
}

if [[ $1 ]]; then
	usbdac=$1
	[[ $usbdac == remove ]] && usbDacVolume remove
	touch $dirshm/usbdacflag
	( sleep 3; rm -f $dirshm/usbdacflag ) &
fi
rm -f $dirmpdconf/{bluetooth,camilladsp,fifo,output}.conf

if [[ -e /proc/asound/card0 ]]; then # not depend on /etc/asound.conf which might be broken from bad script
	rm -f $dirshm/nosound
	. $dirsettings/player-devices.sh # >>> $CARD
else                                   # no sound
	notify output 'Audio Output' '(None)'
	touch $dirshm/nosound
	rm -f $dirshm/{amixercontrol,devices,mixers,output}
	[[ $bluetooth ]] && CARD=0 || CARD=-1
	echo $CARD > $dirsystem/asoundcard
	pushData display '{ "volumenone": true }'
fi

. $dirsettings/player-asound.sh # >>> $bluetooth, $camilladsp, $equalizer

pushStatus() {
	[[ $usbdac == add ]] && usbDacVolume
	status=$( $dirbash/status.sh )
	pushData mpdplayer "$status"
	pushRefresh player
	audiocards=$( aplay -l 2> /dev/null | grep ^card | grep -q -v 'bcm2835\|Loopback' && echo true )
	if [[ $usbdac ]]; then
		volumeGet push
		pushData refresh '{ "page": "system", "audiocards": '$audiocards' }'
	fi
}

# outputs -----------------------------------------------------------------------------
if [[ $bluetooth && ! $camilladsp ]]; then # not require audio devices (from player-asound.sh)
	# no mac address needed - bluealsa already includes mac of latest connected device
	[[ ! -e $dirsystem/devicewithbt ]] && btoutputonly=1
	hw=bluealsa
#---------------< bluetooth
	AUDIOOUTPUTBT='
	name        "'$( < $dirshm/btname )'"
	device      "'$hw'"
	type        "alsa"
	mixer_type  "hardware"'
	[[ -e $dirsystem/btformat ]] && AUDIOOUTPUTBT+='
	format      "44100:16:2"'
#--------------->
######## >
	echo "\
audio_output {\
$AUDIOOUTPUTBT
}
" > $dirmpdconf/bluetooth.conf
######## >
fi
if [[ $CARD == -1 ]]; then # no audio devices
	rm -f $dirmpdconf/{output,soxr}.conf
	if [[ $usbdac == remove ]]; then
		pushData display '{ "volumenone": true }'
		pushData refresh '{ "page": "features", "nosound": true }'
	fi
elif [[ ! $btoutputonly ]]; then
	. $dirshm/output # card name mixer mixertype
	# usbdac.rules
	if [[ $usbdac ]]; then
		$dirbash/cmd.sh playerstop
		[[ $mixertype == none ]] && volumenone=true || volumenone=false
		pushData display '{ "volumenone": '$volumenone' }'
		pushData refresh '{ "page": "features", "nosound": '$volumenone' }'
	fi
	if [[ $camilladsp ]]; then
		hw=hw:Loopback,1
		ln -sf $dirmpdconf/{conf/,}camilladsp.conf
	elif [[ $equalizer ]]; then
		[[ $bluetooth ]] && mixertype=software
		hw=plug:plugequal
#---------------< equalizer
		AUDIOOUTPUT='
	name           "ALSAEqual"
	device         "'$hw'"
	type           "alsa"
	auto_resample  "no"
	mixer_type     "'$mixertype'"'
#--------------->
	elif [[ ! -e $dirsystem/snapclientserver ]]; then # not client + server on same device
		hw=hw:$card,0
#---------------< normal
		AUDIOOUTPUT='
	name           "'$name'"
	device         "'$hw'"
	type           "alsa"
	auto_resample  "no"
	auto_format    "no"
	mixer_type     "'$mixertype'"'
		if [[ $mixertype == hardware ]]; then # mixer_device must be card index
			AUDIOOUTPUT+='
	mixer_control  "'$mixer'"
	mixer_device   "hw:'$card'"'
			[[ -e $dirmpdconf/replaygain.conf && -e $dirsystem/replaygain-hw ]] && \
				AUDIOOUTPUT+='
	replay_gain_handler "mixer"'
		fi
		[[ -e "$dirsystem/dop-$name" ]] && \
			AUDIOOUTPUT+='
	dop            "yes"'
		if [[ $dirsystem/custom ]]; then
			customfile="$dirsystem/custom-output-$name"
			[[ -e "$customfile" ]] && \
				AUDIOOUTPUT+="
$( sed 's/^/\t/' "$customfile" )"
		fi
#--------------->
	fi
	if [[ $AUDIOOUTPUT ]]; then
######## >
		echo "\
audio_output {
$( sed 's/  *"/^"/' <<< $AUDIOOUTPUT | column -t -s^ )
}
" > $dirmpdconf/output.conf
######## >
	else
		rm -f $dirmpdconf/output.conf
	fi
fi

if [[ -e $dirsystem/mpdoled || -e $dirsystem/vuled || -e $dirsystem/vumeter ||
		( ! $AUDIOOUTPUT && ! $btoutputonly && ! S.camilladsp && ! -e $dirsystem/snapclientserver ) ]]; then
	ln -sf $dirmpdconf/{conf/,}fifo.conf
fi

### mpd restart ##########################################################################
systemctl restart mpd

for pid in $( pgrep mpd ); do # set priority
	ionice -c 0 -n 0 -p $pid &> /dev/null 
	renice -n -19 -p $pid &> /dev/null
done

[[ -e $dirmpd/updating ]] && $dirbash/cmd.sh mpcupdate

[[ $bluetooth && -e $dirsystem/autoplay ]] && grep -q bluetooth=true $dirsystem/autoplay.conf && mpc -q play

( sleep 2 && systemctl try-restart rotaryencoder ) &> /dev/null &

[[ $CARD == -1 ]] && pushStatus && exit # >>>>>>>>>>

# renderers ----------------------------------------------------------------------------
[[ ! $mixer || $bluetooth || $camilladsp || $equalizer ]] && mixerno=1

if [[ -e /usr/bin/shairport-sync ]]; then
	fileconf=/etc/shairport-sync.conf
	hw0=$( getVar output_device $fileconf )
	mixer0=$( getVar mixer_control_name $fileconf )
	if [[ $hw0 != $hw || $mixer0 != $mixer ]]; then
#--------------->
		CONF=$( sed '/^alsa/,/}/ d' /etc/shairport-sync.conf )
		CONF+='
alsa = {
	output_device = "'$hw'";
	mixer_control_name = "'$mixer'";
}'
		[[ $mixerno ]] && CONF=$( grep -v mixer_control_name <<< $CONF )
#---------------<
######## >
		echo "$CONF" > /etc/shairport-sync.conf
		systemctl try-restart shairport-sync
	fi
fi

if [[ -e /usr/bin/spotifyd ]]; then # hw:N (or default:CARD=xxxx)
	if [[ $camilladsp ]]; then
		hw=plughw:Loopback,1
	elif [[ $bluetooth ]]; then
		hw=$( bluealsa-aplay -L | head -1 )  # bluealsa:SRV=org.bluealsa,DEV=xx:xx:xx:xx:xx:xx,PROFILE=a2dp
	elif [[ -e $dirsystem/spotifyoutput ]]; then
		hw=$( < $dirsystem/spotifyoutput )
	fi
	fileconf=/etc/spotifyd.conf
	hw0=$( getVar device $fileconf )
	mixer=$( getVar mixer $fileconf )
	if [[ $hw0 != $hw || $mixer0 != $mixer ]]; then
#--------------->
		CONF=$( grep -Ev '^device|^control|^mixer' /etc/spotifyd.conf )
		if [[ ! $equalizer ]]; then
			CONF+='
device = "'$hw'"
control = "'$hw'"
mixer = "'$mixer'"'
		[[ $mixerno ]] && CONF=$( grep -v ^mixer <<< $CONF )
		fi
#---------------<
######## >
		echo "$CONF" > /etc/spotifyd.conf
		systemctl try-restart spotifyd
	fi
fi

pushStatus
