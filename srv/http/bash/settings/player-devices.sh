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
! type -t args2va &> /dev/null && . /srv/http/bash/common.sh # if run directly
echo 'defaults.pcm.card 0
defaults.ctl.card 0' > /etc/asound.conf # reset before probing

nameTrim() { # remove last word
	lastword=$( awk '{print $NF}' <<< $1 )
	[[ $lastword == *-* && $lastword =~ ^[a-z0-9-]+$ ]] && sed 's/ [^ ]*$//' <<< $1 || echo $1
}
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
if [[ -e $dirsystem/output-aplayname ]]; then # device set from player page
	device=$( < $dirsystem/output-aplayname )
else                                         # device set from system page
	device=$( getContent $dirsystem/audio-aplayname 'bcm2835 Headphones' )
	outputname=$( getContent $dirsystem/audio-output 'On-board Headphones' )
fi
while read line; do
	aplayname=$( cut -d^ -f3 <<< $line )
	[[ $usbdac == add ]] && name=$aplayname || name=$( cut -d^ -f6 <<< $line )
	if [[ $name ]]; then
		name=$( nameTrim "${name/bcm2835/On-board}" )
	else
		[[ $aplayname == $device ]] && name=$outputname || name=$aplayname
	fi
	name_device='
, "'$name'": "'$aplayname'"'
	LISTDEVICE+=$name_device
done <<< $aplayl

if (( $( wc -l <<< $aplayl ) == 1 )); then # single card
	aplaycard=$aplayl
elif [[ $usbdac == add ]]; then            # usb <<< player-conf.sh
	aplaycard=$( tail -1 <<< $aplayl )
elif [[ $device == cirrus-wm5102 ]]; then  # cirrus
	aplaycard=$( grep -m1 cirrus-wm5102 <<< $aplayl )
	MIXER='HPOUT2 Digital'
	LISTMIXER=", 'HPOUT1 Digital', 'HPOUT2 Digital', 'SPDIF Out', 'Speaker Digital'"
else                                       # else
	aplaycard=$( grep -i -m1 "$device" <<< $aplayl )
	if [[ ! $aplaycard ]]; then
		# overlayfile : aplayname
		# xxx-yyy-zzz : xxx_yyy_zzz
		# xxx-yyy-zzz : xxx_yyy
		# xxx-yyy-zzz : xxxyyy
		dev=$( tr _- . <<< $device )    # xxx-yyy-zzz > xxx.yyy.zzz
		while grep -q '\.' <<< $dev; do # try match: xxx.yyy.zzz > xxx.yyy > xxx
			aplaycard=$( grep -i -m1 "$dev" <<< $aplayl )
			[[ $aplaycard ]] && break || dev=${dev%.*}
		done
	fi
fi
CARD=$( cut -d^ -f1 <<< $aplaycard )
APLAYNAME=$( cut -d^ -f3 <<< $aplaycard )
DEVICE=$( cut -d^ -f4 <<< $aplaycard )
[[ $usbdac == add ]] && NAME=$APLAYNAME || NAME=$( cut -d^ -f6 <<< $aplaycard )
if [[ ! $NAME ]]; then
	if [[ $APLAYNAME == $( getContent $dirsystem/audio-aplayname ) ]]; then
		NAME=$( getContent $dirsystem/audio-output )
	else
		NAME=$APLAYNAME
	fi
fi
NAME=$( nameTrim "$NAME" )
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
			while read; do # no var name - use default REPLY to preserve trailing/all spaces
				LISTMIXER+=', "'$REPLY'"'
				[[ $REPLY == Digital ]] && MIXER=Digital
			done <<< "$controls"
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

if [[ $LISTDEVICE ]]; then
	LISTDEVICE=$( awk NF <<< $LISTDEVICE | sort -u ) # suppress duplicate + remove blank line
	echo "{ ${LISTDEVICE:1} }" > $dirshm/listdevice
else
	rm -f $dirshm/listdevice
fi
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
