#!/bin/bash

dirbash=/srv/http/bash
dirsettings=$dirbash/settings
dirdata=/srv/http/data
dirbackup=$dirdata/backup
dirnas=/mnt/MPD/NAS
dirsd=/mnt/MPD/SD
dirusb=/mnt/MPD/USB
dirshareddata=$dirnas/data
filesharedip=$dirshareddata/sharedip
dirs=$( ls $dirdata | grep -v 'backup$' )
for dir in $dirs; do
	printf -v dir$dir '%s' $dirdata/$dir
done
mpdconf=$dirmpdconf/mpd.conf

calc() { # $1 - decimal precision, $2 - math without spaces
	awk 'BEGIN { printf "%.'$1'f", '$2' }'
}
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
	data=$( sed 's/:\s*$/: false/
				s/:\s*}$/: false }/
				s/^,\s*$/, false/
				s/\[\s*,/[ false,/g
				s/,\s*,/, false,/g
				s/,\s*]/, false ]/g' <<< $data )
	[[ $2 ]] && pushstream refresh "$data" || echo "$data"
}
exists() {
	[[ -e $1 ]] && echo true || echo false
}
getContent() {
	[[ -e "$1" ]] && cat "$1"
}
getElapsed() {
	getStatus elapsed
}
getStatus() {
	printf '%.0f' $( { echo status; sleep 0.05; } \
						| telnet 127.0.0.1 6600 2> /dev/null \
						| grep ^$1: \
						| cut -d' ' -f2 )
}
ipAddress() {
	ifconfig | awk '/inet.*broadcast/ {print $2;exit}'
}
isactive() {
	systemctl -q is-active $1 && echo true || echo false
}
notify() { # icon title message delayms
	if [[ $1 == -blink ]]; then
		blink=' blink'
		shift
		[[ $4 ]] && delay=$4 || delay=-1
	else
		blink=
		[[ $4 ]] && delay=$4 || delay=3000
	fi
	pushstream notify '{"icon":"'$1$blink'","title":"'${2//\"/\\\"}'","message":"'${3//\"/\\\"}'","delay":'$delay'}'
}
pushRefresh() {
	[[ $1 ]] && page=$1 || page=$( basename $0 .sh )
	[[ $2 ]] && push=$2 || push=push
	[[ $page == networks ]] && sleep 2
	$dirsettings/$page-data.sh $push
}
pushstream() {
	channel=$1
	json=${@:2} # $@=( function channel {"data":"value"...} ) > {"data":"value"...}
	curl -s -X POST http://127.0.0.1/pub?id=$channel -d "$json"
	[[ ! -e $filesharedip  ]] && return
	
	if [[ $channel == coverart ]]; then
		path=$( sed -E -n '/"url"/ {s/.*"url" *: *"(.*)",*.*/\1/; s|%2F|/|g; p}' | cut -d/ -f3 )
		[[ 'MPD bookmark webradio' != *$path* ]] && return
	fi
	
	[[ ! -e $filesharedip || $( wc -l < $filesharedip ) == 1 ]] && return # no shared data / no other cilents
	
	if [[ 'bookmark coverart display mpdupdate order playlists radiolist' == *$channel* ]] || grep -q -m1 'line.*rserver' <<< $json; then # 'Server rAudio' 'Online/Offline ...' rserver
		[[ $channel == radiolist && $json == *webradio* ]] && webradiocopy=1 || webradiocopy=
		ips=$( grep -v $( ipAddress ) $filesharedip )
		for ip in $ips; do
			curl -s -X POST http://$ip/pub?id=$channel -d "$json"
			if [[ $webradiocopy ]]; then
				sshCommand $ip $dirbash/cmd.sh webradiocopybackup & >/dev/null &
			fi
		done
	fi
}
sshCommand() { # $1-ip, ${@:2}-commands
	if ping -c 1 -w 1 $1 &> /dev/null; then
		sshpass -p ros ssh -q \
			-o UserKnownHostsFile=/dev/null \
			-o StrictHostKeyChecking=no \
			root@$1 \
			"${@:2}"
	fi
}
