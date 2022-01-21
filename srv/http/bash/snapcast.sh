#!/bin/bash

# as server - features.sh > this:
#    - force clients stop on disabled
# as client - main.js > this:
#    - connect
#    - disconnect


. /srv/http/bash/common.sh
serverfile=$dirshm/serverip
clientfile=$dirshm/clientip
lcdcharfile=$dirshm/clientiplcdchar

if [[ $1 == start ]]; then # client start - save server ip
	mpc -q stop
	systemctl start snapclient
	serverip=$( timeout 0.2 snapclient | awk '/Connected to/ {print $NF}' )
	if [[ $serverip ]]; then
		echo $serverip > $serverfile
		$dirbash/cmd.sh playerstart$'\n'snapcast
		$dirbash/status-push.sh
		clientip=$( ifconfig | awk '/inet .*broadcast/ {print $2}' )
		[[ -e $dirsystem/lcdchar ]] && lcdchar=1
		sshpass -p ros ssh -qo StrictHostKeyChecking=no root@$serverip \
			"$dirbash/snapcast.sh $clientip $lcdchar"
	else
		systemctl stop snapclient
		echo -1
	fi
elif [[ $1 == remove ]]; then # sshpass remove clientip from disconnected client
	clientip=$2
	sed -i "/$clientip/ d" $clientfile
	[[ $( awk NF $clientfile | wc -l ) == 0 ]] && rm -f $clientfile
	[[ ! -e $lcdcharfile ]] && exit
	
	sed -i "/$clientip/ d" $lcdcharfile
	[[ $( awk NF $lcdcharfile | wc -l ) == 0 ]] && rm -f $lcdcharfile
else # sshpass add clientip from connected client
	clientip=$1
	lcdchar=$2
	iplist="\
$( cat $clientfile )
$clientip"
	echo "$iplist" | sort -u | awk NF > $clientfile
	[[ ! $lcdchar ]] && exit
	
	iplist="\
$( cat $lcdcharfile )
$clientip"
	echo "$iplist" | sort -u | awk NF > $lcdcharfile
fi
