#!/bin/bash

dirbash=/srv/http/bash
dirdata=/srv/http/data
diraddons=$dirdata/addons
dirmpd=$dirdata/mpd
dirshm=$dirdata/shm
dirsystem=$dirdata/system
dirwebradios=$dirdata/webradios

data2json() {
	data="$1"
	if [[ ${data:0:1} != , ]]; then
		data="\
{
$data
}"
	else
		data="\
[
${data:1}
]"
	fi
	# "k": > "k": false # "k":} > "k": false} # [, > [false, # ,, > ,false, # ,] > ,false]
	echo "$data" \
		| sed  's/:\s*$/: false/
				s/:\s*}$/: false }/
				s/^,\s*$/, false/
				s/\[\s*,/[ false,/g
				s/,\s*,/, false,/g
				s/,\s*]/, false ]/g'
}
exists() {
	[[ -e $1 ]] && echo true || echo false
}
pushstream() {
	curl -s -X POST http://127.0.0.1/pub?id=$1 -d "$2"
}
pushstreamNotify() { # title text icon [hide]
	[[ $4 ]] && delay=',"delay":'$4
	data='{"title":"'$1'","text":"'$2'","icon":"'$3'"'$delay'}'
	pushstream notify "$data"
}
pushstreamNotifyBlink() { # title text icon [hide]
	[[ $4 ]] && power=',"power":"'$4'"'
	data='{"title":"'$1'","text":"'$2'","icon":"'$3' blink","delay":-1'$power'}'
	pushstream notify "$data"
}
