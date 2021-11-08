#!/bin/bash

dirshm=/srv/http/data/shm

[[ -e $dirshm/player-upnp ]] && exit

mpc -q stop
sudo rm -f $dirshm/{player-*,scrobble}
touch $dirshm/player-upnp
player=$( ls $dirshm/player-* 2> /dev/null | cut -d- -f2 )
case $player in # sudo - fix permission
	airplay )   sudo systemctl restart shairport-sync;;
	bluetooth ) sudo systemctl restart bluezdbus;;
	snapcast )  sudo systemctl stop snapclient;;
	spotify )   sudo systemctl restart spotifyd;;
esac
/srv/http/bash/cmd-pushstatus.sh
curl -s -X POST http://127.0.0.1/pub?id=player -d '{"player":"upnp","active":true}'
