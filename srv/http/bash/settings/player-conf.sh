#!/bin/bash

# output:
# - get devices data - player-devices.sh
# - set asound.conf  - player-asound.sh
# - mixer_type    - from file if manually set | hardware if mixer | software
# - mixer_control - from file if manually set | mixer | null
# - mixer_device  - card index
[[ -e /dev/shm/usbdac ]] && exit

. /srv/http/bash/common.sh

if [[ $1 ]]; then
	usbdac=$1
	touch /dev/shm/usbdac
	( sleep 3; rm -f /dev/shm/usbdac ) &
fi
rm -f $dirmpdconf/{bluetooth,camilladsp,fifo}.conf

if grep -q ]: /proc/asound/cards; then # asound cards exist
	rm -f $dirshm/nosound
	. $dirsettings/player-devices.sh # >>> $CARD
else                                   # no sound
	touch $dirshm/nosound
	rm -f $dirshm/{amixercontrol,listdevice,listmixer,output}
	[[ -e $dirshm/btreceiver ]] && CARD=0 || CARD=-1
	echo $CARD > $dirsystem/asoundcard
	pushData display '{ "volumenone": true }'
fi

. $dirsettings/player-asound.sh # >>> $bluetooth, $camilladsp, $equalizer

pushStatus() {
	$dirbash/status-push.sh
	$dirsettings/player-data.sh pushrefresh
	audiocards=$( aplay -l 2> /dev/null | grep ^card | grep -q -v 'bcm2835\|Loopback' && echo true )
	[[ $usbdac ]] && pushData refresh '{ "page": "system", "audiocards": '$audiocards' }'
}

# outputs -----------------------------------------------------------------------------
if [[ $bluetooth && ! $camilladsp ]]; then # not require audio devices (from player-asound.sh)
	# no mac address needed - bluealsa already includes mac of latest connected device
	[[ ! -e $dirsystem/devicewithbt ]] && btoutputonly=1
	hw=bluealsa
#---------------< bluetooth
	audiooutputbt='
	name        "'$bluetooth'"
	device      "'$hw'"
	type        "alsa"
	mixer_type  "hardware"'
	[[ -e $dirsystem/btformat ]] && audiooutputbt+='
	format      "44100:16:2"'
#--------------->
########
	echo "\
audio_output {\
$audiooutputbt
}
" > $dirmpdconf/bluetooth.conf
########
fi
if [[ $CARD == -1 ]]; then # no audio devices
	rm -f $dirmpdconf/{output,soxr}.conf
	if [[ $usbdac == remove ]]; then
		pushData display '{ "volumenone": true }'
		pushData refresh '{ "page": "features", "nosound": true }'
		outputswitch='(None)'
	fi
elif [[ ! $btoutputonly ]]; then
	. $dirshm/output # card name mixer mixertype
	# usbdac.rules
	if [[ $usbdac ]]; then
		$dirbash/cmd.sh playerstop
		[[ $mixertype == none ]] && volumenone=true || volumenone=false
		pushData display '{ "volumenone": '$volumenone' }'
		pushData refresh '{ "page": "features", "nosound": '$volumenone' }'
		outputswitch=$name
	fi
	if [[ $camilladsp ]]; then
		hw=hw:Loopback,1
		ln -sf $dirmpdconf/{conf/,}camilladsp.conf
	elif [[ $equalizer ]]; then
		[[ $bluetooth ]] && mixertype=software
		hw=plug:plugequal
#---------------< equalizer
		audiooutput='
	name           "ALSAEqual"
	device         "'$hw'"
	type           "alsa"
	auto_resample  "no"
	mixer_type     "'$mixertype'"'
#--------------->
	elif [[ ! -e $dirsystem/snapclientserver ]]; then # not client + server on same device
		hw=hw:$card,0
#---------------< normal
		audiooutput='
	name           "'$name'"
	device         "'$hw'"
	type           "alsa"
	auto_resample  "no"
	auto_format    "no"
	mixer_type     "'$mixertype'"'
		if [[ $mixertype == hardware ]]; then # mixer_device must be card index
			audiooutput+='
	mixer_control  "'$mixer'"
	mixer_device   "hw:'$card'"'
			[[ -e $dirmpdconf/replaygain.conf && -e $dirsystem/replaygain-hw ]] && \
				audiooutput+='
	replay_gain_handler "mixer"'
		fi
		[[ -e "$dirsystem/dop-$name" ]] && \
			audiooutput+='
	dop            "yes"'
		if [[ $dirsystem/custom ]]; then
			customfile="$dirsystem/custom-output-$name"
			[[ -e "$customfile" ]] && \
				audiooutput+="
$( sed 's/^/\t/' "$customfile" )"
		fi
#--------------->
	fi
########
	if [[ $audiooutput ]]; then
		echo "\
audio_output {
$( sed 's/  *"/^"/' <<< $audiooutput | column -t -s^ )
}
" > $dirmpdconf/output.conf
	else
		rm -f $dirmpdconf/output.conf
	fi
########
fi

if [[ ( ! $audiooutput && ! $btoutputonly && ! -e $dirsystem/snapclientserver )
	|| -e $dirsystem/mpdoled || -e $dirsystem/vuled || -e $dirsystem/vumeter ]]; then
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

[[ $outputswitch ]] && notify output 'Audio Output' "$outputswitch"

( sleep 2 && systemctl try-restart rotaryencoder ) &> /dev/null &

[[ $CARD == -1 ]] && pushStatus && exit # >>>>>>>>>>

# renderers ----------------------------------------------------------------------------
[[ ! $mixer || $bluetooth || $camilladsp || $equalizer ]] && mixerno=1

if [[ -e /usr/bin/camilladsp ]]; then
	fileconf=$( getVar CONFIG /etc/default/camilladsp )
	card=$( sed -n -E '/playback:/,/device:/ {/device/! d; s/.*:(.),.*/\1/g; p}' "$fileconf" )
	if [[ $card != $CARD ]]; then
		sed -i -E '/playback:/,/device:/ s/(device: "hw:).*/\1'$CARD',0"/' "$fileconf"
		systemctl try-restart camilladsp
	fi
fi

if [[ -e /usr/bin/shairport-sync ]]; then
	fileconf=/etc/shairport-sync.conf
	hw0=$( sed -E -n '/output_device/ {s/.* = "(.*)";/\1/; p}' $fileconf )
	mixer0=$( sed -E -n '/mixer_control_name/ {s/.* = "(.*)";/\1/; p}' $fileconf )
	if [[ $hw0 != $hw || $mixer0 != $mixer ]]; then
########
		conf=$( sed '/^alsa/,/}/ d' /etc/shairport-sync.conf )
		conf+='
alsa = {
	output_device = "'$hw'";
	mixer_control_name = "'$mixer'";
}'
		[[ $mixerno ]] && conf=$( grep -v mixer_control_name <<< $conf )
#-------
		echo "$conf" > /etc/shairport-sync.conf
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
	hw0=$( sed -E -n '/device/ {s/.* = "(.*)";/\1/; p}' $fileconf )
	mixer=$( sed -E -n '/mixer/ {s/.* = "(.*)";/\1/; p}' $fileconf )
	if [[ $hw0 != $hw || $mixer0 != $mixer ]]; then
########
		conf=$( grep -Ev '^device|^control|^mixer' /etc/spotifyd.conf )
		if [[ ! $equalizer ]]; then
			conf+='
device = "'$hw'"
control = "'$hw'"
mixer = "'$mixer'"'
		[[ $mixerno ]] && conf=$( grep -v ^mixer <<< $conf )
		fi
#-------
		echo "$conf" > /etc/spotifyd.conf
		systemctl try-restart spotifyd
	fi
fi

pushStatus
