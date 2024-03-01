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

control_output=${controls[$output]}
while read control; do
	if [[ $control == *' Digital '* ]]; then
		val=116% # Set -6dB for safety. ie max 0.5Vrms output level
	else
		case ${control: -6} in
			Volume ) val=33%;;
			Switch ) val=on;;
			Source ) val=AIF;;
			* )
				c0=${control/ *}
				i=${c0: -1}
				i=${i/L/1}
				i=${i/R/2}
				val=AIF1RX$i
				;;
		esac
	fi
	amixer -c $card -Mq cset "$control" $val
done <<< $control_output
