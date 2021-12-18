#!/bin/bash

. /srv/http/data/system/rotaryencoder.conf
dirbash=/srv/http/bash
control_volume=$( $dirbash/cmd.sh volumecontrolget )
control=${control_volume/^*}

gpio -1 mode $pina in
gpio -1 mode $pinb in
gpio -1 write $pina 1

b=$( gpio -1 read $pinb )

triggerWait() {
	gpio -1 wfi $pina falling
	if [[ $b == 0 && $( gpio -1 read $pinb ) == 1 ]]; then
		volume +
	elif [[ $b == 1 && $( gpio -1 read $pinb ) == 0 ]]; then
		volume -
	fi
	gpio -1 write $pina 1
	triggerWait
}
volume() {
	$dirbash/cmd.sh "volumeupdown
$1
$control"
}
triggerWait
