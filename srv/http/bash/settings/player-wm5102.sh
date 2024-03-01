#!/bin/bash

card=RPiCirrus
output=$1

HPOUT1="\
HPOUT1L Input 1
HPOUT1R Input 1
HPOUT1L Input 1 Volume
HPOUT1R Input 1 Volume
HPOUT1 Digital Volume
HPOUT1 Digital Switch"

declare -A controls
controls['HPOUT1 Digital']=$HPOUT1
controls['HPOUT2 Digital']=$( sed 's/1/2/' <<< $HPOUT1 )
controls['Speaker Digital']=$( sed 's/HPOUT1 /Speaker /; s/HPOUT1/SPKOUT/' <<< $HPOUT1 )
controls['SPDIF Out']="\
$( sed -n '/Input/ {s/HPOUT1L/AIF2TX1/; s/HPOUT1R/AIF2TX2/; p}' <<< $HPOUT1 )
Input Source
AIF Playback Switch
TX Playback Switch
SPDIF Out Switch"

# Switch everything off
control_all=$( printf "%s\n" "${controls[@]}" )
while read control; do
	[[ ${control: -1} =~ [12] ]] && val=None || val=off
	amixer -c $card -q cset "$control" $val
done <<< $control_all

while read control; do
	if [[ $control == *' Digital Volume' ]]; then
		val=50%
	else
		case ${control: -6} in
			Volume ) val=50%;;
			Switch ) val=on;;
			Source ) val=AIF;;
			* )      val=AIF1RX$( sed -E 's/.*(.)$/\1/; s/L/1/; s/R/2/' <<< ${control/ *} );;
		esac
	fi
	amixer -c $card -Mq cset "$control" $val
done <<< ${controls["$output"]}
