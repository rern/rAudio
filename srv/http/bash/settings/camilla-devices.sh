#!/bin/bash

. /srv/http/bash/common.sh
. $dirshm/output

$dirbash/cmd.sh playerstop # must stop for aplay --dump-hw-params
systemctl stop camilladsp
if grep -q -m1 configs-bt /etc/default/camilladsp; then
	DEVICES=( '{ "Bluez": "bluez" }' '{ "blueALSA": "bluealsa" }' )
else
	DEVICES=( '{ "Loopback": "hw:Loopback,0" }' "$( < $dirshm/devices )" )
fi
for c in Loopback $card; do
	lines=$( tty2std "timeout 0.1 aplay -D hw:$c /dev/zero --dump-hw-params" )
	CHANNELS+=( $( awk '/^CHANNELS/ {print $NF}' <<< $lines | tr -d ']\r' ) )
	formats=$( sed -n '/^FORMAT/ {s/_3LE/LE3/; s/FLOAT_LE/FLOAT32LE/; s/^.*: *\|[_\r]//g; s/ /\n/g; p}' <<< $lines )
	listformat=
	for f in FLOAT64LE FLOAT32LE S32LE S24LE3 S24LE S16LE; do
		grep -q $f <<< $formats && listformat+=', "'$f'"'
	done
	FORMATS+=( "[ ${listformat:1} ]" )
	if [[ $c != Loopback ]]; then
		ratemax=$( sed -n -E '/^RATE/ {s/.* (.*)].*/\1/; p}' <<< $lines )
		for r in 44100 48000 88200 96000 176400 192000 352800 384000 705600 768000; do
			(( $r > $ratemax )) && break || SAMPLINGS+=', "'$( sed 's/...$/,&/' <<< $r )'": '$r
		done
	fi
done
######## >
data='
  "capture"  : {
	  "device"   : '${DEVICES[0]}'
	, "channels" : '${CHANNELS[0]}'
	, "formats"  : '${FORMATS[0]}'
}
, "playback" : {
	  "device"   : '${DEVICES[1]}'
	, "channels" : '${CHANNELS[1]}'
	, "formats"  : '${FORMATS[1]}'
}
, "samplings" : {
	'${SAMPLINGS:1}'
}'
echo "{ $data }" | jq > $dirshm/camilladevices
######## <
if [[ -e $dirshm/btreceiver ]]; then
	$dirsettings/camilla-bluetooth.sh btreceiver
else
	fileconf=$( getVar CONFIG /etc/default/camilladsp )
	fileformat="$dirsystem/camilla-$name"
	[[ -s $fileformat ]] && format=$( getContent "$fileformat" ) || format=$( jq -r .[0] <<< ${FORMATS[1]} )
	format0=$( getVarYml playback format )
	if [[ $format0 != $format ]]; then
		sed -i -E '/playback:/,/format:/ s/^(\s*format: ).*/\1'$format'/' "$fileconf"
		echo $format > "$fileformat"
	fi
	card0=$( getVarYml playback device | cut -c4 )
	[[ $card0 != $card ]] && sed -i -E '/playback:/,/device:/ s/(device: "hw:).*/\1'$card',0"/' "$fileconf"
	camillaDSPstart
fi
