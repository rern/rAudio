#!/bin/bash

# shairport.service > this:

##### properties list #####
#	busctl \
#		--system \
#		introspect \
#		org.gnome.ShairportSync \
#		/org/gnome/ShairportSync
	
##### monitor #####
#	dbus-monitor \
#		--system \
#		"type=signal,
#		interface=org.freedesktop.DBus.Properties,
#		member=PropertiesChanged,
#		path=/org/gnome/ShairportSync"

# events:
#	...
# signal time=1789821420.049320 sender=:1.160 ....
#	...
#	string "Metadata"
#	...
# signal time=1789821430.049330 sender=:1.160 ....
#	...
#	string "PlayerState"
#	variant             string "Playing"
#	...
# signal time=1789821430.049331 sender=:1.160 ....
#	...
#	string "ProgressString"
#	variant             string "993079641/996629219/1004868385"
#	...
# signal time=1789821440.049340 sender=:1.160 ....
#	...
#	string "ProgressString"
#	variant             string ""993079641/996630897/1004868385"
#	...
# signal time=1789821440.049341 sender=:1.160 ....
#	...
#	string "PlayerState"
#	variant             string "Paused"
#	...

. /srv/http/bash/common.sh

##### start
if ! playerActive airplay; then
	playerStart airplay
	date +%s%3N > $dirshm/timestamp
	$dirbash/status-push.sh
fi

signal_time2ms() {
	s=${signal_time:12:14} # signal time=1789821430.049331 ... > 1789821430.049 (s)
	echo ${s/.}            # 1789821430049 (ms)
}

dbus-monitor \
	--system \
	"type=signal,
	interface=org.freedesktop.DBus.Properties,
	member=PropertiesChanged,
	path=/org/gnome/ShairportSync" 2>/dev/null |
		while read line; do
			case $line in
				*PropertiesChanged )
					signal_time=$line
					;;
				*'"Metadata"' | *variant*'"Playing"' )
					$dirbash/status-push.sh
					;;
				*variant*'"Paused"' ) # ProgressString not change on Paused - calculate for elapsed
					ms_pause=$( signal_time2ms )
					ms_prog=$( < $dirshm/timestamp )
					echo $(( ( ms_pause - ms_prog + 500 ) / 1000 )) > $dirshm/elapsed # (s)
					$dirbash/status-push.sh
					;;
				*'"ProgressString"' )
					signal_time2ms > $dirshm/timestamp # epoch (ms)
					$dirbash/status-push.sh
					;;
				*variant*'"Stopped"' )
					$dirbash/cmd.sh playerstop
					;;
			esac
		done
