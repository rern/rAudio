#!/bin/bash

. /srv/http/data/system/rotaryencoder.conf
dirbash=/srv/http/bash

gpio -1 mode $pins in
gpio -1 write $pins 1

mute() {
	gpio -1 wfi $pins falling
	control_volume=$( $dirbash/cmd.sh volumecontrolget )
	$dirbash/cmd.sh "volume
${control_volume/*^}
0
${control_volume/^*}"
	gpio -1 write $pins 1
	mute
}
mute
