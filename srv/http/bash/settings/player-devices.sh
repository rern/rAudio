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

### included by player-conf.sh, player-data.sh
rm -f $dirshm/{amixercontrol,nosound} $dirsystem/player-device

aplayl=$( aplay -l 2> /dev/null \
							| awk '/^card/ && !/Loopback/' \
							| sed '/device 1.*HDMI 1/ {s/HDMI 1/HDMI 2/g}' )
if [[ ! $aplayl ]]; then
	[[ -e $dirshm/btreceiver ]] && asoundcard=0 || asoundcard=-1
	echo $asoundcard > $dirsystem/asoundcard
	touch $dirshm/nosound
	pushData display '{ "volumenone": true }'
	return
fi

#aplay+=$'\ncard 1: sndrpiwsp [snd_rpi_wsp], device 0: WM5102 AiFi wm5102-aif1-0 []'

readarray -t lines <<< $aplayl
for line in "${lines[@]}"; do
	aplayname=$( sed -E 's/.*\[(.*)], device.*/\1/' <<< "$line" )
	[[ ${aplayname:0:8} == snd_rpi_ ]] && aplayname=$( tr _ - <<< ${aplayname:8} ) # some snd_rpi_xxx_yyy > xxx-yyy
	[[ $aplayname == wsp || $aplayname == RPi-Cirrus ]] && aplayname=cirrus-wm5102
	name=${aplayname/bcm2835/On-board}
	devicelist+=', "'$name'": "'$aplayname'"'
done
########
echo "{ ${devicelist:1} }" > $dirshm/devicelist

name=$( getContent $dirsystem/audio-output 'On-board Headphones' )
if [[ $usbdac == add ]]; then
	line=$( tail -1 <<< $aplayl )
else
	audioaplayname=$( getContent $dirsystem/audio-aplayname 'bcm2835 Headphones' )
	line=$( grep "$audioaplayname" <<< $aplayl )
fi
readarray -t cnd <<< $( sed -E 's/card (.*):.*\[(.*)], device (.*):.*/\1\n\2\n\3/' <<< "$line" )
card=${cnd[0]}
aplayname=${cnd[1]}
device=${cnd[2]}
amixer=$( amixer -c $card scontents )
if [[ $amixer ]]; then
	amixer=$( grep -A1 ^Simple <<< $amixer \
				| sed 's/^\s*Cap.*: /^/' \
				| tr -d '\n' \
				| sed 's/--/\n/g' \
				| grep -v "'Mic'" )
	controls=$( grep -E 'volume.*pswitch|Master.*volume' <<< $amixer )
	[[ ! $controls ]] && controls=$( grep volume <<< $amixer )
	[[ $controls ]] && controls=$( cut -d"'" -f2 <<< $controls )
fi
if [[ ! $controls ]]; then
	mixerdevices=false
	mixers=0
else
	readarray -t controls <<< $( sort -u <<< $controls )
	mixerdevices=
	for control in "${controls[@]}"; do
		mixerdevices+=',"'$control'"'
	done
	mixerdevices=[${mixerdevices:1}]
	mixers=${#controls[@]}
fi
hwmixerfile="$dirsystem/hwmixer-$aplayname"
if [[ -e $hwmixerfile ]]; then # manual
	hwmixer=$( < "$hwmixerfile" )
elif [[ $aplayname == cirrus-wm5102 ]]; then
	mixers=4
	hwmixer='HPOUT2 Digital'
	mixerdevices='["HPOUT1 Digital","HPOUT2 Digital","SPDIF Out","Speaker Digital"]'
else
	hwmixer=${controls[0]}
fi
mixertypefile="$dirsystem/mixertype-$aplayname"
if [[ -e $mixertypefile ]]; then
	mixertype=$( < "$mixertypefile" )
else
	[[ $mixers == 0 ]] && mixertype=none || mixertype=hardware
fi

########
asoundcard=$card # for player-asound.sh and player-conf.sh
echo $card > $dirsystem/asoundcard
[[ $hwmixer ]] && echo $hwmixer > $dirshm/amixercontrol
(( $mixers > 0 )) && echo $mixerdevices > $dirshm/mixerlist
echo '
aplayname="'$aplayname'"
name="'$name'"
card='$card'
device='$device'
hwmixer='$hwmixer'
mixertype='$mixertype > $dirsystem/player-device
