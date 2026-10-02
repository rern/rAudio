#!/bin/bash

[[ $0 == *settings* ]] && . /srv/http/bash/settings/common.sh

dirbash=/srv/http/bash
dirsettings=$dirbash/settings
dirdata=/srv/http/data
dirbackup=$dirdata/backup
for d in NAS SD USB; do
	printf -v dir${d,,} '%s' /mnt/MPD/$d
done
dirshareddata=$dirnas/data
filesharedip=$dirshareddata/sharedip
while read dir; do
	printf -v dir$dir '%s' $dirdata/$dir
done < <( ls $dirdata )
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
	mpc -q stop
	cdtracks=$( mpc -f %file%^%position% playlist | grep ^cdda: | cut -d^ -f2 )
	if [[ $cdtracks ]]; then
		notify audiocd Playlist 'CD tracks removed.'
		mpc -q del $cdtracks
		pushPlaylist
	fi
}
color() {
	filecss=/srv/http/assets/css/colors.css
	css=$( < $filecss )
	hslcd=$( sed -n '/^\t*--cd/ {s/.*(//; s/[^0-9,]//g; s/,/ /g; p}' <<< $css )
	cd=( $hslcd )
	ml=$( sed -n '/^\t*--ml/ {s/.*ml/,/; s/ .*//; p}' <<< $css )
	[[ $LIST ]] && echo '{
  "cd"     : { "h": '${cd[0]}', "s": '${cd[1]}', "l": '${cd[2]}' }
, "custom" : '$( exists $dirsystem/color )'
, "ml"     : [ '${ml:1}' ]
}' && exit
# --------------------------------------------------------------------
	filecolor=$dirsystem/color
	if [[ $HSL ]]; then
		echo $HSL > $filecolor
		HSL=( $HSL )
	else
		[[ $RESET ]] && rm -f $filecolor
		if [[ -e $filecolor ]]; then
			HSL=( $( < $filecolor ) )
		else
			HSL=( $hslcd )
			DEFAULT=1
		fi
	fi
	h=${HSL[0]}
	s=${HSL[1]}
	l=${HSL[2]}
	regex="\
s/(--h *: ).*/\1$h;/
s/(--s *: ).*/\1$s%;/"
	for m in ${ml//,/ }; do
		L=$(( l + m - 35 ))
		regex+="
s/(--ml$m *: ).*/\1$L%;/"
	done
	sed -E "$regex" <<< $css > $filecss
	iconsvg=/srv/http/assets/img/icon.svg
	cm="($h,$s%,$l%)"
	sed -i -E "s|(rect.*hsl).*;|\1$cm;|; s|(path.*hsl)[^,]*|\1($h|" $iconsvg
	sed -E 's/(path.*)75%/\190%/' $iconsvg | magick -density 96 -background none - ${iconsvg/svg/png}
	[[ ! $color ]] && color=true
	color='{
  "cg"    : "hsl('$h',3%,75%)"
, "cm"    : "hsl'$cm'"
, "color" : '$( [[ $DEFAULT ]] && echo false || echo true )'
, "hsl"   : { "h": '$h', "s": '$s', "l": '$l' }
, "ml"    : [ '${ml:1}' ]
}'
	pushData color "$color"
	splashRotate
	sed -i -E "s/^(.hreficon.*v=).*(.';)/\1$( date +%s )\2/" /srv/http/common.php
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
	local counts dir files
	> $dirmpd/radio
	for dir in $dirwebradio $dirdabradio; do
		[[ ! -e $dir ]] && continue

		files=$( find -L $dir -type f -name data )
		counts+='
, "'${dir: -8}'" : '$( wc -l <<< $files )
		while read file; do
			uri=$( head -n 1 "$file" )
			path=$( dirname "$file" )
			list+="$uri^^$path"$'\n'
		done <<< $files
	done
	echo "$counts"
	echo -n "$list" > $dirmpd/radio
}
coverFileLimit() { # from status-coverart.sh, status-dab.sh
	ls -t $dirshm/online/* 2> /dev/null \
		| tail -n +11 \
		| xargs rm -f --
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
equalizer() { # shell mixer: sudo -u [mpd|root] alsamixer -D equal
	freq=( 31 63 125 250 500 1 2 4 8 16 )
	v=( $VALUES )
	for (( i=0; i < 10; i++ )); do
		(( i < 5 )) && unit=Hz || unit=kHz
		band=( "0$i. ${freq[i]} $unit" )
		sudo -u $USR amixer -MqD equal sset "$band" ${v[i]}
	done
}
grepr() {
	grep --color --exclude-dir plugin -Inr "$@" /srv
}
imageCacheBust() {
	sed -i -E "s/^(.hash *= ).*/\1'?v=$1';/" /srv/http/function.php
}
ipAddress() {
	$dirbash/status -I $1
}
ipSharedData() {
	local self
	self=$( ipAddress )
	grep -v $self $filesharedip
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
logoLcdOled() {
	if [[ -e $dirsystem/lcdchar ]]; then
		systemctl stop lcdchar
		$dirbash/lcdchar.py logo
	fi
	if [[ -e $dirsystem/mpdoled ]]; then
		. <( cat /etc/default/mpd_oled )
		timeout 1 mpd_oled $OPTS -x # timeout - if unresponsive
	fi
}
mkdirRW() {
	[[ -e $1 ]] && return
	
	mkdir $1
	chmod 777 $1
}
mpcSkip() {
	radioStop
	[[ $( mpc current ) == cdda* ]] && notify 'audiocd blink' 'Audio CD' 'Change track ...'
	mpc -q play $POS
	[[ $ACTION != play ]] && mpc -q stop
	. <( mpc status 'consume=%consume%; songpos=%songpos%' )
	[[ $consume == on ]] && mpc -q del $songpos
	[[ -e $dirsystem/librandom ]] && plAddRandom || pushPlaylist
}
mpcUpdate() {
	[[ $1 ]] && ACTION=$1
	[[ $2 ]] && PATHMPD=$2
	rm -f $dirshm/updatedone
	date +%s > $dirmpd/updatestart
	pushData mpdupdate '{ "updating": true }'
	if [[ ! $ACTION ]]; then
		if [[ -e $dirsystem/mpcupdate.conf ]]; then # update not finished when reboot
			. <( cat $dirsystem/mpcupdate.conf )
			ACTION=$action
			PATHMPD=$pathmpd
		else
			ACTION=rescan
		fi
	fi
	[[ ! -e $dirmpd/mpd.db ]] && ACTION=rescan
	[[ $PATHMPD == */* ]] && mpc -q $ACTION "$PATHMPD" || mpc -q $ACTION $PATHMPD # NAS SD USB all(blank) - no quotes
}
netDevice() {
	ls /sys/class/net | grep ^$1 | tail -n 1
}
nfsServerActive() {
	systemctl -q is-active nfs-server && return 0
}
notify() { # icon title message delayms
	local data delay icon json message title
	if [[ $4 ]]; then
		delay=$4
	else
		[[ ${1: -5} == 'blink' ]] && delay=-1 || delay=3000
	fi
	icon=$1
	title=$( quoteEscape $2 )
	message=$( quoteEscape $3 )
	pushWebsocket notify '{ "icon": "'$icon'", "title": "'$title'", "message": "'$message'", "delay": '$delay' }'
}
playback() {
	! playerActive mpd && playerStop && exit
# --------------------------------------------------------------------
	if [[ $1 ]]; then
		ACTION=$1
	else
		statePlay && ACTION=pause || ACTION=play
	fi
	$dirbash/cmd.sh "mpcplayback
$ACTION
CMD ACTION"
}
playerActive() {
	[[ $( < $dirshm/player ) == $1 ]] && return 0
}
playerStart() {
	local player service
	player=$1
	echo $1 > $dirshm/player
	radioStop
	mpc -q stop
	case $player in
		airplay )   service=shairport-sync;;
		bluetooth ) service=bluetoothhd;;
		spotify )   service=spotifyd;;
		upnp )
					service=upmpdcli
					touch $dirshm/upnp;;
	esac
	if [[ $service ]]; then
		for pid in $( pgrep $service ); do
			ionice -c 0 -n 0 -p $pid &> /dev/null
			renice -n -19 -p $pid &> /dev/null
		done
	fi
}
playerStop() {
	local player
	player=$( < $dirshm/player )
	echo mpd > $dirshm/player
	scrobbleOnStop $player
	case $player in
		airplay )
			systemctl stop shairport # metadata
			systemctl restart shairport-sync
			rm -f $dirshm/{coverart,elapsed,timestamp}
			;;
		bluetooth )
			rm -f $dirshm/{bluetoothdest,bluetoothsink}
			systemctl restart bluetooth
			;;
		mpd )
			radioStop
			mpc -q stop
			[[ -e $dirshm/skip ]] && return
#...............................................................................
			;;
		snapcast )
			$dirbash/snapclient.sh stop
			;;
		spotify )
			[[ ! $1 ]] && systemctl restart spotifyd # $1 disconnected by source device
			;;
		upnp )
			systemctl stop upmpdcli
			mpc -q clear
			rm -f $dirshm/upnp
			systemctl start upmpdcli
			;;
	esac
	pushStatus
	if [[ -e $dirshm/relayson ]] && grep -q timeron=true $dirsystem/relays.conf; then
		$dirbash/relays-timer.sh &> /dev/null &
	fi
}
plClear() {
	radioStop
	mpc -q clear
	rm -f $dirsystem/librandom $dirshm/playlist*
	[[ $CMD == mpcremove ]] && pushData playlist '{ "blank": true }'
	pushStatus
}
pushData() { # send to websocket.py (server)
	local channel data dir
	channel=$1
	data=$( sed 's/: *,/: false,/g; s/: *}$/: false }/' <<< ${@:2} ) # $2 - end: empty value > false
	pushWebsocket $channel $data
	[[ ! -e $filesharedip || ' bookmark coverart display order mpdupdate playlists radiolist ' != *" $channel "* ]] && return
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
	$dirbash/status -B "$data"
}
pushDataSet() {
	cat << EOF
{ "channel": "$1", "data": $2 }
EOF
}
pushNfsServer() {
	$dirbash/status -B '{ "channel": "nfsserver", "data": { "online": '$1' } }'
}
pushPlaylist() {
	local b buffer data
	[[ -e $dirshm/pushplaylist ]] && exit
# --------------------------------------------------------------------
	touch $dirshm/pushplaylist
	pushData playlist '{ "blink": true }'
	rm -f $dirshm/playlist*
	if [[ $( mpc status %length% ) == 0 ]]; then
		pushData playlist '{ "blank": true }'
	else
		data=$( php /srv/http/playlist.php current )
		data=$( pushDataSet playlist "$data" )
		bytes=$( printf '%s' "$data" | wc -c )
		(( $bytes > 65536 )) && buffer="-B $(( bytes + 100 ))"
		websocat --text $buffer ws://127.0.0.1:8080 <<< $data
	fi
	( sleep 1 && rm -f $dirshm/pushplaylist ) &
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
	data=$( tr -d '\n' <<< ${@:2} ) # remove newlines (<<< preserve spaces)
	data=$( pushDataSet $1 "$data" )
	$dirbash/status -P "$data"
}
quoteEscape() { # backtick ` - no need to escape for json
	echo "${@//\"/\\\"}"
}
radioStop() {
	[[ ! -e $dirshm/radio ]] && return
#...............................................................................
	mpc -q stop
	systemctl stop radio
	systemctl stop dab &> /dev/null
	rm -f $dirshm/radio
	pushStatus
	[[ -e $dirsystem/mpdoled ]] && systemctl stop mpd_oled
}
scrobble() {
	readarray -t data <<< $1
	Artist=${data[0]}
	Title=${data[1]}
	Time=${data[2]}
	elapsed=${data[3]}
	webradio=${data[4]}
	[[ ! $Artist || ! $Title || $webradio == true || "$( < $dirshm/scrobbled )" == "$Artist$Title" ]] && return
#...............................................................................
	(( $Time < 30 || ( $elapsed < 240 && $elapsed < $(( Time / 2 )) ) )) && return
#...............................................................................
	$dirbash/scrobble.sh "cmd
$Artist
$Title
CMD ARTIST TITLE" &> /dev/null &
}
scrobbleOnStop() {
	[[ ! -e $dirsystem/scrobble ]] && return
	
	[[ $1 != mpd ]] && grep -q $1=$ $dirsystem/scrobble.conf && return
	
	scrobble "$( $dirbash/status -s | jq -r .Artist,.Title,.Time,.elapsed,.webradio )"
}
skip() {
	! playerActive mpd && return
	
	local length songpos
	read length songpos state < <( mpc status '%length% %songpos% %state%' )
	ACTION=${state:0:4} # state: playing, paused, stopped
	if [[ $1 == PREVIOUS ]]; then
		(( $songpos == 1 )) && POS=$length || POS=$(( songpos - 1 ))
	else
		(( $songpos == $length )) && POS=1 || POS=$(( songpos + 1 ))
	fi
	mpcSkip
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
statePlay() {
	[[ $( jq .play $dirshm/status.json ) == true ]] && return 0
}
volume() {
	local diff file_volumemute fn_volume type val values
	file_volumemute=$dirsystem/volumemute
	[[ ! $CURRENT ]] && CURRENT=$( volumeGet )
	[[ $TYPE == dragpress ]] && DRAG_PRESS=1
	if [[ ! $DRAG_PRESS ]]; then
		if [[ $TYPE == mute && $TARGET == 0 ]]; then
			val=$CURRENT
			type=mute
			echo $CURRENT > $file_volumemute
		else
			val=$TARGET
			[[ -e $file_volumemute ]] && type=unmute
			rm -f $file_volumemute
		fi
		pushData volume '{ "type": "'$type'", "val": '$val' }'
	fi
	fn_volume=$( volumeFunction )
	diff=$(( TARGET - CURRENT ))
	diff=${diff#-}
	if (( $diff < 5 )); then
		$fn_volume $TARGET% "$CONTROL"
		[[ ! $DRAG_PRESS ]] && volumeGet push
	else
		pushData volume '{ "val": '$TARGET' }'
		(( $CURRENT < $TARGET )) && incr=5 || incr=-5
		values=( $( seq $(( CURRENT + incr )) $incr $TARGET ) )
		(( $diff % 5 )) && values+=( $TARGET )
		for val in "${values[@]}"; do
			$fn_volume $val% "$CONTROL"
			sleep 0.2
		done
		[[ $TYPE != mute && $fn_volume == volumeAmixer ]] && volumeGet push # some dac cannot set exactly on some 1% increments
	fi
	[[ $fn_volume == volumeAmixer && -e $dirshm/usbdac ]] && alsactl store & # fix: not saved on off / disconnect
}
volumeAmixer() { # camilla with mixer control only
	amixer -Mq sset "$2" $1
}
volumeBlueAlsa() { # value control
	amixer -MqD bluealsa sset "$2" $1
}
volumeCamilla() { # camilla without mixer control
	db=$( awk -v pct=$1 -v min=-60 -v max=0 '
			BEGIN {
				min *= 100; max *= 100               # to centidB
				norm = pct / 100
				if (norm < 0) norm = 0
				if (norm > 1) norm = 1
				range = max - min
				if (range <= 2400) {                 # <=24dB -> linear scale
					db = min + norm * range
				} else {
					min_norm = 10 ^ ((min - max) / 6000.0)
					scaled = norm * (1 - min_norm) + min_norm
					db = max + 6000.0 * log(scaled) / log(10)
				}
				printf "%.1f\n", db / 100
			}' ) # % > db
	websocat --text ws://127.0.0.1:1234 <<< '{ "SetVolume": '$db' }' &> /dev/null
}
volumeFunction() {
	if [[ -e $dirsystem/camilladsp ]]; then
		echo volumeCamilla
	elif [[ ! -e $dirshm/btmixer || -e $dirsystemm/devicewithbt ]]; then
		echo volumeMpd
	else
		echo volumeBlueAlsa
	fi
}
volumeGet() {
	local card db fn_volume lines mixer val
	fn_volume=$( volumeFunction )
	case $fn_volume in
		volumeCamilla )  val=$( volumeGetCamilla );;
		volumeMpd )      val=$( mpc status %volume% | tr -d % );; # no db available
		volumeBlueAlsa )
			lines=$( amixer -MD bluealsa 2> /dev/null )
			val=$( volumeLines2val $lines )
			;;
		* )
			. $dirshm/output
			for i in {1..5}; do # some usb might not be ready
				lines=$( amixer -c $card -M sget "$mixer" 2> /dev/null )
				[[ $lines ]] && break || sleep 1
			done
			val=$( volumeLines2val $lines )
			;;
	esac
	if [[ $1 == push ]]; then
		pushData volume '{ "val": '$val' }'
	else
		echo $val
	fi
	[[ -e $dirshm/usbdac ]] && alsactl store # fix: not saved on off / disconnect
}
volumeGetCamilla() {
	db=$( websocat --text ws://127.0.0.1:1234 <<< '"GetVolume"' | jq .GetVolume.value )
	awk -v db=$db -v min=-60 -v max=0 '
		BEGIN {
			min *= 100; max *= 100; db *= 100   # to centidB
			range = max - min
			if (range <= 2400) {                # <=24dB -> linear scale
				norm = (db - min) / range
			} else {
				norm = 10 ^ ((db - max) / 6000.0)
				min_norm = 10 ^ ((min - max) / 6000.0)
				norm = (norm - min_norm) / (1 - min_norm)
			}
			if (norm < 0) norm = 0
			if (norm > 1) norm = 1
			p = norm * 100
			printf "%d\n", (p + (p >= 0 ? 0.5 : -0.5))
		}' # db > %
}
volumeLines2val() {
	val=${1#*[} # last line: Mono: Playback 0 [86%] [0.00dB] [on]
	val=${val%%\%*}
}
volumeMpd() {
	mpc -q volume ${1/\%}
}
