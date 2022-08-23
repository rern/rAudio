#!/bin/bash

dirbash=/srv/http/bash
dirdata=/srv/http/data
for dir in addons audiocd dabradio mpd playlists shm system tmp webradio; do
	printf -v dir$dir '%s' /srv/http/data/$dir
done

cpuInfo() {
	hwrevision=$( awk '/Revision/ {print $NF}' /proc/cpuinfo )
	BB=${hwrevision: -3:2}
	C=${hwrevision: -4:1}
	[[ $BB =~ ^(00|01|02|03|04|09)$ ]] || onboardwireless=1
	[[ $BB =~ ^(04|08|0d|0e|11|12)$ ]] && core4=1
}
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
	data=$( echo "$data" \
				| sed  's/:\s*$/: false/
						s/:\s*}$/: false }/
						s/^,\s*$/, false/
						s/\[\s*,/[ false,/g
						s/,\s*,/, false,/g
						s/,\s*]/, false ]/g' )
	[[ $2 != pushrefresh ]] && echo "$data" || pushstream refresh "$data"
}
exists() {
	[[ -e $1 ]] && echo true || echo false
}
isactive() {
	systemctl -q is-active $1 && echo true || echo false
}
pushstream() {
	curl -s -X POST http://127.0.0.1/pub?id=$1 -d "$2"
}
pushstreamNotify() { # title text icon [hide]
	[[ $4 ]] && delay=',"delay":'$4
	data='{"title":"'$1'","text":"'${2//\"/\\\"}'","icon":"'$3'"'$delay'}'
	pushstream notify "$data"
}
pushstreamNotifyBlink() { # title text icon [hide]
	data='{"title":"'${1//\"/\\\"}'","text":"'${2//\"/\\\"}'","icon":"'$3' blink","delay":-1}'
	pushstream notify "$data"
}
sshCommand() {
	sshpass -p ros ssh -q \
		-o UserKnownHostsFile=/dev/null \
		-o StrictHostKeyChecking=no \
		root@$1 \
		"${@:2}"
}
