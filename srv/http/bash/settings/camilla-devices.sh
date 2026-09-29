#!/bin/bash

### included by <<< features.sh
if [[ ! $dirbash ]]; then # if run directly
	. /srv/http/bash/common.sh 
	. $dirshm/output
	CARD=$card
	NAME=$name
fi

modprobe snd_aloop

if grep -q -m1 configs-bt /etc/default/camilladsp; then
	DEVICES=( '{ "Bluez": "bluez" }' '{ "blueALSA": "bluealsa" }' )
else
	DEVICES=( '{ "Loopback": "hw:Loopback,0" }' "$( < $dirshm/devices )" )
fi
for c in Loopback $CARD; do
	lines=$( timeout 0.1 aplay --dump-hw-params -D hw:$c /dev/zero 2>&1 | sed -n '/^ACCESS.*MMAP/,/^TICK/ p' )
	CHANNELS+=( $( awk '/^CHANNELS/ {print $NF}' <<< $lines | tr -d ']' ) )
	formats=$( awk -F':' '/^FORMAT/ {print $2}' <<< $lines )
	list_f=
	list_s=
	for f in $formats; do
		[[ $f != S*LE ]] && continue
		
		case $f in
			S24_3LE ) f=S24_3_LE;;
			S24_LE )  f=S24_4_LE;;
		esac
		lbl="$f (${f:1:2}bit "
		case ${f:4:1} in
			3 ) lbl+='int-packed)';;
			4 ) lbl+='int-padded)';;
			* ) lbl+='integer)';;
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
	file_config=$( getVar CONFIG /etc/default/camilladsp )
	if [[ ! $file_config ]]; then
		file_config=$dircamilladsp/configs/camilladsp.yml
		sed -i "/^(file_config=).*/\1$file_config/" /etc/default/camilladsp
	fi
	[[ ! -e $file_config ]] && cp /etc/camilladsp/configs/camilladsp.yml "$file_config"
	card=$( getVar playback.device "$file_config" )
	[[ $card != hw:$CARD ]] && sed -i -E "/playback:/,/device:/ s/(device: hw:).*/\1$CARD,0/" "$file_config"
	for dev in capture playback; do
		format=$( getVar $dev.format "$file_config" )
		formats=$( jq -r .$dev.formats.[] $dirshm/hwparams | grep -v null )
		F=
		for f in $formats; do
			[[ $f == $format ]] && F=1 && break
		done
		[[ ! $F ]] && sed -i -E "/$dev:/,/format:/ s/(format: ).*/\1$f/" "$file_config"
	done
	errors=$( camilladsp -c "$fileconf" 2>&1 | grep ^error )
	if [[ $errorr ]]; then
		errors=$( sed 's/$/<br>/' <<< $error )
		pushData error '{ "page": "features", "msg": "'$errors'" }'
		exit
# --------------------------------------------------------------------
	fi
	camillaDSPstart
fi
