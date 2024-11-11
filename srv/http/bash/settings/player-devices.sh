#!/bin/bash

### included by <<< player-conf.sh
[[ ! $dirbash ]] && . /srv/http/bash/common.sh # if run directly

### aplay -l # depend on /etc/asound.conf
# card 1: Headphones [bcm2835 Headphones], device 0: bcm2835 Headphones [bcm2835 Headphones]
#
### cat /proc/asound/cards
# 1 [Headphones     ]: bcm2835_headpho - bcm2835 Headphones
#                      bcm2835 Headphones
#>C [CARD_ID        ]: DEVICE_ID       - DEVICE_NAME
#>                     DEVICE_LONG_NAME
#>hwaddress=hw:1,0 # or hw:Headphones:0

### cat /proc/asound/card1/id
# Headphones

### cat /proc/asound/card1/*/info
# card: 1
# ...
# id: bcm2835 Headphones
# name: bcm2835 Headphones
# ...

proccardn=$( ls -1d /proc/asound/card[0-9] ) # not depend on /etc/asound.conf which might be broken from bad script
while read path; do
	info=$( sed 's/bcm2835/On-board/' $path/*/info )
	name=$( grep -m1 ^name <<< $info | cut -d' ' -f2- )
	[[ ! $name ]] && name=$( grep -m1 ^id <<< $info | cut -d' ' -f2- )
	[[ $name == Loopback* ]] && continue
	
	NAME=$name
	CARD=${path: -1}
	if [[ -e $path/usbmixer ]]; then
		usbname=$( sed -n -E '/^Card/ {s/^Card: | at .*//g; p}' $path/usbmixer )
		[[ $usbname ]] && NAME=$usbname
	fi
	lastword=$( awk '{print $NF}' <<< $NAME )
	[[ $lastword == *-* && $lastword =~ ^[a-z0-9-]+$ ]] && NAME=$( sed 's/ [^ ]*$//' <<< $NAME )
	LISTDEVICE+=', "'$NAME'": "hw:'$CARD',0"'
	card_name+="$CARD^$NAME"$'\n'
done <<< $proccardn

if [[ ! -e $dirshm/usbdac && -e $dirsystem/output-device ]]; then # otherwise last card
	outputdevice=$( < $dirsystem/output-device )
	c_n=$( grep "$outputdevice$" <<< $card_name )
	echo $c_n --- "$card_name"
	if [[ $c_n ]]; then
		CARD=${c_n/^*}
		NAME=$outputdevice
	else
		rm $dirsystem/output-device # remove if not exist any more
	fi
fi
######## >
echo "\
defaults.pcm.card $CARD
defaults.ctl.card $CARD
" > /etc/asound.conf

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
if [[ $LISTMIXER ]]; then
######## >
	echo "[ ${LISTMIXER:1} ]" > $dirshm/mixers
	echo "$MIXER" > $dirshm/amixercontrol
	MIXERTYPE=hardware
else
	rm -f $dirshm/{amixercontrol,mixers}
	MIXERTYPE=none
fi
mixertypefile="$dirsystem/mixertype-$NAME"
[[ -e $mixertypefile ]] && MIXERTYPE=$( < "$mixertypefile" )
######## >
echo '
card='$CARD'
name="'$NAME'"
mixer="'$MIXER'"
mixertype='$MIXERTYPE > $dirshm/output
echo "{ ${LISTDEVICE:1} }" > $dirshm/devices
echo $CARD > $dirsystem/asoundcard
if [[ -e $dirshm/btreceiver ]]; then
	FN=volumeBlueAlsa
else
	[[ $MIXERTYPE == software ]] && FN=volumeMpd || FN=volumeAmixer
fi
echo $FN > $dirshm/volumefunction
