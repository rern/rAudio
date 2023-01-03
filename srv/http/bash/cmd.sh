#!/bin/bash

. /srv/http/bash/common.sh
dirimg=/srv/http/assets/img

# convert each line to each args
readarray -t args <<< $1

addonsListGet() {
	: >/dev/tcp/8.8.8.8/53 || ( echo -2 && exit ) # online check
	
	[[ ! $1 ]] && branch=main || branch=$1
	curl -sfL https://github.com/rern/rAudio-addons/raw/$branch/addons-list.json -o $diraddons/addons-list.json
	[[ $? != 0 ]] && echo -1 && exit
}
equalizerAmixer() { # sudo - mixer equal is user dependent
	sudo -u mpd amixer -MD equal contents \
					| grep ': values' \
					| cut -d, -f2 \
					| xargs
}
equalizerGet() {
	val=$( equalizerAmixer )
	filepresets=$dirsystem/equalizer.presets
	[[ -e $dirshm/btreceiver ]] && filepresets+="-$( < $dirshm/btreceiver )"
	[[ ! -e $filepresets ]] && echo Flat > "$filepresets"
	
	if [[ $2 == set ]]; then
		current='(unnamed)'
		sed -i "1 s/.*/(unnamed)/" "$filepresets"
	else
		current=$( head -1 "$filepresets" )
	fi
	[[ $current != '(unnamed)' ]] && presets+='"Flat"' || presets+='"(unnamed)","Flat"'
	readarray -t lines <<< $( sed 1d "$filepresets" | grep -v '^Flat$' | sort )
	if [[ $lines ]]; then
		for line in "${lines[@]}"; do
			name=${line/^*}
			presets+=',"'$name'"'
			nameval+=',"'$name'":"'${line/*^}'"'
		done
	fi
	data='{
  "current" : "'$current'"
, "values"  : [ '${val// /,}' ]
, "presets" : [ '$presets' ]
, "nameval" : { '${nameval:1}' }
}'
	[[ $1 == pushstream ]] && pushstream equalizer "$data" || echo $data
}
plAddPlay() {
	pushstreamPlaylist add
	if [[ ${1: -4} == play ]]; then
		sleep $2
		mpc -q play $pos
		$dirbash/status-push.sh
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
	total=$( mpc status %length% )
	pos=$( mpc status %songpos% )
	echo $(( total - pos ))
}
pushstreamPlaylist() {
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
	. $dirshm/scrobble
	elapsed=$1
	if (( $Time > 30 && ( $elapsed > 240 || $elapsed > $Time / 2 ) )) && [[ $Artist && $Title ]]; then
		$dirbash/scrobble.sh "\
$Artist
$Title
$Album" &> /dev/null &
	fi
	rm -f $dirshm/scrobble
}
stopRadio() {
	if [[ -e $dirshm/radio ]]; then
		mpc -q stop
		systemctl stop radio
		[[ -e /etc/systemd/system/dab.service ]] && systemctl stop dab
		rm -f $dirshm/radio
		[[ $1 == stop ]] && $dirbash/status-push.sh
		sleep 1
	fi
}
urldecode() { # for webradio url to filename
	: "${*//+/ }"
	echo -e "${_//%/\\x}"
}
volumeGet() {
	[[ -e $dirshm/btreceiver ]] && volumeGetBt && return
	
	[[ -e $dirshm/nosound ]] && echo -1 && return
	
	if [[ -e $dirsystem/snapclientserver ]]; then
		mixersoftware=
	elif grep -q mixer_type.*software $dirmpdconf/output.conf; then
		mixersoftware=1
	fi
	if [[ $( < $dirshm/player ) == mpd && $mixersoftware ]]; then
		mpc status %volume% | tr -d ' %n/a'
	else
		card=$( < $dirsystem/asoundcard )
		control=$( getContent $dirshm/amixercontrol )
		if [[ ! $control ]]; then
			echo 100
		else
			amixer -c $card -M sget "$control" | grep -m1 % | sed -E 's/.*\[(.*)%].*/\1/'
		fi
	fi
}
volumeGetBt() {
	control=$( < $dirshm/btreceiver )
	for i in {1..5}; do # takes some seconds to be ready
		val=$( amixer -MD bluealsa 2> /dev/null | grep -m1 % | sed -E 's/.*\[(.*)%].*/\1/' )
		[[ $val ]] && echo $val && break
		sleep 1
	done
}
volumeSet() {
	current=$1
	target=$2
	card=$3
	control=$4
	diff=$(( $target - $current ))
	pushstreamVolume disable true
	if (( -5 < $diff && $diff < 5 )); then
		volumeSetAt $target $card "$control"
	else # increment
		(( $diff > 0 )) && incr=5 || incr=-5
		values=( $( seq $(( current + incr )) $incr $target ) )
		(( $diff % 5 )) && values+=( $target )
		for i in "${values[@]}"; do
			volumeSetAt $i $card "$control"
			sleep 0.2
		done
	fi
	pushstreamVolume disable false
	[[ $control && ! -e $dirshm/btreceiver ]] && alsactl store
}
volumeSetAt() {
	target=$1
	card=$2
	control=$3
	if [[ -e $dirshm/btreceiver ]]; then
		amixer -MqD bluealsa sset "$control" $target% 2> /dev/null
		echo $target > "$dirsystem/btvolume-$control"
	elif [[ $control ]]; then
		amixer -c $card -Mq sset "$control" $target%
	else
		mpc -q volume $target
	fi
}
webradioCopyBackup() {
	if [[ -e $dirbackup/webradio ]]; then
		rm -rf $dirbackup/webradio
		cp -r $dirwebradio $dirbackup
		webradio=$( grep webradio $dirmpd/counts )
		sed -i "s/.*webradio.*/$webradio/" $dirbackup/mpd/counts
	fi
}
webradioCount() {
	[[ $1 == dabradio ]] && type=dabradio || type=webradio
	count=$( find -L $dirdata/$type -type f ! -path '*/img/*' | wc -l )
	pushstream radiolist '{"type":"'$type'","count":'$count'}'
	grep -q -m1 "$type.*,"$ $dirmpd/counts && count+=,
	sed -i -E 's/("'$type'": ).*/\1'$count'/' $dirmpd/counts
}
webradioPlaylistVerify() {
	ext=$1
	url=$2
	if [[ $ext == m3u ]]; then
		url=$( curl -s $url 2> /dev/null | grep -m1 ^http )
	elif [[ $ext == pls ]]; then
		url=$( curl -s $url 2> /dev/null | grep -m1 ^File | cut -d= -f2 )
	fi
	[[ ! $url ]] && echo 'No valid URL found:' && exit
}
webRadioSampling() {
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

case ${args[0]} in

addonslist )
	addonsListGet ${args[1]}
	bash=$( jq -r .push.bash $diraddons/addons-list.json ) # push bash
	if [[ $bash ]]; then
		eval "$bash" || exit
	fi
	
	url=$( jq -r .push.url $diraddons/addons-list.json ) # push download
	[[ $url ]] && bash <( curl -sL $url )
	;;
addonsupdates )
	addonsListGet
	installed=$( ls "$diraddons" | grep -v addons-list )
	for addon in $installed; do
		verinstalled=$( < $diraddons/$addon )
		if (( ${#verinstalled} > 1 )); then
			verlist=$( jq -r .$addon.version $diraddons/addons-list.json )
			[[ $verinstalled != $verlist ]] && count=1 && break
		fi
	done
	if [[ $count ]]; then
		pushstream option '{"addons":1}'
		touch $diraddons/update
	else
		rm -f $diraddons/update
	fi
	;;
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
	if [[ -e $dirsystem/order ]]; then
		order=$( jq < $dirsystem/order | jq '. + ["'"$path"'"]' )
		echo "$order" > $dirsystem/order
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
	if [[ -e $dirsystem/order ]]; then
		path=$( < "$file" )
		order=$( jq < $dirsystem/order | jq '. - ["'"$path"'"]' )
		echo "$order" > $dirsystem/order
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
		reset=1
		rm -f $file
		hsl=( $( grep '\-\-cd *:' /srv/http/assets/css/colors.css \
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
s|(.box.*hsl).*|\1($hsl);}|
s|(path.*hsl).*|\1(${hsg}75%);}|
" $dirimg/icon.svg
	sed -E "s|(path.*hsl).*|\1(0,0%,90%);}|" $dirimg/icon.svg \
		| convert -density 96 -background none - $dirimg/icon.png
	rotate=$( grep ^rotate /etc/localbrowser.conf 2> /dev/null | cut -d= -f2 )
	[[ ! $rotate ]] && rotate=NORMAL
	rotateSplash $rotate
	sed -i -E 's/\?v=.{10}/?v='$( date +%s )'/g' /srv/http/settings/camillagui/build/index.html
	[[ ! $reset ]] && pushstream reload 1
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
displaysave )
	data=${args[1]}
	pushstream display "$data"
	jq -S <<< $data > $dirsystem/display
	grep -q -m1 '"vumeter".*true' $dirsystem/display && vumeter=1
	[[ -e $dirsystem/vumeter ]] && prevvumeter=1
	[[ $prevvumeter == $vumeter ]] && exit
	
	if [[ $vumeter ]]; then
		grep -q -m1 '^state.*play' $dirshm/status && cava -p /etc/cava.conf | $dirbash/vu.sh &> /dev/null &
		touch $dirsystem/vumeter
		[[ -e $dirmpdconf/fifo.conf ]] && exit
		
	else
		killall cava &> /dev/null
		rm -f $dirsystem/vumeter
		notify -blink playback Playback 'VU meter disable...'
	fi
	$dirsettings/player-conf.sh
	;;
equalizer )
	type=${args[1]} # preset, delete, rename, new, save
	name=${args[2]}
	newname=${args[3]}
	filepresets=$dirsystem/equalizer.presets
	[[ -e $dirshm/btreceiver ]] && filepresets+="-$( < $dirshm/btreceiver )"
	if [[ $type == rename ]]; then
		sed -i -e "1 s/.*/$newname/
" -e "s/^$name^/$newname^/
" "$filepresets"
		equalizerGet pushstream
		exit
	fi
	
	flat='62 62 62 62 62 62 62 62 62 62'
	if [[ $type == preset ]]; then
		[[ $name == Flat ]] && v=( $flat ) || v=( $( grep "^$name\^" "$filepresets" | cut -d^ -f2- ) )
	else # remove then save again with current values
		append=1
		sed -i "/^$name^/ d" "$filepresets" 2> /dev/null
		if [[ $type == delete ]]; then
			v=( $flat )
			name=Flat
		fi
	fi
	sed -i "1 s/.*/$name/" "$filepresets"
	if [[ $type == preset || $type == delete ]]; then
		freq=( 31 63 125 250 500 1 2 4 8 16 )
		for (( i=0; i < 10; i++ )); do
			(( i < 5 )) && unit=Hz || unit=kHz
			band=( "0$i. ${freq[i]} $unit" )
			sudo -u mpd amixer -MqD equal sset "$band" ${v[i]}
		done
	fi
	val=$( equalizerAmixer )
	[[ $append && $name != Flat ]] && echo $name^$val >> "$filepresets"
	equalizerGet pushstream
	;;
equalizerget )
	equalizerGet ${args[1]} ${args[2]}
	;;
equalizerupdn )
	band=${args[1]}
	val=${args[2]}
	sudo -u mpd amixer -D equal sset "$band" $val
	;;
getelapsed )
	getElapsed
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
	> $dirmpd/latest
	sed -i -E 's/("latest": ).*/\10,/' $dirmpd/counts
	notify latest Latest Cleared
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
	cmd=${args[3]}
	data=${args[4]}
	name="$artist - $title"
	name=${name//\/}
	lyricsfile="$dirlyrics/${name,,}.txt"
	if [[ $cmd == save ]]; then
		echo -e "$data" > "$lyricsfile"
	elif [[ $cmd == delete ]]; then
		rm -f "$lyricsfile"
	elif [[ -e "$lyricsfile" ]]; then
		cat "$lyricsfile"
	else
		if [[ -e $dirsystem/lyricsembedded ]]; then
			file=$cmd
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
	cmd=${args[2]}
	delay=${args[3]}
	plAddPosition $cmd
	mpc -q add "$item"
	plAddPlay $cmd $delay
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
	if grep -q -m1 '^state.*play' $dirshm/status; then
		mpc -q crop
	else
		mpc -q play
		mpc -q crop
		mpc -q stop
	fi
	[[ -e $dirsystem/librandom ]] && plAddRandom
	$dirbash/status-push.sh
	pushstreamPlaylist
	;;
mpcfindadd )
	if [[ ${args[1]} != multi ]]; then
		type=${args[1]}
		string=${args[2]}
		cmd=${args[3]}
		plAddPosition $cmd
		mpc -q findadd $type "$string"
	else
		type=${args[2]}
		string=${args[3]}
		type2=${args[4]}
		string2=${args[5]}
		cmd=${args[6]}
		plAddPosition $cmd
		mpc -q findadd $type "$string" $type2 "$string2"
	fi
	plAddPlay $cmd $delay
	;;
mpcload )
	playlist=${args[1]}
	cmd=${args[2]}
	delay=${args[3]}
	plAddPosition $cmd
	mpc -q load "$playlist"
	plAddPlay $cmd $delay
	;;
mpcls )
	dir=${args[1]}
	cmd=${args[2]}
	delay=${args[3]}
	plAddPosition $cmd
	readarray -t cuefiles <<< $( mpc ls "$dir" | grep '\.cue$' | sort -u )
	if [[ ! $cuefiles ]]; then
		mpc ls "$dir" | mpc -q add &> /dev/null
	else
		for cuefile in "${cuefiles[@]}"; do
			mpc -q load "$cuefile"
		done
	fi
	plAddPlay $cmd $delay
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
		
		if grep -q -m1 '^state.*play' $dirshm/status; then
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
		killall cava &> /dev/null
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
	stopRadio
	if [[ ${args[2]} ]]; then
		current=$(( ${args[2]} + 1 ))
		length=${args[3]}
		state=${args[4]}
		elapsed=${args[5]}
	else
		status=( $( $dirbash/status.sh | jq -r .song,.pllength,.state,.elapsed ) )
		current=${status[0]}
		length=${status[1]}
		state=${status[2]}
		elapsed=${status[3]}
	fi
	[[ -e $dirsystem/scrobble && $elapsed ]] && cp -f $dirshm/{status,scrobble}
	touch $dirshm/prevnextseek
	if [[ $state == play ]]; then
		mpc -q stop
		rm -f $dirshm/prevnextseek
	fi
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
	if [[ $state == play ]]; then
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
	$dirbash/status-push.sh
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
	$dirbash/status-push.sh
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
ordersave )
	data=$( jq <<< ${args[1]} )
	pushstream order "$data"
	echo "$data" > $dirsystem/order
	;;
playerstart )
	player=${args[1]}
	mpc -q stop
	stopRadio
	echo $player > $dirshm/player
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
	[[ -e $dirsystem/scrobble && -e $dirsystem/scrobble.conf/$player ]] && cp -f $dirshm/{status,scrobble}
	killall cava &> /dev/null
	echo mpd > $dirshm/player
	[[ $player != upnp ]] && $dirbash/status-push.sh
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
			$dirbash/status-push.sh
			systemctl restart upmpdcli
			;;
	esac
	pushstream player '{"player":"'$player'","active":false}'
	[[ -e $dirshm/scrobble && $elapsed ]] && scrobbleOnStop $elapsed
	;;
power )
	action=${args[1]}
	rserverok=${args[2]}
	if [[ -L $dirshareddata ]]; then # server rAudio
		[[ ! $rserverok && $( ls /proc/fs/nfsd/clients 2> /dev/null ) ]] && echo -1 && exit
		
		cp $filesharedip{,.backup}
		ips=$( grep -v $( ipAddress ) $filesharedip )
		if [[ $ips ]]; then
			for ip in $ips; do
				sshCommand $ip $dirsettings/system.sh shareddatadisconnect
			done
		fi
	elif [[ -e $filesharedip ]]; then # rclient
		sed -i "/$( ipAddress )/ d" $filesharedip
	fi
	
	notify -blink $action Power "${action^} ..."
	touch $dirshm/power
	mpc -q stop
	alsactl store
	pushstream btreceiver false
	if [[ -e $dirshm/clientip ]]; then
		clientip=$( < $dirshm/clientip )
		for ip in $clientip; do
			sshCommand $ip $dirbash/cmd.sh playerstop
		done
	fi
	cdda=$( mpc -f %file%^%position% playlist | grep ^cdda: | cut -d^ -f2 )
	[[ $cdda ]] && mpc -q del $cdda
	[[ -e $dirshm/relayson ]] && $dirsettings/relays.sh && sleep 2
	systemctl -q is-active camilladsp && camilladsp-gain.py
	ply-image /srv/http/assets/img/splash.png &> /dev/null
	if mount | grep -q -m1 $dirnas; then
		umount -l $dirnas/* &> /dev/null
		sleep 3
	fi
	[[ -e /boot/shutdown.sh ]] && . /boot/shutdown.sh
	[[ $action == reboot ]] && reboot && exit
	
	[[ -e $dirsystem/lcdchar ]] && lcdchar.py off
	poweroff
	;;
radiorestart )
	[[ -e $disshm/radiorestart ]] && exit
	
	touch $disshm/radiorestart
	systemctl -q is-active radio || systemctl start radio
	sleep 1
	rm $disshm/radiorestart
	;;
relaystimerreset )
	killall relays-timer.sh &> /dev/null
	$dirsettings/relays-timer.sh &> /dev/null &
	pushstream relays '{"state":"RESET"}'
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
scrobble )
	$dirbash/scrobble.sh "\
${args[1]}
${args[2]}
${args[3]}" &> /dev/null &
	;;
shairport )
	[[ $( < $dirshm/player ) != airplay ]] && $dirbash/cmd.sh playerstart$'\n'airplay
	systemctl start shairport
	echo play > $dirshm/airplay/state
	$dirbash/status-push.sh
	;;
shairportstop )
	systemctl stop shairport
	echo pause > $dirshm/airplay/state
	[[ -e $dirshm/airplay/start ]] && start=$( < $dirshm/airplay/start ) || start=0
	timestamp=$( date +%s%3N )
	echo $(( timestamp - start - 7500 )) > $dirshm/airplay/elapsed # delayed 7s
	$dirbash/status-push.sh
	;;
volume ) # no args = toggle mute / unmute
	current=${args[1]}
	target=${args[2]}
	card=${args[3]}
	control=${args[4]}
	[[ $current == drag ]] && volumeSetAt $target $card "$control" && exit
	
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
	volumeSet $current $target $card "$control"
	;;
volumeget )
	volumeGet
	;;
volumepushstream )
	pushstream volume '{"val":'$( volumeGet )'}'
	;;
volumeupdown )
	updn=${args[1]}
	card=${args[2]}
	control=${args[3]}
	if [[ -e $dirshm/btreceiver ]]; then
		amixer -MqD bluealsa sset "$control" 1%$updn 2> /dev/null
	else
		if [[ $control ]]; then
			amixer -c $card -Mq sset "$control" 1%$updn
		else
			mpc -q volume ${updn}1
		fi
	fi
	pushstreamVolume updn $( volumeGet )
	;;
webradioadd )
	dir=${args[1]}
	name=${args[2]}
	url=$( urldecode ${args[3]} )
	charset=${args[4]}
	urlname=${url//\//|}
	ext=${url/*.}
	[[ $ext == m3u || $ext == pls ]] && webradioPlaylistVerify $ext $url
	[[ $dir ]] && file="$dirwebradio/$dir/$urlname" || file="$dirwebradio/$urlname"
	[[ -e "$file" ]] && echo 'Already exists as <wh>'$( head -1 "$file" )'</wh>:' && exit
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
	pushstream coverart '{"type":"radio","url":""}'
	;;
webradiodelete )
	dir=${args[1]}
	url=${args[2]}
	type=${args[3]}
	urlname=${url//\//|}
	path=$dirdata/$type
	[[ $dir ]] && path+="/$dir"
	rm -f "$path/$urlname"
	[[ ! $( find $dir -name $urlname ) ]] && rm -f "$path/img/$urlname."* "$path/img/$urlname-thumb".*
	webradioCount $type
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
	mode=${args[4]}
	mv -f "$dirdata/$mode/$path/$name" "$dirdata/$mode/$path/$newname"
	pushstreamRadioList
	;;
webradioedit )
	dir=${args[1]}
	name=${args[2]}
	url=${args[3]}
	charset=${args[4]}
	urlprev=${args[5]}
	urlname=${url//\//|}
	[[ $url != $urlprev ]] && urlchanged=1
	[[ $dir ]] && file="$dirwebradio/$dir/$urlname" || file="$dirwebradio/$urlname"
	if [[ $urlchanged ]]; then
		ext=${url/*.}
		[[ $ext == m3u || $ext == pls ]] && webradioPlaylistVerify $ext $url
		
		[[ -e "$file" ]] && echo -1 && exit
		
	fi
	sampling=$( sed -n 2p "$file" 2> /dev/null )
	echo "\
$name
$sampling
$charset" > "$file"
	if [[ $urlchanged ]]; then
		urlprevname=${urlprev//\//|}
		[[ $dir ]] && rm "$dirwebradio/$dir/$urlprevname" || rm "$dirwebradio/$urlprevname"
		mv $dirwebradio/img/{$urlprevname,$urlname}.* # jpg / gif
		mv $dirwebradio/img/{$urlprevname,$urlname}-thumb.*
		webRadioSampling $url "$file" &
	fi
	pushstreamRadioList
	;;
	
esac
