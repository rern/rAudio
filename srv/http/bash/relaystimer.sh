#!/bin/bash

timer=$( grep timer /srv/http/data/system/relayspins | cut -d= -f2 )
(( $timer == 0 )) && exit

sleep $(( ( $timer - 1 ) * 60 ))
curl -s -X POST http://127.0.0.1/pub?id=relays -d '{ "state": "IDLE", "timer": '$timer' }'
sleep 60
/srv/http/bash/relays.sh
