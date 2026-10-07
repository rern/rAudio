#!/bin/bash

### included by <<< features.sh
if [[ ! $dirbash ]]; then # if run directly
	. /srv/http/bash/common.sh 
	. $dirshm/output
fi

# capture
if [[ -e $dirshm/btc_sender ]]; then # send from source client
	DEVICES=( '{ "BlueALSA": "Bluez" }' )
	DEV=bluealsa
else
	DEVICES=( '{ "Loopback": "hw:Loopback,0" }' )
	DEV=Loopback
fi
# playback
if [[ -e $dirshm/btmixer ]]; then # send from rAudio
	DEVICES+=( '{ "BlueALSA": "bluealsa" }' )
	DEV+=' bluealsa'
else
	DEVICES+=( "$( < $dirshm/devices )" )
	DEV+=" $card"
fi
for D in $DEV; do
	if [[ $D == bluealsa ]] then
		DEVICE=$D
		read formats channels sampling < <( bluealsa-aplay -L | sed -n -E '/channel.*Hz$/ {s/.*: | channels*| Hz//g; p}' )
		CHANNELS+=( $channels )
		SAMPLINGS=', "'$( sed 's/...$/,&/' <<< $sampling )'": '$sampling
	else
		DEVICE=hw:$D
		lines=$( timeout 0.1 aplay --dump-hw-params -D $DEVICE /dev/zero 2>&1 | sed -n '/^ACCESS.*MMAP/,/^TICK/ p' )
		formats=$( awk -F':' '/^FORMAT/ {print $2}' <<< $lines )
		CHANNELS+=( $( awk '/^CHANNELS/ {print $NF}' <<< $lines | tr -d ']' ) )
		if [[ $D != Loopback ]]; then
			ratemax=$( awk -F'[][ ]+' '/^RATE/ {print $3}' <<< $lines )
			for r in 44100 48000 88200 96000 176400 192000 352800 384000 705600 768000; do
				(( $r > $ratemax )) && break || SAMPLINGS+=', "'$( sed 's/...$/,&/' <<< $r )'": '$r
			done
		fi
	fi
	list_f=
	list_s=
	for f in $formats; do # S16_LE S24_3_LE S24_4_LE S32_LE F32_LE F64_LE
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
file_backup="$dircamilladsp/$( getContent $dirshm/amixercontrol none )"
if [[ -e $dirshm/btmixer || -e $dirshm/btc_sender ]]; then
	echo "$file_config" > $file_backup
	dbuspath=$( bluealsa-cli list-pcms )
	mac=$( sed -E 's|.*dev_(.*)/a.*|\1|; s/_/:/g' <<< $dbuspath )
	file_mac=$dircamilladsp/$mac
	if [[ -e $file_mac ]]; then # existing
		FILE_CONFIG=$( < $file_mac )
	else
		NEW_CONFIG=1
		FILE_CONFIG=$dircamilladsp/configs-bt/camilladsp.yml
		echo $FILE_CONFIG > $file_mac
	fi
else
	if [[ -e $file_backup ]]; then # existing
		FILE_CONFIG=$( < $file_backup )
		rm $file_backup
	else
		NEW_CONFIG=1
		FILE_CONFIG=$( compgen -G $dircamilladsp/configs/* )
	fi
fi
[[ ! -e $FILE_CONFIG ]] && cp /etc/camilladsp/configs/camilladsp.yml "$FILE_CONFIG"

[[ $file_config != $FILE_CONFIG ]] && sed -i -E "s|^(CONFIG=).*|\1$FILE_CONFIG|" $file_default

if [[ $NEW_CONFIG ]]; then
	if [[ -e $dirshm/btc_sender ]]; then
		sed -i -E -e '
s/(samplerate: ).*/\1'$sampling'/
s/(chunksize:).*/\1 4096/
s/(enable_rate_adjust:).*/\1 true/
s/(target_level:).*/\1 8000/
s/(adjust_period:).*/\1 3
' -e '/  capture:$/,/    playback:$/ c\
  capture:\
    type: Bluez\
    dbus_path: '$dbuspath'\
    channels: 2\
    format: '${FORMATS[0]}'\
  playback:
' "$FILE_CONFIG"
	else # alsa / bluealsa
		sed -i '/  playback:$/,/    format:/ c\
  playback:\
    type: Alsa\
    channels: 2\
    device: '$DEVICE'\
    format: '${FORMATS[1]}'
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
for i on {0..3; do
	sleep 1
	websocat --text ws://127.0.0.1:1234 <<< '"GetVolume"' &> /dev/null && break
	[[ $i == 3 ]] && failed_exit 'Start failed!'
#-------------------------------------------------------------------------------
done
touch $dirsystem/camilladsp
pushRefresh camilla
if [[ ! $ACTIVE ]]; then
	amixer0dB
	volume=$( getContent $dirshm/volume )
	[[ $volume ]] && volumeCamilla $volume
fi
rm -f $dirshm/volume
