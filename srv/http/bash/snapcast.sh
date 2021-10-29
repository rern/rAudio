#!/bin/bash

dirshm=/srv/http/data/shm
snapserverfile=$dirshm/snapserverip
snapclientfile=$dirshm/snapclientip
snapclientpwfile=/srv/http/data/system/snapclientpw

pushstream() {
	curl -s -X POST http://$1/pub?id=snapcast -d "$2"
}

if [[ $1 == start ]]; then # client start - save server ip
	mpc -q stop
	systemctl start snapclient
	sleep 2
	serverip=$( journalctl -u snapclient | grep 'Connected to' | tail -1 | awk '{print $NF}' )
	if [[ -n $serverip ]]; then
		rm -f $dirshm/player-*
		touch $dirshm/player-snapclient
		echo $serverip > $snapserverfile
		clientip=$( ifconfig | awk '/inet .*broadcast/ {print $2}' )
		snapserverpw=$( cat $snapclientpwfile 2> /dev/null || echo ros )
		sshpass -p "$snapserverpw" ssh -qo StrictHostKeyChecking=no root@$serverip "/srv/http/bash/snapcast.sh $clientip $serverip"
		systemctl try-restart shairport-sync spotifyd upmpdcli &> /dev/null
	else
		systemctl stop snapclient
		echo -1
	fi
elif [[ $1 == stop ]]; then # client stop - delete server ip, curl remove client ip
	systemctl stop snapclient
	rm -f $dirshm/player-*
	touch $dirshm/player-mpd
	curl -s -X POST http://127.0.0.1/pub?id=mpdplayer -d "$( /srv/http/bash/status.sh )"
	serverip=$( cat $snapserverfile )
	clientip=$( ifconfig | awk '/inet .*broadcast/ {print $2}' )
	snapserverpw=$( cat $snapclientpwfile 2> /dev/null || echo ros )
	sshpass -p "$snapserverpw" ssh -q root@$serverip "/srv/http/bash/snapcast.sh $clientip"
	rm $snapserverfile
elif [[ $1 == serverstop ]]; then # force clients stop
	snapclientfile=$dirshm/snapclientip
	if [[ -e $snapclientfile ]]; then
		readarray -t clientip < $snapclientfile
		for ip in "${clientip[@]}"; do
			[[ -n $ip ]] && pushstream $ip -1
		done
		rm -f $snapclientfile
	fi
else # sshpass from snapclient
	snapclientip=$1
	snapserverip=$2
	snapclientfile=$dirshm/snapclientip
	sed -i "/$snapclientip/ d" $snapclientfile &> /dev/null
	[[ -s $snapclientfile ]] || rm $snapclientfile
	if [[ -n $snapserverip ]]; then
		echo $snapclientip >> $snapclientfile
		status=$( /srv/http/bash/status.sh snapclient )
		curl -s -X POST http://$snapclientip/pub?id=mpdplayer -d "$status"
	fi
fi
