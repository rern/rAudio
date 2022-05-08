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

### included by mpd-conf.sh, player-data.sh

aplay=$( aplay -l 2> /dev/null \
			| grep '^card' )
if [[ ! $aplay ]]; then
	[[ -e $dirshm/btreceiver ]] && i=0 || i=-1
	devices=false
	touch $dirshm/nosound
	pushstream display '{"volumenone":false}'
	return
fi

getControls() {
	amixer=$( amixer -c $1 scontents \
				| grep -A1 ^Simple \
				| sed 's/^\s*Cap.*: /^/' \
				| tr -d '\n' \
				| sed 's/--/\n/g' )
	[[ ! $amixer ]] && controls= && return
	
	controls=$( echo "$amixer" \
					| grep 'volume.*pswitch\|Master.*volume' \
					| cut -d"'" -f2 )
	[[ ! $controls ]] && controls=$( echo "$amixer" \
										| grep volume \
										| grep -v Mic \
										| cut -d"'" -f2 )
}

rm -f $dirshm/nosound
#aplay+=$'\ncard 1: sndrpiwsp [snd_rpi_wsp], device 0: WM5102 AiFi wm5102-aif1-0 []'

audioaplayname=$( cat $dirsystem/audio-aplayname 2> /dev/null )

cards=$( echo "$aplay" \
			| cut -d: -f1 \
			| sort -u \
			| sed 's/card //' )
for card in $cards; do
	line=$( echo "$aplay" | sed -n "/^card $card/ p" )
	hw=$( echo $line | sed 's/card \(.*\):.*device \(.*\):.*/hw:\1,\2/' )
	card=${hw:3:1}
	device=${hw: -1}
	aplayname=$( echo $line \
					| awk -F'[][]' '{print $2}' \
					| sed 's/^snd_rpi_//; s/_/-/g' ) # some aplay -l: snd_rpi_xxx_yyy > xxx-yyy
	if [[ $aplayname == Loopback ]]; then
		device=; dop=; hw=; hwmixer=; mixers=; mixerdevices=; mixermanual=; mixertype=; name=;
		devices+=',{
  "aplayname"    : "'$aplayname'"
, "card"         : '$card'
}'
	else
		[[ $aplayname == wsp || $aplayname == RPi-Cirrus ]] && aplayname=rpi-cirrus-wm5102
		if [[ $aplayname == $audioaplayname ]]; then
			name=$( cat $dirsystem/audio-output )
		else
			name=$( echo $aplayname | sed 's/bcm2835/On-board/' )
		fi
		mixertype=$( cat "$dirsystem/mixertype-$aplayname" 2> /dev/null || echo hardware )
		getControls $card
		if [[ ! $controls ]]; then
			mixerdevices=['"( not available )"']
			mixers=0
		else
			readarray -t controls <<< $( echo "$controls" | sort -u )
			mixerdevices=
			for control in "${controls[@]}"; do
				mixerdevices+=',"'$control'"'
			done
			mixerdevices=[${mixerdevices:1}]
			mixers=${#controls[@]}
		fi
		
		mixermanual=false
		hwmixerfile=$dirsystem/hwmixer-$aplayname
		if [[ -e $hwmixerfile ]]; then # manual
			mixermanual=true
			hwmixer=$( cat "$hwmixerfile" )
		elif [[ $aplayname == rpi-cirrus-wm5102 ]]; then
			mixers=4
			hwmixer='HPOUT2 Digital'
			mixerdevices='["HPOUT1 Digital","HPOUT2 Digital","SPDIF Out","Speaker Digital"]'
		else
			if [[ $mixers == 0 ]]; then
				[[ $mixertype == hardware ]] && mixertype=none
				hwmixer='( not available )'
			else
				hwmixer=${controls[0]}
			fi
		fi
		[[ -e "$dirsystem/dop-$aplayname" ]] && dop=1 || dop=0
		devices+=',{
  "aplayname"    : "'$aplayname'"
, "card"         : '$card'
, "device"       : '$device'
, "dop"          : '$dop'
, "hw"           : "'$hw'"
, "hwmixer"      : "'$hwmixer'"
, "mixers"       : '$mixers'
, "mixerdevices" : '$mixerdevices'
, "mixermanual"  : '$mixermanual'
, "mixertype"    : "'$mixertype'"
, "name"         : "'$name'"
}'
	fi
	Aaplayname[card]=$aplayname
	Acard[card]=$card
	Adevice[card]=$device
	Adop[card]=$dop
	Ahw[card]=$hw
	Ahwmixer[card]=$hwmixer
	Amixers[card]=$mixers
	Amixermanual[card]=$mixermanual
	Amixertype[card]=$mixertype
	Aname[card]=$name
done

if [[ $usbdac == add ]]; then
	i=$card
	[[ -e $dirsystem/asoundcard ]] && mv $dirsystem/asoundcard{,.backup}
	echo $i > $dirsystem/asoundcard
elif [[ $usbdac == remove && -e $dirsystem/asoundcard.backup ]]; then
	i=$( cat $dirsystem/asoundcard.backup )
	mv $dirsystem/asoundcard{.backup,}
elif [[ -e $dirsystem/asoundcard ]]; then
	i=$( cat $dirsystem/asoundcard )
else
	i=$( aplay -l 2> /dev/null \
				| grep ^card \
				| grep -v Loopback \
				| head -1 \
				| cut -d: -f1 \
				| cut -d' ' -f2 )
	echo $i > $dirsystem/asoundcard
fi
echo Ahwmixer[i] > $dirshm/amixercontrol

getControls $i
if [[ $controls ]]; then
	echo "$controls" \
		| sort -u \
		| head -1 \
		> $dirshm/amixercontrol
else
	rm -f $dirshm/amixercontrol
fi

devices="[ ${devices:1} ]"
aplayname=${Aaplayname[i]}
output=${Aname[i]}
