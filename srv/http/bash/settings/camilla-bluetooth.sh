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
	if [[ $type == receiver ]]; then
		sed -E '/playback:$/,/filters:$/ s/(device: ).*/\1bluealsa/' "$configfile" > "$configbt"
	else
		sed -E -e '/capture:$/,/playback:$/ s/(type: ).*/\1Bluez/; /device: .*/ d
' -e '/playback:$/ i\
dbus_path: /org/bluealsa/hci0/dev_A0_B1_C2_D3_E4_F5/a2dpsnk/source
' "$configfile" > "$configbt"
	fi
fi
cp $etcdefault{,.backup}
sed -i -E 's|^(CONFIG=).*|\1"'$configbt'"|' $etcdefault

fch=( $( bluealsa-aplay -L | awk '/channel.*Hz/ {print $3" "$4" "$6}' ) )
format=${fch[0]/_} # remove underscore
channels=${fch[1]}
samplerate=${fch[2]}

if [[ $type == receiver ]]; then
	sed -i -E -e '/playback:$/,/filters:$/ {
s/(channels: ).*/\1'$channels'/
s/(format: ).*/\1'$format'/
}
' $configbt
else
	dbuspath=$( gdbus introspect \
					--recurse \
					--system \
					--dest org.bluealsa \
					--object-path /org/bluealsa \
						| awk '/node.*source {$/ {print $2}' )
	sed -i -E -e 's/(samplerate: ).*/\1'$samplerate'/
' -e '/capture:$/,/playback:$/ {
s/(channels: ).*/\1'$channels'/
s/(format: ).*/\1'$format'/
s|(dbus_path: ).*|\1'$dbuspath'|
}
' $configbt
fi

systemctl restart camilladsp
