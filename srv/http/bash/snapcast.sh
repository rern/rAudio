#!/bin/bash

# as server - features.sh > this:
#    - force clients stop on disabled
# as client - main.js > this:
#    - connect
#    - disconnect


. /srv/http/bash/common.sh
fileclientip=$dirshm/clientip

if [[ $1 == start ]]; then # client start - save server ip
	if systemctl -q is-active snapserver; then # server + client on same device
		line=$( sed -n '/auto_format/ =' $mpdconf )
		line0=$(( line - 5 ))
		sed -i "$line0,/}/ d" $mpdconf
		systemctl restart mpd
		systemctl start snapclient
		touch $dirshm/snapclientactive
		pushstream display '{"snapclientactive":true,"volumenone":false}'
		pushstream refresh '{"page":"features","snapclientactive",true}'
		$dirsettings/player-data.sh pushrefresh
		exit
	fi
	
	mpc -q stop
	systemctl start snapclient
	serverip=$( timeout 0.2 snapclient | awk '/Connected to/ {print $NF}' )
	if [[ $serverip ]]; then
		echo $serverip > $dirshm/serverip
		$dirbash/cmd.sh playerstart$'\n'snapcast
		$dirbash/status-push.sh
		clientip=$( ipGet )
		sshCommand $serverip $dirbash/snapcast.sh $clientip
	else
		systemctl stop snapclient
		echo -1
	fi
elif [[ $1 == stop ]]; then # server + client on same device
	systemctl stop snapclient
	rm $dirshm/snapclientactive
	$dirsettings/player-conf.sh
	if [[ -e $dirshm/nosound ]]; then
		volumenone=true
	else
		[[ ! -e $dirshm/mixernone || -e $dirshm/btreceiver ]] && volumenone=false || volumenone=true
	fi
	pushstream display '{"snapclientactive":false,"volumenone":'$volumenone'}'
	pushstream refresh '{"page":"features","snapclientactive",false}'

elif [[ $1 == remove ]]; then # sshpass remove clientip from disconnected client
	clientip=$2
	sed -i "/$clientip/ d" $fileclientip
	[[ ! $( awk NF $fileclientip ) ]] && rm -f $fileclientip
else # sshpass add clientip from connected client
	clientip=$1
	iplist="\
$( getContent $fileclientip )
$clientip"
	awk NF <<< "$iplist" | sort -u > $fileclientip
fi
