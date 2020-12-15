#!/bin/bash

# get hardware devices data with 'aplay' and amixer
# - aplay - get card index, sub-device index and aplayname
# - mixer device
#    - from file if manually set
#    - from 'amixer'
#        - if more than 1, filter with 'Digital\|Master' | get 1st one
# - mixer_type
#    - from file if manually set
#    - set as hardware if mixer device available
#    - if nothing, set as software
dirsystem=/srv/http/data/system

aplay=$( aplay -l | grep '^card' )
[[ -z $aplay ]] && echo -1 && exit
#aplay+=$'\ncard 1: sndrpiwsp [snd_rpi_wsp], device 0: WM5102 AiFi wm5102-aif1-0 []'

cardL=$( echo "$aplay" | wc -l )
audioaplayname=$( cat $dirsystem/audio-aplayname )

readarray -t lines <<<"$aplay"
for line in "${lines[@]}"; do
	hw=$( echo $line | sed 's/card \(.*\):.*device \(.*\):.*/hw:\1,\2/' )
	card=${hw:3:1}
	device=${hw: -1}
	aplayname=$( echo $line \
		| awk -F'[][]' '{print $2}' )
	# aplay -l: snd_rpi_xxx_yyy > xxx-yyy
	aplayname=$( echo $aplayname | sed 's/^snd_rpi_//; s/_/-/g' )
	case $aplayname in
		'bcm2835 HDMI 1' )     name='On-board - HDMI';;
		'bcm2835 Headphones' ) name='On-board - Headphone';;
		wsp )                  name='Cirrus Logic WM5102';;
		* )
			if [[ $aplayname == $audioaplayname ]]; then
				name=$( cat $dirsystem/audio-output )
			else
				name="$aplayname $device"
			fi
			;;
	esac
	# user selected
	hwmixerfile=$dirsystem/hwmixer-$card
	if [[ -e $hwmixerfile ]]; then
		hwmixer=$( cat $hwmixerfile )
		mixermanual=$hwmixer
	elif [[ $aplayname == wsp ]]; then
		mixermanual=
		mixercount=4
		hwmixer=WM5102
	else
		mixermanual=
		amixer=$( amixer -c $card scontents \
			| grep -A2 'Simple mixer control' \
			| grep -v 'Capabilities' \
			| tr -d '\n' \
			| sed 's/--/\n/g' \
			| grep 'Playback channels' \
			| sed "s/.*'\(.*\)',\(.\) .*/\1 \2/; s/ 0$//" \
			| awk '!a[$0]++' )
		mixercount=$( echo "$amixer" | wc -l )
		if (( $mixercount == 0 )); then
			hwmixer=
		elif (( $mixercount == 1 )); then
			hwmixer=$amixer
		else
			hwmixer=$( echo "$amixer" | grep 'Digital\|Master' | head -1 )
			[[ -z $hwmixer ]] && hwmixer=$( echo "$amixer" | head -1 )
		fi
	fi
	
	mixertypefile="$dirsystem/mixertype-$name"
	if [[ -e $mixertypefile ]]; then
		mixertype=$( cat "$mixertypefile" )
	elif [[ -n $hwmixer ]]; then
		mixertype=hardware
	else
		mixertype=software
	fi
	
	[[ -e "$dirsystem/dop-$name" ]] && dop=1 || dop=0
	
	Aaplayname+=( "$aplayname" )
	Acard+=( "$card" )
	Adevice+=( "$device" )
	Adop+=( "$dop" )
	Ahw+=( "$hw" )
	Ahwmixer+=( "$hwmixer" )
	Amixercount+=( "$mixercount" )
	Amixermanual+=( "$mixermanual" )
	Amixertype+=( "$mixertype" )
	Aname+=( "$name" )
done
