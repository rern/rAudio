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
alphaNumeric() {
	tr -dc [:alnum:] <<< $@
}
appendSortUnique() {
	local data file lines
	data=$1
	file=$2
	[[ ! -e $file ]] && echo "$data" > $file && return
	
	lines="\
$( < $file )
$data"
	lines=$( awk NF <<< $lines )
	[[ $lines ]] && sort -u <<< $lines > $file || rm -f $file
}
args2var() { # $2 $3 ... if any, still valid
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
				v=$( quoteEscape $v )
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
cmdshWebsocket() {
	websocat ws://$1:8080 <<< '{ "filesh": [ "'$dirbash'/cmd.sh", "'$2'" ] }'
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
			confNotString "$v" || v='"'$( quoteEscape $v )'"' # quote and escape string
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
	coverfile=$( ls -X "$path"/cover.{gif,jpg,png} 2> /dev/null | head -1 )
	[[ ! $coverfile ]] && coverfile=$( ls -X "$path"/*.{gif,jpg,png} 2> /dev/null | grep -E -i -m1 '/album\....$|cover\....$|/folder\....$|/front\....$' )
	[[ $coverfile ]] && php -r "echo rawurlencode( '${coverfile//\'/\\\'}' );" | sed 's|%2F|/|g' # preserve spaces and special characters
}
data2json() {
	local json page
	page=$( basename ${0/-*} )
	[[ $page == status.sh ]] && page='"page" : false' || page='"page" : "'$page'"'
	json="\
{
  $page$1
}"
	json=$( data2jsonPatch "$json" ) # "k": > "k": false # "k":} > "k": false} # [, > [false, # ,, > ,false, # ,] > ,false]
	if [[ $2 ]]; then
		pushData refresh "$json"
	else
		echo "$json"
	fi
}
data2jsonPatch() { # "k": > "k": false # "k":} > "k": false} # [, > [false, # ,, > ,false, # ,] > ,false]
	sed 's/:\s*$/: false/
		s/:\s*}$/: false }/
		s/^,\s*$/, false/
		s/\[\s*,/[ false,/g
		s/,\s*,/, false,/g
		s/,\s*]/, false ]/g' <<< $1
}
dirPermissions() {
	[[ -e /boot/kernel.img ]] && rm -f $dirbash/{dab*,status-dab.sh}
	if [[ ! -e /usr/bin/camilladsp ]]; then
		rm -f /srv/http/assets/css/camilla.css \
			  /srv/http/assets/js/{camilla,pipelineplotter}.js \
			  /srv/http/assets/js/plugin/{d3,plotly}*.min.js \
			  /srv/http/settings/camilla.php \
			  $dirsettings/camilla*
	fi
	[[ ! -e /usr/bin/firefox ]] && rm -f /srv/http/assets/img/splash.png $dirbash/xinitrc
	chown -R http:http /srv &> /dev/null
	chown -R mpd:mpd $dirmpd $dirplaylists &> /dev/null
	chmod -R u=rw,go=r,a+X /srv
	chmod -R +x $dirbash
}
enableFlagSet() {
	file=$dirsystem/$CMD
	[[ $ON ]] && touch $file || rm -f $file
}
exists() {
	[[ -e $1 ]] && echo true || echo false
}
fifoToggle() { # mpdoled vuled vumeter
	filefifo=$dirmpdconf/fifo.conf
	[[ -e $dirsystem/mpdoled ]] && mpdoled=1
	[[ -e $dirsystem/vuled ]] && vuled=1
	if grep -q -m1 vumeter.*true $dirsystem/display.json; then
		vumeter=1
		touch $dirsystem/vumeter
	else
		rm -f $dirsystem/vumeter
	fi
	if [[ $mpdoled || $vuled || $vumeter ]]; then
		if [[ ! -e $filefifo ]]; then
			ln -s $dirmpdconf/{conf/,}fifo.conf
			systemctl restart mpd
			[[ $vuled || $vumeter ]] && systemctl restart cava
		fi
		! grep -q 'state="*play' $dirshm/status && return
		
		[[ $mpdoled ]] && systemctl restart mpd_oled
		[[ $vuled || $vumeter ]] && systemctl restart cava
	else
		if [[ -e $filefifo ]]; then
			[[ $mpdoled || $vuled || $vumeter ]] && return
			
			rm $filefifo
			systemctl restart mpd
		fi
		[[ ! $mpdoled ]] && systemctl stop mpd_oled
		[[ ! $vuled && ! $vumeter ]] && systemctl stop cava
	fi
}
getContent() {
	if [[ -e $1 ]]; then
		cat "$1"
	elif [[ $2 ]]; then
		echo $2
	fi
}
getVar() { # var=value
	[[ ! -e $2 ]] && echo false && return
	
	case ${2: -4} in
		json ) sed -n -E '/'$1'/ {s/.*: "*|"*,*$//g; p}' "$2";;                   # /var: value/ > value
		.yml ) 
			if [[ $1 != *.* ]]; then
				sed -n '/^\s*'$1':/ {s/^.*: \+//; p}' "$2"                        # /var: value/ > value
			else
				local a b
				a=${1/.*}
				b=${1/*.}
				sed -n '/^\s*'$a':/,/^\s*'$b':/ {/'$b'/! d; s/^.*: \+//; p}' "$2" # /var1:/,/var2: value/ > value
			fi
			;;
		* )
			local data line var
			data=$( < "$2" )
			line=$( grep ^$1= <<< $data )                                    # var=
			[[ ! $line ]] && line=$( grep -E "^${1// /|^}" <<< $data )       # var
			[[ ! $line ]] && line=$( grep -E "^\s*${1// /|^\s*}" <<< $data ) #     var
			[[ $line != *=* ]] && line=$( sed 's/ \+/=/' <<< $line )         # var value > var=value
			var=$( sed -E "s/.* *= *//; s/^[\"']|[\"'];*$//g" <<< $line )    # var=value || var = value || var="value"; > value
			[[ $var ]] && quoteEscape $var || echo $3
			;;
	esac
}
inOutputConf() {
	local file
	file=$dirmpdconf/output.conf
	[[ -e $file ]] && grep -q -m1 "$1" $file && return 0
}
ipAddress() {
	ifconfig | awk '/inet/ {print $2}' | grep -v 127.0.0.1 | head -1
}
ipOnline() {
	timeout 3 ping -c 1 -w 1 $1 &> /dev/null && return 0
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
lanDevice() {
	ip -br link | awk '/^e/ {print $1; exit}'
}
lineCount() {
	[[ -e $1 ]] && awk NF "$1" | wc -l || echo 0
}
line2array() {
	[[ $1 ]] && tr '\n' , <<< $1 | sed 's/^/[ "/; s/,$/" ]/; s/,/", "/g' || echo false
}
logoLcdOled() {
	[[ -e $dirsystem/lcdchar ]] && $dirbash/lcdchar.py logo
	if [[ -e $dirsystem/mpdoled ]]; then
		chip=$( cut -d' ' -f2 /etc/default/mpd_oled )
		mpd_oled -o $chip -x logo
	fi
}
mountpointSet() {
	umount -ql "$1"
	mkdir -p "$1"
	chown mpd:audio "$1"
	cp -f /etc/fstab /tmp
	fstab="\
$( < /etc/fstab )
$2"
	column -t <<< $fstab > /etc/fstab
	systemctl daemon-reload
	std=$( mount "$1" 2>&1 )
	if [[ $? != 0 ]]; then
		mv -f /tmp/fstab /etc
		rmdir "$1"
		systemctl daemon-reload
		sed -n '1 {s/.*: //; p}' <<< $std
	else
		for i in {1..10}; do
			sleep 1
			mountpoint -q "$1" && break
		done
	fi
}
mpcElapsed() {
	if [[ $1 ]] && grep -q radioelapsed.*false $dirsystem/display.json; then # webradio + radioelapsed
		echo false
	else
		mpc status %currenttime% | awk -F: '{print ($1 * 60) + $2}'
	fi
}
mpcPlayback() {
	$dirbash/cmd.sh "mpcplayback
$1
CMD ACTION"
}
mpcState() {
	mpc status %state% | sed -E 's/ing|ped|d$//'
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
	title=$( quoteEscape $2 )
	message=$( quoteEscape $3 )
	[[ ! $ip ]] && ip=127.0.0.1
	pushWebsocket $ip notify '{ "icon": "'$icon'", "title": "'$title'", "message": "'$message'", "delay": '$delay' }'
}
playerActive() {
	[[ $( < $dirshm/player ) == $1 ]] && return 0
}
pushData() {
	local channel data ip json path sharedip updatedone webradiocopy
	channel=$1
	data=$( sed 's/: *,/: false,/g; s/: *}$/: false }/' <<< ${@:2} ) # $2 - end: empty value > false
	pushWebsocket 127.0.0.1 $channel $data
	[[ ! -e $filesharedip || $( lineCount $filesharedip ) == 1 ]] && return  # no other cilents
	# shared data
	[[ 'bookmark coverart display order mpdupdate playlists radiolist' != *$channel* ]] && return
	
	if [[ $channel == coverart ]]; then
		path=$( sed -E -n '/"url"/ {s/.*"url" *: *"(.*)",*.*/\1/; s|%2F|/|g; p}' | cut -d/ -f3 )
		[[ 'MPD bookmark webradio' != *$path* ]] && return
	fi
	
	if [[ $channel == mpdupdate ]]; then
		if [[ $data == *done* ]]; then
			sharedip=$( grep -v $( ipAddress ) $filesharedip )
			for ip in $sharedip; do
				cmdshWebsocket $ip shareddatampdupdate
			done
			return
		fi
	fi
	
	sharedip=$( grep -v $( ipAddress ) $filesharedip )
	for ip in $sharedip; do
		pushWebsocket $ip $channel $data
	done
}
pushDataCoverart() {
	pushData coverart '{ "url": "'$1'", "radioalbum" : "'$2'" }'
	sed -i -e '/^coverart=/ d' -e "$ a\coverart=$1" $dirshm/status
	$dirbash/cmd.sh coverfileslimit
}
pushDirCounts() {
	dir=$1
	dirs=$( ls -d /mnt/MPD/${dir^^}/*/ 2> /dev/null )
	[[ $dir == nas ]] && dirs=$( grep -v /mnt/MPD/NAS/data/ <<< $dirs )
	pushData mpdupdate '{ "counts": { "'$dir'": '$( awk NF <<< $dirs | wc -l )' } }'
}
pushRefresh() {
	local page push
	[[ $1 ]] && page=$1 || page=$( basename $0 .sh )
	[[ $2 ]] && push=$2 || push=push
	[[ $page == networks ]] && sleep 2
	$dirsettings/$page-data.sh $push
}
pushWebsocket() {
	if [[ $1 == 127.0.0.1 ]] || ipOnline $1; then
		data='{ "channel": "'$2'", "data": '${@:3}' }'
		websocat -B 10485760 ws://$1:8080 <<< $( tr -d '\n' <<< $data ) # remove newlines - preserve spaces
	fi
}
quoteEscape() {
	echo "${@//\"/\\\"}"
}
radioStatusFile() {
	local status
	status=$( grep -vE '^Album|^Artist|^coverart|^elapsed|^pllength|^state|^Title' $dirshm/status )
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
settingsActive() {
	local data pkg
	for pkg in $@; do
		data+='
, "'${pkg/-}'" : '$( systemctl -q is-active $pkg && echo true || echo false )
	done
	echo "$data"
}
settingsConf() {
	local data file
	for file in $@; do
		data+='
, "'$file'conf" : '$( conf2json $file.conf )
	done
	echo "$data"
}
settingsEnabled() {
	local data dir file
	for file in $@; do
		[[ ${file:0:1} == / ]] && dir=$file && continue
		
		data+='
, "'${file/.*}'" : '$( [[ -e $dir/$file ]] && echo true || echo false )
	done
	echo "$data"
}
sharedDataCopy() {
	rm -f $dirmpd/{listing,updating}
	cp -rf $dirdata/{audiocd,bookmarks,lyrics,mpd,playlists,webradio} $dirshareddata
	cp -f $dirsystem/{display,order}.json $dirshareddata &> /dev/null
	touch $dirshareddata/order.json # if not exist
	[[ $1 != rserver ]] && grep $dirnas /etc/fstab | grep -v "$dirnas/data " > $dirshareddata/source
}
sharedDataLink() {
	local ip_share s
	mv -f $dirdata/{audiocd,bookmarks,lyrics,mpd,playlists,webradio} $dirbackup
	mv -f $dirsystem/{display,order}.json $dirbackup
	ln -s $dirshareddata/{audiocd,bookmarks,lyrics,mpd,playlists,webradio} $dirdata
	ln -s $dirshareddata/{display,order}.json $dirsystem
	chown -h http:http $dirdata/{audiocd,bookmarks,lyrics,webradio} $dirsystem/{display,order}.json
	chown -h mpd:audio $dirdata/{mpd,playlists} $dirmpd/mpd.db
	appendSortUnique data $dirnas/.mpdignore
	[[ $1 == rserver && -e $dirshareddata/source ]] && return
	
	readarray -t source <<< $( < $dirshareddata/source )
	for s in "${source[@]}"; do
		ip_share=${s/ *}
		grep -q "${ip_share//\\/\\\\}" /etc/fstab && continue
		
		mountpointSet "$( awk '{print $2}' <<< $s | sed 's/\\040/ /g' )" "$s"
	done
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
snapclientIP() {
	[[ ! -e $dirmpdconf/snapserver.conf ]] && return
	
	local clientip connected line 
	lines=$( jq .Groups < /var/lib/snapserver/server.json \
				| grep -E '"connected":|"ip":' \
				| tr -d ' ",' )
	while read l; do
		if [[ ${l/:*} == connected ]]; then
			[[ ${l/*:} == true ]] && connected=1 || connected=
		else
			[[ ! $connected ]] && continue
			
			[[ $1 ]] && cmdshWebsocket $ip playerstop || clientip+=" ${l/*:}"
		fi
	done <<< $lines
	[[ $clientip ]] && echo $clientip
}
snapserverList() {
	local name_ip
	name_ip=$( avahi-browse -d local -kprt _snapcast._tcp | awk -F';' '/1704;$/&&!/^=;l/ {print $7" "$8}' )
	if [[ $name_ip ]] ; then
		name_ip=$( sed 's/ / @ /g; s/^/, "/; s/$/"/' <<< $name_ip )
		echo '[ '${name_ip:1}' ]'
	else
		echo '[]'
	fi
}
tty2std() { # if output is not stdout - /dev/tty: aplay dab-scanner-rtlsdr rtl_test
	script /dev/null -qc "$1"
}
volume() {
	local diff filevolumemute fn_volume type val values
	filevolumemute=$dirsystem/volumemute
	[[ ! $CURRENT ]] && CURRENT=$( volumeGet )
	if [[ $TYPE != dragpress ]]; then
		if [[ $TYPE == mute ]]; then
			val=$CURRENT
			type=mute
		else
			val=$TARGET
			[[ -e $filevolumemute ]] && type=unmute
		fi
		pushData volume '{ "type": "'$type'", "val": '$val' }'
	fi
	if [[ $TYPE == mute ]]; then
		echo $CURRENT > $filevolumemute
	else
		rm -f $filevolumemute
	fi
	fn_volume=$( < $dirshm/volumefunction )
	diff=$(( TARGET - CURRENT ))
	diff=${diff#-}
	if (( $diff < 5 )); then
		$fn_volume $TARGET% "$CONTROL" $CARD
		if [[ $TARGET == 1 && $( volumeGet ) == 0 ]]; then # fix - some mixers cannot set at 1%
			[[ $CURRENT == 0 ]] && val=2 || val=0
			$fn_volume $val% "$CONTROL" $CARD
			pushData volume '{ "val": '$val' }'
		fi
	else
		(( $CURRENT < $TARGET )) && incr=5 || incr=-5
		values=( $( seq $(( CURRENT + incr )) $incr $TARGET ) )
		(( $diff % 5 )) && values+=( $TARGET )
		for val in "${values[@]}"; do
			$fn_volume $val% "$CONTROL" $CARD
			sleep 0.2
		done
	fi
}
volumeAmixer() { # value control card
	amixer -c $3 -Mq sset "$2" $1
	[[ -e $dirshm/usbdac ]] && alsactl store & # fix: not saved on off / disconnect
}
volumeBlueAlsa() { # value control
	amixer -MqD bluealsa sset "$2" $1
}
volumeGet() {
	[[ -e $dirshm/nosound && ! -e $dirshm/btreceiver ]] && echo -1 && return
	
	local args card db mixer val val_db volume
	if [[ $2 != hw && -e $dirshm/btreceiver ]]; then # bluetooth
		val_db=$( amixer -MD bluealsa 2> /dev/null \
					| grep -m1 % \
					| awk -F'[][]' '{print $2" "$4}' )
	elif [[ $2 != hw && ! -e $dirsystem/snapclientserver ]] \
				&& grep -q mixertype=software $dirshm/output \
				&& playerActive mpd; then            # software
		val_db="$( mpc status %volume% | tr -dc [:digit:] ) false"
	elif [[ -e $dirshm/amixercontrol ]]; then        # hardware
		. <( grep -E '^card|^mixer' $dirshm/output )
		for i in {1..5}; do # some usb might not be ready
			val_db=$( amixer -c $card -M sget "$mixer" 2> /dev/null \
						| grep -m1 % \
						| awk -F'[][]' '{print $2" "$4}' )
			[[ $val_db ]] && break || sleep 1
		done
	fi
	val_db=$( tr -dc '[:digit:]-. ' <<< $val_db )
	val=${val_db/ *}
	db=${val_db/* }
	case $1 in
		push )
			pushData volume '{ "type": "'$1'", "val": '$val', "db": '$db' }'
			[[ -e $dirshm/usbdac ]] && alsactl store # fix: not saved on off / disconnect
			;;
		valdb ) echo $val $db;;
		db )    echo $db;;
		* )     echo $val;;
	esac
	[[ $val > 0 ]] && rm -rf $dirsystem/volumemute
}
volumeMaxGet() {
	local volumemax
	if [[ -e  $dirsystem/volumelimit ]]; then
		volumemax=$( getVar max $dirsystem/volumelimit.conf )
		[[ $volumemax == 100 ]] && volumemax=false
	else
		volumemax=false
	fi
	echo $volumemax
}
volumeMpd() {
	mpc -q volume ${1/\%}
}
volumeLimit() {
	fn_volume=$( < $dirshm/volumefunction )
	val=$( getVar $1 $dirsystem/volumelimit.conf )
	if [[ -e $dirshm/btreceiver ]]; then
		mixer=$( < $dirshm/btmixer )
	elif [[ -e $dirshm/amixercontrol ]]; then
		. $dirshm/output 
	fi
	$fn_volume $val% "$mixer" $card
}
