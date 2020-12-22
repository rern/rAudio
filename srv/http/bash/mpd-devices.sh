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

aplay=$( aplay -l 2> /dev/null | grep '^card' )
if [[ -z $aplay ]]; then
	i=-1
	aplayname=
	output='( No sound device )'
	devices+='{ "aplayname": "", "name": "( No sound device )" }'
	return
fi
#aplay+=$'\ncard 1: sndrpiwsp [snd_rpi_wsp], device 0: WM5102 AiFi wm5102-aif1-0 []'

audioaplayname=$( cat $dirsystem/audio-aplayname 2> /dev/null )

readarray -t lines <<< "$aplay"
for line in "${lines[@]}"; do
	hw=$( echo $line | sed 's/card \(.*\):.*device \(.*\):.*/hw:\1,\2/' )
	card=${hw:3:1}
	device=${hw: -1}
	aplayname=$( echo $line \
					| awk -F'[][]' '{print $2}' \
					| sed 's/^snd_rpi_//' ) # some aplay -l: snd_rpi_xxx_yyy > xxx-yyy
	[[ $aplayname == wsp ]] && aplayname=rpi-cirrus-wm5102
	if [[ $aplayname == $audioaplayname ]]; then
		name=$( cat $dirsystem/audio-output )
	else
		name=$( echo $aplayname | sed 's/bcm2835/On-board/' )
	fi
	hwmixerfile=$dirsystem/hwmixer-$aplayname
	if [[ -e $hwmixerfile ]]; then # manual
		mixers=2
		hwmixer=$( cat "$hwmixerfile" )
		mixertype=hardware
	elif [[ $aplayname == rpi-cirrus-wm5102 ]]; then
		mixers=4
		hwmixer='HPOUT2 Digital'
		mixertype=$( cat "$dirsystem/mixertype-$aplayname" 2> /dev/null || echo hardware )
	else
		amixer=$( amixer -c $card scontents )
		if [[ -z $amixer ]]; then
			mixers=0
			hwmixer=
			mixertype=software
		else
			amixer=$( echo "$amixer" \
				| grep -A2 'Simple mixer control' \
				| grep -v 'Capabilities' \
				| tr -d '\n' \
				| sed 's/--/\n/g' \
				| grep 'Playback channels' \
				| sed "s/.*'\(.*\)',\(.\) .*/\1 \2/; s/ 0$//" \
				| awk '!a[$0]++' \
				| grep . )
			mixers=$( echo "$amixer" | wc -l )
			if (( $mixers == 1 )); then
				hwmixer=$amixer
			else
				hwmixer=$( echo "$amixer" | grep 'Digital\|Master' | head -1 )
				[[ -z $hwmixer ]] && hwmixer=$( echo "$amixer" | head -1 )
			fi
			mixertype=$( cat "$dirsystem/mixertype-$aplayname" 2> /dev/null || echo hardware )
		fi
	fi
	
	[[ -e "$dirsystem/dop-$name" ]] && dop=1 || dop=0
	
	devices+=',{
		  "aplayname"   : "'$aplayname'"
		, "card"        : '$card'
		, "device"      : '$device'
		, "dop"         : '$dop'
		, "mixers"      : '$mixers'
		, "mixertype"   : "'$mixertype'"
		, "name"        : "'$name'"
		, "hw"          : "'$hw'"
		, "hwmixer"     : "'$hwmixer'"
	}'
	Aaplayname+=( "$aplayname" )
	Acard+=( "$card" )
	Adevice+=( "$device" )
	Adop+=( "$dop" )
	Ahw+=( "$hw" )
	Ahwmixer+=( "$hwmixer" )
	Amixers+=( "$mixers" )
	Amixertype+=( "$mixertype" )
	Aname+=( "$name" )
done

devices=${devices:1}
i=$( head -1 /etc/asound.conf | cut -d' ' -f2 )
aplayname=${Aaplayname[i]}
output=${Aname[i]}
