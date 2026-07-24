#!/bin/bash

dirbash=/srv/http/bash
dirsettings=$dirbash/settings
dirdata=/srv/http/data
dirbackup=$dirdata/backup
for d in NAS SD USB; do
	printf -v dir${d,,} '%s' /mnt/MPD/$d
done
dirshareddata=$dirnas/data
filesharedip=$dirshareddata/sharedip
dirs=$( ls $dirdata )
for dir in $dirs; do
	printf -v dir$dir '%s' $dirdata/$dir
done
https_addonslist=https://github.com/rern/rAudio-addons/raw/main/addonslist.json
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
	tr -dc [:alnum:] <<< ${@,,}
}
appendSortUnique() {
	local data file lines
	file=$1
	shift
	data=$@
	[[ ! -e $file ]] && echo "$data" > $file && return
#...............................................................................
	lines="\
$( < $file )
$data"
	sort -u <<< $lines > $file
}
args2var() { # $2 $3 ... if any, still valid
	local argslast CFG CMD_CFG_OFF conf i k keys kL v
	readarray -t args <<< $1
	CMD=${args[0]}
	argslast=${args[@]: -1}
	CMD_CFG_OFF=${argslast:0:3}
	[[ $CMD_CFG_OFF == OFF ]] && TF=false && return
#...............................................................................
	ON=true
	TF=true
	[[ ! $CMD_CFG_OFF =~ ^(CMD|CFG)$ ]] && return
#...............................................................................
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
cacheBust() {
	if [[ $TYPE ]]; then
		grep -q "?v='.time()" /srv/http/common.php && echo time || echo static
		return
#...............................................................................
	fi
	local hash
	hash=$( date +%s )"'"
	sed -i "1,/rern.woff2/ s/woff2.*/woff2?v=$hash );/" /srv/http/assets/css/common.css
	[[ $TIME ]] && hash="'.time()"
	sed -i "1,/hash.*=/ s/v=.*/v=$hash;/" /srv/http/common.php
	rm -f $dirshm/system
}
calc() { # $1 - decimal precision, $2 - math
	awk 'BEGIN { printf "%.'$1'f", '"$2"' }'
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
	file=$1
	[[ ${file:0:1} != / ]] && file=$dirsystem/$file
	[[ ! -e $file ]] && echo false && return
#...............................................................................
	# omit lines  blank, comment / group [xxx]
	lines=$( awk 'NF && !/^\s*[#[}]|{$/' "$file" ) # exclude: (blank lines) ^# ^[ ^} ^' #' {$
	[[ ! $lines ]] && echo false && return
#...............................................................................
	if [[ $2 ]]; then # $2 - specific keys
		shift
		keys=$@
		only="^\s*${keys// /|^\\s*}"
		lines=$( grep -E "$only" <<< $lines )
	fi
	[[ ! $lines ]] && echo false && return
#...............................................................................
	[[ $( head -1 <<< $lines ) != *=* ]] && lines=$( sed 's/^\s*//; s/ \+"/="/' <<< $lines ) # key "value" > key="value"
	while read line; do
		k=${line/=*}
		v=${line/*=}
		if [[ $v ]]; then
			v=$( sed -E -e "s/^[\"']|[\"']$//g" \
						-e 's/^(True|yes)$/true/
							s/^(False|no|"")$/false/' <<< $v )
			if [[ ${v:0:1} != '[' && ! $v =~ ^true$|^false$ && ! $v =~ ^-*[0-9]*\.*[0-9]+$ ]]; then
				v='"'$( quoteEscape $v )'"' # quote and escape string
			fi
		else
			v=false
		fi
		json+=', "'${k^^}'": '$v
	done <<< $lines
	echo { ${json:1} }
}
countMnt() {
	local counts d dir dirL list lsdir mpdignore path
	for dir in NAS NVME SATA SD USB; do
		list=false
		path=/mnt/MPD/$dir
		lsdir=$( ls $path 2> /dev/null )
		if [[ $lsdir ]]; then
			mpdignore=$path/.mpdignore
			if [[ -e $mpdignore ]]; then
				dirL=$( wc -l <<< $lsdir )
				while read d; do
					grep -q "^$d$" <<< $lsdir && (( dirL-- ))
				done < $mpdignore
				(( $dirL > 0 )) && list=true
			else
				list=true
			fi
		fi
		counts+='
, "'${dir,,}'" : '$list
	done
	echo "$counts"
}
countRadio() {
	local counts type
	for type in dabradio webradio; do
		[[ -e $dirdata/$type ]] && counts+='
, "'$type'" : '$( find -L $dirdata/$type ! -path '*/img/*' -type f ! -regex '.*\.\(jpg\|gif\|png\)$' | wc -l )
	done
	echo "$counts"
}
coverFileGet() {
	local coverfile dir file files name
	dir=$1
	shopt -s nullglob
	for name in cover folder front album; do
		files=( "$dir"/[${name:0:1}]"${name:1}".{jpg,png,gif,jpeg} )
		(( ${#files[@]} )) && coverfile=${files[0]} && break
	done
	shopt -u nullglob
	[[ $coverfile ]] && echo $coverfile && return
	
	files=$( mpc ls "${dir:9}" 2> /dev/null )
	while read file; do
		file="/mnt/MPD/$file"
		if [[ -f "$file" ]]; then
			coverfile=$( $dirbash/status -C "$file" )
			[[ $coverfile ]] && echo $coverfile && return
		fi
	done <<< $files
}
dabDevice() {
	script /dev/null -qc 'timeout 0.1 rtl_test -t' # force capture all std
}
data2json() {
	local json page
	page=$( basename ${0/-*} )
	[[ $page == status ]] && page='"page" : false' || page='"page" : "'$page'"'
	json="\
{
  $page$1
}"
	json=$( data2jsonPatch "$json" )
	if [[ $2 ]]; then
		pushData refresh "$json"
	else
		echo "$json"
	fi
}
data2jsonPatch() {
	sed '
		s/:\s*$/: false/;    # "k": \n    > "k": false
		s/:\s*}$/: false }/; # "k": }\n   > "k": false }
		s/{\s*,/{ /;         # { , ...    > { ...
		s/^,\s*$/, false/;   # , \n       > , false
		s/\[\s*,/[ false,/g; # [ ,        > [ false,
		s/,\s*,/, false,/g;  # ..., , ... > , false,
		s/,\s*]/, false ]/g  # ..., ]     > , false ]
	' <<< $1
}
enableFlagSet() {
	local file
	file=$dirsystem/$CMD
	[[ $ON ]] && touch $file || rm -f $file
}
exists() {
	[[ -e $1 ]] && echo true || echo false
}
mpdoled_vuled_vumeter() {
	[[ -e $dirsystem/mpdoled ]] && mpdoled=1 || mpdoled=
	[[ -e $dirsystem/vuled ]] && vuled=1 || vuled=
	grep -q -m1 vumeter.*true $dirsystem/display.json && vumeter=1 || vumeter=
}
fifoToggle() { # mpdoled vuled vumeter
	local filefifo vumeter
	filefifo=$dirmpdconf/fifo.conf
	mpdoled_vuled_vumeter
	[[ $vumeter ]] && touch $dirsystem/vumeter || rm -f $dirsystem/vumeter
	if [[ $mpdoled || $vuled || $vumeter ]]; then
		if [[ ! -e $filefifo ]]; then
			ln -s $dirmpdconf/{conf/,}fifo.conf
			systemctl restart mpd
		fi
		if grep -q '^state=.*play' $dirshm/status; then
			[[ $mpdoled ]] && systemctl restart mpd_oled
			[[ $vuled || $vumeter ]] && systemctl start cava
		fi
	else
		if [[ -e $filefifo ]]; then
			[[ $mpdoled || $vuled || $vumeter ]] && return
#...............................................................................
			rm $filefifo
			systemctl restart mpd
		fi
		[[ ! $mpdoled ]] && systemctl stop mpd_oled
		[[ ! $vuled && ! $vumeter ]] && systemctl stop cava
	fi
}
fstabColumnReload() {
	column -t <<< $1 > /etc/fstab
	systemctl daemon-reload
	mount -a &> /dev/null && return 0
}
fstabSet() {
	local fstab std
	umount -ql "$1"
	mkdir -p "$1"
	chown mpd:audio "$1"
	cp -f /etc/fstab /tmp
	fstab="\
$( < /etc/fstab )
$2"
	fstabColumnReload "$fstab"
	if [[ $? == 0 ]]; then
		for i in {1..10}; do
			sleep 1
			mountpoint -q "$1" && break
		done
	else
		mv -f /tmp/fstab /etc
		rmdir "$1"
		systemctl daemon-reload
		sed 's/$/<br>/' <<< $std
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
#...............................................................................
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
grepr() {
	grep --color --exclude-dir plugin -Inr "$@" /srv
}
i2cAddress() {
	local n=$( compgen -G /dev/i2c* | cut -d- -f2 )
	[[ ! $n ]] && return
	
	i2cdetect -y $n \
		| awk 'NR>1 {for(i=2;i<=NF;i++) print $i}' \
		| grep -E '^[0-9a-fA-F]{2}$' \
		| xargs # timeout - if unresponsive
}
inOutputConf() {
	local file
	file=$dirmpdconf/output.conf
	[[ -e $file ]] && grep -q -m1 "$1" $file && return 0
}
ipAddress() {
	$dirbash/status -I $1
}
ipOnline() {
	timeout 3 ping -c 1 -w 1 $1 &> /dev/null && return 0
}
ipSharedData() {
	local self
	self=$( ipAddress )
	grep -v $self $filesharedip
}
json2var() { # single level only
	local regex
	regex='/^\{$|^\}$/d; s/^,* *"//; s/,$//; s/" *: */=/; s/=false$/=/'
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
line2array() {
	[[ $1 ]] && tr '\n' , <<< $1 | sed 's/^/[ "/; s/,$/" ]/; s/,/", "/g' || echo false
}
localBrowserOff() {
	systemctl disable --now bootsplash localbrowser
	systemctl enable --now getty@tty1
	sed -i -E 's/tty3.*/tty1/' /boot/cmdline.txt
	[[ -e $dirshm/btreceiver ]] && systemctl start bluetoothbutton
}
logoLcdOled() {
	[[ -e $dirsystem/lcdchar ]] && $dirbash/lcdchar.py logo
	if [[ -e $dirsystem/mpdoled ]]; then
		. <( cat /etc/default/mpd_oled )
		timeout 1 mpd_oled $OPTS -x # timeout - if unresponsive
	fi
}
mpcElapsed() {
	if [[ $1 ]] && grep -q -m1 radioelapsed.*false $dirsystem/display.json; then # webradio + radioelapsed
		echo false
	else
		mpc status %currenttime% | awk -F: '{print ($1 * 60) + $2}'
	fi
}
mpcPlayback() {
	if [[ $1 ]]; then
		ACTION=$1
	else
		! playerActive mpd && playerstop && exit
# --------------------------------------------------------------------
		[[ $( mpcState ) == play ]] && ACTION=pause || ACTION=play
	fi
	$dirbash/cmd.sh "mpcplayback
$ACTION
CMD ACTION"
}
mpcState() {
	mpc status %state% | sed -E 's/ing|ped|d$//'
}
mpdOledChip() {
	if grep -q '\-o ' /etc/default/mpd_oled; then
		sed -E 's/.*-o (.).*/\1/' /etc/default/mpd_oled
	else
		echo 6
	fi
}
netDevice() {
	ls /sys/class/net | grep ^$1 | tail -n 1
}
nfsServerActive() {
	systemctl -q is-active nfs-server && return 0
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
pushBookmark() {
	data=$( php /srv/http/library.php home )
	pushData bookmark "$data"
}
pushData() { # send to websocket.py (server)
	local channel data dir ip ip_client json
	channel=$1
	data=$( sed 's/: *,/: false,/g; s/: *}$/: false }/' <<< ${@:2} ) # $2 - end: empty value > false
	pushWebsocket 127.0.0.1 $channel $data
	[[ ! -e $filesharedip || ' bookmark coverart display order mpdupdate playlists radiolist ' != *" $channel "* ]] && return
#...............................................................................
	ip_client=$( ipSharedData ) # other shared data hosts
	[[ ! $ip_client ]] && return
#...............................................................................
	if [[ $channel == coverart ]]; then
		dir=$( jq .coverart <<< $data | sed 's|%2F|/|g' | cut -d/ -f3 )
		[[ ' MPD bookmark webradio ' != *" $dir "* ]] && return
#...............................................................................
	elif [[ $channel == mpdupdate && $data != '{ "updating": true }' ]]; then # update done
		data='{ "filesh": [ "cmd.sh", "shareddataupdate" ] }'
	else
		data=$( tr -d '\n' <<< $data )
		data=$( pushDataSet $channel "$data" )
	fi
	for ip in $ip_client; do
		ipOnline $ip && websocat --text ws://$ip:8080 <<< $data
	done
}
pushDataSet() {
	cat << EOF
{ "channel": "$1", "data": $2 }
EOF
}
pushDirCounts() {
	local tf
	[[ $( compgen -G /mnt/MPD/${1^^}/*/ | grep -v $dirshareddata/ ) ]] && tf=true || tf=false
	pushData counts '{ "'$1'": '$tf' }'
}
pushNfsServer() {
	local ip name status
	name=$( hostname )
	[[ -e $dirshm/startup ]] && status=Offline || status=Online
	while read ip; do
		pushWebsocket $ip nfsserver '{ "status": "'$status'", "name": "'$name'" }'
	done < <( ipSharedData )
}
pushRefresh() {
	local page push
	page=${1:-$( basename $0 .sh )}
	push=${2:-push}
	[[ $page == networks ]] && sleep 2
	$dirsettings/$page-data.sh $push
}
pushStatus() {
	$dirbash/status-push.sh
}
pushWebsocket() {
	local data
	data=$( tr -d '\n' <<< ${@:3} ) # remove newlines (<<< preserve spaces)
	data=$( pushDataSet $2 "$data" )
	if [[ $1 == 127.0.0.1 ]] || ipOnline $1; then
		websocat --text ws://$1:8080 <<< $data
	fi
}
quoteEscape() {
	echo "${@//\"/\\\"}"
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
sharedData() {
	[[ ! -e $filesharedip ]] && echo false && return
#...............................................................................
	nfsServerActive && echo false || echo true
}
sharedDataCopy() {
	rm -f $dirmpd/{listing,updating}
	cp -rf $dirdata/{audiocd,bookmarks,lyrics,mpd,playlists,webradio} $dirshareddata
	file_order=$dirsystem/order.json
	[[ ! -e $file_order ]] && file_order=
	cp -f $dirsystem/display.json $file_order $dirshareddata
	touch $dirshareddata/order.json # if not exist
}
sharedDataLink() {
	local ip_share s
	mkdir -p $dirbackup
	mv -f $dirdata/{audiocd,bookmarks,lyrics,mpd,playlists,webradio} $dirbackup
	file_order=$dirsystem/order.json
	[[ ! -e $file_order ]] && file_order=
	mv -f $dirsystem/display.json $file_order $dirbackup
	ln -s $dirshareddata/{audiocd,bookmarks,lyrics,mpd,playlists,webradio} $dirdata
	ln -s $dirshareddata/{display,order}.json $dirsystem
	chown -h http:http $dirdata/{audiocd,bookmarks,lyrics,webradio} $dirsystem/{display,order}.json
	chown -h mpd:audio $dirdata/{mpd,playlists} $dirmpd/mpd.db
	echo data > $dirnas/.mpdignore
}
sharedDataReset() {
	rm -rf $dirdata/{audiocd,bookmarks,lyrics,mpd,playlists,webradio}
	rm -f $dirsystem/{display,order}.json $dirnas/.mpdignore
	file_order=$dirbackup/order.json
	[[ ! -s $file_order ]] && file_order=
	mv -f $dirbackup/display.json $file_order $dirsystem
	mv -f $dirbackup/* $dirdata
	rm -rf $dirbackup
}
snapserverList() {
	local name_ip
	name_ip=$( avahi-browse -d local -kprt _snapcast._tcp | awk -F';' '/IPv4.*1704;$/&&!/^=;l/ {print $7, $8}' )
	if [[ $name_ip ]] ; then
		name_ip=$( sed 's/ / @ /g; s/^/, "/; s/$/"/' <<< $name_ip )
		echo '[ '${name_ip:1}' ]'
	else
		echo '[]'
	fi
}
splashRotate() {
	local dirimg rotate
	dirimg=/srv/http/assets/img
	. <( grep ^rotate $dirsystem/localbrowser.conf )
	[[ $rotate == 0 ]] && return
#...............................................................................
	magick \
		-density 48 \
		-background none $dirimg/icon.svg \
		-rotate $rotate \
		-gravity center \
		-background '#000' \
		-extent 1920x1080 \
		$dirimg/splash.png
}
statusColor() {
	sed -E  -e 's|●|<grn>&</grn>|
					' -e '/^\s*Loaded:/ {s|(disabled)|<yl>\1</yl>|g
										 s|(enabled)|<grn>\1</grn>|g}
					' -e '/^\s*Active:/ {s|( active \(.*\))|<grn>\1</grn>|
										 s|inactive|<ora>&</ora>|
										 s|(failed)|<red>\1</red>|ig}
					' -e '/^\s*Status:/  s|"online"|<grn>&</grn>|'
}
statusUpdating() {
	mpc | grep -q ^Updating && echo true && return
#...............................................................................
	[[ ! -e $dirshm/updatedone && ( -e $dirmpd/listing || -e $dirsystem/mpcupdate.conf ) ]] && echo true || echo false
}
timezoneAuto() {
	local tz
	tz=$( curl -s -m 2 https://worldtimeapi.org/api/ip | jq -r .timezone )
	[[ ! $tz ]] && tz=$( curl -s -m 2 http://ip-api.com | grep '"timezone"' | cut -d'"' -f4 )
	[[ ! $tz ]] && tz=$( curl -s -m 2 https://ipapi.co/timezone )
	[[ ! $tz ]] && tz=UTC
	timedatectl set-timezone $tz
}
usbMaxCurrent() {
	local BB revision
	revision=$( grep ^Revision /proc/cpuinfo )
	BB=${revision: -3:2}
	if [[ $BB != 17 ]]; then
		sed -i '/usb_max_current/ d' /boot/config.txt
	elif [[ $BB != 03 || $BB = 04 ]]; then
		sed -i '/max_usb_current/ d' /boot/config.txt
	fi
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
	fn_volume=$( volumeFunction )
	diff=$(( TARGET - CURRENT ))
	diff=${diff#-}
	if (( $diff < 5 )); then
		$fn_volume $TARGET% "$CONTROL"
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
			$fn_volume $val% "$CONTROL"
			sleep 0.2
		done
	fi
}
volumeAmixer() { # value control card
	amixer -Mq sset "$2" $1
	[[ -e $dirshm/usbdac ]] && alsactl store & # fix: not saved on off / disconnect
}
volumeBlueAlsa() { # value control
	amixer -MqD bluealsa sset "$2" $1
}
volumeFunction() {
	[[ ! -e $dirshm/btmixer || -e $dirsystemm/devicewithbt ]] && echo volumeMpd || echo volumeBlueAlsa
}
volumeGet() {
	local args card db mixer mixertype name val val_db volume
	. $dirshm/output
	if [[ $2 == hw ]]; then
		read val db < <( volumeGetAmixer "$mixer" )
	elif [[ -e $dirshm/btmixer && ! -e $dirsystem/devicewithbt ]]; then
		read val db < <( volumeGetAmixer bluealsa )
	elif [[ -e $dirshm/nosound || $mixertype == none ]]; then
		true
	elif [[ $mixertype == software ]] && playerActive mpd; then
		val="$( mpc status %volume% )"
	else
		for i in {1..5}; do # some usb might not be ready
			read val db < <( volumeGetAmixer "$mixer" )
			[[ $val ]] && break || sleep 1
		done
	fi
	[[ ! $val ]] && val=0
	[[ ! $db ]] && db=0
	case $1 in
		push )
			pushData volume '{ "type": "'$1'", "val": '$val', "db": '$db' }'
			[[ -e $dirshm/usbdac ]] && alsactl store # fix: not saved on off / disconnect
			;;
		valdb ) echo $val $db;;
		json )  echo '{ "val": '$val', "db": '$db' }';;
		db )    echo $db;;
		* )     echo $val;;
	esac
	[[ $val > 0 ]] && rm -rf $dirsystem/volumemute
}
volumeGetAmixer() {
	local val_db
	if [[ $1 == bluealsa ]]; then
		val_db=$( amixer -MD bluealsa 2> /dev/null )
	else
		val_db=$( amixer -M sget "$1" 2> /dev/null )
	fi
	awk -F'[][]' '/%/ {print $2, $4}' <<< $val_db | tr -d '%dB'
}
volumeMaxGet() {
	local max
	if [[ -e  $dirsystem/volumelimit ]]; then
		. <( grep ^max $dirsystem/volumelimit.conf )
	else
		max=100
	fi
	echo $max
}
volumeMpd() {
	mpc -q volume ${1/\%}
}
volumeLimit() {
	local fn_volume mixer val
	val=$( getVar $1 $dirsystem/volumelimit.conf )
	if [[ -e $dirshm/btreceiver ]]; then
		mixer=$( < $dirshm/btmixer )
	elif [[ -e $dirshm/amixercontrol ]]; then
		. $dirshm/output
	fi
	fn_volume=$( volumeFunction )
	$fn_volume $val% "$mixer" $card
}
wlanOnboardDisable() {
	local mod
	lsmod | grep -q brcmfmac_cyw && mod=cyw || mod=wcc
	rmmod brcmfmac_$mod brcmfmac &> /dev/null
}
