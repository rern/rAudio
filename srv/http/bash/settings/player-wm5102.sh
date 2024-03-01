#!/bin/bash

card=$1
output=$2

declare -A controls
controls['HPOUT1 Digital']="\
HPOUT1L Input 1
HPOUT1R Input 1
HPOUT1 Digital Volume
HPOUT1L Input 1 Volume
HPOUT1R Input 1 Volume
HPOUT1 Digital Switch"
controls['HPOUT2 Digital']="\
HPOUT2L Input 1
HPOUT2R Input 1
HPOUT2L Input 1 Volume
HPOUT2R Input 1 Volume
HPOUT2 Digital Switch"
controls['SPDIF Out']="\
AIF2TX1 Input 1
AIF2TX2 Input 1
Input Source
AIF2TX1 Input 1 Volume
AIF2TX2 Input 1 Volume
AIF Playback Switch
TX Playback Switch
SPDIF Out Switch"
controls['Speaker Digital']="\
SPKOUTL Input 1
SPKOUTR Input 1
Speaker Digital Volume
SPKOUTL Input 1 Volume
SPKOUTR Input 1 Volume
Speaker Digital Switch"

# Switch everything off
control_all=$( printf "%s\n" "${controls[@]}" )
while read control; do
	[[ ${control: -1} =~ [12] ]] && val=None || val=off
	amixer -c $card -q cset "$control" $val
done <<< $control_all

volume=$( getContent $dirsystem/volume-wm5102 50 )%
control_output=${controls[$output]}
while read control; do
	if [[ $control == *' Digital '* ]]; then
		val=$volume # Set -6dB for safety. ie max 0.5Vrms output level
	else
		case ${control: -6} in
			Volume ) val=$volume;;
			Switch ) val=on;;
			Source ) val=AIF;;
			* )      val=AIF1RX$( sed -E 's/.*(.)$/\1/; s/L/1/; s/R/2/' <<< ${control/ *} );;
		esac
	fi
	amixer -c $card -Mq cset "$control" $val
done <<< $control_output
