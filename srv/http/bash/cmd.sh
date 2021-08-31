#!/bin/bash

dirdata=/srv/http/data
diraddons=$dirdata/addons
dirbash=/srv/http/bash
dirimg=/srv/http/assets/img
dirmpd=$dirdata/mpd
dirsystem=$dirdata/system
dirtmp=$dirdata/shm
dirwebradios=$dirdata/webradios

# convert each line to each args
readarray -t args <<< "$1"

audiocdWaitStart() {
	sleep 5
	for i in {1..20}; do
		[[ $( mpc | awk '/^\[playing\]/ {print $3}' | cut -d/ -f1 ) == 0:00 ]] && sleep 1 || break
	done
}
gifNotify() {
	pushstream notify '{"title":"Thumbnail","text":"Resize animated GIF ...","icon":"coverart blink","delay":-1}'
}
gifThumbnail() {
	type=$1
	source=$2
	target=$3
	imgwh=( $( gifsicle -I "$source" | awk 'NR < 3 {print $NF}' ) )
	[[ ${imgwh[0]} == images ]] && animated=1
	case $type in
		bookmark )
			rm -f "${target:0:-4}".*
			[[ -n $animated ]] && (( ${imgwh[1]/x*} > 200 || ${imgwh[1]/*x} > 200 )) && gifNotify
			gifsicle -O3 --resize-fit 200x200 "$source" > "$target"
			;;
		coverart )
			dir=$( dirname "$target" )
			rm -f "$dir/cover".*.backup "$dir/coverart".* "$dir/thumb".*
			coverfile=$( ls "$dir/cover".* | head -1 )
			[[ -e $coverfile ]] && mv -f "$coverfile" "$coverfile.backup"
			[[ -n $animated ]] && gifNotify
			gifsicle -O3 --resize-fit 1000x1000 "$source" > "$target"
			gifsicle -O3 --resize-fit 200x200 "$source" > "$dir/coverart.gif"
			gifsicle -O3 --resize-fit 80x80 "$source" > "$dir/thumb.gif"
			;;
		webradio )
			filenoext=${target:0:-4}
			rm -f $filenoext.* $filenoext-thumb.*
			[[ -n $animated ]] && gifNotify
			gifsicle -O3 --resize-fit 200x200 $source > $target
			gifsicle -O3 --resize-fit 80x80 $source > $filenoext-thumb.gif
			;;
	esac
	coverfile=${target:9:-4}
	coverfile=$( php -r "echo rawurlencode( '${coverfile//\'/\\\'}' );" )
	pushstream coverart '{"url":"'$coverfile.$( date +%s ).gif'","type":"'$type'"}'
}
jpgThumbnail() {
	type=$1
	source=$2
	target=$3
	case $type in
		bookmark )
			rm -f "${target:0:-4}".*
			cp -f "$source" "$target"
			;;
		coverart )
			dir=$( dirname "$target" )
			rm -f "$dir/cover".*.backup "$dir/coverart".* "$dir/thumb".*
			coverfile=$( ls "$dir/cover".* | head -1 )
			[[ -e $coverfile ]] && mv -f "$coverfile" "$coverfile.backup"
			cp -f "$source" "$target" # already resized from client
			convert "$source" -thumbnail 200x200\> -unsharp 0x.5 "$dir/coverart.jpg"
			convert "$dir/coverart.jpg" -thumbnail 80x80\> -unsharp 0x.5 "$dir/thumb.jpg"
			;;
		webradio )
			filenoext=${target:0:-4}
			rm -f $filenoext.* $filenoext-thumb.*
			cp -f $source $target
			convert $source -thumbnail 80x80\> -unsharp 0x.5 $filenoext-thumb.jpg
			;;
	esac
	[[ $type == coverart ]] && coverfile=${target:0:-4} || coverfile=${target:9:-4}
	coverfile=$( php -r "echo rawurlencode( '${coverfile//\'/\\\'}' );" )
	pushstream coverart '{"url":"'$coverfile.$( date +%s ).jpg'","type":"'$type'"}'
}
pladdPlay() {
	pushstreamPlaylist
	if [[ ${1: -4} == play ]]; then
		sleep $2
		mpc play $pos
	fi
	$dirbash/cmd-pushstatus.sh
}
pladdPosition() {
	if [[ ${1:0:7} == replace ]]; then
		mpc clear
		pos=1
	else
		pos=$(( $( mpc playlist | wc -l ) + 1 ))
	fi
}
pushstream() {
	curl -s -X POST http://127.0.0.1/pub?id=$1 -d "$2"
}
pushstreamAudiocd() {
	pushstream notify '{"title":"Audio CD","text":"'"$1"'","icon":"audiocd blink","delay":-1}'
}
pushstreamPlaylist() {
	pushstream playlist "$( php /srv/http/mpdplaylist.php current )"
}
pushstreamVolume() {
	pushstream volume '{"type":"'$1'", "val":'$2' }'
}
rotateSplash() {
	case $1 in
		NORMAL ) degree=0;;
		CCW )    degree=-90;;
		CW )     degree=90;;
		UD )     degree=180;;
	esac
	convert \
		-density 48 \
		-background none $dirimg/icon.svg \
		-rotate $degree \
		-gravity center \
		-background '#000' \
		-extent 1920x1080 \
		$dirimg/splash.png
}
urldecode() { # for webradio url to filename
	: "${*//+/ }"
	echo -e "${_//%/\\x}"
}
volume0dB(){
	volumeGet
	amixer -c $card -Mq sset "$control" 0dB
}
volumeControls() {
	! aplay -l 2> /dev/null | grep -q '^card' && return
	
	amixer=$( amixer -c $1 scontents \
				| grep -A1 ^Simple \
				| sed 's/^\s*Cap.*: /^/' \
				| tr -d '\n' \
				| sed 's/--/\n/g' )
	[[ -z $amixer ]] && control= && return
	
	controls=$( echo "$amixer" \
					| grep 'volume.*pswitch' \
					| grep -v Mic \
					| cut -d"'" -f2 )
	if [[ -z $controls ]]; then
		controls=$( echo "$amixer" \
						| grep volume \
						| grep -v Mic \
						| cut -d"'" -f2  )
	fi
}
volumeGet() {
	if ! aplay -l 2> /dev/null | grep -q '^card'; then
		volume=-1
		return
	fi
	
	mixertype=$( sed -n '/^\s*device.*"hw:/,/mixer_type/ p' /etc/mpd.conf \
					| tail -1 \
					| cut -d'"' -f2 )
	if [[ $mixertype == software ]]; then
		volume=$( mpc volume | cut -d: -f2 | tr -d ' %' )
	else
		card=$( head -1 /etc/asound.conf | tail -c 2 )
		volumeControls $card
		if [[ -z $controls ]]; then
			volume=100
		else
			control=$( echo "$controls" | sort -u | head -1 )
			voldb=$( amixer -M sget "$control" \
				| grep '%.*dB' \
				| head -1 \
				| sed 's/.*\[\(.*\)%\] \[\(.*\)dB.*/\1 \2/' )
			if [[ -n $voldb ]]; then
				volume=${voldb/ *}
				db=${voldb/* }
			else
				volume=100
			fi
		fi
	fi
}
volumeReset() {
	file=$dirtmp/mpdvolume
	if [[ -e $file ]]; then
		volumeGet
		vol_db=( $( cat $file ) )
		vol=${vol_db[0]}
		db=${vol_db[1]}
		volumeSet $volume $vol $control
		[[ $db == 0.00 ]] && amixer -c $card -Mq sset "$control" 0dB
		rm -f $file
	fi
}
volumeSet() {
	current=$1
	target=$2
	control=$3
	diff=$(( $target - $current ))
	pushstreamVolume disable true
	if (( -5 < $diff && $diff < 5 )); then
		[[ -z $control ]] && mpc volume $target || amixer -Mq sset "$control" $target%
	else # increment
		(( $diff > 0 )) && incr=5 || incr=-5
		for i in $( seq $current $incr $target ); do
			[[ -z $control ]] && mpc volume $i || amixer -Mq sset "$control" $i%
			sleep 0.2
		done
		if (( $i != $target )); then
			[[ -z $control ]] && mpc volume $target || amixer -Mq sset "$control" $target%
		fi
	fi
	pushstreamVolume disable false
	[[ -n $control ]] && alsactl store
}

case ${args[0]} in

addonsclose )
	script=${args[1]}
	alias=${args[2]}
	killall $script wget pacman &> /dev/null
	rm -f /var/lib/pacman/db.lck /srv/http/*.zip $diraddons/$alias /usr/local/bin/uninstall_$alias.sh
	;;
addonslist )
	! : >/dev/tcp/8.8.8.8/53 && exit -2 # online check
	
	[[ -z ${args[1]} ]] && branch=main || branch=${args[1]}
	wget --no-check-certificate https://github.com/rern/rAudio-addons/raw/$branch/addons-list.json -qO $diraddons/addons-list.json
	[[ $? != 0 ]] && exit -1
	
	bash=$( jq -r .push.bash $diraddons/addons-list.json ) # check condition - wget if necessary
	if [[ -n $bash ]]; then
		eval "$bash"
		[[ $? != 0 ]] && exit
	fi
	
	url=$( jq -r .push.url $diraddons/addons-list.json )
	[[ -n $url ]] && bash <( curl -sL $url )
	;;
addonsupdates )
	: >/dev/tcp/8.8.8.8/53 || exit # online check
	
	wget --no-check-certificate https://github.com/rern/rAudio-addons/raw/main/addons-list.json -qO $diraddons/addons-list.json
	[[ $? != 0 ]] && exit

	installed=$( ls "$diraddons" | grep -v addons-list )
	for addon in $installed; do
		verinstalled=$( cat $diraddons/$addon )
		if (( ${#verinstalled} > 1 )); then
			verlist=$( jq -r .$addon.version $diraddons/addons-list.json )
			[[ $verinstalled != $verlist ]] && count=1 && break
		fi
	done
	[[ -n $count ]] && touch $diraddons/update || rm -f $diraddons/update
	;;
audiocdtag )
	track=${args[1]}
	tag=${args[2]}
	discid=${args[3]}
	sed -i "$track s|.*|$tag|" $dirdata/audiocd/$discid
	pushstreamPlaylist
	;;
bluetoothplayer )
	val=${args[1]}
	if [[ $val == 1 ]]; then # connected
		[[ ! -e $dirtmp/player-bluetooth ]] && touch $dirtmp/btclient
		pushstream refresh '{ "page": "networks" }'
	elif [[ $val == 0 ]]; then # disconnected
		rm -f $dirtmp/{player-*,btclient}
		touch $dirtmp/player-mpd
		pushstream refresh '{ "page": "networks" }'
	else
		mpc stop
		rm -f $dirtmp/{player-*,btclient}
		echo $val > $dirtmp/player-bluetooth
		sleep 1
		volume0dB
		status=$( $dirbash/status.sh )
		pushstream mpdplayer "$status"
	fi
	;;
bluetoothplayerstop )
	systemctl restart bluezdbus
	rm -f $dirtmp/player-bluetooth
	touch $dirtmp/player-mpd
	volumeReset
	status=$( $dirbash/status.sh )
	pushstream mpdplayer "$status"
	;;
bookmarkreset )
	path=${args[1]}
	rm -f "/mnt/MPD/$path/"{coverart,thumb}.*
	;;
bookmarkthumb )
	mpdpath=${args[1]}
	coverartfile=$( ls "/mnt/MPD/$mpdpath/coverart".* )
	echo ${coverartfile: -3} # ext
	;;
color )
	hsl=${args[1]}
	file=$dirsystem/color
	if [[ -n $hsl ]]; then # omit call from addons.sh / datarestore
		[[ $hsl == reset ]] && rm -f $file || echo $hsl > $file
	fi
	if [[ -e $file ]]; then
		hsl=( $( cat $file ) )
	else
		hsl=( $( grep '\-\-cd:' /srv/http/assets/css/colors.css | sed 's/.*(\(.*\)).*/\1/' | tr ',' ' ' | tr -d % ) )
	fi
	h=${hsl[0]}; s=${hsl[1]}; l=${hsl[2]}
	hs="$h,$s%,"
	hsg="$h,3%,"
	hsl="${hs}$l%"

	sed -i "
 s|\(--cml: *hsl\).*;|\1(${hs}$(( l + 5 ))%);|
  s|\(--cm: *hsl\).*;|\1($hsl);|
 s|\(--cma: *hsl\).*;|\1(${hs}$(( l - 5 ))%);|
 s|\(--cmd: *hsl\).*;|\1(${hs}$(( l - 15 ))%);|
s|\(--cg75: *hsl\).*;|\1(${hsg}75%);|
s|\(--cg60: *hsl\).*;|\1(${hsg}60%);|
 s|\(--cgl: *hsl\).*;|\1(${hsg}40%);|
  s|\(--cg: *hsl\).*;|\1(${hsg}30%);|
 s|\(--cga: *hsl\).*;|\1(${hsg}20%);|
 s|\(--cgd: *hsl\).*;|\1(${hsg}10%);|
" /srv/http/assets/css/colors.css
	sed -i "
 s|\(.box{fill:hsl\).*|\1($hsl);|
s|\(.text{fill:hsl\).*|\1(${hsg}30%);}|
" $dirimg/coverart.svg
	sed -i "
s|\(.box{fill:hsl\).*|\1($hsl);}|
s|\(path{fill:hsl\).*|\1(${hsg}75%);}|
" $dirimg/icon.svg
	sed "s|\(path{fill:hsl\).*|\1(0,0%,90%);}|" $dirimg/icon.svg \
		| convert -density 96 -background none - $dirimg/icon.png
	rotate=$( grep ^rotate /etc/localbrowser.conf 2> /dev/null | cut -d= -f2 )
	[[ -z $rotate ]] && rotate=NORMAL
	rotateSplash $rotate
	pushstream reload 1
	;;
count )
	count
	;;
coverartreset )
	coverfile=${args[1]}
	mpdpath=${args[2]}
	artist=${args[3]}
	album=${args[4]}
	dir=$( dirname "$coverfile" )
	if [[ $( basename "$dir" ) == audiocd ]]; then
		filename=$( basename "$coverfile" )
		id=${filename/.*}
		rm -f "$coverfile"
		killall status-coverartonline.sh &> /dev/null # new track - kill if still running
		$dirbash/status-coverartonline.sh "$artist"$'\n'"$album"$'\naudiocd\n'$id &> /dev/null &
		exit
	fi
	
	rm -f "$coverfile" "$dir/coverart".* "$dir/thumb".*
	backupfile=$( ls -p "$dir"/*.backup | head -1 )
	if [[ -e $backupfile ]]; then
		restorefile=${backupfile%%.backup}
		ext=${restorefile: -3}
		if [[ $ext != gif ]]; then
			jpgThumbnail coverart "$backupfile" "$restorefile"
		else
			gifThumbnail coverart "$backupfile" "$restorefile"
		fi
		rm "$backupfile"
	fi
	url=$( $dirbash/status-coverart.sh "\
$artist
$album
$mpdpath
reset" )
	echo $url
	;;
coversave )
	source=${args[1]}
	path=${args[2]}
	coverfile="$path/cover.jpg"
	jpgThumbnail coverart "$source" "$coverfile"
	;;
displayget )
	if [[ -e $dirtmp/nosound ]]; then
		volumenone=true
	else
		card=$( head -1 /etc/asound.conf | cut -d' ' -f2 )
		volumenone=$( sed -n "/^\s*device.*hw:$card/,/mixer_type/ p" /etc/mpd.conf \
					| grep -q 'mixer_type.*none' \
					&& echo true || echo false )
	fi
	data=$( head -n -1 $dirsystem/display )
	data+='
, "audiocd"    : '$( grep -q 'plugin.*cdio_paranoia' /etc/mpd.conf && echo true || echo false )'
, "color"      : "'$( cat $dirsystem/color 2> /dev/null )'"
, "lock"       : '$( [[ -e $dirsystem/login ]] && echo true || echo false )'
, "order"      : '$( cat $dirsystem/order 2> /dev/null || echo false )'
, "relays"     : '$( [[ -e $dirsystem/relays ]] && echo true || echo false )'
, "snapclient" : '$( [[ -e $dirsystem/snapclient ]] && echo true || echo false )'
, "volumenone" : '$volumenone'
}'
	echo "$data"
	;;
displaysave )
	data=$( jq . <<< ${args[1]} )
	grep -q 'vumeter.*true' <<< "$data" && vumeter=true || vumeter=false
	[[ -e $dirsystem/vumeter ]] && vumeter0=true || vumeter0=false
	if [[ $vumeter != $vumeter0 ]]; then
		if [[ $vumeter == true ]]; then
			touch $dirsystem/vumeter
			! grep -q mpd.fifo /etc/mpd.conf && $dirbash/mpd-conf.sh
		else
			rm $dirsystem/vumeter
		fi
		status=$( $dirbash/status.sh )
		pushstream mpdplayer "$status"
		if [[ $vumeter == true || -e $dirsystem/vuled ]]; then
			killall cava &> /dev/null
			cava -p /etc/cava.conf | $dirbash/vu.sh &> /dev/null &
		fi
	fi
	pushstream display "$data"
	echo "$data" > $dirsystem/display
	;;
ignoredir )
	touch $dirsystem/updating
	path=${args[1]}
	dir=$( basename "$path" )
	mpdpath=$( dirname "$path" )
	echo $dir >> "/mnt/MPD/$mpdpath/.mpdignore"
	pushstream mpdupdate 1
	mpc update "$mpdpath" #1 get .mpdignore into database
	mpc update "$mpdpath" #2 after .mpdignore was in database
	;;
librandom )
	enable=${args[1]}
	if [[ $enable == false ]]; then
		rm -f $dirsystem/librandom
	else
		mpc random 0
		plL=$( mpc playlist | wc -l )
		$dirbash/cmd-librandom.sh start
		touch $dirsystem/librandom
		sleep 1
		mpc play $(( plL + 1 ))
	fi
	pushstream option '{ "librandom": '$enable' }'
	pushstream playlist "$( php /srv/http/mpdplaylist.php current )"
	;;
list )
	list
	;;
lyrics )
	artist=${args[1]}
	title=${args[2]}
	cmd=${args[3]}
	data=${args[4]}
	name="$artist - $title"
	name=${name//\/}
	lyricsfile="$dirdata/lyrics/${name,,}.txt"
	if [[ $cmd == save ]]; then
		echo -e "$data" > "$lyricsfile"
	elif [[ $cmd == delete ]]; then
		rm "$lyricsfile"
	else
		artist=$( echo $artist | sed 's/^A \|^The \|\///g' )
		title=${title//\/}
		query=$( echo $artist/$title \
					| tr -d " '\-\"\!*\(\);:@&=+$,?#[]." )
		lyrics=$( curl -s -A firefox https://www.azlyrics.com/lyrics/${query,,}.html )
		if [[ -n $lyrics ]]; then
			echo "$lyrics" \
				| sed -n '/id="cf_text_top"/,/id="azmxmbanner"/ p' \
				| sed -e '/^\s*$/ d' -e '/\/div>/,/<br>/ {N;d}' -e 's/<br>//' -e 's/&quot;/"/g' \
				| grep -v '^<' \
				| tee "$lyricsfile"
		fi
	fi
	;;
lyricsexist )
	artist=${args[1]}
	title=${args[2]}
	file=${args[3]}
	name="$artist - $title"
	name=${name//\/}
	lyricsfile="$dirdata/lyrics/${name,,}.txt"
	if [[ -e "$lyricsfile" ]]; then
		cat "$lyricsfile"
	else
		kid3-cli -c "select \"$file\"" \
				 -c "get lyrics"
	fi
	;;
mpcoption )
	option=${args[1]}
	onoff=${args[2]}
	mpc $option $onoff
	pushstream option '{"'$option'":'$onoff'}'
	;;
mpcplayback )
	command=${args[1]}
	pos=${args[2]}
	systemctl stop radio mpd_oled
	mpc | grep -q '^\[paused\]' && pause=1
	mpc $command $pos
	if [[ $command == play ]]; then
		fileheadder=$( mpc | head -c 4 )
		if [[ $fileheadder == http ]]; then
			webradio=1
			sleep 1 # fix: webradio start - blank 'file:' status
		elif [[ $fileheadder == cdda && -z $pause ]]; then
			pushstreamAudiocd "Start play ..."
			audiocdWaitStart
		fi
		[[ -e $dirsystem/mpdoled ]] && systemctl start mpd_oled
	else
		killall cava &> /dev/null
		[[ $command == stop ]] && rm -f $dirtmp/status
	fi
	;;
mpcprevnext )
	command=${args[1]}
	current=$(( ${args[2]} + 1 ))
	length=${args[3]}
	rm -f $dirtmp/status
	systemctl stop radio mpd_oled
	if mpc | grep -q '^\[playing\]'; then
		playing=1
		mpc stop
	fi
	if mpc | grep -q 'random: on'; then
		pos=$( shuf -n 1 <( seq $length | grep -v $current ) )
		mpc play $pos
	else
		if [[ $command == next ]]; then
			(( $current != $length )) && mpc play $(( current + 1 )) || mpc play 1
			mpc | grep -q 'consume: on' && mpc del $current
			[[ -e $dirsystem/librandom ]] && $dirbash/cmd-librandom.sh
		else
			(( $current != 1 )) && mpc play $(( current - 1 )) || mpc play $length
		fi
	fi
	if [[ -z $playing ]]; then
		mpc stop
	else
		fileheadder=$( mpc | head -c 4 )
		if [[ $fileheadder == cdda ]]; then
			pushstreamAudiocd "Change track ..."
			audiocdWaitStart
		else
			[[ $fileheadder == http ]] && sleep 0.6 || sleep 0.05 # suppress multiple player events
		fi
		[[ -e $dirsystem/mpdoled ]] && systemctl start mpd_oled
	fi
	;;
mpcseek )
	seek=${args[1]}
	pause=${args[2]}
	if [[ -n $pause ]]; then
		mpc play
		mpc pause
		mpc seek $seek
		state=pause
	else
		mpc seek $seek
	fi
	;;
mpcupdate )
	path=${args[1]}
	if [[ $path == rescan ]]; then
		echo rescan > $dirsystem/updating
		mpc -q rescan
	else
		echo $path > $dirsystem/updating
		mpc -q update "$path"
	fi
	pushstream mpdupdate 1
	;;
nicespotify )
	for pid in $( pgrep spotifyd ); do
		ionice -c 0 -n 0 -p $pid &> /dev/null 
		renice -n -19 -p $pid &> /dev/null
	done
	;;
onlinefileslimit )
	onlinefiles=$( ls -1t $dirtmp/online-*.* 2> /dev/null )
	if (( $( echo "$onlinefiles" | wc -l ) > 10 )); then
		file=$( echo "$onlinefiles" | tail -1 )
		rm -f "$file"
	fi
	onlinefiles=$( ls -1t $dirtmp/webradio-*.* 2> /dev/null )
	if (( $( echo "$onlinefiles" | wc -l ) > 10 )); then
		file=$( echo "$onlinefiles" | tail -1 )
		rm -f "$file" "${file:0:-4}"
	fi
	;;
ordersave )
	data=$( jq . <<< ${args[1]} )
	pushstream order "$data"
	echo "$data" > $dirsystem/order
	;;
partexpand )
	dev=$( mount | awk '/ on \/ / {printf $1}' | head -c -2 )
	if (( $( sfdisk -F $dev | head -1 | awk '{print $6}' ) != 0 )); then
		echo -e "d\n\nn\n\n\n\n\nw" | fdisk $dev &>/dev/null
		partprobe $dev
		resize2fs ${dev}p2
	fi
	;;
pladd )
	item=${args[1]}
	cmd=${args[2]}
	delay=${args[3]}
	pladdPosition $cmd
	mpc add "$item"
	pladdPlay $cmd $delay
	;;
plcrop )
	if mpc | grep -q playing; then
		mpc crop
	else
		mpc play
		mpc crop
		mpc stop
	fi
	systemctl -q is-active libraryrandom && $dirbash/cmd-librandom.sh
	$dirbash/cmd-pushstatus.sh
	pushstreamPlaylist
	;;
plcurrent )
	mpc play ${args[1]}
	mpc stop
	$dirbash/cmd-pushstatus.sh
	;;
plfindadd )
	if [[ ${args[1]} != multi ]]; then
		type=${args[1]}
		string=${args[2]}
		cmd=${args[3]}
		pladdPosition $cmd
		mpc findadd $type "$string"
	else
		type=${args[2]}
		string=${args[3]}
		type2=${args[4]}
		string2=${args[5]}
		cmd=${args[6]}
		pladdPosition $cmd
		mpc findadd $type "$string" $type2 "$string2"
	fi
	pladdPlay $cmd $delay
	;;
plload )
	playlist=${args[1]}
	cmd=${args[2]}
	delay=${args[3]}
	pladdPosition $cmd
	mpc load "$playlist"
	pladdPlay $cmd $delay
	;;
plloadrange )
	range=${args[1]}
	playlist=${args[2]}
	cmd=${args[3]}
	delay=${args[4]}
	pladdPosition $cmd
	mpc --range=$range load "$playlist"
	pladdPlay $cmd $delay
	;;
plls )
	dir=${args[1]}
	cmd=${args[2]}
	delay=${args[3]}
	pladdPosition $cmd
	readarray -t cuefiles <<< $( mpc ls "$dir" | grep '\.cue$' | sort -u )
	if [[ -z $cuefiles ]]; then
		mpc ls "$dir" | mpc add &> /dev/null
	else
		for cuefile in "${cuefiles[@]}"; do
			mpc load "$cuefile"
		done
	fi
	pladdPlay $cmd $delay
	;;
plorder )
	mpc move ${args[1]} ${args[2]}
	pushstreamPlaylist
	;;
plremove )
	pos=${args[1]}
	activenext=${args[2]}
	if [[ -n $pos ]]; then
		mpc del $pos
		[[ -n $activenext ]] && mpc play $activenext && mpc stop
	else
		mpc clear
	fi
	$dirbash/cmd-pushstatus.sh
	pushstreamPlaylist
	;;
plrename )
	mv "$dirdata/playlists/${args[1]}" "$dirdata/playlists/${args[2]}"
	pushstreamPlaylist
	;;
plshuffle )
	mpc shuffle
	pushstreamPlaylist
	;;
plsimilar )
	plLprev=$( mpc playlist | wc -l )
	linesL=${#args[@]}
	[[ ${args[1]} == addplay ]] && pos=$(( $( mpc playlist | wc -l ) + 1 ))
	for (( i=1; i < linesL; i++ )); do
		artist=${args[$i]}
		(( i++ ))
		title=${args[$i]}
		[[ -z $artist || -z $title ]] && continue
		
		file=$( mpc find artist "$artist" title "$title" )
		[[ -z $file ]] && continue
		
		list+="$( mpc find artist "$artist" title "$title" )
"
	done
	echo "$list" | awk 'NF' | mpc add
	pushstreamPlaylist
	echo $(( $( mpc playlist | wc -l ) - plLprev ))
	[[ -n $pos ]] && mpc -q play $pos
	;;
power )
	reboot=${args[1]}
	mpc stop
	[[ -e $dirsystem/lcdchar ]] && $dirbash/lcdchar.py
	cdda=$( mpc -f %file%^%position% playlist | grep ^cdda: | cut -d^ -f2 )
	[[ -n $cdda ]] && mpc del $cdda
	if [[ -e $dirtmp/relaystimer ]]; then
		$dirbash/relays.sh
		sleep 2
	fi
	if [[ -n $reboot ]]; then
		pushstream notify '{"title":"Power","text":"Reboot ...","icon":"reboot blink","delay":-1,"power":"reboot"}'
	else
		pushstream notify '{"title":"Power","text":"Off ...","icon":"power blink","delay":-1,"power":"off"}'
	fi
	ply-image /srv/http/assets/img/splash.png &> /dev/null
	if mount | grep -q /mnt/MPD/NAS; then
		umount -l /mnt/MPD/NAS/* &> /dev/null
		sleep 3
	fi
	[[ -e /boot/shutdown.sh ]] && /boot/shutdown.sh
	[[ -z $reboot && -e $dirsystem/lcdchar ]] && $dirbash/lcdchar.py off
	[[ -n $reboot ]] && reboot || poweroff
	;;
refreshbrowser )
	pushstream reload 1
	;;
relayscountdown )
	relaysfile=$dirtmp/relaystimer
	if [[ -e $relaysfile ]] && (( $( cat $relaysfile ) < 2 )); then
		killall relaystimer.sh &> /dev/null
		echo 1 > $relaysfile
		$dirbash/relaystimer.sh &> /dev/null &
		curl -s -X POST http://127.0.0.1/pub?id=relays -d '{ "state": "IDLE", "delay": 60 }'
	fi
	;;
relaystimerreset )
	grep ^timer $dirsystem/relayspins | cut -d= -f2 > $dirtmp/relaystimer
	pushstream relays '{"state":"RESET"}'
	;;
rotateSplash )
	rotateSplash ${args[1]}
	;;
screenoff )
	DISPLAY=:0 xset dpms force off
	;;
stationcoverreset )
	coverfile=${args[1]}
	rm -f "$coverfile".* "$coverfile-thumb".*
	pushstream coverart '{"url":"'$coverfile'","type":"webradioreset"}'
	;;
statuspkg )
	echo "$( pacman -Q ${args[1]} )
$( systemctl status ${args[2]} )"
	;;
thumbgif )
	type=${args[1]}
	source=${args[2]}
	target=${args[3]}
	gifThumbnail "$type" "$source" "$target"
	;;
thumbjpg )
	type=${args[1]}
	source=${args[2]}
	target=${args[3]}
	jpgThumbnail "$type" "$source" "$target"
	;;
volume )
	current=${args[1]}
	target=${args[2]}
	control=${args[3]}
	filevolumemute=$dirsystem/volumemute
	if [[ $target > 0 ]]; then      # set
		type=set
		rm -f $filevolumemute
		pushstreamVolume set $target
	else
		if (( $current > 0 )); then # mute
			type=mute
			target=0
			echo $current > $filevolumemute
			pushstreamVolume mute $current
		else                        # unmute
			type=unmute
			target=$( cat $filevolumemute )
			rm -f $filevolumemute
			pushstreamVolume unmute $target
		fi
	fi
	volumeSet "$current" $target "$control" # $current may be blank
	;;
volume0db )
	volume0dB
	[[ ${args[1]} == spotifyd ]] && echo $volume $db  > $dirtmp/mpdvolume
	;;
volumecontrols )
	volumeControls ${args[1]}
	echo "$controls"
	;;
volumecontrolget )
	volumeGet
	echo $control^$volume # place $control first to keep trailing space if any
	;;
volumeget )
	volumeGet
	[[ ${args[1]} == db ]] && echo $volume $db || echo $volume
	;;
volumepushstream )
	volumeGet
	pushstream volume '{"val":'$volume'}'
	[[ -n $control ]] && alsactl store
	;;
volumereset )
	volumeReset
	;;
volumeupdown )
	updn=${args[1]}
	control=${args[2]}
	[[ -z $control ]] && mpc volume ${updn}1 || amixer -Mq sset "$control" 1%$updn
	volumeGet
	pushstreamVolume updn $volume
	;;
webradioadd )
	name=${args[1]}
	url=$( urldecode ${args[2]} )
	filewebradio=$dirwebradios/${url//\//|}
	ext=${url/*.}
	if [[ $ext == m3u ]]; then
		url=$( curl -s $url | grep ^http | head -1 )
	elif [[ $ext == pls ]]; then
		url=$( curl -s $url | grep ^File | head -1 | cut -d= -f2 )
	fi
	[[ -z $url ]] && exit -1
	
	echo $name > $filewebradio
	chown http:http $filewebradio # for edit in php
	count=$(( $( jq .webradio $dirmpd/counts ) + 1 ))
	pushstream webradio $count
	sed -i 's/\("webradio": \).*/\1'$count'/' $dirmpd/counts
	;;
webradiodelete )
	url=${args[1]}
	urlname=${url//\//|}
	rm $dirwebradios/$urlname
	rm -f ${dirwebradios}img/$urlname{,-thumb}.jpg
	count=$(( $( jq .webradio $dirmpd/counts ) - 1 ))
	pushstream webradio $count
	sed -i 's/\("webradio": \).*/\1'$count'/' $dirmpd/counts
	;;
webradioedit ) # name, newname, url, newurl
	name=${args[1]}
	namenew=${args[2]}
	url=${args[3]}
	urlnew=$( urldecode ${args[4]} )
	urlname=${url//\//|}
	urlnamenew=${urlnew//\//|}
	filewebradio=$dirwebradios/$urlname
	filewebradionew=$dirwebradios/$urlnamenew
	if [[ $name != $namenew ]]; then
		if [[ -s $filewebradio ]]; then
			sed -i "1 c$namenew" $filewebradio
		else
			echo $namenew > $filewebradio
		fi
	fi
	if [[ $url != $urlnew ]]; then
		mv $filewebradio $filewebradionew
		mv ${dirwebradios}img/{$urlname,$urlnamenew}.jpg 
		mv ${dirwebradios}img/{$urlname,$urlnamenew}-thumb.jpg 
	fi
	;;
	
esac
