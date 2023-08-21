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

# args2var "\
#	command
#	v1
#	v2
#	CMD k1 k2 ..."
#
# convert multiline to variables:
#	${args[0]}=CMD
#	${args[1]}=v1
#	${args[2]}=v2
#	...
# if 'OFF'   / not set
#	ON=      / ON=true
#	TF=false / TF=true
#
# if 'CMD k1 k2 ...' set (CFG - also save to file)
#	k1=v1
#	k2=v2
#	...
appendSortUnique() {
	data=$1
	file=$2
	[[ ! -e $file ]] && echo "$data" > $file && exit
	
	lines="\
$( < $file )
$data"
	awk NF <<< $lines | sort -u > $file
}
args2var() {
	local argslast CMD_CFG_OFF CFG i keys kL k v conf
	readarray -t args <<< $1
	CMD=${args[0]}
	argslast=${args[@]: -1}
	CMD_CFG_OFF=${argslast:0:3}
	[[ $CMD_CFG_OFF == OFF ]] && TF=false && return
	
	ON=true
	TF=true
	[[ ! $CMD_CFG_OFF =~ ^(CMD|CFG)$ ]] && return
	
	keys=( $argslast )
	[[ $CMD_CFG_OFF == CFG ]] && CFG=1
	kL=${#keys[@]}
	for (( i=1; i < kL; i++ )); do
		k=${keys[i]}
		v=${args[i]}
		[[ $v == false ]] && v=
		printf -v $k '%s' "$v"
		if [[ $CFG ]]; then
			if [[ $v ]]; then
				v=$( stringEscape $v )
				[[ $v =~ \ |\"|\'|\`|\<|\> ]] && v='"'$v'"' # quote if contains space " ' ` <
			fi
			conf+=${k,,}'='$v$'\n'
		fi
	done
	[[ $CFG ]] && echo -n "$conf" > $dirsystem/$CMD.conf
}
cacheBust() {
	! grep -q ^.hash.*time /srv/http/common.php && sed -i "s/?v=.*/?v='.time();/" /srv/http/common.php
	hash=?v=$( date +%s )
	sed -E -i "s/(rern.woff2).*'/\1$hash'/" /srv/http/assets/css/common.css
	sed -E -i  "s/\?v=.{10}/$hash/g" /srv/http/settings/camillagui/build/index.html
}
calc() { # $1 - decimal precision, $2 - math without spaces
	awk 'BEGIN { printf "%.'$1'f", '$2' }'
}
conf2json() {
	local file lines l json v
	[[ $1 == '-nocap' ]] && nocap=1 && shift
	file=$1
	[[ ${file:0:1} != / ]] && file=$dirsystem/$file
	[[ ! -e $file ]] && echo false && return
	
	# omit lines  blank, comment / group [xxx]
	lines=$( awk 'NF && !/^\s*[#[}]|{$/' "$file" ) # exclude: (blank lines) ^# ^[ ^} ^' #' {$
	[[ ! $lines ]] && echo false && return
	
	if [[ $2 ]]; then # $2 - specific keys
		shift
		keys=$@
		only="^\s*${keys// /|^\\s*}"
		lines=$( grep -E "$only" <<< $lines )
	fi
	[[ ! $lines ]] && echo false && return
	
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
			confNotString "$v" || v='"'$( stringEscape $v )'"' # quote and escape string
			[[ ! $nocap ]] && k=${k^^}
			json+=', "'$k'": '$v
	done
	echo { ${json:1} }
}
confNotString() {
	local array boolean number string var
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
data2json() {
	local data json
	data="$1"
	if [[ ${data:0:1} != , ]]; then # status.sh PAGE-data.sh
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
	chown -R http:http /srv
	chown mpd:audio $dirmpd $dirplaylists $dirmpd/mpd.db
	chmod -R u=rw,go=r,a+X /srv
	chmod -R +x $dirbash /srv/http/settings/camillagui/{backend,main.py} &> /dev/null
}
enableFlagSet() {
	[[ $ON ]] && touch $dirsystem/$CMD || rm -f $dirsystem/$CMD
}
exists() {
	[[ -e $1 ]] && echo true || echo false
}
getContent() {
	[[ -e "$1" ]] && cat "$1"
}
getVar(){
	local line
	line=$( grep -E "^${1// /|^}" $2 )
	[[ $line != *=* ]] && line=$( sed 's/ \+/=/' <<< $line )
	line=$( sed -E "s/.* *= *//; s/^[\"']|[\"']$//g" <<< $line )
	stringEscape $line
}
internetConnected() {
	ipOnline 8.8.8.8
}
ipAddress() {
	ifconfig | awk '/inet.*broadcast/ {print $2;exit}' | head -1
}
ipSub() {
	local ip
	ip=$( ipAddress )
	echo ${ip%.*}.
}
ipOnline() {
	ping -c 1 -w 1 $1 &> /dev/null && return 0
}
killProcess() {
	local filepid
	filepid=$dirshm/pid$1
	if [[ -e $filepid ]]; then
		kill -9 $( < $filepid ) &> /dev/null
		rm $filepid
	fi
}
lineCount() {
	[[ -e $1 ]] && awk NF "$1" | wc -l || echo 0
}
mpcElapsed() {
	mpc status %currenttime% | awk -F: '{print ($1 * 60) + $2}'
}
notify() { # icon title message delayms
	local blink delay icon json message title
	blink=
	delay=3000
	if [[ $1 == '-blink' ]]; then
		blink=' blink'
		delay=-1
		shift
	fi
	[[ $1 == *.*.*.* ]] && ip=$1 && shift
	[[ $4 ]] && delay=$4
	icon=$1$blink
	title=$( stringEscape $2 )
	message=$( stringEscape $3 )
	json='{ "icon": "'$icon'", "title": "'$title'", "message": "'$message'", "delay": '$delay' }'
	if [[ $ip ]]; then
		curl -s -X POST http://$ip/pub?id=notify -d "$json"
	else
		pushstream notify "$json"
	fi
}
packageActive() {
	local active pkg pkgs status
	pkgs=$@
	status=( $( systemctl is-active $pkgs ) )
	i=0
	for pkg in ${pkgs[@]}; do
		[[ ${status[i]} == active ]] && active=true || active=false
		printf -v ${pkg//-} '%s' $active
		(( i++ ))
	done
}
package() {
	local file
	file=$( dialog --colors --no-shadow --no-collapse --output-fd 1 --nocancel --menu "
Package:
" 8 0 0 \
1 Build \
2 'Update repo' \
3 'AUR setup' )
	case $file in
		1 ) file=pkgbuild;;
		2 ) file=repoupdate;;
		3 ) file=aursetup;;
	esac
	bash <( curl -L https://github.com/rern/rern.github.io/raw/main/$file.sh )
}
pushRefresh() {
	local page push
	[[ $1 ]] && page=$1 || page=$( basename $0 .sh )
	[[ $2 ]] && push=$2 || push=push
	[[ $page == networks ]] && sleep 2
	$dirsettings/$page-data.sh $push
}
pushstream() {
	local channel ip json path sharedip updatedone webradiocopy
	channel=$1
	json=${@:2} # $2 ...
	json=$( sed 's/: *,/: false,/g; s/: *}$/: false }/' <<< $json ) # empty value > false
	curl -s -X POST http://127.0.0.1/pub?id=$channel -d "$json"
	[[ ! -e $filesharedip || $( lineCount $filesharedip ) == 1 ]] && return  # no other cilents
	# shared data
	[[ 'bookmark coverart display order mpdupdate playlists radiolist' != *$channel* ]] && return
	
	if [[ $channel == coverart ]]; then
		path=$( sed -E -n '/"url"/ {s/.*"url" *: *"(.*)",*.*/\1/; s|%2F|/|g; p}' | cut -d/ -f3 )
		[[ 'MPD bookmark webradio' != *$path* ]] && return
	fi
	
	if [[ $channel == mpdupdate ]]; then
		if [[ $json == *done* ]]; then
			sharedip=$( grep -v $( ipAddress ) $filesharedip )
			for ip in $sharedip; do
				sshCommand $ip $dirbash/cmd.sh shareddatampdupdate
			done
			return
		fi
	fi
	
	sharedip=$( grep -v $( ipAddress ) $filesharedip )
	for ip in $sharedip; do
		ipOnline $ip && curl -s -X POST http://$ip/pub?id=$channel -d "$json"
	done
}
serviceRestartEnable() {
	systemctl restart $CMD
	systemctl -q is-active $CMD && systemctl enable $CMD
}
sharedDataBackupLink() {
	mv -f $dirdata/{audiocd,bookmarks,lyrics,mpd,playlists,webradio} $dirbackup
	mv -f $dirsystem/{display,order}.json $dirbackup
	ln -s $dirshareddata/{audiocd,bookmarks,lyrics,mpd,playlists,webradio} $dirdata
	ln -s $dirshareddata/{display,order}.json $dirsystem
	chown -h http:http $dirdata/{audiocd,bookmarks,lyrics,webradio} $dirsystem/{display,order}.json
	chown -h mpd:audio $dirdata/{mpd,playlists} $dirmpd/mpd.db
	echo data > $dirnas/.mpdignore
	touch $dirsystem/usbautoupdateno
}
sharedDataCopy() {
	rm -f $dirmpd/{listing,updating}
	cp -rf $dirdata/{audiocd,bookmarks,lyrics,mpd,playlists,webradio} $dirshareddata
	cp $dirsystem/{display,order}.json $dirshareddata
	touch $dirshareddata/order.json
}
sharedDataReset() {
	mpc -q clear
	rm -rf $dirdata/{audiocd,bookmarks,lyrics,mpd,playlists,webradio}
	rm $dirsystem/{display,order}.json
	mv -f $dirbackup/{display,order}.json $dirsystem
	mv -f $dirbackup/* $dirdata
	rm -rf $dirbackup
	dirPermissions
}
sshCommand() {
	! ipOnline $1 && return
	
	if [[ ${@: -1} == snapclient ]]; then
		sshpassCmd $@
	else
		sshpassCmd $@ &> /dev/null &
	fi
}
sshpassCmd() {
	sshpass -p ros ssh -q \
		-o ConnectTimeout=1 \
		-o UserKnownHostsFile=/dev/null \
		-o StrictHostKeyChecking=no \
		root@$1 \
		"${@:2}"
}
statePlay() {
	grep -q -m1 '^state.*play' $dirshm/status && return 0
}
stringEscape() {
	echo ${@//\"/\\\"}
}
volumeGet() {
	# camilla: 
	#   set: awk 'BEGIN { printf "%.2f", ( '$percent' - 100 ) / 2 }' )
	#   get: awk 'BEGIN { printf "%.0f", '$db' * 2 + 100 }'
	local amixer card control data mixersoftware val_db
	if [[ -e $dirsystem/camilladsp && -e $dirsystem/camillavolume ]]; then
		$dirsettings/camilla.py volume
		return
		
	elif [[ -e $dirshm/btreceiver ]]; then
		for i in {1..5}; do # takes some seconds to be ready
			amixer=$( amixer -MD bluealsa 2> /dev/null | grep -m1 % )
			[[ $amixer ]] && break || sleep 1
		done
	else
		[[ -e $dirshm/nosound ]] && echo -1 && return
		
		if [[ -e $dirsystem/snapclientserver ]]; then
			mixersoftware=
		elif grep -q mixer_type.*software $dirmpdconf/output.conf; then
			mixersoftware=1
		fi
		if [[ $mixersoftware && $( < $dirshm/player ) == mpd ]]; then
			val=$( mpc status %volume% | tr -dc [0-9] )
		elif [[ -e $dirshm/amixercontrol ]]; then
			card=$( < $dirsystem/asoundcard )
			control=$( < $dirshm/amixercontrol )
			amixer=$( amixer -c $card -M sget "$control" | grep -m1 % )
		fi
	fi
	if [[ $amixer ]]; then
		val_db=$( sed -E 's/.*\[(.*)%.*\[(.*)dB.*/\1 \2/' <<< $amixer )
		val=${val_db/ *}
		db=${val_db/* }
	fi
	[[ ! $val ]] && val=100
	[[ ! $db ]] && db=0
	case $1 in
		value ) echo $val;;
		valdb ) echo '{ "val": '$val', "db": '$db' }';;
		* )     pushstream volume '{ "type": "'$1'", "val": '$val', "db": '$db' }';;
	esac
	[[ $val > 0 ]] && rm -rf $dirsystem/volumemute
}
volumeUpDn() { # cmd.sh, bluetoothbutton.sh, rotaryencoder.sh
	killProcess vol
	amixer -c $3 -Mq sset "$2" $1
	volumePushSet
}
volumeUpDnBt() {
	killProcess vol
	amixer -MqD bluealsa sset "$2" $1
	volumePushSet
}
volumeUpDnCamilla() {
	killProcess vol
	volume=$1
	db=$( awk 'BEGIN { printf "%.1f", '$(( volume - 100 ))' / 2 }' )
	$dirsettings/camilla.py volumeset $db
	volumePushSet
}
volumeUpDnMpc() {
	killProcess vol
	mpc -q volume $1
	volumePushSet
}
volumePush() {
	sleep 0.5
	volumeGet updn
	rm $dirshm/pidvol
}
volumePushSet() {
	rm -rf $dirsystem/volumemute
	volumePush &> /dev/null &
	echo $! > $dirshm/pidvol
}