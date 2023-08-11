#!/bin/bash

# output:
# - get devices data - player-devices.sh
# - set asound.conf  - player-asound.sh
# - mixer_type    - from file if manually set | hardware if hwmixer | software
# - mixer_control - from file if manually set | hwmixer | null
# - mixer_device  - card index

. /srv/http/bash/common.sh

usbdac=$1

. $dirsettings/player-devices.sh # $asoundcard, $A...
. $dirsettings/player-asound.sh

pushData() {
	$dirbash/status-push.sh
	$dirsettings/player-data.sh pushrefresh
	[[ $usbdac ]] && pushstream refresh '{ "page": "system", "audiocards": '$( aplay -l | grep ^card | grep -c -v Loopback )' }'
}

rm -f $dirmpdconf/{bluetooth,output}.conf

# outputs -----------------------------------------------------------------------------
if [[ $btreceiver ]]; then # not require audio devices (from player-asound.sh)
	# no mac address needed - bluealsa already includes mac of latest connected device
	[[ ! -e $dirsystem/btoutputall ]] && btoutputonly=1
#---------------< bluetooth
	audiooutputbt='
	name        "'$btreceiver'"
	device      "bluealsa"
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

if [[ $asoundcard == -1 ]]; then # no audio devices
	if [[ $usbdac == remove ]]; then
		pushstream display '{ "volumenone": true }'
		pushstream refresh '{ "page": "features", "nosound": true }'
		systemctl stop camilladsp &> /dev/null
		outputswitch='(None)'
	fi
elif [[ ! $btoutputonly ]]; then # with devices (from player-devices.sh)
	aplayname=${Aaplayname[asoundcard]}
	card=${Acard[asoundcard]}
	device=${Adevice[asoundcard]}
	hwmixer=${Ahwmixer[asoundcard]}
	mixertype=${Amixertype[asoundcard]}
	name=${Aname[asoundcard]}
	# usbdac.rules
	if [[ $usbdac ]]; then
		$dirbash/cmd.sh playerstop
		[[ $mixertype == none ]] && volumenone=true || volumenone=false
		pushstream display '{ "volumenone": '$volumenone' }'
		pushstream refresh '{ "page": "features", "nosound": '$volumenone' }'
		outputswitch=$name
	fi
	if [[ $dsp ]]; then # from player-asound.sh
		card=$( aplay -l | grep '^card.*Loopback.*device 0' | cut -c 6 )
		hw=hw:$card,1
#---------------< camilladsp
		audiooutput='
	name           "CamillaDSP (Loopback)"
	device         "'$hw'"
	type           "alsa"
	auto_resample  "no"
	mixer_type     "none"'
#--------------->
	elif [[ $equalizer ]]; then # from player-asound.sh
		[[ -e $dirshm/btreceiver ]] && mixertype=software
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
	[[ $audiooutput ]] && echo "\
audio_output {
$( sed 's/  *"/^"/' <<< $audiooutput | column -t -s^ )
}
" > $dirmpdconf/output.conf
########
fi

if [[ ( ! $audiooutput && ! $btoutputonly && ! -e $dirsystem/snapclientserver )
	|| -e $dirsystem/vumeter || -e $dirsystem/vuled || -e $dirsystem/mpdoled ]]; then
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

[[ -e $dirmpd/updating ]] && $dirbash/cmd.sh mpcupdate

[[ -e $dirshm/btreceiver && -e $dirsystem/autoplay ]] && grep -q bluetooth=true $dirsystem/autoplay.conf && mpc -q play

[[ $outputswitch ]] && notify output 'Audio Output' "$outputswitch"

( sleep 2 && systemctl try-restart rotaryencoder ) &> /dev/null &

[[ ! $Acard && ! $btreceiver ]] && pushData && exit # >>>>>>>>>>

# renderers ----------------------------------------------------------------------------

if [[ -e /usr/bin/shairport-sync ]]; then # output_device = "hw:N";
	[[ $btreceiver ]] && hw=bluealsa         #                 "bluealsa";
########
	conf="\
$( sed '/^alsa/,/}/ d' /etc/shairport-sync.conf )
alsa = {
	output_device = \"hw:$card\";"
	
	[[ $hwmixer && ! $dsp && ! $equalizer ]] && \
		conf+='
	mixer_control_name = "'$hwmixer'";'
	
	conf+='
}'
#-------
	echo "$conf" > /etc/shairport-sync.conf
	systemctl try-restart shairport-sync
fi

if [[ -e /usr/bin/spotifyd ]]; then # device = "hw:N" or "default:CARD=xxxx"
									#          "bluealsa:SRV=org.bluealsa,DEV=xx:xx:xx:xx:xx:xx,PROFILE=a2dp"
	if [[ $btreceiver ]]; then
		hw=$( bluealsa-aplay -L | head -1 )
	elif [[ -e "$dirsystem/spotify-$aplayname" ]]; then
		hw=$( < "$dirsystem/spotify-$aplayname" )
	else
		hw=hw:$asoundcard
	fi
########
	conf=$( grep -Ev '^device|^control|^mixer' /etc/spotifyd.conf )

	if [[ ! $equalizer ]]; then
		conf+='
device = "'$hw'"
control = "'$hw'"'
		
		[[ $hwmixer && ! $btreceiver ]] && \
			conf+='
mixer = "'$hwmixer'"'
	fi
#-------
	echo "$conf" > /etc/spotifyd.conf
	systemctl try-restart spotifyd
fi

if [[ $dsp ]] && ! systemctl -q is-active camilladsp; then
	systemctl start camilladsp
fi

pushData
