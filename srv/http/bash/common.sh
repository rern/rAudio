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
if [[ -e $dirdata ]]; then # create-ros.sh - not yet exist
	dirs=$( ls $dirdata | grep -v 'backup$' )
	for dir in $dirs; do
		printf -v dir$dir '%s' $dirdata/$dir
	done
	mpdconf=$dirmpdconf/mpd.conf
fi

argsConvert() { # convert lines to array > $args > var=value ...
	readarray -t args <<< $1
	cmd=${args[0]}
	[[ ${args[1]} == json ]] && return
	
	filetmp=$dirshm/conf
	printf "%s\n" "${args[@]:1}" > $filetmp
	. $filetmp
	if [[ $fileconf ]]; then # save file conf
		[[ ${fileconf:0:1} != / ]] && fileconf=$dirsystem/$cmd.conf
		grep -Ev '^enable|^fileconf' $filetmp > $fileconf
	fi
	rm $filetmp
}
calc() { # $1 - decimal precision, $2 - math without spaces
	awk 'BEGIN { printf "%.'$1'f", '$2' }'
}
conf2json() {
	local file lines l json v
	file=$1
	[[ ${file:0:1} != / ]] && file=$dirsystem/$file
	[[ ! -e $file ]] && echo false && exit
	
	# omit lines  blank, comment / group [xxx]
	lines=$( awk 'NF && !/^\s*[#[}]|{$/' "$file" ) # exclude: (blank lines) ^# ^[ ^} ^' #' {$
	[[ ! $lines ]] && echo false && exit
	
	if [[ $2 ]]; then # $2 - specific keys
		shift
		keys=$@
		only="^\s*${keys// /|^\\s*}"
		lines=$( grep -E "$only" <<< $lines )
	fi
	[[ ! $lines ]] && echo false && exit
	
	[[ $( head -1 <<< $lines ) != *=* ]] && lines=$( sed 's/^\s*//; s/ \+"/="/' <<< $lines ) # key "value" > key="value"
	readarray -t lines <<< $lines
	for l in "${lines[@]}"; do
			k=${l/=*}
			v=${l/*=}
			[[ ! $v ]] && v=false
			v=$( sed -E -e "s/^[\"']|[\"']$//g" \
						-e 's/^True$|^False$/\L&/
							s/^yes$/true/
							s/^no$/false/' <<< $v )
			confNotString "$v" || v='"'${v//\"/\\\"}'"' # quote and escape string
			json+=', "'$k'": '$v
	done
	echo { ${json:1} }
}
confNotString() {
	local var string boolean number array
	var=$1
	[[ $var =~ ^true$|^false$ ]]                          && boolean=1
	[[ $var != 0 && ${var:0:1} == 0 && ${var:1:1} != . ]] && string=1  # not 0 and not 0.123
	[[ $var =~ ^-*[0-9]*\.*[0-9]*$ ]]                     && number=1  # 0 / 123 / -123 / 0.123 / .123
	[[ ${var:0:1} == '[' ]]                               && array=1   # [val, ...]
	[[ ! $string && ( $boolean || $number || $array ) ]]  && return 0  || return 1
}
confFromJson() { # $1 - file
	sed -E '/\{|}/d; s/,//; s/^\s*"(.*)": "*(.*)"*$/\1="\2"/' "$1"
}
cpuInfo() {
	hwrevision=$( grep ^Revision /proc/cpuinfo )
	BB=${hwrevision: -3:2}
	[[ $BB =~ ^(00|01|02|03|04|09)$ ]] || onboardwireless=1
}
data2json() {
	local data json
	data="$1"
	if [[ ${data:0:1} != , ]]; then
		data+='
, "login" : '$( exists $dirsystem/login )
		json="{ $data }"
	else
		json="[ ${data:1} ]"
	fi
	# "k": > "k": false # "k":} > "k": false} # [, > [false, # ,, > ,false, # ,] > ,false]
	json=$( sed 's/:\s*$/: false/
				s/:\s*}$/: false }/
				s/^,\s*$/, false/
				s/\[\s*,/[ false,/g
				s/,\s*,/, false,/g
				s/,\s*]/, false ]/g' <<< $json )
	[[ $2 ]] && pushstream refresh "$json" || echo "$json"
}
dirPermissions() {
	chown -R root:root /srv
	chown -R mpd:audio $dirmpd $dirplaylists
	chmod -R u=rw,go=r,a+X /srv
	chmod -R u+x /srv/http/bash
	[[ -L $dirshareddata ]] && dirPermissionsShared
}
dirPermissionsShared() {
	chown -h http:http $dirdata/{audiocd,bookmarks,lyrics,webradio}
	chown -h mpd:audio $dirdata/{mpd,playlists}
	chmod 777 $filesharedip $dirshareddata/system/{display,order}
}
exists() {
	[[ -e $1 ]] && echo true || echo false
}
getContent() {
	[[ -e "$1" ]] && cat "$1"
}
getElapsed() {
	local mmss=$( mpc status %currenttime% )
	echo $(( ${mmss/:*} * 60 + ${mmss/*:} ))
}
getVar(){
	line=$( grep -E "^${1// /|^}" $2 )
	[[ $line != *=* ]] && line=$( sed 's/ \+/="/' <<< $line )
	sed -E "s/.* *= *//; s/^[\"']|[\"']$//g; s/\"/\\\\\"/g" <<< $line
}
internetConnected() {
	ping -c 1 -w 1 8.8.8.8 &> /dev/null && return 0 || return 1
}
ipAddress() {
	ifconfig | awk '/inet.*broadcast/ {print $2;exit}' | head -1
}
notify() { # icon title message delayms
	local blink delay
	if [[ $1 == -blink ]]; then
		blink=' blink'
		shift
		[[ $4 ]] && delay=$4 || delay=-1
	else
		[[ $4 ]] && delay=$4 || delay=3000
	fi
	pushstream notify '{"icon":"'$1$blink'","title":"'${2//\"/\\\"}'","message":"'${3//\"/\\\"}'","delay":'$delay'}'
}
packageActive() {
	local pkgs pkg active i
	pkgs=$@
	active=( $( systemctl is-active $pkgs | sed 's/inactive/false/; s/active/true/' ) )
	i=0
	for pkg in ${pkgs[@]}; do
		printf -v ${pkg//-} '%s' ${active[i]}
		(( i++ ))
	done
}
pushRefresh() {
	local page push
	[[ $1 ]] && page=$1 || page=$( basename $0 .sh )
	[[ $2 ]] && push=$2 || push=push
	[[ $page == networks ]] && sleep 2
	$dirsettings/$page-data.sh $push
}
pushstream() {
	local channel json path ips ip
	channel=$1
	json=${@:2} # $@=( function channel {"data":"value"...} ) > {"data":"value"...}
	json=$( sed 's/: *,/: false,/g; s/: *}$/: false }/' <<< $json ) # empty value > false
	curl -s -X POST http://127.0.0.1/pub?id=$channel -d "$json"
	[[ ! -e $filesharedip  ]] && return
	
	if [[ $channel == coverart ]]; then
		path=$( sed -E -n '/"url"/ {s/.*"url" *: *"(.*)",*.*/\1/; s|%2F|/|g; p}' | cut -d/ -f3 )
		[[ 'MPD bookmark webradio' != *$path* ]] && return
	fi
	
	[[ ! -e $filesharedip || $( wc -l < $filesharedip ) == 1 ]] && return # no shared data / no other cilents
	
	if [[ 'bookmark coverart display mpdupdate order playlists radiolist' == *$channel* ]] || grep -q -m1 'line.*rserver' <<< $json; then # 'Server rAudio' 'Online/Offline ...' rserver
		[[ $channel == radiolist && $json == *webradio* ]] && local webradiocopy=1
		ips=$( grep -v $( ipAddress ) $filesharedip )
		for ip in $ips; do
			curl -s -X POST http://$ip/pub?id=$channel -d "$json"
			[[ $webradiocopy ]] && sshCommand $ip $dirbash/cmd.sh webradiocopybackup
		done
	fi
}
sshCommand() { # $1=ip or -d/--data stdout(optional)
	[[ $1 == '-d' || $1 == '--data' ]] && shift && data=1 || data=
	! ping -c 1 -w 1 $1 &> /dev/null && return
	
	[[ $data ]] && sshpassCmd $@ || sshpassCmd $@ &> /dev/null
}
sshpassCmd() {
	sshpass -p ros ssh -q \
		-o ConnectTimeout=1 \
		-o UserKnownHostsFile=/dev/null \
		-o StrictHostKeyChecking=no \
		root@$1 \
		"${@:2}"
}
