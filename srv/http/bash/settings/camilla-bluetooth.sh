#!/bin/bash

. /srv/http/bash/common.sh

type=$1

etcdefault=/etc/default/camilladsp
configfile=$( getVar CONFIG $etcdefault )

if [[ -e $dirsystem/camilla-bt$type ]]; then
	configbt=$( < $dirsystem/camilla-bt$type )
else                                         # create yml file if not exist
	configbt=$dircamilladsp/configs-bt/$type.yml
	echo $configbt > $dirsystem/camilla-bt$type
fi

cp $etcdefault{,.backup}
sed -i -E 's|^(CONFIG=).*|\1"'$configbt'"|' $etcdefault

. <( bluealsa-aplay -L | awk '/channel.*Hz/ {print "format="$3"\nchannels="$4"\nsamplerate="$6}' )
format=$( sed 's/_3LE/LE3/; s/FLOAT_LE/FLOAT32LE/; s/_//g' <<< $format )

if [[ $type == receiver ]]; then
	sed -E -e '/playback:$/,/format:/ {
s/(device: ).*/\1bluealsa/
s/(channels: ).*/\1'$channels'/
s/(format: ).*/\1'$format'/
}' "$configfile" > $configbt
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
	s/(type: ).*/\1Bluez/
	s/(channels: ).*/\1'$channels'/
	s/(format: ).*/\1'$format'/
	s|(dbus_path: ).*|\1'$dbuspath'|
}' "$configfile" > $configbt
fi
