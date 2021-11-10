#!/bin/bash

# as server - features.sh > this:
#    - force clients stop on disabled
#    - data for sshpass from snapclient
# as client - main.js > this:
#    - connect / disconnect


. /srv/http/bash/common.sh
serverfile=$dirshm/serverip
clientfile=$dirshm/clientip

if [[ $1 == start ]]; then # client start - save server ip
	mpc -q stop
	systemctl start snapclient
	sleep 2
	serverip=$( journalctl -u snapclient | grep 'Connected to' | tail -1 | awk '{print $NF}' )
	if [[ -n $serverip ]]; then
		echo $serverip > $serverfile
		clientip=$( ifconfig | awk '/inet .*broadcast/ {print $2}' )
		sshpass -p ros \
			ssh -qo StrictHostKeyChecking=no root@$serverip \
			"$dirbash/snapcast.sh $clientip"
		$dirbash/cmd.sh playerstart$'\n'snapcast
		$dirbash/cmd-pushstatus.sh
	else
		systemctl stop snapclient
		echo -1
	fi
elif [[ $1 == stop ]]; then # client stop
	sshpass -p ros \
		ssh -qo StrictHostKeyChecking=no root@$( cat $serverfile ) \
		"$dirbash/snapcast.sh removeip $clientip"
	$dirbash/cmd.sh playerstop$'\n'snapcast
	$dirbash/cmd-pushstatus.sh
elif [[ $1 == serverstop ]]; then # server force stop clients
	[[ ! -e $clientfile ]] && exit
	
	clientip=( $( cat $dirshm/clientip ) )
	for ip in "${clientip[@]}"; do
		curl -s -X POST http://$ip/pub?id=snapcast -d -1
	done
	rm -f $clientfile
elif [[ $1 == remove ]]; then # sshpass remove clientip from disconnected client
	sed -i "$2 d" $clientfile
	[[ -s $clientfile ]] && rm -f $clientfile
else # sshpass add clientip from connected client
	clientip=$1
	echo "\
$clientip
$( grep -v $clientip $clientfile 2> /dev/null )" \
	| grep . \
	| sort -u \
	> $clientfile
fi
