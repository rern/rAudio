#!/bin/bash

# as server - features.sh > this:
#    - force clients stop on disabled
# as client - main.js > this:
#    - connect
#    - disconnect
# as client + server - cmd.sh
#    - play > connect
#    - stop > disconnect


. /srv/http/bash/common.sh

if [[ $1 == start ]]; then
	service=$( avahi-browse -prt _snapcast._tcp | tail -1 )
	if [[ $service ]]; then
		server=$( cut -d';' -f7 <<< $service )
		serverip=$( cut -d';' -f8 <<< $service | cut -d';' -f8 )
		notify snapcast SnapServer "Connect ${server/.local} ..."
		systemctl start snapclient
		echo $serverip > $dirshm/serverip
		echo snapcast > $dirshm/player
		$dirbash/cmd.sh playerstart
		$dirbash/status-push.sh
		touch $dirshm/snapclient
	else
		echo -1
	fi
elif [[ $1 == stop ]]; then
	systemctl stop snapclient
	$dirbash/cmd.sh playerstop
	$dirbash/status-push.sh
	rm $dirshm/{serverip,snapclient}
fi
