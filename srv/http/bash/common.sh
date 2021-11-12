#!/bin/bash

dirbash=/srv/http/bash
dirdata=/srv/http/data
diraddons=$dirdata/addons
dirmpd=$dirdata/mpd
dirshm=$dirdata/shm
dirsystem=$dirdata/system
dirwebradios=$dirdata/webradios

pushstream() {
	curl -s -X POST http://127.0.0.1/pub?id=$1 -d "$2"
}
pushstreamNotify() { # title text icon [hide]
	data='{"title":"'$1'","text":"'$2'","icon":"'$3'"}'
	pushstream notify "$data"
}
pushstreamNotifyBlink() { # title text icon [hide]
	data='{"title":"'$1'","text":"'$2'","icon":"'$3' blink","delay":-1}'
	pushstream notify "$data"
}
