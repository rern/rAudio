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
	local data file lines
	data=$1
	file=$2
	[[ ! -e $file ]] && echo "$data" > $file && return
	
	lines="\
$( < $file )
$data"
	awk NF <<< $lines | sort -u > $file
}
args2var() {
	local argslast CFG CMD_CFG_OFF conf i k keys kL v
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
audioCDtrack() {
	songpos=$( mpc status %songpos% )
	[[ $( mpc -f %file% playlist | sed -n "$songpos p" ) == cdda* ]] && return 0
}
audioCDplClear() {
	local cdtracks
	cdtracks=$( mpc -f %file%^%position% playlist | grep ^cdda: | cut -d^ -f2 )
	if [[ $cdtracks ]]; then
		mpc -q del $cdtracks
		return 0
	fi
}
cacheBust() {
	! grep -q ^.hash.*time /srv/http/common.php && sed -i "s/?v=.*/?v='.time();/" /srv/http/common.php
	hash=?v=$( date +%s )
	sed -E -i "s/(rern.woff2).*'/\1$hash'/" /srv/http/assets/css/common.css
}
calc() { # $1 - decimal precision, $2 - math without spaces
	awk 'BEGIN { printf "%.'$1'f", '$2' }'
}
camillaDSPstart() {
	systemctl start camilladsp
	if systemctl -q is-active camilladsp; then
		pushRefresh camilla
	else
		$dirsettings/features.sh camilladsp$'\n'OFF
	fi
}
conf2json() {
	local file json k keys only l lines v
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
	while read line; do
		k=${line/=*}
		v=${line/*=}
		if [[ ${v/\"\"} ]]; then # omit v=""
			v=$( sed -E -e "s/^[\"']|[\"']$//g" \
						-e 's/^True$|^yes$/true/
							s/^False$|^no$/false/' <<< $v )
			confNotString "$v" || v='"'$( stringEscape "$v" )'"' # quote and escape string
		else
			v=false
		fi
		[[ ! $nocap ]] && k=${k^^}
		json+=', "'$k'": '$v
	done <<< $lines
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
coverFileGet() {
	local path coverfile
	path=$1
	coverfile=$( ls -1X "$path"/cover.{gif,jpg,png} 2> /dev/null | head -1 )
	[[ ! $coverfile ]] && coverfile=$( ls -1X "$path"/*.{gif,jpg,png} 2> /dev/null | grep -E -i -m1 '/album\....$|cover\....$|/folder\....$|/front\....$' )
	[[ $coverfile ]] && echo "$coverfile"
}
data2json() {
	local json page
	page=$( basename ${0/-*} )
	[[ $page == status.sh ]] && page=false || page='"'$page'"'
	json='{
  "page"  : '$page'
, "login" : '$( exists $dirsystem/login )
	json+="$1
}"
	# "k": > "k": false # "k":} > "k": false} # [, > [false, # ,, > ,false, # ,] > ,false]
	json=$( sed 's/:\s*$/: false/
				s/:\s*}$/: false }/
				s/^,\s*$/, false/
				s/\[\s*,/[ false,/g
				s/,\s*,/, false,/g
				s/,\s*]/, false ]/g' <<< $json )
	if [[ $2 ]]; then
		pushData refresh "$json"
	else
		echo "$json"
	fi
}
dirPermissions() {
	[[ -e /boot/kernel.img ]] && rm -f $dirbash/{dab*,status-dab.sh}
	[[ ! -e /usr/bin/firefox ]] && rm -f /srv/http/assets/img/splash.png $dirbash/xinitrc
	if [[ ! -e /usr/bin/camilladsp ]]; then
		rm -f /srv/http/assets/css/camilla.css \
			/srv/http/assets/js/{camilla,pipelineplotter}.js \
			/srv/http/settings/camilla.php \
			$dirsettings/camilla*
	fi
	chown -R http:http /srv
	chown mpd:audio $dirmpd $dirplaylists
 	[[ -e $dirmpd/mpd.db ]] && chown mpd:audio $dirmpd/mpd.db
	chmod -R u=rw,go=r,a+X /srv
	chmod -R +x $dirbash
}
enableFlagSet() {
	[[ $ON ]] && touch $dirsystem/$CMD || rm -f $dirsystem/$CMD
}
exists() {
	[[ -e $1 ]] && echo true || echo false
}
getContent() {
	if [[ -e "$1" ]]; then
		cat "$1"
	elif [[ $2 ]]; then
		echo $2
	fi
}
getVar() { # var=value
	[[ ! -e $2 ]] && echo false && return
	
	local line
	line=$( grep -E "^${1// /|^}" $2 )                             # var
	[[ ! $line ]] && line=$( grep -E "^\s*${1// /|^\s*}" $2 )      #     var
	[[ $line != *=* ]] && line=$( sed 's/ \+/=/' <<< $line )       # var value > var=value
	line=$( sed -E "s/.* *= *//; s/^[\"']|[\"'];*$//g" <<< $line ) # var=value || var = value || var="value"; > value
	stringEscape $line
}
getVarColon() { # var: value || var: "value";*
	[[ ! -e ${@: -1} ]] && echo false && return
	
	if [[ $3 ]]; then
		sed -n -E '/^\s*'$1':/,/^\s*'$2':/ {/'$2'/! d; s/^.*:\s"*|"*$//g; p}' "$3" # /var1/,/var2/ > var2: value > value
	else
		sed -n -E '/^\s*'$1':/ {s/^.*:\s"*|"*$//g; p}' "$2"                        # var: value value
	fi
}
inOutputConf() {
	local file
	file=$dirmpdconf/output.conf
	[[ -e $file ]] && grep -q -m1 "$1" $file && return 0
}
ipAddress() {
	local ip
	ip=$( ip r \
			| grep ^default \
			| sort \
			| head -1 \
			| awk '{print $(NF-2); exit}' )
	[[ $1 ]] && echo ${ip%.*}. || echo $ip
}
ipOnline() {
	ping -c 1 -w 1 $1 &> /dev/null && return 0
}
json2var() {
	local regex
	regex='/^\{$|^\}$/d; s/^,* *"//; s/,$//; s/" *: */=/'
	[[ -f $1 ]] && sed -E "$regex" "$1" || sed -E "$regex" <<< $1
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
	local data delay icon ip json message title
	[[ $1 == '-ip' ]] && ip=$2 && shift 2
	if [[ $4 ]]; then
		delay=$4
	else
		[[ ${1: -5} == 'blink' ]] && delay=-1 || delay=3000
	fi
	icon=$1
	title=$( stringEscape $2 )
	message=$( stringEscape $3 )
	data='{ "channel": "notify", "data": { "icon": "'$icon'", "title": "'$title'", "message": "'$message'", "delay": '$delay' } }'
	if [[ $ip ]]; then
		! ipOnline $ip && return
		
	else
		ip=127.0.0.1
	fi
	websocat ws://$ip:8080 <<< $( tr -d '\n' <<< $data )
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
playerActive() {
	[[ $( < $dirshm/player ) == $1 ]] && return 0
}
pushData() {
	local channel data ip json path sharedip updatedone webradiocopy
	channel=$1
	json=${@:2} # $2 ...
	json=$( sed 's/: *,/: false,/g; s/: *}$/: false }/' <<< $json ) # empty value > false
	data='{ "channel": "'$channel'", "data": '$json' }'
	websocat ws://127.0.0.1:8080 <<< $( tr -d '\n' <<< $data ) # remove newlines - preserve spaces
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
		ipOnline $ip && websocat ws://$ip:8080 <<< $( tr -d '\n' <<< $data )
	done
}
pushDataCount() {
	local type
	type=$1
	count=$( ls -1d /mnt/MPD/${type^^}/*/ 2> /dev/null | wc -l )
	echo $count > $dirshm/x
	sed -i -E 's/("'$type'": ).*/\1'$count',/' $dirmpd/counts
	pushData display '{ "type": "'$type'", "count": '$count' }'
}
pushDataCoverart() {
	pushData coverart '{ "url": "'$1'", "radioalbum" : "'$2'" }'
	sed -i -e '/^coverart=/ d' -e "$ a\coverart=$1" $dirshm/status
	$dirbash/cmd.sh coverfileslimit
}
pushRefresh() {
	local page push
	[[ $1 ]] && page=$1 || page=$( basename $0 .sh )
	[[ $2 ]] && push=$2 || push=push
	[[ $page == networks ]] && sleep 2
	$dirsettings/$page-data.sh $push
}
radioStatusFile() {
	local status
	status=$( grep -vE '^Album|^Artist|^coverart|^elapsed|^state|^Title' $dirshm/status )
	status+='
Artist="'$artist'"
Album="'$album'"
coverart="'$coverart'"
elapsed='$elapsed'
pllength='$pllength'
state="play"
Title="'$title'"'
	echo "$status" > $dirshm/status
	$dirbash/status-push.sh statusradio & # for snapcast ssh - for: mpdoled, lcdchar, vumeter, snapclient(need to run in background)
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
stateMPD() {
	mpc status %state% | sed -E 's/ped$|ing$|d$//g'
	
}
statePlay() {
	[[ $( mpc status %state% ) == playing ]] && return 0
}
stringEscape() {
	echo "${@//\"/\\\"}"
}
volumeGet() {
	[[ -e $dirshm/nosound && ! -e $dirshm/btreceiver ]] && echo -1 && return
	
	local args card db mixer val val_db volume
	if [[ $2 != hw && -e $dirshm/btreceiver ]]; then # bluetooth
		args='-MD bluealsa'
	elif [[ $2 != hw && ! -e $dirsystem/snapclientserver ]] \
				&& grep -q mixertype=software $dirshm/output \
				&& playerActive mpd; then           # software
		val=$( mpc status %volume% | tr -dc [0-9] )
		db=false
	elif [[ -e $dirshm/amixercontrol ]]; then       # hardware
		. <( grep -E '^card|^mixer' $dirshm/output )
		args="-c $card -M sget \"$mixer\""
	fi
	if [[ $args ]]; then # not mpd software
		for i in {1..3}; do # some usb might not be ready
			volume=$( amixer $args 2> /dev/null | grep -m1 % )
			[[ $volume ]] && break || sleep 1
		done
		[[ ! $volume ]] && volume=$( getContent $dirshm/volume )
		[[ ! $volume ]] && return
	fi
	
	if [[ $volume ]]; then
		val_db=$( sed -E 's/.*\[(.*)%.*\[(.*)dB.*/\1 \2/' <<< $volume )
		val=${val_db/ *}
		db=${val_db/* }
		echo $val > $dirshm/volume
	fi
	case $1 in
		push )  pushData volume '{ "type": "'$1'", "val": '$val', "db": '$db' }';;
		valdb ) echo '{ "val": '$val', "db": '$db' }';;
		db )    echo $db;;
		* )     echo $val;;
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
volumeUpDnMpc() {
	killProcess vol
	mpc -q volume $1
	volumePushSet
}
volumePush() {
	sleep 0.5
	volumeGet push
	rm $dirshm/pidvol
}
volumePushSet() {
	rm -rf $dirsystem/volumemute
	volumePush &> /dev/null &
	echo $! > $dirshm/pidvol
}
