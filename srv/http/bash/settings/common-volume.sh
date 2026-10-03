#!/bin/bash

volume() {
	amixer -Mq sset "$CONTROL" $TARGET
	[[ $TARGET == 0dB ]] && volumeGetDb
}
volumeBt() {
	amixer -MqD bluealsa sset "$CONTROL" $TARGET
	[[ $TARGET == 0dB ]] && volumeGetDb
}
volumeGetDb() {
	if [[ $ID == btmixer ]]; then
		val_db=$( amixer -MD bluealsa )
	else
		. $dirshm/output
		val_db=$( amixer -c $card -M sget "$mixer" )
	fi
	read val db < <( awk -F'[][]' '/%/ {print $2, $4}' <<< $val_db | tr -d '%dB' )
	echo '{ "val": '$val', "db": '$db' }'
	rm -f $dirsystem/volumemute
	pushData volume '{ "type": "unmute", "val": '$( volumeGet )' }'
}
