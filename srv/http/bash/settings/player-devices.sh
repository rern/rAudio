#!/bin/bash

### included by <<< player-conf.sh
[[ ! $dirbash ]] && . /srv/http/bash/common.sh # if run directly

cardfiles=$( ls -1d /proc/asound/card[0-9] )
while read path; do
	CARD=${path: -1}
	NAME=$( sed -n '/^name/ {s/^.*: //; s/bcm2835/On-board/; p; q}' $path/*/info )
	if [[ -e $path/usbmixer ]]; then
		usbname=$( sed -n -E '/^Card/ {s/^Card: | at .*//g; p}' $path/usbmixer )
		[[ $usbname ]] && NAME=$usbname
	fi
	lastword=$( awk '{print $NF}' <<< $NAME )
	[[ $lastword == *-* && $lastword =~ ^[a-z0-9-]+$ ]] && NAME=$( sed 's/ [^ ]*$//' <<< $NAME )
	LISTDEVICE+=', "'$NAME'"'
	list+="$NAME"$'\n'
done <<< $cardfiles

if [[ $usbdac != add && -e $dirsystem/output-device ]]; then # otherwise last card
	outputdevice=$( < $dirsystem/output-device )
	line=$( sed -n "/^$outputdevice$/=" <<< $list )
	if [[ $line ]]; then
		CARD=$(( line - 1 ))
		NAME=$outputdevice
	else
		rm $dirsystem/output-device # remove if not exist any more
	fi
fi
echo "\
defaults.pcm.card $CARD
defaults.ctl.card $CARD
" > /etc/asound.conf
# aplay -l
#         id <<< /proc/asound/cardN/id
# card N: RPiCirrus [RPi-Cirrus], device N: WM5102 AiFi wm5102-aif1-0 [WM5102 AiFi wm5102-aif1-0]
#                                           id:........................name: <<< /proc/asound/cardN/*/info
if grep -q WM5102 <<< $NAME; then
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
			mixerfile="$dirsystem/mixer-$NAME"
			if [[ -e $mixerfile ]]; then # manual
				MIXER=$( < "$mixerfile" )
			elif [[ ! $MIXER ]]; then    # not Digital
				MIXER=$( head -1 <<< $controls )
			fi
		fi
	fi
fi

mixertypefile="$dirsystem/mixertype-$NAME"
if [[ -e $mixertypefile ]]; then
	MIXERTYPE=$( < "$mixertypefile" )
else
	[[ $LISTMIXER ]] && MIXERTYPE=hardware || MIXERTYPE=none
fi

echo "[ ${LISTDEVICE:1} ]" > $dirshm/listdevice
[[ $LISTMIXER ]] && echo "[ ${LISTMIXER:1} ]" > $dirshm/listmixer || rm -f $dirshm/listmixer
if [[ $MIXER ]]; then
	echo "$MIXER" > $dirshm/amixercontrol # keep trailing space
else
	rm -f $dirshm/amixercontrol
	MIXER=false
fi
output+='
card='$CARD'
name="'$NAME'"
mixer="'$MIXER'"
mixertype='$MIXERTYPE
echo "$output" > $dirshm/output
echo $CARD > $dirsystem/asoundcard
