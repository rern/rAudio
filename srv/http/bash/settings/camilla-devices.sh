#!/bin/bash

### included by <<< player-conf.sh
if [[ ! $dirbash ]]; then # if run directly
	. /srv/http/bash/common.sh 
	. $dirshm/output
	CARD=$card
	NAME=$name
fi

$dirbash/cmd.sh playerstop # must stop for aplay --dump-hw-params
systemctl stop camilladsp
if grep -q -m1 configs-bt /etc/default/camilladsp; then
	DEVICES=( '{ "Bluez": "bluez" }' '{ "blueALSA": "bluealsa" }' )
else
	DEVICES=( '{ "Loopback": "hw:Loopback,0" }' "$( < $dirshm/devices )" )
fi
for c in Loopback $CARD; do
	lines=$( timeout 0.1 aplay -D hw:$c /dev/zero --dump-hw-params 2>&1 | sed -n '/^ACCESS.*MMAP/,/^TICK/ p' )
	CHANNELS+=( "[ $( awk -F'[][]' '/^CHANNELS/ {print $2}' <<< $lines | tr ' ' ',' ) ]" )
	formats=$( awk -F':' '/^FORMAT/ {print $2}' <<< $lines )
	list_f=
	list_s=
	for f in $formats; do
		[[ $f != [FS]*LE ]] && continue
		
		case $f in
			FLOAT64_LE ) f=F64_LE;;
			FLOAT_LE )   f=F32_LE;;
			S24_3LE )    f=S24_3_LE;;
			S24_LE ) [[ -d /proc/asound/card$CARD/usbmixer ]] && f=S24_4_RJ_LE || f=S24_4_LJ_LE;;
		esac
		lbl="$f: ${f:1:2}bit "
		[[ $f == F* ]] && lbl+='float' || lbl+='integer'
		case ${f:4:1} in
			3 ) lbl+='-packed';;
			4 ) lbl+='-padded';;
		esac
		list=$'\n, "'$lbl'": "'$f'"'
		[[ $f == F* ]] && list_f+=$list || list_s+=$list
	done
	FORMATS+=( "{ \"Auto\": null $( sort -d <<< $list_s ) $( sort -d <<< $list_f ) }" )
	if [[ $c != Loopback ]]; then
		ratemax=$( awk -F'[][ ]+' '/^RATE/ {print $3}' <<< $lines )
		for r in 44100 48000 88200 96000 176400 192000 352800 384000 705600 768000; do
			(( $r > $ratemax )) && break || SAMPLINGS+=', "'$( sed 's/...$/,&/' <<< $r )'": '$r
		done
	fi
done
######## >
data='
  "capture"  : {
	  "device"    : '${DEVICES[0]}'
	, "channels"  : '${CHANNELS[0]}'
	, "formats"   : '${FORMATS[0]}'
}
, "playback" : {
	  "device"    : '${DEVICES[1]}'
	, "channels"  : '${CHANNELS[1]}'
	, "formats"   : '${FORMATS[1]}'
	, "samplings" : { '${SAMPLINGS:1}' }
}'
echo "{ $data }" | jq > $dirshm/hwparams
######## <
if [[ -e $dirshm/btmixer ]]; then
	$dirsettings/camilla-bluetooth.sh btreceiver
else
	. <( grep ^CONFIG /etc/default/camilladsp )
	[[ ! $CONFIG ]] && CONFIG=$dircamilladsp/configs/camilladsp.yml
	card=$( getVar playback.device "$CONFIG" )
	[[ $card != hw:$CARD,0 ]] && sed -i -E "/playback:/,/device:/ s/(device: hw:).*/\1$CARD,0/" $CONFIG
	format=$( getVar playback.format "$CONFIG" )
	while read f; do
		[[ $f == $format ]] && f= && break
	done < <( jq -r .playback.formats.[] $dirshm/hwparams )
	[[ $f ]] && sed -i -E "/playback:/,/format:/ s/(format: ).*/\1$f/" $CONFIG
	camillaDSPstart
fi
