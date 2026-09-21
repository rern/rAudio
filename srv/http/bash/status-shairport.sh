#!/bin/bash

# shairport.service > this:

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
