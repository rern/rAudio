#!/bin/bash

# output:
# - get devices data - player-devices.sh
# - set asound.conf  - player-asound.sh
# - mixer_type    - from file if manually set | hardware if mixer | software
# - mixer_control - from file if manually set | mixer | null
# - mixer_device  - card index

[[ -e /dev/shm/usbdac_rules ]] && exit # debounce usbdac.rules
# --------------------------------------------------------------------
. /srv/http/bash/common.sh

pushVolumeNone() {
	pushData display '{ "volumenone": '$1' }'
	pushData refresh '{ "page": "features", "nosound": '$1', "toggle": true }'
}

[[ $( jq -r .state $dirshm/status.json ) != stop ]] && playerStop
mixer_current=$( getVar name $dirshm/output )

if [[ $1 ]]; then
	udev_usb=$1
	touch $dirshm/usbdac_rules
	if [[ $udev_usb == add ]]; then
		touch $dirshm/usbdac
		alsactl restore # store - saved by cmd.sh - volume.value push
	else
		rm -f $dirshm/usbdac
	fi
	( sleep 3; rm -f $dirshm/usbdac_rules ) &
fi
rm -f $dirmpdconf/{bluetooth,camilladsp,fifo,output}.conf

if [[ -e /proc/asound/card0 ]]; then # not depend on /etc/asound.conf which might be broken from bad script
	rm -f $dirshm/nosound
	. $dirsettings/player-devices.sh # >>>>>>>>>>>>>>> $CARD
else
	touch $dirshm/nosound
	rm -f $dirshm/{amixercontrol,devices,mixers,output}
	CARD=-1
	NAME='(None)'
	echo '
card='$CARD'
name=
mixer=
mixertype=' > $dirshm/output
	pushData display '{ "volumenone": true }'
fi

. $dirsettings/player-asound.sh # >>>>>>>>>>>>>>> $BT_SINK, $CAMILLADSP, $EQUALIZER

if [[ $CAMILLADSP ]]; then
	systemctl -q is-active camilladsp && ACTIVE=1
	systemctl restart camilladsp
	for i in {0..3}; do
		$dirbash/status -c GetVolume &> /dev/null && break || sleep 1
	done
	if [[ $i == 3 ]]; then
		CAMILLADSP=
		file_log=$( getVar LOG /etc/default/camilladsp )
		echo "\
Start failed!
$( cat $file_log )"
		systemctl stop camilladsp
		rm -f $dirsystem/camilladsp
		. $dirsettings/player-asound.sh
	else
		[[ ! $ACTIVE ]] && mixer.0dB
	fi
fi
# outputs -----------------------------------------------------------------------------
if [[ $BT_SINK && ! $CAMILLADSP ]]; then
	[[ ! -e $dirsystem/devicewithbt ]] && BT_ONLY=1
	hw=bluealsa
#	hwspotifyd=$( bluealsa-aplay -L | head -n 1 ) # bluealsa:SRV=org.bluealsa,DEV=xx:xx:xx:xx:xx:xx,PROFILE=a2dp
	ln -s $dirmpdconf/{conf/,}bluetooth.conf
	pcm=$( bluealsa-cli list-pcms | grep /sink$ )
	if [[ $pcm ]]; then
		info=$( bluealsa-cli info $pcm | grep -E '^(Channels|Format|Sampling)' )
		if [[ $info ]]; then
			read ch fm sr < <( sort <<< $info | cut -d' ' -f2 | tr '\n' ' ' )
			format=$sr:${fm:1:2}:$ch
		fi
	fi
	[[ ! $format ]] && format=44100:16:2
	! grep -q $format $dirmpdconf/bluetooth.conf && sed -i -E 's/(format *").*/\1'$format'"/' $dirmpdconf/bluetooth.conf
fi
if [[ $CARD == -1 ]]; then # no audio devices
	rm -f $dirmpdconf/{output,soxr}.conf
	[[ ! $AUDIOOUTPUTBT ]] && ln -sf $dirmpdconf/{conf/,}httpd.conf # set as output to allow play
	[[ $udev_usb == remove ]] && pushVolumeNone true
elif [[ ! $BT_ONLY && ! -e $dirshm/nosound ]]; then
	. $dirshm/output # card name mixer mixertype
	# usbdac.rules
	[[ $udev_usb ]] && pushVolumeNone $( [[ $mixertype == none ]] && echo true || echo false )
	if [[ $CAMILLADSP && ! -e $dirshm/source ]]; then
		hw=hw:Loopback,1
#		hwspotifyd=plughw:Loopback,1
		ln -sf $dirmpdconf/{conf/,}camilladsp.conf
	elif [[ $EQUALIZER ]]; then
		[[ $BT_SINK ]] && mixertype=software
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
		hw=hw:$card
		[[ $mixertype == software && ( $CAMILLADSP || $( bluealsa-cli list-pcms ) ) ]] && mixertype=hardware
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
	mixer_device   "'$hw'"'
			[[ -e $dirmpdconf/replaygain.conf && -e $dirsystem/replaygain-hw ]] && \
				AUDIOOUTPUT+='
	replay_gain_handler "mixer"'
		fi
		[[ -e "$dirsystem/dop-$name" ]] && \
			AUDIOOUTPUT+='
	dop            "yes"'
		if [[ -e $dirsystem/custom ]]; then
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
		( ! $AUDIOOUTPUT && ! $BT_ONLY && ! $CAMILLADSP && ! -e $dirsystem/snapclientserver ) ]]; then
	ln -sf $dirmpdconf/{conf/,}fifo.conf
fi

### mpd restart ##########################################################################
killProcess cmdlist
systemctl restart mpd
serviceIO mpd

if [[ -e $dirsystem/mpcupdate.conf ]]; then
	mpcUpdate
elif [[ -e $dirmpd/listing ]]; then
	$dirbash/cmd-list.sh
fi
( sleep 2 && systemctl try-restart rotaryencoder ) &> /dev/null & # $mixer might be changed
### reset volume
if [[ -e $dirsystem/camilladsp ]]; then
	FN_VOLUME=volumeCamilla
elif [[ -e $dirshm/source || ( -e $dirshm/sink && ! -e $dirsystem/devicewithbt ) ]]; then
	FN_VOLUME=volumeBlueAlsa
else
	FN_VOLUME=volumeMpd
fi
echo $FN_VOLUME > $dirshm/fn_volume
if [[ $FN_VOLUME == volumeMpd ]]; then
	volumeMpdRestore
elif [[ $FN_VOLUME == volumeBlueAlsa ]]; then # restore bluetooth saved volume
	[[ -e $dirshm/sink ]] && mac=$( < $dirshm/sink ) || mac=$( < $dirshm/source )
	if [[ -e $dirsystem/$mac ]]; then # saved from volumeMpdRestore()
		percent=$( < $dirsystem/$mac )
	else
		file_volume=$dirsystem/volume
		if [[ -e $file_volume ]]; then # use current volume
			percent=$( < $file_volume )
			rm -f $file_volume
		elif [[ -e ${file_volume}limit ]]; then
			percent=$( getVar startup ${file_volume}limit.conf )
		else
			percent=$( volume.value )
			(( $percent > 30 )) && percent=30
		fi
	fi
	systemctl stop bluez-volume
	amixer -MqD bluealsa:$mac sset A2DP $percent%
	pushData volume $percent refresh
	systemctl start bluez-volume
fi
if [[ ! -e $dirshm/btonboard ]]; then
	audiocards=$( aplay -l 2> /dev/null | grep ^card | grep -q -v 'bcm2835\|Loopback' && echo true )
	pushData refresh '{ "page": "system", "audiocards": '$audiocards' }'
fi
if [[ -e $dirshm/startup && ! $BT_SINK && $mixer_current != $NAME ]]; then
	notify output "Output Device" "$NAME"
fi
if [[ $udev_usb == add ]]; then
	pushData output '{ "usb": true }'
else
	$dirbash/status -p
	pushRefresh player
fi
[[ $CAMILLADSP ]] && pushRefresh camilla features
[[ $CARD == -1 && ! $BT_SINK ]] && exit
# --------------------------------------------------------------------
# renderers
[[ ! $mixer || $BT_SINK || $CAMILLADSP || $EQUALIZER ]] && MIXER_NO=1

if [[ -e /bin/shairport-sync && ! -e $dirmpdconf/snapserver.conf ]]; then
	fileconf=/etc/shairport-sync.conf
	hw0=$( getVar output_device $fileconf )
	mixer0=$( getVar mixer_control_name $fileconf )
	if [[ $hw0 != $hw || $mixer0 != $mixer ]]; then
#--------------->
		CONF=$( sed '/^alsa/,/}/ d' $fileconf )
		CONF+='
alsa = {
	output_device = "'$hw'";
	mixer_control_name = "'$mixer'";
}'
		[[ $MIXER_NO ]] && CONF=$( grep -v mixer_control_name <<< $CONF )
#---------------<
######## >
		echo "$CONF" > /etc/shairport-sync.conf
		systemctl try-restart shairport-sync
	fi
fi

if [[ -e /bin/snapclient ]]; then
	pcm=$( aplay -l | grep -m1 "^card $card" | sed -E 's/^card .: | \[.*//g' )
	pcm0=$( cut -d= -f3 /etc/default/snapclient | tr -d '"' )
	if [[ $pcm0 != $pcm ]]; then
		echo 'SNAPCLIENT_OPTS="--soundcard='$pcm'"' > /etc/default/snapclient
		systemctl try-restart snapclient
	fi
fi

if [[ -e /bin/spotifyd && ! -e $dirmpdconf/snapserver.conf ]]; then
	if [[ -e $dirsystem/spotifyoutput ]]; then
		device=$( < $dirsystem/spotifyoutput ) # hw=default:CARD=xxxx (from aplay -L)
	else
		device=hw:$card                        # hw=hw:N
	fi
	fileconf=/etc/spotifyd.conf
	device0=$( getVar device $fileconf )
	if [[ $device0 != $device ]]; then
######## >
		sed -i -E 's/^(device = ").*/\1'$device'"/' $fileconf
		systemctl try-restart spotifyd
	fi
fi

if [[ $EQUALIZER ]]; then
	VALUE=$( getVar current $dirsystem/equalizer.json )
	player=$( < $dirshm/player )
	[[ $player == airplay || $player == spotify ]] && USER=root || USER=mpd
	equalizer
fi
