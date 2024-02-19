#!/bin/bash

# get hardware devices data with 'aplay' and amixer
# - aplay - get card index, sub-device index and aplayname
# - mixer device
#    - from file if manually set
#    - from 'amixer'
#        - if more than 1, filter with 'Digital|Master' | get 1st one
# - mixer_type
#    - from file if manually set
#    - set as hardware if mixer device available
#    - if nothing, set as software

### included by <<< player-conf.sh
! type -t args2va &> /dev/null && . /srv/http/bash/common.sh         # if run directly
# snd_rpi_rpi_dac > i2s-dac (rpi-dac obsolete)
# snd_rpi_wsp     > cirrus-wm5102
# RPi-Cirrus      > cirrus-wm5102
# snd_rpi_xxx_yyy > xxx_yyy
# xxx_yyy         > xxx-yyy
aplayl=$( aplay -l \
			| sed -n -E '/^card/ {
				s/^card //
				s/: /^/g
				s/\[snd_rpi_rpi_dac]/[i2s-dac]/
				s/\[snd_rpi_wsp]|\[RPi-Cirrus]/[cirrus-wm5102]/
				s/\[snd_rpi_/[/
				s/ \[/^/g
				s/, device /^/
				s/_/-/g
				s/\]//g
			p}' )
# >>> 1card^...^3aplayname^4device^...^6name^
audioaplayname=$( getContent $dirsystem/audio-aplayname 'bcm2835 Headphones' )
audiooutput=$( getContent $dirsystem/audio-output 'On-board Headphones' )
while read line; do
	aplayname=$( cut -d^ -f3 <<< $line )
	name=$( cut -d^ -f6 <<< $line )
	if [[ $name ]]; then
		name=${name/bcm2835/On-board}
	else
		if [[ $aplayname == $audioaplayname ]]; then
			name=$audiooutput
		else
			name=$aplayname
		fi
	fi
	name_device=', "'$name'": "'$aplayname'"'
	! grep -q "$name_device" <<< $LISTDEVICE && LISTDEVICE+=$name_device # suppress duplicate
done <<< $aplayl

if [[ $usbdac == add ]]; then # <<< player-conf.sh
	aplaycard=$( tail -1 <<< $aplayl )
elif [[ $aplayname == cirrus-wm5102 ]]; then
	aplaycard=$( grep -m1 cirrus-wm5102 <<< $aplayl )
	MIXER='HPOUT2 Digital'
	LISTMIXER=", 'HPOUT1 Digital', 'HPOUT2 Digital', 'SPDIF Out', 'Speaker Digital'"
else
	aplaycard=$( grep -m1 "$audioaplayname" <<< $aplayl ) # avoid duplicate aplayname
fi

CARD=$( cut -d^ -f1 <<< $aplaycard )
APLAYNAME=$( cut -d^ -f3 <<< $aplaycard )
DEVICE=$( cut -d^ -f4 <<< $aplaycard )
[[ $usbdac == add ]] && NAME=$APLAYNAME || NAME=$audiooutput
if [[ ! $LISTMIXER ]]; then # ! cirrus-wm5102
	amixer=$( amixer -c $CARD scontents )
	if [[ $amixer ]]; then
		amixer=$( grep -A1 ^Simple <<< $amixer \
					| sed 's/^\s*Cap.*: /^/' \
					| tr -d '\n' \
					| sed 's/--/\n/g' \
					| grep -v "'Mic'" )
		controls=$( grep -E 'volume.*pswitch|Master.*volume' <<< $amixer )
		[[ ! $controls ]] && controls=$( grep volume <<< $amixer )
		if [[ $controls ]]; then
			controls=$( cut -d"'" -f2 <<< $controls | sort -u )
			while read control; do
				LISTMIXER+=', "'$control'"'
				[[ $control == Digital ]] && MIXER=Digital
			done <<< $controls
			mixerfile="$dirsystem/mixer-$APLAYNAME"
			if [[ -e $mixerfile ]]; then # manual
				MIXER=$( < "$mixerfile" )
			elif [[ ! $MIXER ]]; then    # not Digital
				MIXER=$( head -1 <<< $controls )
			fi
		fi
	fi
fi
mixertypefile="$dirsystem/mixertype-$APLAYNAME"
if [[ -e $mixertypefile ]]; then
	MIXERTYPE=$( < "$mixertypefile" )
else
	[[ $LISTMIXER ]] && MIXERTYPE=hardware || MIXERTYPE=none
fi

[[ $LISTDEVICE ]] && echo "{ ${LISTDEVICE:1} }" > $dirshm/listdevice || rm -f $dirshm/listdevice
[[ $LISTMIXER ]] && echo "[ ${LISTMIXER:1} ]" > $dirshm/listmixer || rm -f $dirshm/listmixer
if [[ $MIXER ]]; then
	echo "$MIXER" > $dirshm/amixercontrol
	output='mixer="'$MIXER'"'
else
	rm -f $dirshm/amixercontrol
	output='mixer=false'
fi
output+='
aplayname="'$APLAYNAME'"
name="'$NAME'"
card='$CARD'
device='$DEVICE'
mixertype='$MIXERTYPE
echo "$output" > $dirshm/output
echo $CARD > $dirsystem/asoundcard
asoundcard=$CARD
