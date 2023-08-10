#!/bin/bash

. /srv/http/bash/common.sh

etcdefault=/etc/default/camilladsp

if [[ $1 == off ]]; then
	mv -f $etcdefault{.backup,}
	exit
fi

configfile=$( getVar CONFIG $etcdefault )

case $1 in

receiver )
	receiverfile=$dirsystem/camilla-btreceiver
	if [[ -e $receiverfile ]]; then
		btconfigfile=$( < $receiverfile )
	else
		btconfigfile=$dircamilladsp/configs/btreceiver.yml
		cp $configfile $btconfigfile
		echo $btconfigfile > $receiverfile
	fi
	fch=( $( bluealsa-aplay -L | awk '/channel.*Hz/ {print $3" "$4}' ) )
	format=${fch[0]}
	channels=${fch[1]}
	sed -i -E -e 's/(samplerate: ).*/\1'$samplerate'/
' -e '/playback:/,/filters:/ {
s/(channels: ).*/\1'$channels'/
s/(device: ).*/\1"bluealsa"/
s/(format: ).*/\1'$format'/
}
' $btconfigfile
	cp $etcdefault{,.backup}
	sed -i 's/^CONFIG/CONFIG="'$btconfigfile'"/' $etcdefault
	;;
sender )
	senderfile=$dirsystem/camilla-btsender
	if [[ -e $senderfile ]]; then
		btconfigfile=$( < $senderfile )
	else
		btconfigfile=$dircamilladsp/configs/btsender.yml
		sed -e '/capture:$/,/playback:$/ s/type: .*/type: Bluez/
' -e '/playback:$/ i\
    dbus_path: /org/bluealsa/hci0/dev_A0_B1_C2_D3_E4_F5/a2dpsnk/source
'$configfile > $btconfigfile
		echo $btconfigfile > $senderfile
	fi
	fch=( $( bluealsa-aplay -L | awk '/channel.*Hz/ {print $3" "$4" "$6}' ) )
	format=${fch[0]}
	channels=${fch[1]}
	samplerate=${fch[2]}
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
' $btconfigfile
	cp -f $etcdefault{,.backup}
	sed -i 's/^CONFIG/CONFIG="'$btconfigfile'"/' $etcdefault
	;;
	
esac

systemctl restart camilladsp
