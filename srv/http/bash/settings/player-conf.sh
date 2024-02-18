#!/bin/bash

# output:
# - get devices data - player-devices.sh
# - set asound.conf  - player-asound.sh
# - mixer_type    - from file if manually set | hardware if hwmixer | software
# - mixer_control - from file if manually set | hwmixer | null
# - mixer_device  - card index

. /srv/http/bash/common.sh

usbdac=$1

. $dirsettings/player-devices.sh
. $dirsettings/player-asound.sh  # $bluetooth, $camilladsp, $equalizer

pushStatus() {
	$dirbash/status-push.sh
	$dirsettings/player-data.sh pushrefresh
	[[ $usbdac ]] && pushData refresh '{ "page": "system", "audiocards": '$( aplay -l | grep ^card | grep -c -v Loopback )' }'
}

rm -f $dirmpdconf/{bluetooth,camilladsp,fifo}.conf
systemctl stop camilladsp

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
asoundcard=$( < $dirsystem/asoundcard )
if [[ $asoundcard == -1 ]]; then # no audio devices
	if [[ $usbdac == remove ]]; then
		pushData display '{ "volumenone": true }'
		pushData refresh '{ "page": "features", "nosound": true }'
		outputswitch='(None)'
	fi
elif [[ ! $btoutputonly ]]; then
	. $dirshm/output # aplayname name card device hwmixer mixertype
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
		hw=hw:$card,$device
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
	mixer_control  "'$hwmixer'"
	mixer_device   "hw:'$card'"'
			[[ -e $dirmpdconf/replaygain.conf && -e $dirsystem/replaygain-hw ]] && \
				audiooutput+='
	replay_gain_handler "mixer"'
		fi
		[[ -e "$dirsystem/dop-$aplayname" ]] && \
			audiooutput+='
	dop            "yes"'
		if [[ $dirsystem/custom ]]; then
			customfile="$dirsystem/custom-output-$aplayname"
			[[ -e "$customfile" ]] && \
				audiooutput+="
$( sed 's/^/\t/' "$customfile" )"
		fi
#--------------->
		[[ $mixertype == none ]] && touch $dirshm/mixernone || rm -f $dirshm/mixernone
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

[[ $camilladsp ]] && systemctl start camilladsp

for pid in $( pgrep mpd ); do # set priority
	ionice -c 0 -n 0 -p $pid &> /dev/null 
	renice -n -19 -p $pid &> /dev/null
done

[[ -e $dirmpd/updating ]] && $dirbash/cmd.sh mpcupdate

[[ $bluetooth && -e $dirsystem/autoplay ]] && grep -q bluetooth=true $dirsystem/autoplay.conf && mpc -q play

[[ $outputswitch ]] && notify output 'Audio Output' "$outputswitch"

( sleep 2 && systemctl try-restart rotaryencoder ) &> /dev/null &

[[ $asoundcard == -1 ]] && pushStatus && exit # >>>>>>>>>>

# renderers ----------------------------------------------------------------------------
[[ $hwmixer && ! $bluetooth && ! $camilladsp && ! $equalizer ]] && mixer=1

if [[ -e /usr/bin/shairport-sync ]]; then
########
	conf=$( sed '/^alsa/,/}/ d' /etc/shairport-sync.conf )
	conf+='
alsa = {
	output_device = "'$hw'";
	mixer_control_name = "'$hwmixer'";
}'
	[[ ! $mixer ]] && conf=$( grep -v mixer_control_name <<< $conf )
#-------
	echo "$conf" > /etc/shairport-sync.conf
	systemctl try-restart shairport-sync
fi

if [[ -e /usr/bin/spotifyd ]]; then # hw:N (or default:CARD=xxxx)
	if [[ $camilladsp ]]; then
		hw=plughw:Loopback,1
	elif [[ $bluetooth ]]; then
		hw=$( bluealsa-aplay -L | head -1 )  # bluealsa:SRV=org.bluealsa,DEV=xx:xx:xx:xx:xx:xx,PROFILE=a2dp
	elif [[ -e $dirsystem/spotifyoutput ]]; then
		hw=$( < $dirsystem/spotifyoutput )
	fi
########
	conf=$( grep -Ev '^device|^control|^mixer' /etc/spotifyd.conf )
	if [[ ! $equalizer ]]; then
		conf+='
device = "'$hw'"
control = "'$hw'"
mixer = "'$hwmixer'"'
	[[ ! $mixer ]] && conf=$( grep -v ^mixer <<< $conf )
	fi
#-------
	echo "$conf" > /etc/spotifyd.conf
	systemctl try-restart spotifyd
fi

pushStatus
