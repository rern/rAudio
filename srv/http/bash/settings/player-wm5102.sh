#!/bin/bash

CARD=$1
case "$2" in
	'HPOUT1 Digital' )  output=headset_out;;
	'HPOUT2 Digital' )  output=line_out;;
	'SPDIF Out' )       output=spdif_out;;
	'Speaker Digital' ) output=speakers_out;;
esac
amixer_cset() {
	amixer -c $CARD -Mq cset "$1" $2%
}
# Switch everything off
amixer_cset 'AIF Playback Switch'         off
amixer_cset 'DMIC Switch'                 off
amixer_cset 'Headset Mic Switch'          off
amixer_cset 'IN3 High Performance Switch' off
amixer_cset 'RX Playback Switch'          off
amixer_cset 'SPDIF in Switch'             off
amixer_cset 'SPDIF out Switch'            off
amixer_cset 'Speaker Digital Switch'      off
amixer_cset 'TX Playback Switch'          off
amixer_cset 'AIF1TX1 Input 1'             None
amixer_cset 'AIF1TX2 Input 1'             None
amixer_cset 'AIF2TX1 Input 1'             None
amixer_cset 'AIF2TX2 Input 1'             None
amixer_cset 'HPOUT1L Input 1'             None
amixer_cset 'HPOUT1R Input 1'             None
amixer_cset 'HPOUT1L Input 2'             None
amixer_cset 'HPOUT1R Input 2'             None
amixer_cset 'HPOUT2L Input 1'             None
amixer_cset 'HPOUT2R Input 1'             None
amixer_cset 'HPOUT2L Input 2'             None
amixer_cset 'HPOUT2R Input 2'             None
amixer_cset 'SPKOUTL Input 1'             None
amixer_cset 'SPKOUTR Input 1'             None
amixer_cset 'SPKOUTL Input 2'             None
amixer_cset 'SPKOUTR Input 2'             None

if [[ $output == line_out ]]; then
	amixer_cset 'HPOUT2L Input 1'        AIF1RX1
	amixer_cset 'HPOUT2R Input 1'        AIF1RX2
	amixer_cset 'HPOUT2L Input 1 Volume' 33
	amixer_cset 'HPOUT2R Input 1 Volume' 33
	amixer_cset 'HPOUT2 Digital Switch'  on
elif [[ $output == speakers_out ]]; then
	amixer_cset 'SPKOUTL Input 1'        AIF1RX1
	amixer_cset 'SPKOUTR Input 1'        AIF1RX2
	amixer_cset 'Speaker Digital Volume' 128
	amixer_cset 'SPKOUTL Input 1 Volume' 33
	amixer_cset 'SPKOUTR Input 1 Volume' 33
	amixer_cset 'Speaker Digital Switch' on
elif [[ $output == spdif_out ]]; then
	amixer_cset 'AIF2TX1 Input 1'        AIF1RX1
	amixer_cset 'AIF2TX2 Input 1'        AIF1RX2
	amixer_cset 'Input Source'           AIF
	amixer_cset 'AIF2TX1 Input 1 Volume' 33
	amixer_cset 'AIF2TX2 Input 1 Volume' 33
	amixer_cset 'AIF Playback Switch'    on
	amixer_cset 'TX Playback Switch'     on
	amixer_cset 'SPDIF Out Switch'       on
elif [[ $output == headset_out ]]; then
	amixer_cset 'HPOUT1L Input 1'        AIF1RX1
	amixer_cset 'HPOUT1R Input 1'        AIF1RX2
	amixer_cset 'HPOUT1 Digital Volume'  116 # Set -6dB for safety. ie max 0.5Vrms output level
	amixer_cset 'HPOUT1L Input 1 Volume' 33
	amixer_cset 'HPOUT1R Input 1 Volume' 33
	amixer_cset 'HPOUT1 Digital Switch'  on
fi
