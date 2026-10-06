#!/bin/bash

### included by <<< features.sh
if [[ ! $dirbash ]]; then # if run directly
	. /srv/http/bash/common.sh 
	. $dirshm/output
fi

modprobe snd_aloop

DEVICES=( '{ "Loopback": "hw:Loopback,0" }' )
if [[ -e $dirshm/btmixer ]]; then
	card=bluealsa
	DEVICES+=( '{ "BlueALSA": "bluealsa" }' )
else
	DEVICES+=( "$( < $dirshm/devices )" )
fi
for D in Loopback $card; do
	if [[ $D == bluealsa ]] then
		DEVICE=$D
		read formats channels sampling < <( bluealsa-aplay -L | sed -n -E '/channel.*Hz$/ {s/.*: | channels*| Hz//g; p}' )
		CHANNELS+=( $channels )
		SAMPLINGS+=', "'$( sed 's/...$/,&/' <<< $sampling )'": '$sampling
	else
		DEVICE=hw:$D
		lines=$( timeout 0.1 aplay --dump-hw-params -D $DEVICE /dev/zero 2>&1 | sed -n '/^ACCESS.*MMAP/,/^TICK/ p' )
		CHANNELS+=( $( awk '/^CHANNELS/ {print $NF}' <<< $lines | tr -d ']' ) )
		formats=$( awk -F':' '/^FORMAT/ {print $2}' <<< $lines )
	fi
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

file_default=/etc/default/camilladsp
file_config=$( getVar CONFIG $file_default )
file_backup=$dircamilladsp/config.backup
if [[ -e $dirshm/btmixer ]]; then
	echo "$file_config" > $file_backup
	file_mac=$dircamilladsp/$mac
	if [[ -e $file_mac ]]; then
		FILE_CONFIG=$( < $file_mac )
	else
		FILE_CONFIG=$dircamilladsp/configs-bt/camilladsp.yml
		echo $FILE_CONFIG > $file_mac
	fi
else
	if [[ -e $file_backup ]]; then
		FILE_CONFIG=$( < $file_backup )
		rm $file_backup
	else
		FILE_CONFIG=$file_config
	fi
fi
[[ ! -e $FILE_CONFIG ]] && cp /etc/camilladsp/configs/camilladsp.yml "$FILE_CONFIG"

[[ $file_config != $FILE_CONFIG ]] && sed -i -E "s|^(CONFIG=).*|\1$FILE_CONFIG|" $file_default

device=$( getVar playback.device "$FILE_CONFIG" )
[[ $device != $DEVICE ]] && sed -i -E "/playback:/,/device:/ s/(device: ).*/\1$DEVICE/" "$FILE_CONFIG"
for dev in capture playback; do
	format=$( getVar $dev.format "$FILE_CONFIG" )
	formats=$( jq -r .$dev.formats.[] $dirshm/hwparams | grep -v null )
	F=
	for f in $formats; do
		[[ $f == $format ]] && F=1 && break
	done
	[[ ! $F ]] && sed -i -E "/$dev:/,/format:/ s/(format: ).*/\1$f/" "$FILE_CONFIG"
done

errors=$( camilladsp -c "$FILE_CONFIG" 2>&1 | grep ^error )
if [[ $errors ]]; then
	errors=$( sed 's/$/<br>/' <<< $error )
	pushData error '{ "page": "features", "msg": "'$errors'" }'
else
	camillaDSPstart
fi
