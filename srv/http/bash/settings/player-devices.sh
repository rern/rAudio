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
! type -t args2va &> /dev/null && . /srv/http/bash/common.sh                                           # if run directly
[[ ! $proccards ]] && readarray -t proccards <<< $( sed -n '/]:/ {s/^.* - //; p}' /proc/asound/cards ) # if run directly

audioaplayname=$( getContent $dirsystem/audio-aplayname 'bcm2835 Headphones' )
audiooutput=$( getContent $dirsystem/audio-output 'On-board Headphones' )
for aplayname in "${proccards[@]}"; do # <<< player-conf.sh
	[[ ${aplayname:0:8} == snd_rpi_ ]] && aplayname=$( tr _ - <<< ${aplayname:8} ) # snd_rpi_xxx_yyy > xxx-yyy
	[[ $aplayname == wsp || $aplayname == RPi-Cirrus ]] && aplayname=cirrus-wm5102
	[[ $aplayname == $audioaplayname ]] && name=$audiooutput || name=${aplayname/bcm2835/On-board}
	LISTDEVICE+=', "'$name'": "'$aplayname'"'
done

aplayl=$( aplay -l 2> /dev/null | awk '/^card/ && !/Loopback/' )
if [[ $usbdac == add ]]; then # <<< player-conf.sh
	aplaycard=$( tail -1 <<< $aplayl )
elif [[ $aplayname == cirrus-wm5102 ]]; then
	aplaycard=$( grep -m1 wm5102 <<< $aplayl )
	HWMIXER='HPOUT2 Digital'
	LISTMIXER=", 'HPOUT1 Digital', 'HPOUT2 Digital', 'SPDIF Out', 'Speaker Digital'"
else
	aplaycard=$( grep -m1 "$audioaplayname" <<< $aplayl ) # avoid duplicate aplayname
fi
readarray -t cnd <<< $( sed -E 's/card (.*):.*\[(.*)], device (.*):.*/\1\n\2\n\3/' <<< "$aplaycard" )
CARD=${cnd[0]}
APLAYNAME=${cnd[1]}
DEVICE=${cnd[2]}
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
			readarray -t controls <<< $( cut -d"'" -f2 <<< $controls | sort -u )
			for control in "${controls[@]}"; do
				LISTMIXER+=', "'$control'"'
				[[ $control == Digital ]] && HWMIXER=Digital
			done
			hwmixerfile="$dirsystem/hwmixer-$APLAYNAME"
			if [[ -e $hwmixerfile ]]; then # manual
				HWMIXER=$( < "$hwmixerfile" )
			elif [[ ! $HWMIXER ]]; then    # not Digital
				HWMIXER=${controls[0]}
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

[[ $HWMIXER ]] && echo "$HWMIXER" > $dirshm/amixercontrol || rm -f $dirshm/amixercontrol
[[ $LISTDEVICE ]] && echo "{ ${LISTDEVICE:1} }" > $dirshm/listdevice || rm -f $dirshm/listdevice
[[ $LISTMIXER ]] && echo "[ ${LISTMIXER:1} ]" > $dirshm/listmixer || rm -f $dirshm/listmixer
echo '
aplayname="'$APLAYNAME'"
name="'$NAME'"
card='$CARD'
device='$DEVICE'
hwmixer="'$HWMIXER'"
mixertype='$MIXERTYPE > $dirshm/output
echo $CARD > $dirsystem/asoundcard
asoundcard=$CARD
