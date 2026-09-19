#!/bin/bash

# shairport.service > this:

. /srv/http/bash/common.sh

##### start
if ! playerActive airplay; then
	playerStart airplay
	sleep 1
	date +%s > $dirshm/timestamp
	$dirbash/status -p
fi
dbus-monitor \
	--system \
	"type=signal,
	interface=org.freedesktop.DBus.Properties,
	member=PropertiesChanged,
	path=/org/gnome/ShairportSync" 2>/dev/null |
		while read line; do
			if [[ $line == *PropertiesChanged ]]; then # signal time=1789821437.049377 sender=:1.160 ....
				timestamp=$( awk -F'[= ]' '{print int($3 + 0.5)}' <<< $line )
				continue
#...............................................................................
			fi
			if [[ $line == *'"Metadata"'* ]]; then
				echo $timestamp > $dirshm/timestamp
				$dirbash/status -p
			fi
		done
