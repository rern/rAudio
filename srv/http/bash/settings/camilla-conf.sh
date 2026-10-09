#!/bin/bash

### included by <<< player-asound.sh
if [[ ! $dirbash ]]; then # if run directly
	. /srv/http/bash/common.sh 
	. $dirshm/output
fi

modprobe snd_aloop
for i in {0..3}; do
	lsmod | grep -q snd_aloop && break || sleep 1
done

declare -A CHANNELS DEVICES FORMATS SAMPLINGS
# capture
if [[ -e $dirshm/btsource ]]; then # send from source client
	BT_SOURCE=1
	DEVICES[c]='{ "BlueALSA": "Bluez" }'
	DEV=bluealsa
else
	DEVICES[c]='{ "Loopback": "hw:Loopback,0" }'
	DEV=Loopback
fi
# playback
if [[ -e $dirshm/btmixer ]]; then # send from rAudio
	BT_MIXER=1
	DEVICES[p]='{ "BlueALSA": "bluealsa" }'
	DEV+=' bluealsa'
else
	DEVICES[p]=$( < $dirshm/devices )
	DEV+=" $card"
fi

for D in $DEV; do
	[[ ! $c_p ]] && c_p=c || c_p=p
	if [[ $D == bluealsa ]] then
		DEVICE=$D
		read formats channels sampling < <( bluealsa-aplay -L | sed -n -E '/channel.*Hz$/ {s/.*: | channels*| Hz//g; p}' )
		CHANNELS[$c_p]=$channels
		SAMPLINGS[$c_p]=', "'$( sed 's/...$/,&/' <<< $sampling )'": '$sampling
	else
		DEVICE=hw:$D
		lines=$( timeout 0.1 aplay --dump-hw-params -D $DEVICE /dev/zero 2>&1 | sed -n '/^ACCESS.*MMAP/,/^TICK/ p' )
		formats=$( awk -F':' '/^FORMAT/ {print $2}' <<< $lines )
		CHANNELS[$c_p]=$( awk '/^CHANNELS/ {print $NF}' <<< $lines | tr -d ']' )
		ratemax=$( awk -F'[][ ]+' '/^RATE/ {print $3}' <<< $lines )
		for r in 44100 48000 88200 96000 176400 192000 352800 384000 705600 768000; do
			(( $r > $ratemax )) && break || SAMPLINGS[$c_p]+=', "'$( sed 's/...$/,&/' <<< $r )'": '$r
		done
	fi
	list_f=
	list_s=
	for f in $formats; do # S16_LE S24_3_LE S24_4_LE S32_LE F32_LE F64_LE
		[[ $f == *BE || ( $f != F* && $f != S* ) ]] && continue
		
		case $f in
			FLOAT_LE )   f=F32_LE;;
			FLOAT64_LE ) f=F64_LE;;
			S24_3LE )    f=S24_3_LE;;
			S24_LE )     f=S24_4_LE;;
		esac
		format_list+="$f "
		lbl="$f (${f:1:2}bit "
		case ${f:4:1} in
			3 ) lbl+='int-packed)';;
			4 ) lbl+='int-padded)';;
			* ) lbl+='integer)';;
		esac
		list=$'\n, "'$lbl'": "'$f'"'
		[[ $f == F* ]] && list_f+=$list || list_s+=$list
	done
	FORMATS[$c_p]="{ \"Auto\": null $( sort -d <<< $list_s ) $( sort -d <<< $list_f ) }"
done
######## >
data='
  "capture"  : {
	  "device"    : '${DEVICES[c]}'
	, "channels"  : '${CHANNELS[c]}'
	, "formats"   : '${FORMATS[c]}'
	, "samplings" : { '${SAMPLINGS[c]:1}' }
}
, "playback" : {
	  "device"    : '${DEVICES[p]}'
	, "channels"  : '${CHANNELS[p]}'
	, "formats"   : '${FORMATS[p]}'
	, "samplings" : { '${SAMPLINGS[p]:1}' }
}'
echo "{ $data }" | jq > $dirshm/hwparams
######## <

if [[ $BT_MIXER || $BT_SOURCE ]]; then
	dbuspath=$( bluealsa-cli list-pcms | grep -E '(sink|source)$' )
	mac=$( sed -E 's|.*/dev_([^/]*).*|\1|; s|_|:|g' <<< $dbuspath )
	file_config=$dircamilladsp/$mac
	bt_alias=$( bluetoothProperty Alias $mac )
else
	file_config="$dircamilladsp/$name"
fi
if [[ -e $file_config ]]; then # existing
	FILE_CONFIG=$( < "$file_config" )
else
	if [[ $bt_alias ]]; then
		dir="$dircamilladsp/configs/$bt_alias"
		mkdir -p "$dir"
		FILE_CONFIG="$dir/camilladsp.yml"
	else
		FILE_CONFIG=$dircamilladsp/configs/camilladsp.yml
	fi
fi

[[ ! -e $FILE_CONFIG ]] && cp /etc/camilladsp/configs/camilladsp.yml "$FILE_CONFIG"

file_current=$( getVar CONFIG /etc/default/camilladsp )
if [[ $file_current != $FILE_CONFIG ]]; then
	if [[ $bt_alias ]] && ! grep -qE 'type: Bluez|device: bluealsa' "$file_current"; then
		echo $file_current > "$dircamilladsp/$name" # from $dirshm/output
													# bt: save by networks-bluetooth.sh on disconnect
	fi
	sed -i -E "s|^(CONFIG=).*|\1\"$FILE_CONFIG\"|" /etc/default/camilladsp
	if [[ $BT_SOURCE ]]; then
		sed -i -E -e '
s/(samplerate: ).*/\1'$sampling'/
s/(chunksize:).*/\1 4096/
s/(enable_rate_adjust:).*/\1 true/
s/(target_level:).*/\1 8000/
s/(adjust_period:).*/\1 3/
' -e '/  capture:$/,/    playback:$/ c\
  capture:\
    type: Bluez\
    dbus_path: '$dbuspath'\
    channels: 2\
    format: null\
  playback:
' "$FILE_CONFIG"
	else # alsa / bluealsa
		sed -i '/  playback:$/,/    format:/ c\
  playback:\
    type: Alsa\
    channels: 2\
    device: '$DEVICE'\
    format: null
' "$FILE_CONFIG"
	fi
fi
# format validate
for dev in capture playback; do
	format=$( getVar $dev.format "$FILE_CONFIG" )
	formats=$( jq -r .$dev.formats.[] $dirshm/hwparams | grep -v null )
	F=
	for f in $formats; do
		[[ $f == $format ]] && F=1 && break
	done
	[[ ! $F ]] && sed -i -E "/  $dev:/,/    format:/ s/(format:).*/\1 $f/" "$FILE_CONFIG"
done

failed_exit() {
	systemctl stop camilladsp
	echo "$1"
	rm -f $dirsystem/camilladsp
	$dirsettings/player-conf.sh
	exit
#-------------------------------------------------------------------------------
}
validate=$( camilladsp -c "$FILE_CONFIG" )
grep -q 'Config is not valid' <<< $validate && failed_exit ${validate//$'\n'/<br>}
#-------------------------------------------------------------------------------
systemctl -q is-active camilladsp && ACTIVE=1
systemctl restart camilladsp
for i in {0..3}; do
	sleep 1
	websocat --text ws://127.0.0.1:1234 <<< '"GetVolume"' &> /dev/null && break
	[[ $i == 3 ]] && failed_exit 'Start failed!'
#-------------------------------------------------------------------------------
done
touch $dirsystem/camilladsp
pushRefresh camilla features player
if [[ ! $ACTIVE ]]; then
	amixer0dB
	volume=$( getContent $dirshm/volume )
	[[ $volume ]] && volumeCamilla $volume
fi
rm -f $dirshm/volume
