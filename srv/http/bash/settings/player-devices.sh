#!/bin/bash

### included by <<< player-conf.sh
! type -t args2va &> /dev/null && . /srv/http/bash/common.sh # if run directly

cards=$( awk '/]/ {print $1}' /proc/asound/cards )
while read i; do
	line=$( cat /proc/asound/card$i/*/info \
				| head -6 \
				| sed -E -n '/^device|^name/ {s/^.*: //; s/bcm2835/On-board/; p}' \
				| tr '\n' ^ )
	device=$( cut -d^ -f1 <<< $line )
	name=$( cut -d^ -f2 <<< $line )
	lastword=$( awk '{print $NF}' <<< $name )
	[[ $lastword == *-* && $lastword =~ ^[a-z0-9-]+$ ]] && name=$( sed 's/ [^ ]*$//' <<< $name )
	LISTDEVICE+=', "'$name'"'
	list+="$i^$device^$name"$'\n'
done <<< $cards
list=$( awk NF <<< $list )
if (( $( wc -l <<< $list ) == 1 )); then # single card
	cdn=$list
elif [[ $usbdac == add ]]; then          # usb <<< player-conf.sh
	cdn=$( tail -1 <<< $list )
elif [[ -e $dirsystem/output-device ]]; then
	outputdevice=$( < $dirsystem/output-device )
	cdn=$( grep -m1 "$outputdevice" <<< $list )
fi
[[ ! $cdn ]] && cdn=$( tail -1 <<< $list )
CARD=$( cut -d^ -f1 <<< $cdn )
DEVICE=$( cut -d^ -f2 <<< $cdn )
NAME=$( cut -d^ -f3 <<< $cdn )

if grep -qi wm5102 <<< $cdn; then
	MIXER='HPOUT2 Digital'
	LISTMIXER=", 'HPOUT1 Digital', 'HPOUT2 Digital', 'SPDIF Out', 'Speaker Digital'"
else
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

echo "[ ${LISTDEVICE:1} ]" > $dirshm/listdevice
[[ $LISTMIXER ]] && echo "[ ${LISTMIXER:1} ]" > $dirshm/listmixer || rm -f $dirshm/listmixer
if [[ $MIXER ]]; then
	echo "$MIXER" > $dirshm/amixercontrol
	output='mixer="'$MIXER'"'
else
	rm -f $dirshm/amixercontrol
	output='mixer=false'
fi
output+='
name="'$NAME'"
card='$CARD'
device='$DEVICE'
mixertype='$MIXERTYPE
echo "$output" > $dirshm/output
echo $CARD > $dirsystem/asoundcard
asoundcard=$CARD
