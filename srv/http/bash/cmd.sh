#!/bin/bash

. /srv/http/bash/common.sh
dirimg=/srv/http/assets/img

echo "$1" > $dirshm/z
args2var "$1"

plAddPlay() {
	if [[ ${ACTION: -4} == play ]]; then
		playerActive mpd && radioStop || playerStop
		mpc -q play $1
	fi
	pushPlaylist
}
plAddPosition() {
	[[ $ACTION == replaceplay ]] && touch $dirshm/skip
	if [[ ${ACTION:0:7} == replace ]]; then
		plClear
		rm $dirshm/skip
	fi
	echo $(( $( mpc status %length% ) + 1 ))
}
plAddRandom() {
	local ab cuefile dir dirlast len_pos mpcls plL range
	len_pos=( $( mpc status '%length% %songpos%' ) )
	(( $(( ${len_pos[0]} - ${len_pos[1]} )) > 2 )) && plAddPlay $pos && return # $pos from librandom
	
	dir=$( shuf -n 1 $dirmpd/album | cut -d^ -f7 )
	dirlast=$( dirname "$( mpc -f %file% playlist | tail -1 )" )
	if [[ $dir == $dirlast ]]; then # force different album
		[[ $( sed -n '$p' $dirmpd/album ) == $dir ]] && ab=B1 || ab=A1
		dir=$( grep -$ab "\^$dir$" $dirmpd/album | head -1 | cut -d^ -f7 )
	fi
	if [[ -s $dirsystem/librandom ]]; then # album
		mpc -q add "$dir"
	else
		mpcls=$( mpc ls "$dir" )
		cuefile=$( grep -m1 '\.cue$' <<< $mpcls )
		if [[ $cuefile ]]; then
			plL=$(( $( grep -c '^\s*TRACK' "/mnt/MPD/$cuefile" ) - 1 ))
			range=$( shuf -i 0-$plL -n 1 )
			mpc --range=$range load "$cuefile"
		else
			mpc -q add "$( shuf -n 1 <<< $mpcls )"
		fi
	fi
	plAddRandom
}
playerStart() {
	local player service
	if [[ -e $dirshm/bluetoothsink ]]; then
		player=bluetooth
		echo bluetooth > $dirshm/player
	else
		player=$( < $dirshm/player )
	fi
	radioStop
	mpc -q stop
	case $player in
		airplay )   service=shairport-sync;;
		bluetooth ) service=bluetoothhd;;
		spotify )   service=spotifyd;;
		upnp )      service=upmpdcli;;
	esac
	if [[ $service ]]; then
		for pid in $( pgrep $service ); do
			ionice -c 0 -n 0 -p $pid &> /dev/null 
			renice -n -19 -p $pid &> /dev/null
		done
	fi
	pushData player '{ "player": "'$player'", "active": true }'
}
playerStop() {
	local player
	player=$( < $dirshm/player )
	echo mpd > $dirshm/player
	[[ -e $dirsystem/scrobble && $ELAPSED ]] && echo $ELAPSED > $dirshm/elapsed
	$dirbash/status-push.sh
	case $player in
		airplay )
			shairportStop
			;;
		bluetooth )
			rm -f $dirshm/{bluetoothdest,bluetoothsink}
			systemctl restart bluetooth
			;;
		mpd )
			radioStop
			mpc -q stop
			;;
		snapcast )
			$dirbash/snapclient.sh stop
			;;
		spotify )
			rm -f $dirshm/spotify/start
			systemctl restart spotifyd
			;;
		upnp )
			systemctl restart upmpdcli
			mpc -q clear
			$dirbash/status-push.sh
			;;
	esac
	[[ $player != mpd ]] && pushData player '{ "player": "'$player'", "active": false }'
}
plClear() {
	mpc -q clear
	radioStop
	rm -f $dirsystem/librandom
	pushData playlist '{ "refresh": -1 }'
}
pushPlaylist() {
	pushData playlist '{ "refresh": true }'
}
pushRadioList() {
	pushData radiolist '{ "type": "webradio" }'
}
pushSavedPlaylist() {
	pushData savedplaylist $( php /srv/http/mpdplaylist.php list )
}
radioStop() {
	if [[ -e $dirshm/radio ]]; then
		mpc -q stop
		systemctl stop radio dab &> /dev/null
		rm -f $dirshm/radio
		[[ ! -e $dirshm/skip ]] && $dirbash/status-push.sh
	fi
}
savedPlCount() {
	playlists=$( ls -1 $dirplaylists | wc -l )
	grep -q '"playlists".*,' $dirmpd/counts && playlists+=,
	sed -i -E 's/("playlists" *: ).*/\1'$playlists'/' $dirmpd/counts
	pushSavedPlaylist
}
shairportStop() {
	systemctl stop shairport
	systemctl restart shairport-sync
	$dirbash/status-push.sh
}
splashRotate() {
	local rotate
	rotate=$( getVar rotate $dirsystem/localbrowser.conf )
	convert \
		-density 48 \
		-background none $dirimg/icon.svg \
		-rotate $rotate \
		-gravity center \
		-background '#000' \
		-extent 1920x1080 \
		$dirimg/splash.png
}
urldecode() { # for webradio url to filename
	: "${*//+/ }"
	echo -e "${_//%/\\x}"
}
volumeSet() {
	local card control current diff target values
	current=$1
	target=$2
	control=$3
	card=$4
	diff=$5
	# increment
	(( $diff > 0 )) && incr=5 || incr=-5
	values=( $( seq $(( current + incr )) $incr $target ) )
	(( $diff % 5 )) && values+=( $target )
	for i in "${values[@]}"; do
		volumeSetAt $i "$control" $card
		sleep 0.2
	done
}
volumeSetAt() {
	local card control target
	target=$1
	control=$2
	card=$3
	if [[ -e $dirshm/btreceiver ]]; then            # bluetooth
		volumeBlueAlsa $target% "$control"
	elif [[ $control ]]; then                       # hardware
		volumeAmixer $target% "$control" $card
	else                                            # software
		mpc -q volume $target
	fi
}
webradioCount() {
	local count type
	[[ $1 == dabradio ]] && type=dabradio || type=webradio
	count=$( find -L $dirdata/$type -type f ! -path '*/img/*' | wc -l )
	pushData radiolist '{ "type": "'$type'", "count": '$count' }'
	grep -q -m1 "$type.*,"$ $dirmpd/counts && count+=,
	sed -i -E 's/("'$type'": ).*/\1'$count'/' $dirmpd/counts
}
webradioM3uPlsVerify() {
	local ext url
	url=$1
	ext=${url/*.}
	[[ ! $ext =~ ^(m3u|pls)$ ]] && return
	
	if [[ $ext == m3u ]]; then
		url=$( curl -s $url 2> /dev/null | grep -m1 ^http )
	elif [[ $ext == pls ]]; then
		url=$( curl -s $url 2> /dev/null | grep -m1 ^File | cut -d= -f2 )
	fi
	[[ ! $url ]] && echo 'No valid URL found in:'$url && exit
# --------------------------------------------------------------------
}
webRadioSampling() {
	local bitrate data file kb rate sample samplerate url
	url=$1
	file=$2
	timeout 3 curl -sL $url -o /tmp/webradio
	[[ ! $( awk NF /tmp/webradio ) ]] && echo 'Cannot be streamed:' && exit
# --------------------------------------------------------------------
	data=( $( ffprobe -v quiet -select_streams a:0 \
				-show_entries stream=sample_rate \
				-show_entries format=bit_rate \
				-of default=noprint_wrappers=1:nokey=1 \
				/tmp/webradio ) )
	[[ ! $data ]] && 'No stream data found:' && exit
# --------------------------------------------------------------------
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
	sed -i "/\^$ALBUM^^$ARTIST^/ d" $dirmpd/album
	sed -i "/\^$ARTIST^^$ALBUM^/ d" $dirmpd/albumbyartist
	sed -i "/\^$ARTIST^^.*^^$ALBUM^/ d" $dirmpd/albumbyartist-year
	echo $ALBUM^^$ARTIST >> $dirmpd/albumignore
	;;
bookmarkadd )
	bkfile="$dirbookmarks/${NAME//\//|}"
	[[ -e $bkfile ]] && echo -1 && exit
# --------------------------------------------------------------------
	echo "$DIR" > "$bkfile"
	if [[ -e $dirsystem/order.json ]]; then
		order=$( jq '. + ["'$DIR'"]' $dirsystem/order.json )
		echo "$order" > $dirsystem/order.json
	fi
	pushData bookmark 1
	;;
bookmarkcoverreset )
	path=$( < "$dirbookmarks/$NAME" )
	[[ ${path:0:1} != '/' ]] && path="/mnt/MPD/$path"
	rm -f "$path/coverart".*
	pushData bookmark 1
	;;
bookmarkremove )
	bkfile="$dirbookmarks/${NAME//\//|}"
	path=$( < "$bkfile" )
	if grep -q "$path" $dirsystem/order.json 2> /dev/null; then
		order=$( jq '. - ["'$path'"]' $dirsystem/order.json )
		echo "$order" > $dirsystem/order.json
	fi
	rm "$bkfile"
	pushData bookmark 1
	;;
bookmarkrename )
	mv $dirbookmarks/{"${NAME//\//|}","${NEWNAME//\//|}"} 
	pushData bookmark 1
	;;
cachebust )
	! grep -q ^.hash.*time /srv/http/common.php && sed -i "s/?v=.*/?v='.time();/" /srv/http/common.php
	hash=?v=$( date +%s )
	sed -E -i "s/(rern.woff2).*'/\1$hash'/" /srv/http/assets/css/common.css
	;;
color )
	file=$dirsystem/color
	[[ $HSL == reset ]] && rm -f $file && HSL=
	if [[ $HSL ]]; then
		echo $HSL > $file
		hsl=( $HSL )
	else
		if [[ -e $file ]]; then
			hsl=( $( < $file ) )
		else
			hsl=( $( grep '\--cd *:' /srv/http/assets/css/colors.css \
						| sed 's/.*(\(.*\)).*/\1/' \
						| tr ',' ' ' \
						| tr -d % ) )
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
	[[ -e $dirsystem/localbrowser.conf ]] && splashRotate
	sed -i 's/icon.png/&?v='$( date +%s )'/' /srv/http/common.php
	pushData reload 1
	;;
coverartonline )
	$dirbash/status-coverartonline.sh "cmd
$ARTIST
$ALBUM
debug
CMD ARTIST ALBUM DEBUG"
	;;
coverartreset )
	dir=$( dirname "$COVERFILE" )
	filename=$( basename "$COVERFILE" )
	if [[ $( basename "$dir" ) == audiocd ]]; then
		discid=${filename/.*}
		rm -f "$COVERFILE"
		$dirbash/status-coverartonline.sh "cmd
$ARTIST
$ALBUM
audiocd
$discid
CMD ARTIST ALBUM MODE DISCID" &> /dev/null &
		exit
# --------------------------------------------------------------------
	fi
	rm -f "$COVERFILE" "$dir/{coverart,thumb}".* $dirshm/{embedded,local}/*
	backupfile=$( ls -p "$dir"/*.backup | head -1 )
	if [[ -e $backupfile ]]; then
		restorefile=${backupfile:0:-7}
		mv "$backupfile" "$restorefile"
		pushDataCoverart "$restorefile"
		if [[ ${restorefile: -3} != gif ]]; then
			convert "$restorefile" -thumbnail 200x200\> -unsharp 0x.5 "$dir/coverart.jpg"
			convert "$dir/coverart.jpg" -thumbnail 80x80\> -unsharp 0x.5 "$dir/thumb.jpg"
		else
			gifsicle -O3 --resize-fit 200x200 "$restorefile" > "$dir/coverart.gif"
			convert "$restorefile" -thumbnail 80x80\> -unsharp 0x.5 "$dir/thumb.jpg"
		fi
	else
		url=$( $dirbash/status-coverart.sh "cmd
$ARTIST
$ALBUM
$COVERFILE
CMD ARTIST ALBUM FILE" )
		pushDataCoverart "$url"
	fi
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
	pushData mpdupdate '{ "type": "dabradio" }'
	;;
display )
	pushData display $( < $dirsystem/display.json )
	# temp
	if grep -q albumyear.*true $dirsystem/display.json && [[ ! -e $dirmpd/albumbyartist-year ]]; then
		pushData mpdupdate '{ "type": "mpd" }'
		$dirbash/cmd-list.sh &> /dev/null &
	fi
	[[ -e $dirsystem/vumeter ]] && prevvumeter=1
	grep -q -m1 vumeter.*true $dirsystem/display.json && touch $dirsystem/vumeter && vumeter=1
	[[ $prevvumeter == $vumeter ]] && exit
# --------------------------------------------------------------------
	if [[ $vumeter ]]; then
		[[ ! -e $dirmpdconf/fifo.conf ]] && $dirsettings/player-conf.sh
	else
		rm -f $dirsystem/vumeter
	fi
	;;
equalizer )
	freq=( 31 63 125 250 500 1 2 4 8 16 )
	v=( $VALUES )
	for (( i=0; i < 10; i++ )); do
		(( i < 5 )) && unit=Hz || unit=kHz
		band=( "0$i. ${freq[i]} $unit" )
		sudo -u $USR amixer -MqD equal sset "$band" ${v[i]}
	done
	;;
equalizerget )
	if [[ -e $dirsystem/equalizer.json ]]; then
		cat $dirsystem/equalizer.json
	else
		echo '{
  "active" : "Flat"
, "preset" : {
		"Flat": [ 62, 62, 62, 62, 62, 62, 62, 62, 62, 62 ]
	}
}'
	fi
	;;
equalizerset ) # slide
	sudo -u $USR amixer -MqD equal sset "$BAND" $VAL
	;;
latestclear )
	if [[ $DIR ]]; then
		sed -i "\|\^$DIR$| d" $dirmpd/latest
		count=$( lineCount $dirmpd/latest )
		notify latest Latest 'Album cleared.'
	else
		> $dirmpd/latest
		count=0
		notify latest Latest Cleared
	fi
	sed -i -E 's/("latest": ).*/\1'$count',/' $dirmpd/counts
	;;
librandom )
	if [[ $ON ]]; then
		mpc -q random 0
		[[ $ALBUM ]] && echo album > $dirsystem/librandom || touch $dirsystem/librandom
		[[ $ACTION == play ]] && pos=$(( $( mpc status %length% ) + 1 ))
		plAddRandom
	else
		rm -f $dirsystem/librandom
	fi
	pushData option '{ "librandom": '$TF' }'
	;;
lsmntmpd )
	readarray -t mountpoints <<< $( awk '/.mnt.MPD.NAS/ {print $2}' /etc/fstab \
				| grep -v /mnt/MPD/NAS/data \
				| sed 's/\\040/ /g' )
	mpdignore=$( getContent /mnt/MPD/NAS/.mpdignore )
	nas=false
	for m in "${mountpoints[@]}"; do
		[[ $mpdignore ]] && grep -q "$( basename "$m" )" <<< $mpdignore && continue
		
		timeout 0.1 ls -d "$m" &> /dev/null && nas=true && break
# --------------------------------------------------------------------
	done
	[[ $( ls /mnt/MPD/SD ) ]] && sd=true || sd=false
	ls -d /mnt/MPD/USB/*/ &> /dev/null && usb=true || usb=false
	echo '{ "nas" : '$nas', "sd"  : '$sd', "usb" : '$usb' }'
	;;
lyrics )
	name="$ARTIST - $TITLE"
	name=${name//\/}
	lyricsfile="$dirlyrics/${name,,}.txt"
	if [[ $ACTION == save ]]; then
		echo -e "$DATA" > "$lyricsfile"
	elif [[ $ACTION == delete ]]; then
		rm -f "$lyricsfile"
	elif [[ -e "$lyricsfile" ]]; then
		cat "$lyricsfile"
	else
		. $dirsystem/lyrics.conf
		if [[ $embedded ]] && playerActive mpd; then
			file=$( getVar file $dirshm/status )
			if [[ ${file/\/*} =~ ^(USB|NAS|SD)$ ]]; then
				file="/mnt/MPD/$file"
				lyrics=$( kid3-cli -c "select \"$file\"" -c "get lyrics" )
				[[ $lyrics ]] && echo "$lyrics" && exit
# --------------------------------------------------------------------
			fi
		fi
		artist=$( sed -E 's/^A |^The |\///g' <<< $ARTIST )
		title=${TITLE//\/}
		query=$( tr -d " '\-\"\!*\(\);:@&=+$,?#[]." <<< "$artist/$title" )
		lyrics=$( curl -sL -A firefox $url/${query,,}.html | sed -n "/$start/,\|$end| p" )
		[[ $lyrics ]] && sed -e 's/<br>//; s/&quot;/"/g' -e '/^</ d' <<< $lyrics | tee "$lyricsfile"
	fi
	;;
mpcadd )
	pos=$( plAddPosition )
	mpc -q add "$FILE"
	plAddPlay $pos
	;;
mpcaddplaynext )
	mpc -q insert "$FILE"
	pushPlaylist
	;;
mpcaddfind )
	pos=$( plAddPosition )
	if [[ $MODE3 ]]; then
		mpc -q findadd $MODE "$STRING" $MODE2 "$STRING2" $MODE3 "$STRING3"
	elif [[ $MODE2 ]]; then
		mpc -q findadd $MODE "$STRING" $MODE2 "$STRING2"
	else
		mpc -q findadd $MODE "$STRING"
	fi
	plAddPlay $pos
	;;
mpcaddload )
	pos=$( plAddPosition )
	mpc -q load "$FILE"
	plAddPlay $pos
	;;
mpcaddls )
	pos=$( plAddPosition )
	cuefiles=$( mpc ls "$DIR" | grep '\.cue$' | sort -u )
	if [[ ! $cuefiles ]]; then
		mpc ls "$DIR" | mpc -q add &> /dev/null
	else
		while read cuefile; do
			mpc -q load "$cuefile"
		done <<< $cuefiles
	fi
	plAddPlay $pos
	;;
mpccrop )
	if statePlay; then
		mpc -q crop
	else
		radioStop
		mpc -q play
		mpc -q crop
		mpc -q stop
	fi
	[[ -e $dirsystem/librandom ]] && plAddRandom
	$dirbash/status-push.sh
	pushPlaylist
	;;
mpclibrandom )
	plAddRandom
	;;
mpcls )
	mpc ls "$DIR" 2> /dev/null | wc -l
	;;
mpcmove )
	mpc -q move $FROM $TO
	pushPlaylist
	;;
mpcoption )
	[[ ! $ONOFF ]] && ONOFF=false
	mpc -q $OPTION $ONOFF
	pushData option '{ "'$OPTION'": '$ONOFF' }'
	;;
mpcplayback )
	if [[ ! $ACTION ]]; then
		! playerActive mpd && playerstop && exit
# --------------------------------------------------------------------
		if statePlay; then
			grep -q -m1 webradio=true $dirshm/status && ACTION=stop || ACTION=pause
		else
			ACTION=play
		fi
	fi
	radioStop
	if [[ $ACTION == play ]]; then
		mpc -q $ACTION
		if audioCDtrack; then
			touch $dirshm/cdstart
			( sleep 20 && rm -f $dirshm/cdstart ) &
			notify 'audiocd blink' 'Audio CD' 'Start play ...'
			for i in {0..20}; do
				[[ $( mpc status %currenttime% ) == 0:00 ]] && sleep 1 || break
			done
			rm -f $dirshm/cdstart
			$dirbash/status-push.sh
		fi
	else
		[[ -e $dirsystem/scrobble && $ACTION == stop ]] && mpcElapsed > $dirshm/elapsed
		mpc -q $ACTION
	fi
	[[ ! -e $dirsystem/snapclientserver ]] && exit
# --------------------------------------------------------------------
	# snapclient
	if [[ $ACTION == play ]]; then
		sleep 2 # fix stutter
		action=start
		systemctl start snapclient
	else
		systemctl stop snapclient
	fi
	;;
mpcremove )
	if [[ $POS ]]; then
		[[ $( mpc status %songpos% ) == $POS ]] && radioStop
		mpc -q del $POS
		pushData playlist '{ "refresh": '$POS' }'
		if [[ $CURRENT ]]; then
			mpc -q play $CURRENT
			mpc -q stop
		fi
	else
		plClear
	fi
	;;
mpcseek )
	if [[ $STATE == stop ]]; then
		touch $dirshm/skip
		mpc -q play
		mpc -q pause
		rm $dirshm/skip
	fi
	mpc -q seek $ELAPSED
	;;
mpcshuffle )
	mpc -q shuffle
	pushPlaylist
	;;
mpcsimilar )
	lines=$( curl -sfG -m 5 \
				--data-urlencode "artist=$ARTIST" \
				--data-urlencode "track=$TITLE" \
				--data "method=track.getsimilar" \
				--data "api_key=$APIKEY" \
				--data "format=json" \
				--data "autocorrect=1" \
				http://ws.audioscrobbler.com/2.0 \
					| jq .similartracks.track \
					| sed -n '/"name": "/ {s/.*": "\|",$//g; p}' )
	[[ ! $lines ]] && echo 'No similar tracks found in database.' && exit
# --------------------------------------------------------------------
	while read line; do
		if [[ $title ]]; then
			file=$( mpc find artist "$line" title "$title" )
			[[ $file ]] && list+="$file"$'\n'
			title=
		else
			title=$line
		fi
	done <<< $lines
	[[ ! $list ]] && echo 'No similar tracks found in Library.' 5000 && exit
# --------------------------------------------------------------------
	plLprev=$( mpc status %length% )
	awk NF <<< $list | mpc -q add
	pushPlaylist
	added=$(( $( mpc status %length% ) - plLprev ))
	notify lastfm 'Add Similar' "$added tracks added."
	;;
mpcskip )
	. <( mpc status 'state=%state%; consume=%consume%; songpos=%songpos%' )
	radioStop
	touch $dirshm/skip
	if [[ $state == playing ]]; then
		[[ $( mpc | head -c 4 ) == cdda ]] && notify 'audiocd blink' 'Audio CD' 'Change track ...'
		[[ -e $dirsystem/scrobble ]] && mpcElapsed > $dirshm/elapsed
		rm -f $dirshm/skip
		mpc -q play $POS
		[[ $consume == on ]] && mpc -q del $songpos
	else
		mpc -q play $POS
		rm -f $dirshm/skip
		mpc -q stop
	fi
	[[ -e $dirsystem/librandom ]] && plAddRandom || pushData playlist '{ "song": '$(( POS - 1 ))' }'
	;;
mpcskippl )
	radioStop
	mpc -q play $POS
	Time=$( mpc status %totaltime% | awk -F: '{print ($1 * 60) + $2}' )
	[[ $Time == 0 ]] && Time=false
	[[ $ACTION == stop ]] && mpc -q stop
	pushData playlist '{ "song": '$(( POS - 1 ))', "elapsed": 0, "Time": '$Time', "state": "'$ACTION'" }'
	;;
mpcupdate )
	date +%s > $dirmpd/updatestart # /usr/bin/ - fix date command not found
	pushData mpdupdate '{ "type": "mpd" }'
	if [[ $ACTION ]]; then
		echo "\
ACTION=$ACTION
PATHMPD=\"$PATHMPD\"" > $dirmpd/updating
	else
		. <( $dirmpd/updating )
	fi
	[[ $PATHMPD == */* ]] && mpc -q $ACTION "$PATHMPD" || mpc -q $ACTION $PATHMPD # NAS SD USB all(blank) - no quotes
	;;
mpcupdatestop )
	pushData mpdupdate '{ "stop": true }'
	systemctl restart mpd
	if [[ -e $dirmpd/listing ]]; then
		killall cmd-list.sh
		rm -f $dirmpd/{listing,updating} $dirshm/{listing,tageditor}
	fi
	;;
mpdignore )
	dir=$( basename "$DIR" )
	mpdpath=$( dirname "$DIR" )
	echo $dir >> "/mnt/MPD/$mpdpath/.mpdignore"
	[[ ! $( mpc ls "$mpdpath" 2> /dev/null ) ]] && exit
# --------------------------------------------------------------------
	pushData mpdupdate '{ "type": "mpd" }'
	echo "$mpdpath" > $dirmpd/updating
	mpc -q update "$mpdpath" #1 get .mpdignore into database
	mpc -q update "$mpdpath" #2 after .mpdignore was in database
	;;
multiraudiolist )
	echo '{
  "current" : "'$( ipAddress )'"
, "list"    : '$( < $dirsystem/multiraudio.json )'
}'
	;;
order )
	pushData order "$( < $dirsystem/order.json )" # quoted - keep double spaces
	;;
pladdrandom )
	plAddRandom
	;;
playerstart )
	playerStart
	;;
playerstop )
	playerStop
	;;
playlist )
	[[ $REPLACE ]] && plClear
	mpc -q load "$NAME"
	[[ $PLAY ]] && mpc -q play
	[[ $PLAY || $REPLACE ]] && $dirbash/push-status.sh
	pushPlaylist
	;;
relaystimerreset )
	$dirbash/relays-timer.sh &> /dev/null &
	pushData relays '{ "done": 1 }'
	;;
savedpldelete )
	rm "$dirplaylists/$NAME.m3u"
	savedPlCount
	;;
savedpledit ) # $DATA: remove - file, add - position-file, move - from-to
	plfile="$dirplaylists/$NAME.m3u"
	if [[ $ACTION == remove ]]; then
		sed -i "$POS d" "$plfile"
	elif [[ $ACTION == add ]]; then
		[[ $TO == last ]] && echo "$FILE" >> "$plfile" || sed -i "$TO i$FILE" "$plfile"
	else # move
		file=$( sed -n "$FROM p" "$plfile" )
		[[ $FROM < $TO ]] && (( TO++ ))
		sed -i -e "$FROM d" -e "$TO i$file" "$plfile"
	fi
	pushSavedPlaylist
	;;
savedplrename )
	if [[ ! $REPLACE ]]; then
		mpc lsplaylists | grep -q "$NEWNAME" && echo -1 && exit
# --------------------------------------------------------------------
	fi
	mpc renplaylist "$NAME" "$NEWNAME"
	pushSavedPlaylist
	;;
savedplsave )
	plfile="$dirplaylists/$NAME.m3u"
	if [[ $REPLACE ]]; then
		rm -f "$plfile"
	elif [[ -e "$plfile" ]]; then
		echo -1
		exit
# --------------------------------------------------------------------
	fi
	mpc -q save "$NAME"
	chmod 777 "$plfile"
	savedPlCount
	;;
screenoff )
	DISPLAY=:0 xset dpms force off
	;;
shairport )
	! playerActive airplay && echo airplay > $dirshm/player && playerStart
	systemctl start shairport
	$dirbash/status-push.sh
	;;
shairportstop )
	shairportStop
	;;
shareddatampdupdate )
	systemctl restart mpd
	notify refresh-library 'Library Update' Done
	$dirbash/status-push.sh
	;;
splashrotate )
	splashRotate
	;;
titlewithparen )
	! grep -q "$TITLE" /srv/http/assets/data/titles_with_paren && echo -1
	;;
upnpstart )
	echo upnp > $dirshm/player
	playerStart
	;;
volume )
	[[ ! $CURRENT ]] && CURRENT=$( volumeGet )
	if [[ $TYPE != dragpress ]]; then
		[[ $TYPE == mute ]] && val=$CURRENT || val=$TARGET
		pushData volume '{ "type": "'$TYPE'", "val": '$val' }'
	fi
	filevolumemute=$dirsystem/volumemute
	if [[ $TYPE == mute ]]; then
		echo $CURRENT > $filevolumemute
	elif [[ $TYPE == unmute ]]; then
		rm -f $filevolumemute
	fi
	diff=$(( TARGET - CURRENT ))
	diff=${diff#-}
	if (( $diff < 5 )); then
		volumeSetAt $TARGET "$CONTROL" $CARD
	else
		volumeSet $CURRENT $TARGET "$CONTROL" $CARD $diff
	fi
	;;
webradioadd )
	url=$( urldecode $URL )
	urlname=${url//\//|}
	webradioM3uPlsVerify $url
	file=$dirwebradio
	[[ $DIR ]] && file+="/$DIR"
	file+="/$urlname"
	[[ -e $file ]] && echo 'Already exists as <wh>'$( head -1 "$file" )'</wh>:' && exit
# --------------------------------------------------------------------
	echo "\
$NAME

$CHARSET" > "$file"
	chown http:http "$file" # for edit in php
	webradioCount
	webRadioSampling $url "$file" &> /dev/null &
	;;
webradiocoverreset )
	rm "$FILENOEXT".* "$FILENOEXT-thumb".*
	pushDataCoverart
	;;
webradiodelete )
	urlname=${URL//\//|}
	path=$dirdata/$MODE
	[[ $DIR ]] && path+="/$DIR"
	rm -f "$path/$urlname"
	[[ ! $( find "$path" -name "$urlname" ) ]] && rm -f "$path/img/$urlname".* "$path/img/$urlname-thumb".*
	webradioCount $MODE
	;;
webradioedit )
	newurlname=${NEWURL//\//|}
	urlname=${URL//\//|}
	path=$dirwebradio/
	[[ $DIR ]] && path+="/$DIR"
	newfile="$path/$newurlname"
	prevfile="$path/$urlname"
	if [[ $NEWURL == $URL ]]; then
		sampling=$( sed -n 2p "$prevfile" )
	else
		[[ -e $newfile ]] && echo 'URL exists:' && exit
# --------------------------------------------------------------------
		webradioM3uPlsVerify $NEWURL
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
$NAME
$sampling
$CHARSET" > "$newfile"
	pushRadioList
	;;
wrdirdelete )
	file="$dirdata/$MODE/$NAME"
	[[ ! $CONFIRM && $( ls "$file" ) ]] && echo -1 && exit
# --------------------------------------------------------------------
	rm -rf "$file"
	webradio=$( find -L $dirwebradio -type f ! -path '*/img/*' | wc -l )
	sed -i -E 's/(  "webradio": ).*/\1'$webradio'/' $dirmpd/counts
	pushRadioList
	;;
wrdirnew )
	[[ $DIR ]] && path="$dirwebradio/$DIR/$SUB" || path="$dirwebradio/$SUB"
	mkdir -p "$path"
	chown -h http:http "$path"
	chmod 755 "$path"
	pushRadioList
	;;
wrdirrename )
	mv -f "$dirdata/$MODE/{$NAME,$NEWNAME}"
	pushRadioList
	;;
	
esac
