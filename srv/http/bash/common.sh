#!/bin/bash

dirbash=/srv/http/bash
dirdata=/srv/http/data
dirbackup=/srv/http/data/backup
dirshareddata=/mnt/MPD/NAS/data
filesharedip=/mnt/MPD/NAS/data/sharedip
dirs=$( ls $dirdata | grep -v 'backup$' )
for dir in $dirs; do
	printf -v dir$dir '%s' $dirdata/$dir
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
	[[ $2 ]] && pushstream refresh "$data" || echo "$data"
}
exists() {
	[[ -e $1 ]] && echo true || echo false
}
ipGet() {
	ifconfig | grep -m1 inet.*broadcast | awk '{print $2}'
}
isactive() {
	systemctl -q is-active $1 && echo true || echo false
}
pushRefresh() {
	[[ $1 ]] && page=$1 || page=$( basename $0 .sh )
	[[ $2 ]] && push=$2 || push=push
	[[ $page == networks ]] && sleep 2
	$dirbash/settings/$page-data.sh $push
}
pushstream() {
	channel=$1
	data=$2
	curl -s -X POST http://127.0.0.1/pub?id=$channel -d "$data"
	[[ ! -e $filesharedip  ]] && return
	
	if [[ $channel == coverart ]]; then
		path=$( echo "$data" \
					| grep '"url"' \
					| sed -E 's/.*"url" *: *"(.*)",*.*/\1/; s|%2F|/|g' \
					| cut -d/ -f3 )
		[[ 'MPD bookmark webradio' != *$path* ]] && return
	fi
	
	if [[ 'bookmark coverart display mpdupdate order playlists radiolist' == *$channel* ]] || grep -q 'line.*rserver' <<< $data; then # rserver reboot / off
		ips=$( grep -v $( ipGet ) $filesharedip )
		for ip in $ips; do
			curl -s -X POST http://$ip/pub?id=$channel -d "$data"
		done
	fi
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
