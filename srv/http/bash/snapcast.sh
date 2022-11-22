#!/bin/bash

# as server - features.sh > this:
#    - force clients stop on disabled
# as client - main.js > this:
#    - connect
#    - disconnect


. /srv/http/bash/common.sh
fileclientip=$dirshm/clientip

if [[ $1 == start ]]; then
	systemctl start snapclient
	serverip=$( timeout 0.2 snapclient | awk '/Connected to/ {print $NF}' )
	if [[ $serverip ]]; then
		echo $serverip > $dirshm/serverip
		$dirbash/cmd.sh playerstart$'\n'snapcast
		$dirbash/status-push.sh
		clientip=$( ipAddress )
		sshCommand $serverip $dirbash/snapcast.sh $clientip
	else
		systemctl stop snapclient
		echo -1
	fi
elif [[ $1 == stop ]]; then
	systemctl stop snapclient
	serverip=$( < $dirshm/serverip )
	clientip=$( ipAddress )
	sshCommand $serverip $dirbash/snapcast.sh remove $clientip
	rm $dirshm/serverip

elif [[ $1 == remove ]]; then # sshpass remove clientip from disconnected client
	clientip=$2
	sed -i "/$clientip/ d" $fileclientip
	[[ ! $( awk NF $fileclientip ) ]] && rm -f $fileclientip
else # sshpass add clientip from connected client
	clientip=$1
	iplist="\
$( getContent $fileclientip )
$clientip"
	awk NF <<< $iplist | sort -u > $fileclientip
fi
