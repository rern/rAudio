#!/bin/bash

. /srv/http/bash/common.sh
dirimg=/srv/http/assets/img

args2var "$1"

plAddPlay() {
	pushstreamPlaylist add
	if [[ ${1: -4} == play ]]; then
		sleep $2
		mpc -q play $pos
		statusPush
	fi
}
plAddPosition() {
	if [[ ${1:0:7} == replace ]]; then
		mpc -q clear
		pos=1
	else
		pos=$(( $( mpc status %length% ) + 1 ))
	fi
}
plAddRandom() {
	local tail dir mpcls cuefile plL range file diffcount
	tail=$( plTail )
	(( $tail > 1 )) && pushstreamPlaylist add && return
	
	dir=$( shuf -n 1 $dirmpd/album | cut -d^ -f7 )
	mpcls=$( mpc ls "$dir" )
	cuefile=$( grep -m1 '\.cue$' <<< $mpcls )
	if [[ $cuefile ]]; then
		plL=$(( $( grep -c '^\s*TRACK' "/mnt/MPD/$cuefile" ) - 1 ))
		range=$( shuf -i 0-$plL -n 1 )
		file="$range $cuefile"
		grep -q -m1 "$file" $dirsystem/librandom && plAddRandom && return
		
		mpc --range=$range load "$cuefile"
	else
		file=$( shuf -n 1 <<< $mpcls )
		grep -q -m1 "$file" $dirsystem/librandom && plAddRandom && return
		
		mpc add "$file"
	fi
	diffcount=$(( $( jq .song $dirmpd/counts ) - $( wc -l < $dirsystem/librandom ) ))
	if (( $diffcount > 1 )); then
		echo $file >> $dirsystem/librandom
	else
		> $dirsystem/librandom
	fi
	(( $tail > 1 )) || plAddRandom
}
plTail() {
	local total pos
	total=$( mpc status %length% )
	pos=$( mpc status %songpos% )
	echo $(( total - pos ))
}
pushstreamPlaylist() {
	local arg
	[[ $1 ]] && arg=$1 || arg=current
	pushstream playlist $( php /srv/http/mpdplaylist.php $arg )
}
pushstreamSavedPlaylist() {
	pushstream savedplaylist $( php /srv/http/mpdplaylist.php list )
}
pushstreamRadioList() {
	pushstream radiolist '{"type":"webradio"}'
	webradioCopyBackup &> /dev/null &
}
pushstreamVolume() {
	pushstream volume '{"type":"'$1'","val":'$2'}'
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
scrobbleOnStop() {
	local elapsed
	. $dirshm/scrobble
	elapsed=$1
	if (( $Time > 30 && ( $elapsed > 240 || $elapsed > $Time / 2 ) )) && [[ $Artist && $Title ]]; then
		$dirbash/scrobble.sh "\
$Artist
$Title
$Album
CMD ARTIST TITLE ALBUM" &> /dev/null &
	fi
	rm -f $dirshm/scrobble
}
statusPush() {
	killProcess push
	$dirbash/status-push.sh
}
stopRadio() {
	if [[ -e $dirshm/radio ]]; then
		mpc -q stop
		systemctl stop radio
		[[ -e /etc/systemd/system/dab.service ]] && systemctl stop dab
		rm -f $dirshm/radio
		[[ $1 == stop ]] && statusPush
		sleep 1
	fi
}
urldecode() { # for webradio url to filename
	: "${*//+/ }"
	echo -e "${_//%/\\x}"
}
volumeGet() {
	local mixersoftware control
	if [[ -e $dirshm/btreceiver ]]; then
		for i in {1..5}; do # takes some seconds to be ready
			vol=$( amixer -MD bluealsa 2> /dev/null | grep -m1 % | sed -E 's/.*\[(.*)%].*/\1/' )
			[[ $vol ]] && echo $vol && break
			sleep 1
		done
		return
	fi
	
	[[ -e $dirshm/nosound ]] && echo -1 && return
	
	if [[ -e $dirsystem/snapclientserver ]]; then
		mixersoftware=
	elif grep -q mixer_type.*software $dirmpdconf/output.conf; then
		mixersoftware=1
	fi
	if [[ $( < $dirshm/player ) == mpd && $mixersoftware ]]; then
		mpc status %volume% | tr -dc [0-9]
	else
		card=$( < $dirsystem/asoundcard )
		control=$( getContent $dirshm/amixercontrol )
		if [[ ! $control ]]; then
			echo 100
		else
			amixer -M | grep -m1 % | sed -E 's/.*\[(.*)%].*/\1/'
		fi
	fi
}
volumeSet() {
	local current target control diff values
	current=$1
	target=$2
	control=$3
	diff=$(( $target - $current ))
	if (( -5 < $diff && $diff < 5 )); then
		volumeSetAt $target "$control"
	else # increment
		(( $diff > 0 )) && incr=5 || incr=-5
		values=( $( seq $(( current + incr )) $incr $target ) )
		(( $diff % 5 )) && values+=( $target )
		for i in "${values[@]}"; do
			volumeSetAt $i "$control"
			sleep 0.2
		done
	fi
	[[ $control && ! -e $dirshm/btreceiver ]] && alsactl store
}
volumeSetAt() {
	local target control
	target=$1
	control=$2
	if [[ -e $dirshm/btreceiver ]]; then
		amixer -MqD bluealsa sset "$control" $target% 2> /dev/null
		echo $target > "$dirsystem/btvolume-$control"
	elif [[ $control ]]; then
		amixer -Mq sset "$control" $target%
	else
		mpc -q volume $target
	fi
}
webradioCopyBackup() {
	local webradio
	if [[ -e $dirbackup/webradio ]]; then
		rm -rf $dirbackup/webradio
		cp -r $dirwebradio $dirbackup
		webradio=$( grep webradio $dirmpd/counts )
		sed -i "s/.*webradio.*/$webradio/" $dirbackup/mpd/counts
	fi
}
webradioCount() {
	local type count
	[[ $1 == dabradio ]] && type=dabradio || type=webradio
	count=$( find -L $dirdata/$type -type f ! -path '*/img/*' | wc -l )
	pushstream radiolist '{"type":"'$type'","count":'$count'}'
	grep -q -m1 "$type.*,"$ $dirmpd/counts && count+=,
	sed -i -E 's/("'$type'": ).*/\1'$count'/' $dirmpd/counts
}
webradioPlaylistVerify() {
	local ext url
	ext=$1
	url=$2
	if [[ $ext == m3u ]]; then
		url=$( curl -s $url 2> /dev/null | grep -m1 ^http )
	elif [[ $ext == pls ]]; then
		url=$( curl -s $url 2> /dev/null | grep -m1 ^File | cut -d= -f2 )
	fi
	[[ ! $url ]] && echo 'No valid URL found in:' && exit
}
webRadioSampling() {
	local url file data samplerate bitrate sample kb rate
	url=$1
	file=$2
	timeout 3 curl -sL $url -o /tmp/webradio
	[[ ! $( awk NF /tmp/webradio ) ]] && echo 'Cannot be streamed:' && exit
	
	data=( $( ffprobe -v quiet -select_streams a:0 \
				-show_entries stream=sample_rate \
				-show_entries format=bit_rate \
				-of default=noprint_wrappers=1:nokey=1 \
				/tmp/webradio ) )
	[[ ! $data ]] && 'No stream data found:' && exit
	
	samplerate=${data[0]}
	bitrate=${data[1]}
	sample="$( calc 1 $samplerate/1000 ) kHz"
	kb=$(( bitrate / 1000 ))
	rate="$(( ( ( kb + 4 ) / 8 ) * 8 )) kbit/s" # round to modulo 8
	sed -i "2 s|.*|$sample $rate|" "$file"
	rm /tmp/webradio
}

case $CMD in

albumignore )
	album=${args[1]}
	artist=${args[2]}
	sed -i "/\^$album^^$artist^/ d" $dirmpd/album
	sed -i "/\^$artist^^$album^/ d" $dirmpd/albumbyartist
	echo $album^^$artist >> $dirmpd/albumignore
	;;
audiocdtag )
	track=${args[1]}
	tag=${args[2]}
	discid=${args[3]}
	sed -i "$track s|.*|$tag|" $diraudiocd/$discid
	pushstreamPlaylist
	;;
bookmarkadd )
	name=${args[1]//\//|}
	path=${args[2]}
	bkfile="$dirbookmarks/$name"
	[[ -e $bkfile ]] && echo -1 && exit
	
	echo $path > "$bkfile"
	if [[ -e $dirsystem/order.json ]]; then
		order=$( jq '. + ["'$path'"]' $dirsystem/order.json )
		echo "$order" > $dirsystem/order.json
	fi
	pushstream bookmark 1
	;;
bookmarkcoverreset )
	name=${args[1]}
	path=$( < "$dirbookmarks/$name" )
	[[ ${path:0:1} != '/' ]] && path="/mnt/MPD/$path"
	rm -f "$path/coverart".*
	pushstream bookmark 1
	;;
bookmarkremove )
	file="$dirbookmarks/${args[1]//\//|}"
	path=$( < "$file" )
	if grep -q "$path" $dirsystem/order.json 2> /dev/null; then
		order=$( jq '. - ["'$path'"]' $dirsystem/order.json )
		echo "$order" > $dirsystem/order.json
	fi
	rm "$file"
	pushstream bookmark 1
	;;
bookmarkrename )
	name=${args[1]//\//|}
	newname=${args[2]//\//|}
	mv $dirbookmarks/{"$name","$newname"} 
	pushstream bookmark 1
	;;
camillagui )
	systemctl start camillagui
	sed -i '/Connection reset without closing handshake/ d' /var/log/camilladsp.log
	;;
color )
	hsl=${args[1]}
	file=$dirsystem/color
	if [[ $hsl == reset ]]; then
		rm -f $file
		hsl=( $( grep '\--cd *:' /srv/http/assets/css/colors.css \
					| sed 's/.*(\(.*\)).*/\1/' \
					| tr ',' ' ' \
					| tr -d % ) )
	else
		if [[ $hsl ]]; then
			echo $hsl > $file
			hsl=( $( echo $hsl ) )
		else  # from addons.sh, system.sh datarestore
			hsl=( $( < $file ) )
		fi
	fi
	h=${hsl[0]}; s=${hsl[1]}; l=${hsl[2]}
	hs="$h,$s%,"
	hsg="$h,3%,"
	hsl="${hs}$l%"

	sed -i -E "
 s|(--cml *: *hsl).*;|\1(${hs}$(( l + 5 ))%);|
  s|(--cm *: *hsl).*;|\1($hsl);|
 s|(--cma *: *hsl).*;|\1(${hs}$(( l - 5 ))%);|
 s|(--cmd *: *hsl).*;|\1(${hs}$(( l - 15 ))%);|
s|(--cg75 *: *hsl).*;|\1(${hsg}75%);|
s|(--cg60 *: *hsl).*;|\1(${hsg}60%);|
 s|(--cgl *: *hsl).*;|\1(${hsg}40%);|
  s|(--cg *: *hsl).*;|\1(${hsg}30%);|
 s|(--cga *: *hsl).*;|\1(${hsg}20%);|
 s|(--cgd *: *hsl).*;|\1(${hsg}10%);|
" /srv/http/assets/css/colors.css
	sed -i -E "
s|(rect.*hsl).*;|\1($hsl);|
s|(path.*hsl).*;|\1(${hsg}75%);|
" $dirimg/icon.svg
	sed -E "s|(path.*hsl).*;|\1(0,0%,90%);}|" $dirimg/icon.svg \
		| convert -density 96 -background none - $dirimg/icon.png
	rotate=$( grep ^rotate /etc/localbrowser.conf 2> /dev/null | cut -d= -f2 )
	[[ ! $rotate ]] && rotate=NORMAL
	rotateSplash $rotate
	sed -i -E 's/\?v=.{10}/?v='$( date +%s )'/g' /srv/http/settings/camillagui/build/index.html
	pushstream reload 1
	;;
coverartget )
	path=${args[1]}
	radio=${args[2]}
	if [[ $radio ]]; then
		coverartfile=$( ls -1 "$path".{gif,jpg} 2> /dev/null )
		[[ $coverartfile ]] && echo ${coverartfile/\/srv\/http}
		exit
	fi
	
	coverartfile=$( ls -1X "$path"/coverart.{gif,jpg,png} 2> /dev/null | head -1 )
	[[ $coverartfile ]] && echo ${coverartfile/\/srv\/http} && exit
	
	[[ ${path:0:4} == /srv ]] && exit
	
	coverfile=$( ls -1X "$path" \
					| grep -E -i '^cover\.|^folder\.|^front\.|^album\.' \
					| grep -E -i -m1 '\.gif$|\.jpg$|\.png$' ) # filename only
	if [[ $coverfile ]]; then
		ext=${coverfile: -3}
		coverartfile="$path/coverart.${ext,,}"
		cp "$path/$coverfile" "$coverartfile" 2> /dev/null
		[[ -e $coverartfile ]] && echo $coverartfile
	fi
	;;
coverartreset )
	coverfile=${args[1]}
	mpdpath=${args[2]}
	artist=${args[3]}
	album=${args[4]}
	dir=$( dirname "$coverfile" )
	filename=$( basename "$coverfile" )
	if [[ $( basename "$dir" ) == audiocd ]]; then
		id=${filename/.*}
		rm -f "$coverfile"
		$dirbash/status-coverartonline.sh "\
$artist
$album
audiocd
$id" &> /dev/null &
		exit
	fi
	
	rm -f "$coverfile" \
		"$dir/{coverart,thumb}".* \
		$dirshm/{embedded,local}/*
	backupfile=$( ls -p "$dir"/*.backup | head -1 )
	if [[ -e $backupfile ]]; then
		restorefile=${backupfile:0:-7}
		mv "$backupfile" "$restorefile"
		if [[ ${restorefile: -3} != gif ]]; then
			convert "$restorefile" -thumbnail 200x200\> -unsharp 0x.5 "$dir/coverart.jpg"
			convert "$dir/coverart.jpg" -thumbnail 80x80\> -unsharp 0x.5 "$dir/thumb.jpg"
		else
			gifsicle -O3 --resize-fit 200x200 "$restorefile" > "$dir/coverart.gif"
			convert "$restorefile" -thumbnail 80x80\> -unsharp 0x.5 "$dir/thumb.jpg"
		fi
	fi
	url=$( $dirbash/status-coverart.sh "\
$artist
$album
$mpdpath" )
	[[ ! $url ]] && url=reset
	pushstream coverart '{"url":"'$url'","type":"coverart"}'
	;;
coverfileslimit )
	for type in local online webradio; do
		ls -t $dirshm/$type/* 2> /dev/null \
			| tail -n +10 \
			| xargs rm -f --
	done
	;;
dabscan )
	touch $dirshm/updatingdab
	$dirbash/dab-scan.sh &> /dev/null &
	pushstream mpdupdate '{"type":"dabradio"}'
	;;
display )
	[[ -e $dirsystem/vumeter ]] && prevvumeter=1
	grep -q -m1 vumeter.*true $dirsystem/display.json && touch $dirsystem/vumeter && vumeter=1
	pushstream display $( < $dirsystem/display.json )
	[[ $prevvumeter == $vumeter ]] && exit
	
	killProcess cava
	if [[ $vumeter ]]; then
		if [[ -e $dirmpdconf/fifo.conf ]]; then
			if statePlay; then
				cava -p /etc/cava.conf | $dirbash/vu.sh &> /dev/null &
				echo $! > $dirshm/pidcava
			fi
			exit
			
		fi
	else
		rm -f $dirsystem/vumeter $dirshm/status
	fi
	$dirsettings/player-conf.sh
	;;
equalizer )
	if [[ $VALUES ]]; then # preset ( delete, rename, new - save json only )
		freq=( 31 63 125 250 500 1 2 4 8 16 )
		v=( $VALUES )
		for (( i=0; i < 10; i++ )); do
			(( i < 5 )) && unit=Hz || unit=kHz
			band=( "0$i. ${freq[i]} $unit" )
			sudo -u $USER amixer -MqD equal sset "$band" ${v[i]}
		done
	fi
	pushstream equalizer $( < $dirsystem/equalizer.json )
	;;
equalizerget )
	cat $dirsystem/equalizer.json 2> /dev/null || echo false
	;;
equalizerset ) # slide
	sudo -u $USER amixer -MqD equal sset "$BAND" $VAL
	;;
getelapsed )
	getElapsed
	;;
hashreset )
	! grep -q ^.hash.*time /srv/http/common.php && sed -E -i "s/(^.hash.*v=).*/\1'.time();/" /srv/http/common.php
	;;
ignoredir )
	touch $dirmpd/updating
	path=${args[1]}
	dir=$( basename "$path" )
	mpdpath=$( dirname "$path" )
	echo $dir >> "/mnt/MPD/$mpdpath/.mpdignore"
	pushstream mpdupdate '{"type":"mpd"}'
	mpc -q update "$mpdpath" #1 get .mpdignore into database
	mpc -q update "$mpdpath" #2 after .mpdignore was in database
	;;
latestclear )
	path=${args[1]}
	if [[ $path ]]; then
		sed -i "\|\^$path$| d" $dirmpd/latest
		count=$( wc -l < $dirmpd/latest )
		notify latest Latest 'Album cleared.'
	else
		> $dirmpd/latest
		count=0
		notify latest Latest Cleared
	fi
	sed -i -E 's/("latest": ).*/\1'$count',/' $dirmpd/counts
	;;
librandom )
	enable=${args[1]}
	if [[ $enable == false ]]; then
		rm -f $dirsystem/librandom
	else
		[[ ${args[2]} == true ]] && play=1
		mpc -q random 0
		tail=$( plTail )
		if [[ $play ]]; then
			playnext=$(( total + 1 ))
			(( $tail > 0 )) && mpc -q play $total && mpc -q stop
		fi
		touch $dirsystem/librandom
		plAddRandom
		[[ $play ]] && mpc -q play $playnext
	fi
	pushstream option '{"librandom":'$enable'}'
	;;
lyrics )
	artist=${args[1]}
	title=${args[2]}
	command=${args[3]}
	data=${args[4]}
	name="$artist - $title"
	name=${name//\/}
	lyricsfile="$dirlyrics/${name,,}.txt"
	if [[ $command == save ]]; then
		echo -e "$data" > "$lyricsfile"
	elif [[ $command == delete ]]; then
		rm -f "$lyricsfile"
	elif [[ -e "$lyricsfile" ]]; then
		cat "$lyricsfile"
	else
		if [[ -e $dirsystem/lyricsembedded ]]; then
			file=$command
			lyrics=$( kid3-cli -c "select \"$file\"" -c "get lyrics" )
			[[ $lyrics ]] && echo "$lyrics" && exit
		fi
		
		artist=$( sed -E 's/^A |^The |\///g' <<< $artist )
		title=${title//\/}
		query=$( tr -d " '\-\"\!*\(\);:@&=+$,?#[]." <<< "$artist/$title" )
		lyrics=$( curl -s -A firefox https://www.azlyrics.com/lyrics/${query,,}.html )
		if [[ $lyrics ]]; then
			sed -n '/id="cf_text_top"/,/id="azmxmbanner"/ p' <<< $lyrics \
				| sed -e '/^\s*$\|^</ d
					' -e '/\/div>/,/<br>/ {N;d}
					' -e 's/<br>//
					' -e 's/&quot;/"/g' \
				| tee "$lyricsfile"
		fi
	fi
	;;
mpcadd )
	item=${args[1]}
	command=${args[2]}
	delay=${args[3]}
	plAddPosition $command
	mpc -q add "$item"
	plAddPlay $command $delay
	pushstreamPlaylist add
	;;
mpcaddplaynext )
	mpc -q insert "${args[1]}"
	pushstreamPlaylist add
	;;
mpcaddrandom )
	plAddRandom
	;;
mpccrop )
	if statePlay; then
		mpc -q crop
	else
		mpc -q play
		mpc -q crop
		mpc -q stop
	fi
	[[ -e $dirsystem/librandom ]] && plAddRandom
	statusPush
	pushstreamPlaylist
	;;
mpcfindadd )
	if [[ ${args[1]} != multi ]]; then
		type=${args[1]}
		string=${args[2]}
		command=${args[3]}
		plAddPosition $command
		mpc -q findadd $type "$string"
	else
		type=${args[2]}
		string=${args[3]}
		type2=${args[4]}
		string2=${args[5]}
		command=${args[6]}
		plAddPosition $command
		mpc -q findadd $type "$string" $type2 "$string2"
	fi
	plAddPlay $command $delay
	;;
mpcload )
	playlist=${args[1]}
	command=${args[2]}
	delay=${args[3]}
	plAddPosition $command
	mpc -q load "$playlist"
	plAddPlay $command $delay
	;;
mpcls )
	dir=${args[1]}
	command=${args[2]}
	delay=${args[3]}
	plAddPosition $command
	readarray -t cuefiles <<< $( mpc ls "$dir" | grep '\.cue$' | sort -u )
	if [[ ! $cuefiles ]]; then
		mpc ls "$dir" | mpc -q add &> /dev/null
	else
		for cuefile in "${cuefiles[@]}"; do
			mpc -q load "$cuefile"
		done
	fi
	plAddPlay $command $delay
	;;
mpcmove )
	mpc -q move ${args[1]} ${args[2]}
	pushstreamPlaylist
	;;
mpcoption )
	option=${args[1]}
	onoff=${args[2]}
	mpc -q $option $onoff
	pushstream option '{"'$option'":'$onoff'}'
	;;
mpcplayback )
	command=${args[1]}
	pos=${args[2]} # if stop = elapsed
	if [[ ! $command ]]; then
		player=$( < $dirshm/player )
		if [[ $( < $dirshm/player ) != mpd ]]; then
			$dirbash/cmd.sh playerstop
			exit
		fi
		
		if statePlay; then
			grep -q -m1 webradio=true $dirshm/status && command=stop || command=pause
		else
			command=play
		fi
	fi
	stopRadio $command
	if [[ $command == play ]]; then
		[[ $( mpc status %state% ) == paused ]] && pause=1
		mpc -q $command $pos
		[[ $( mpc | head -c 4 ) == cdda && ! $pause ]] && notify -blink audiocd 'Audio CD' 'Start play ...'
	else
		[[ -e $dirsystem/scrobble && $command == stop && $pos ]] && cp -f $dirshm/{status,scrobble}
		mpc -q $command
		killProcess cava
		[[ -e $dirshm/scrobble ]] && scrobbleOnStop $pos
	fi
	[[ ! -e $dirsystem/snapclientserver ]] && exit
	# snapclient
	if [[ $command == play ]]; then
		action=start
		active=true
		sleep 2 # fix stutter
		touch $dirshm/snapclient
	else
		action=stop
		active=false
		rm $dirshm/snapclient
	fi
	systemctl $action snapclient
	pushstream option '{"snapclient":'$active'}'
	pushstream refresh '{"page":"features","snapclientactive":'$active'}'
	;;
mpcprevnext )
	command=${args[1]}
	elapsed=${args[2]}
	[[ ! $elapsed ]] && elapsed=$( getElapsed )
	current=$( mpc status %songpos% )
	length=$( mpc status %length% )
	[[ $( mpc status %state% ) == playing ]] && playing=1
	mpc -q stop
	stopRadio
	[[ -e $dirsystem/scrobble && $elapsed ]] && cp -f $dirshm/{status,scrobble}
	[[ ! $playing ]] && touch $dirshm/prevnextseek
	if [[ $( mpc status %random% ) == on ]]; then
		pos=$( shuf -n 1 <( seq $length | grep -v $current ) )
		mpc -q play $pos
	else
		if [[ $command == next ]]; then
			(( $current != $length )) && mpc -q play $(( current + 1 )) || mpc -q play 1
			[[ $( mpc status %consume% ) == on ]] && mpc -q del $current
			[[ -e $dirsystem/librandom ]] && plAddRandom
		else
			(( $current != 1 )) && mpc -q play $(( current - 1 )) || mpc -q play $length
		fi
	fi
	if [[ $playing ]]; then
		mpc -q play
		[[ $( mpc | head -c 4 ) == cdda ]] && notify -blink audiocd 'Audio CD' 'Change track ...'
	else
		rm -f $dirshm/prevnextseek
		mpc -q stop
	fi
	if [[ -e $dirshm/scrobble ]]; then
		sleep 2
		scrobbleOnStop $elapsed
	fi
	;;
mpcremove )
	pos=${args[1]}
	posprev=${args[2]}
	if [[ $pos ]]; then
		mpc -q del $pos
		[[ $posprev ]] && mpc -q play $posprev && mpc -q stop
	else
		mpc -q clear
	fi
	statusPush
	pushstreamPlaylist
	;;
mpcseek )
	seek=${args[1]}
	state=${args[2]}
	touch $dirshm/scrobble
	if [[ $state == stop ]]; then
		touch $dirshm/prevnextseek
		mpc -q play
		mpc -q pause
		rm $dirshm/prevnextseek
	fi
	mpc -q seek $seek
	rm -f $dirshm/scrobble
	;;
mpcsetcurrent )
	mpc -q play ${args[1]}
	mpc -q stop
	statusPush
	;;
mpcshuffle )
	mpc -q shuffle
	pushstreamPlaylist
	;;
mpcsimilar )
	plLprev=$( mpc status %length% )
	linesL=${#args[@]}
	for (( i=1; i < linesL; i++ )); do
		artist=${args[$i]}
		(( i++ ))
		title=${args[$i]}
		[[ ! $artist || ! $title ]] && continue
		
		file=$( mpc find artist "$artist" title "$title" )
		[[ ! $file ]] && continue
		
		list+="$( mpc find artist "$artist" title "$title" )
"
	done
	awk NF <<< $list | mpc -q add
	pushstreamPlaylist
	echo $(( $( mpc status %length% ) - plLprev ))
	;;
mpcupdate )
	path=${args[1]}
	echo $path > $dirmpd/updating
	[[ $path == rescan ]] && mpc -q rescan || mpc -q update "$path"
	pushstream mpdupdate '{"type":"mpd"}'
	;;
multiraudiolist )
	echo '{
  "current" : "'$( ipAddress )'"
, "list"    : '$( < $dirsystem/multiraudio.json )'
}'
	;;
order )
	pushstream order $( < $dirsystem/order.json )
	;;
playerstart )
	player=$( < $dirshm/player )
	mpc -q stop
	stopRadio
	case $player in
		airplay )   service=shairport-sync;;
		bluetooth ) service=bluetoothhd;;
		spotify )   service=spotifyd;;
		upnp )      service=upmpdcli;;
	esac
	for pid in $( pgrep $service ); do
		ionice -c 0 -n 0 -p $pid &> /dev/null 
		renice -n -19 -p $pid &> /dev/null
	done
	pushstream player '{"player":"'$player'","active":true}'
	;;
playerstop )
	elapsed=${args[1]}
	player=$( < $dirshm/player )
	if [[ -e $dirsystem/scrobble ]] && grep -q $player=true $dirsystem/scrobble.conf; then
		cp -f $dirshm/{status,scrobble}
	fi
	killProcess cava
	echo mpd > $dirshm/player
	[[ $player != upnp ]] && statusPush
	case $player in
		airplay )
			systemctl stop shairport
			rm -f $dirshm/airplay/start
			systemctl restart shairport-sync
			;;
		bluetooth )
			rm -f $dirshm/bluetoothdest
			systemctl restart bluetooth
			;;
		snapcast )
			$dirbash/snapcast.sh stop
			;;
		spotify )
			rm -f $dirshm/spotify/start
			systemctl restart spotifyd
			;;
		upnp )
			mpc -q stop
			tracks=$( mpc -f %file%^%position% playlist | grep 'http://192' | cut -d^ -f2 )
			for i in $tracks; do
				mpc -q del $i
			done
			statusPush
			systemctl restart upmpdcli
			;;
	esac
	pushstream player '{"player":"'$player'","active":false}'
	[[ -e $dirshm/scrobble && $elapsed ]] && scrobbleOnStop $elapsed
	;;
playlist )
	name=${args[1]}
	[[ ${args[2]} == true ]] && play=1
	[[ ${args[3]} == true ]] && replace=1
	[[ $replace ]] && mpc -q clear
	mpc -q load "$name"
	[[ $play ]] && sleep 1 && mpc -q play
	[[ $play || $replace ]] && $dirbash/push-status.sh
	pushstreamPlaylist
	;;
radiorestart )
	[[ -e $disshm/radiorestart ]] && exit
	
	touch $disshm/radiorestart
	systemctl -q is-active radio || systemctl start radio
	sleep 1
	rm $disshm/radiorestart
	;;
relaystimerreset )
	killProcess relays
	$dirbash/relays-timer.sh &> /dev/null &
	pushstream relays '{ "done": 1 }'
	;;
rotatesplash )
	rotateSplash ${args[1]}
	;;
savedpldelete )
	name=${args[1]}
	rm "$dirplaylists/$name.m3u"
	count=$( ls -1 $dirplaylists | wc -l )
	sed -i -E 's/(.*playlists": ).*/\1'$count',/' $dirmpd/counts
	pushstreamSavedPlaylist
	;;
savedpledit )
	name=${args[1]}
	type=${args[2]}
	data=${args[3]} # remove - file, add - position-file, move - from-to
	plfile="$dirplaylists/$name.m3u"
	if [[ $type == remove ]]; then
		sed -i "$data d" "$plfile"
	elif [[ $type == add ]]; then
		file=${args[4]}
		if [[ $data == first ]]; then
			sed -i "1 i$file" "$plfile"
		elif [[ $data == last ]]; then
			echo $file >> "$plfile"
		else
			sed -i "$data i$file" "$plfile"
		fi
	else
		from=$(( $data + 1 ))
		to=${args[4]}
		file=$( sed -n "$from p" "$plfile" )
		sed -i "$from d" "$plfile"
		[[ $to == 0 ]] && sed -i "1 i$file" "$plfile" || sed -i "$to a$file" "$plfile"
	fi
	pushstreamSavedPlaylist
	;;
savedplrename )
	oldname=${args[1]}
	name=${args[2]}
	replace=${args[3]}
	plfile="$dirplaylists/$name.m3u"
	if [[ $replace ]]; then
		rm -f "$plfile"
	elif [[ -e "$plfile" ]]; then
		echo -1
		exit
	fi
	
	mv "$dirplaylists/$oldname.m3u" "$plfile"
	pushstreamSavedPlaylist
	;;
savedplsave )
	name=${args[1]}
	replace=${args[2]}
	plfile="$dirplaylists/$name.m3u"
	if [[ $replace ]]; then
		rm -f "$plfile"
	elif [[ -e "$plfile" ]]; then
		echo -1
		exit
	fi
	
	mpc -q save "$name"
	chmod 777 "$plfile"
	count=$( ls -1 $dirplaylists | wc -l )
	sed -E -i 's/(,*)(.*playlists" *: ).*(,)/\1\2'$count'\3/' $dirmpd/counts
	pushstreamSavedPlaylist
	;;
screenoff )
	DISPLAY=:0 xset ${args[1]}
	;;
shairport )
	[[ $( < $dirshm/player ) != airplay ]] && $dirbash/cmd.sh playerstart$'\n'airplay
	systemctl start shairport
	echo play > $dirshm/airplay/state
	statusPush
	;;
shairportstop )
	systemctl stop shairport
	echo pause > $dirshm/airplay/state
	[[ -e $dirshm/airplay/start ]] && start=$( < $dirshm/airplay/start ) || start=0
	timestamp=$( date +%s%3N )
	echo $(( timestamp - start - 7500 )) > $dirshm/airplay/elapsed # delayed 7s
	statusPush
	;;
volume ) # no args = toggle mute / unmute
	[[ $current == drag ]] && volumeSetAt $target "$control" && exit
	
	[[ ! $current ]] && current=$( volumeGet )
	filevolumemute=$dirsystem/volumemute
	if [[ $target > 0 ]]; then      # set
		rm -f $filevolumemute
		pushstreamVolume set $target
	else
		if (( $current > 0 )); then # mute
			target=0
			echo $current > $filevolumemute
			pushstreamVolume mute $current
		else                        # unmute
			target=$( < $filevolumemute )
			rm -f $filevolumemute
			pushstreamVolume unmute $target
		fi
	fi
	volumeSet $current $target "$control"
	;;
volumeget )
	volumeGet
	;;
volumepushstream )
	pushstream volume '{"val":'$( volumeGet )'}'
	;;
volumeupdn )
	volumeUpDn 1%$updn "$control"
	;;
volumeupdnbt )
	volumeUpDnBt 1%$updn "$control"
	;;
volumeupdnmpc )
	volumeUpDnMpc ${updn}1
	;;
vumeter )
	! grep -q vu.*true $dirsystem/display.json && exit
	
	html='<div id="vu" class="hide">'
	html+="$( < /srv/http/assets/img/vu.svg )</div>"
	echo "$html"
	;;
webradioadd )
	dir=${args[1]}
	name=${args[2]}
	url=$( urldecode ${args[3]} )
	charset=${args[4]}
	urlname=${url//\//|}
	ext=${url/*.}
	[[ $ext == m3u || $ext == pls ]] && webradioPlaylistVerify $ext $url
	
	file=$dirwebradio
	[[ $dir ]] && file+="/$dir"
	file+="/$urlname"
	[[ -e $file ]] && echo 'Already exists as <wh>'$( head -1 "$file" )'</wh>:' && exit
	echo "\
$name

$charset" > "$file"
	chown http:http "$file" # for edit in php
	webradioCount
	webRadioSampling $url "$file" &> /dev/null &
	;;
webradiocopybackup )
	webradioCopyBackup &> /dev/null &
	;;
webradiocoverreset )
	filenoext=${args[1]}
	type=${args[2]}
	rm "$filenoext".* "$filenoext-thumb".*
	pushstream coverart '{"type":"'$mode'","url":""}'
	;;
webradiodelete )
	dir=${args[1]}
	url=${args[2]}
	mode=${args[3]}
	urlname=${url//\//|}
	path=$dirdata/$mode
	[[ $dir ]] && path+="/$dir"
	rm -f "$path/$urlname"
	[[ ! $( find "$path" -name "$urlname" ) ]] && rm -f "$path/img/{$urlname,$urlname-thumb}".*
	webradioCount $mode
	;;
webradioedit )
	dir=${args[1]}
	name=${args[2]}
	newurl=${args[3]}
	charset=${args[4]}
	url=${args[5]}
	newurlname=${newurl//\//|}
	urlname=${url//\//|}
	path=$dirwebradio/
	[[ $dir ]] && path+="/$dir"
	newfile="$path/$newurlname"
	prevfile="$path/$urlname"
	if [[ $newurl == $url ]]; then
		sampling=$( sed -n 2p "$prevfile" )
	else
		[[ -e $newfile ]] && echo 'URL exists:' && exit
		
		ext=${newurl##*.}
		[[ $ext == m3u || $ext == pls ]] && webradioPlaylistVerify $ext $newurl
		
		rm "$prevfile"
		# stationcover
		imgurl="$dirwebradio/img/$urlname"
		img=$( ls -1 "$imgurl".* | head -1 )
		thumb="$imgurl-thumb.jpg"
		if [[ $img || -e $thumb ]]; then
			newimgurl="$dirwebradio/img/$newurlname"
			newimg="$newimgurl.${img##*.}"
			newthumb="$newimgurl-thumb.jpg"
			[[ ! -e $newimg && -e $img ]] && cp "$img" "$newimg"
			[[ ! -e $newthumb && -e $thumb ]] && cp "$thumb" "$newthumb"
			[[ ! $( find $dirwebradio -name "$urlname" ) ]] && rm -f "$imgurl".* "$thumb"
		fi
	fi
	echo "\
$name
$sampling
$charset" > "$newfile"
	pushstreamRadioList
	;;
wrdirdelete )
	path=${args[1]}
	mode=${args[2]}
	noconfirm=${args[3]}
	if [[ ! $noconfirm && $( ls -A "$dirdata/$mode/$path" ) ]]; then
		echo -1
	else
		rm -rf "$dirdata/$mode/$path"
		pushstreamRadioList
	fi
	;;
wrdirnew )
	dir=${args[1]}
	sub=${args[2]}
	[[ $dir ]] && mkdir -p "$dirwebradio/$dir/$path" || mkdir -p "$dirwebradio/$sub"
	pushstreamRadioList
	;;
wrdirrename )
	path=${args[1]}
	name=${args[2]}
	newname=${args[3]}
	mv -f "$dirdata/$path/{$name,$newname}"
	pushstreamRadioList
	;;
	
esac
