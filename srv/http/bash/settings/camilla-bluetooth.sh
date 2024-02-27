#!/bin/bash

. /srv/http/bash/common.sh

type=$1
[[ $2 ]] && name=$2 || name=$( < $dirshm/$type )
etcdefault=/etc/default/camilladsp
fileconfig=$( getVar CONFIG $etcdefault )
[[ -e "$dircamilladsp/$name" ]] && configbt=$( < "$dircamilladsp/$name" ) || configbt="$dircamilladsp/configs-bt/$name.yml"
cp $etcdefault{,.backup}
sed -i "s|^CONFIG.*|CONFIG=$configbt|" $etcdefault

if [[ ! -e $configbt ]]; then
	. <( bluealsa-aplay -L | awk '/channel.*Hz/ {print "format="$3"\nchannels="$4"\nsamplerate="$6}' )
	format=$( sed 's/_3LE/LE3/; s/FLOAT_LE/FLOAT32LE/; s/_//g' <<< $format )

	if [[ $type == btreceiver ]]; then
		sed -E -e '/playback:$/,/format:/ {
s/(device: ).*/\1bluealsa/
s/(channels: ).*/\1'$channels'/
s/(format: ).*/\1'$format'/
}' "$fileconfig" > "$configbt"
	else
		dbuspath=$( gdbus introspect \
						--recurse \
						--system \
						--dest org.bluealsa \
						--object-path /org/bluealsa \
							| awk '/node.*source {$/ {print $2}' ) # /org/bluealsa/hci0/dev_A0_B1_C2_D3_E4_F5/a2dpsnk/source
		sed -E -e 's/(samplerate: ).*/\1'$samplerate'/
s/(chunksize: ).*/\14096/
s/(enable_rate_adjust: )/\1true/
s/(target_level: )/\18000/
s/(adjust_period: )/\13/
s/(enable_resampling: )/\1true/
' -e '/capture:$/,/format:/ {
	/device: .*/ d
	/format:/ a\	dbus_path: '$dbuspath'
	s/(type: ).*/\1Bluez/
	s/(channels: ).*/\1'$channels'/
	s/(format: ).*/\1'$format'/
}' "$fileconfig" > "$configbt"
	fi
fi
