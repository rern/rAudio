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

s2ms() {
	sec=${signal_time:12:14}
	echo ${sec/.}
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
				*variant*'"Paused"' )
					sec=$( s2ms )
					sec_prev=$( < $dirshm/timestamp )
					echo $(( ( sec - sec_prev + 500 ) / 1000 )) > $dirshm/timestamp
					$dirbash/status-push.sh
					;;
				*'"ProgressString"' )
					s2ms > $dirshm/timestamp
					$dirbash/status-push.sh
					;;
				*variant*'"Stopped"' )
					$dirbash/cmd.sh playerstop
					;;
			esac
		done
