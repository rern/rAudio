#!/bin/bash

dirshm=/srv/http/data/shm

[[ -e $dirshm/player-upnp ]] && exit

for pid in $( pgrep upmpdcli ); do
	ionice -c 0 -n 0 -p $pid &> /dev/null 
	renice -n -19 -p $pid &> /dev/null
done
#sudo mv $playerfile-{*,upnp} # sudo - fix permission on start
mpc stop
rm -f $dirshm/{player-*,scrobble}
touch $dirshm/player-upnp
systemctl try-restart bluezdbus shairport-sync snapclient spotifyd &> /dev/null
