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
	CHANNELS+=( $( awk -F'[][]' '/^CHANNELS/ {print $2}' <<< $lines ) )
	formats=$( awk -F':' '/^FORMAT/ {print $2}' <<< $lines )
	list_f=
	list_s=
	for f in $formats; do
		[[ $f != [FS]*LE ]] && continue
		
		case $f in
			FLOAT64_LE ) f=F64_LE;;
			FLOAT_LE )   f=F32_LE;;
			S24_3LE )    f=S24_3_LE;;
			S24_LE )     f=S24_4_LE;;
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
if [[ -e $dirshm/btreceiver ]]; then
	$dirsettings/camilla-bluetooth.sh btreceiver
else
	fileformat="$dirsystem/camilla-$NAME"
	[[ -s $fileformat ]] && format=$( getContent "$fileformat" ) || format=$( jq -r .[0] <<< ${FORMATS[1]} )
	fileconf=$( getVar CONFIG /etc/default/camilladsp )
	format0=$( getVar playback.format "$fileconf" )
	card0=$( getVar playback.device "$fileconf" | cut -c4 )
	[[ $format0 != $format ]] && changeformat=1
	[[ $card0 != $CARD ]] && changecard=1
	if [[ $changeformat || $changecard ]]; then
		config=$( < "$fileconf" )
		if [[ $changeformat ]]; then
			config=$( sed -E '/playback:/,/format:/ s/^(\s*format: ).*/\1'$format'/' <<< $config )
			echo $format > "$fileformat"
		fi
		[[ $changecard ]] && config=$( sed '/playback:/,/device:/ s/hw:./hw:'$CARD'/' <<< $config )
		echo "$config" > "$fileconf"
	fi
	camillaDSPstart
fi
