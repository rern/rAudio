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
fileclientip=$dirshm/clientip

if [[ $1 == start ]]; then
	systemctl start snapclient
	serverip=$( timeout 1 snapclient | awk '/Connected to/ {print $NF}' )
	if [[ $serverip ]]; then
		echo $serverip > $dirshm/serverip
		echo snapcast > $dirshm/player
		$dirbash/cmd.sh playerstart
		$dirbash/status-push.sh
		clientip=$( ipAddress )
		sshCommand $serverip $dirbash/snapcast.sh $clientip
		touch $dirshm/snapclient
	else
		systemctl stop snapclient
		echo -1
	fi
elif [[ $1 == stop ]]; then
	systemctl stop snapclient
	$dirbash/cmd.sh playerstop
	$dirbash/status-push.sh
	serverip=$( < $dirshm/serverip )
	clientip=$( ipAddress )
	sshCommand $serverip $dirbash/snapcast.sh remove $clientip
	rm $dirshm/{serverip,snapclient}
elif [[ $1 == remove ]]; then # sshpass remove clientip from disconnected client
	clientip=$2
	sed -i "/$clientip/ d" $fileclientip
	[[ ! $( awk NF $fileclientip ) ]] && rm -f $fileclientip
else # sshpass add clientip from connected client
	clientip=$1
	appendSortUnique $clientip $fileclientip
fi
