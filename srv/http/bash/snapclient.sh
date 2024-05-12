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

if [[ $1 == stop ]]; then
	systemctl stop snapclient
	$dirbash/cmd.sh playerstop
	rm -f $dirshm/snapserverip
else
	readarray -t name_ip <<< $( snapserverList )
	[[ ! $name_ip ]] && echo -1 && exit
	
	notify snapcast SnapServer "Connect ${name_ip[0]} ..."
	[[ ! -e $dirsystem/snapclientserver ]] && echo ${name_ip[1]} > $dirshm/snapserverip
	echo snapcast > $dirshm/player
	systemctl start snapclient
fi
$dirbash/status-push.sh
