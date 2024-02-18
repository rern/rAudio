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

### included by player-conf.sh

! type -t args2va &> /dev/null && . /srv/http/bash/common.sh

audioaplayname=$( getContent $dirsystem/audio-aplayname 'bcm2835 Headphones' )
audiooutput=$( getContent $dirsystem/audio-output 'On-board Headphones' )
for aplayname in "${proccards[@]}"; do
	[[ ${aplayname:0:8} == snd_rpi_ ]] && aplayname=$( tr _ - <<< ${aplayname:8} ) # snd_rpi_xxx_yyy > xxx-yyy
	[[ $aplayname == wsp || $aplayname == RPi-Cirrus ]] && aplayname=cirrus-wm5102
	[[ $aplayname == $audioaplayname ]] && name=$audiooutput || name=${aplayname/bcm2835/On-board}
	listdevice+=', "'$name'": "'$aplayname'"'
done
########
echo "{ ${listdevice:1} }" > $dirshm/listdevice

aplayl=$( aplay -l 2> /dev/null | awk '/^card/ && !/Loopback/' )
if [[ $usbdac == add ]]; then
	aplaycard=$( tail -1 <<< $aplayl )
elif [[ $aplayname == cirrus-wm5102 ]]; then
	aplaycard=$( grep -m1 wm5102 <<< $aplayl )
	hwmixer='HPOUT2 Digital'
	listmixer='[ "HPOUT1 Digital", "HPOUT2 Digital", "SPDIF Out", "Speaker Digital" ]'
else
	aplaycard=$( grep -m1 "$audioaplayname" <<< $aplayl ) # avoid duplicate aplayname
fi
readarray -t cnd <<< $( sed -E 's/card (.*):.*\[(.*)], device (.*):.*/\1\n\2\n\3/' <<< "$aplaycard" )
card=${cnd[0]}
aplayname=${cnd[1]}
device=${cnd[2]}
[[ $usbdac == add ]] && name=$aplayname || name=$audiooutput

if [[ $aplayname != cirrus-wm5102 ]]; then
	amixer=$( amixer -c $card scontents )
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
				listmixer+=', "'$control'"'
				[[ $control == Digital ]] && hwmixer=Digital
			done
			listmixer="[ ${listmixer:1} ]"
			hwmixerfile="$dirsystem/hwmixer-$aplayname"
			if [[ -e $hwmixerfile ]]; then # manual
				hwmixer=$( < "$hwmixerfile" )
			elif [[ ! $hwmixer ]]; then    # not Digital
				hwmixer=${controls[0]}
			fi
		fi
	fi
fi
mixertypefile="$dirsystem/mixertype-$aplayname"
if [[ -e $mixertypefile ]]; then
	mixertype=$( < "$mixertypefile" )
else
	[[ $listmixer ]] && mixertype=hardware || mixertype=none
fi

########
echo $card > $dirsystem/asoundcard
[[ $hwmixer ]] && echo "$hwmixer" > $dirshm/amixercontrol # quote to includes trailing space (if any)
[[ $listmixer ]] && echo $listmixer > $dirshm/listmixer
echo '
aplayname="'$aplayname'"
name="'$name'"
card='$card'
device='$device'
hwmixer='$hwmixer'
mixertype='$mixertype > $dirshm/output
