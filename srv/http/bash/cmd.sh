#!/bin/bash

. /srv/http/bash/common.sh

args2var "$1" # $2 $3 ... if any, still valid

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
	[[ $( getVar timeron $dirsystem/relays.conf ) == true ]] && $dirbash/relays-timer.sh &> /dev/null &
}
plClear() {
	mpc -q clear
	radioStop
	rm -f $dirsystem/librandom $dirshm/playlist*
	[[ $CMD == mpcremove ]] && pushData playlist '{ "blank": true }'
}
pushPlaylist() {
	[[ -e $dirshm/pushplaylist ]] && exit
# --------------------------------------------------------------------
	touch $dirshm/pushplaylist
	pushData playlist '{ "blink": true }'
	rm -f $dirshm/playlist*
	[[ $( mpc status %length% ) == 0 ]] && data='{ "blank": true }' || data=$( php /srv/http/playlist.php current )
	pushData playlist $data
	( sleep 1 && rm -f $dirshm/pushplaylist ) &
}
pushRadioList() {
	pushData radiolist '{ "type": "webradio" }'
}
pushSavedPlaylist() {
	if [[ $( ls $dirdata/playlists ) ]]; then
		pushData playlists $( php /srv/http/playlist.php list )
	else
		pushData playlists -1
	fi
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
	playlists=$( ls $dirplaylists | wc -l )
	grep -q '"playlists".*,' $dirmpd/counts && playlists+=,
	sed -i -E 's/("playlists" *: ).*/\1'$playlists'/' $dirmpd/counts
	pushSavedPlaylist
}
shairportStop() {
	systemctl stop shairport
	systemctl restart shairport-sync
	$dirbash/status-push.sh
}
urldecode() { # for webradio url to filename
	: "${*//+/ }"
	echo -e "${_//%/\\x}"
}
webradioCount() {
	local counts
	counts=$( grep -vE '{|radio|}' $dirmpd/counts | sed '$ s/,$//' )
	counts+=$( countRadio )
	echo '{ '${counts:1}' }' | jq -S > $dirmpd/counts
	pushRadioList
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
	appendSortUnique $dirmpd/albumignore "$ALBUM^^$ARTIST"
	;;
bookmarkadd )
	file_bk="$dirbookmarks/${NAME//\//|}"
	[[ -e $file_bk ]] && echo -1 && exit
# --------------------------------------------------------------------
	echo "$DIR" > "$file_bk"
	file_order=$dirsystem/order.json
	[[ NSU == *${DIR:0:1}* ]] && order=$DIR || order=$NAME
	[[ -e $file_order ]] && sed -i -e 's/"$/",/' -e "/]/ i\  \"${order//\"/\\\\\"}\"" $file_order
	dir="/mnt/MPD/$DIR"
	if [[ -d $dir  ]] && ! ls "$dir/coverart".* 2> /dev/null; then
		target=$( coverFileGet "$dir" raw )
		[[ $target ]] && $dirbash/cmd-coverart.sh "coverart
$target
CMD TARGET"
	fi
	pushBookmark
	;;
bookmarkremove )
	file_bk="$dirbookmarks/$NAME"
	file_order=$dirsystem/order.json
	if [[ -e $file_order ]]; then
		line=$( sed 's/"/\\"/g' "$file_bk" )
		order=$( grep -Ev "\[|\"$line\"|]" $file_order | sed '$ s/,$//' )
		echo "[ $order ]" | jq > $file_order
	fi
	rm "$file_bk"
	pushBookmark
	;;
bookmarkrename )
	mv $dirbookmarks/{"$NAME","$NEWNAME"}
	pushBookmark
	;;
cachebust )
	hash="?v=$( date +%s )'"
	sed -E -i "1,/rern.woff2/ s/(rern.woff2).*'/\1$hash/" /srv/http/assets/css/common.css
	if [[ $TIME ]]; then
		hashtime="?v='.time()"
		! grep -q $hashtime /srv/http/common.php && hash=$hashtime
	fi
	sed -i "1,/?v=.*/ s/?v=.*/$hash;/" /srv/http/common.php
	;;
cachetype )
	grep -q "?v='.time()" /srv/http/common.php && echo time || echo static
	;;
color )
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
			default=1
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
	sed -i -E 's/(icon.png).*/\1?v='$( date +%s )'">/' /srv/http/common.php
	[[ ! $color ]] && color=true
	color='{
  "cg"    : "hsl('$h',3%,75%)"
, "cm"    : "hsl'$cm'"
, "color" : '$( [[ $default ]] && echo false || echo true )'
, "hsl"   : { "h": '$h', "s": '$s', "l": '$l' }
, "ml"    : [ '${ml:1}' ]
}'
	pushData color "$color"
	splashRotate
	;;
coverartonline )
	$dirbash/status-coverartonline.sh "cmd
$ARTIST
$ALBUM
debug
CMD ARTIST ALBUM DEBUG"
	;;
coverfileslimit )
	for type in local online webradio; do
		ls -t $dirshm/$type/* 2> /dev/null \
			| tail -n +10 \
			| xargs rm -f --
	done
	;;
dirdelete )
	dir="$DIR/$NAME"
	lsdir=$( ls "$dir" )
	[[ ! $CONFIRM && $lsdir ]] && echo -1 && exit
# --------------------------------------------------------------------
	stations=$( find "$dir" -type f -exec basename {} \; )
	rm -rf "$dir"
	webradio=$( find -L $dirwebradio -type f ! -path '*/img/*' | wc -l )
	sed -i -E 's/(  "webradio": ).*/\1'$webradio'/' $dirmpd/counts
	pushData radiolist '{ "dirdelete": "'$DIR'", "name": "'$NAME'" }'
	[[ $lsdir ]] && webradioCount
	while read s; do
		find $dirwebradio -name "$s" -exec false {} + || continue # continue on 1st found
		
		rm -f "$dirwebradio/img/$s".*
	done <<< $stations
	;;
dirnew )
	mkdir -p "$DIR"
	chown -h http:http "$$DIR"
	chmod 755 "$$DIR"
	pushRadioList
	;;
dirrename )
	[[ -e "$DIR/$NEWNAME" ]] && echo -1 && exit
# --------------------------------------------------------------------
	mv -f "$DIR/$NAME" "$DIR/$NEWNAME"
	pushRadioList
	;;
display )
	status=$( $dirbash/status.sh )
	pushData mpdplayer "$status"
	systemctl try-restart radio
	fifoToggle
	;;
equalizer ) # shell mixer: sudo -u [mpd|root] alsamixer -D equal
	freq=( 31 63 125 250 500 1 2 4 8 16 )
	v=( $VALUES )
	for (( i=0; i < 10; i++ )); do
		(( i < 5 )) && unit=Hz || unit=kHz
		band=( "0$i. ${freq[i]} $unit" )
		sudo -u $USR amixer -MqD equal sset "$band" ${v[i]}
	done
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
		rm -f $dirmpd/latest*
		count=0
		notify latest Latest Cleared
	fi
	sed -i -E 's/("latest": ).*/\1'$count',/' $dirmpd/counts
	;;
librandom )
	if [[ $ON ]]; then
		mpc -q random off
		[[ $ALBUM ]] && echo album > $dirsystem/librandom || touch $dirsystem/librandom
		[[ $ACTION == play ]] && pos=$(( $( mpc status %length% ) + 1 ))
		plAddRandom
	else
		rm -f $dirsystem/librandom
	fi
	pushData option '{ "librandom": '$TF' }'
	;;
lyrics )
	if [[ ! $ACTION ]]; then
		filelrc="/mnt/MPD/${FILE%.*}.lrc"
		if [[ -e $filelrc ]]; then
			grep -v ']$' "$filelrc" | sed -e 's/\[.*]//' -e '1,/^$/ d'
			exit
# --------------------------------------------------------------------
		fi
	fi
	name="$ARTIST - $TITLE"
	name=${name//\/}
	lyricsfile="$dirlyrics/${name,,}.txt"
	if [[ $ACTION == save ]]; then
		echo -e "$DATA" > "$lyricsfile"
	elif [[ $ACTION == delete ]]; then
		rm -f "$lyricsfile"
	elif [[ $ACTION != refresh && -e "$lyricsfile" ]]; then
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
		lyricsGet() {
			query=$( alphaNumeric $artist )/$( alphaNumeric $TITLE )
			curl -sL -A firefox $url/${query,,}.html | sed -n "/$start/,\|$end| p"
		}
		artist=$( sed -E 's/^A |^The |\///g' <<< $ARTIST )
		[[ ${#artist} == 2 ]] && short=1 && artist+=band
		lyrics=$( lyricsGet )
		if [[ ! $lyrics && $short ]]; then
			artist=${artist/band}
			lyrics=$( lyricsGet )
		fi
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
		if [[ $MODE2 == lsmode ]]; then
			mpc -q ls -f %$MODE%^%file% "$STRING2" \
				| grep "^$STRING" \
				| cut -d^ -f2 \
				| mpc -q add &> /dev/null
		else
			mpc -q findadd $MODE "$STRING" $MODE2 "$STRING2"
		fi
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
	if [[ ! $POS && $( mpcState ) == play ]]; then
		mpc -q crop
	else
		radioStop
		mpc -q play $POS
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
	[[ ! $TF ]] && TF=false
	mpc -q $OPTION $TF
	pushData option '{ "'$OPTION'": '$TF' }'
	;;
mpcplayback )
	(( $( mpc status %length% ) == 0 )) && exit
# --------------------------------------------------------------------
	if [[ ! $ACTION ]]; then
		! playerActive mpd && playerstop && exit
# --------------------------------------------------------------------
		if [[ $( mpcState ) == play ]]; then
			grep -q -m1 webradio=true $dirshm/status && ACTION=stop || ACTION=pause
		else
			ACTION=play
		fi
	fi
	radioStop
	if [[ $ACTION == play ]]; then
		mpc -q play
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
		if [[ -e $dirshm/relayson ]]; then
			grep -q -m1 ^timeron=true $dirsystem/relays.conf && $dirbash/relays-timer.sh &> /dev/null &
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
	[[ ! $POS ]] && plClear && exit
# --------------------------------------------------------------------
	songpos=$( mpc status %songpos% )
	pllength=$( mpc status %length% )
	if [[ $TO ]]; then
		if (( $songpos >= $POS && $songpos <= $TO )); then
			[[ $pllength == $TO ]] && next=$(( POS -1 )) || next=$(( END + 1 ))
		fi
		POS+=-$TO
	else
		if [[ $songpos == $POS ]]; then
			[[ $pllength == $POS ]] && next=$(( POS -1 )) || next=$POS
		fi
	fi
	mpc -q del $POS
	[[ $next ]] && mpc -q play $next && mpc -q stop
	pushPlaylist
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
	readarray -t lines <<< $( mpc ls -f %artist%^%title% "$FILE" | tr ^ '\n' )
	artist=${lines[0]}
	title=${lines[1]}
	apikey=$( grep -E -m1 'apikeylastfm' /srv/http/assets/js/main.js | cut -d"'" -f2 )
	lines=$( curl -sfG -m 5 \
				--data-urlencode "artist=$artist" \
				--data-urlencode "track=$title" \
				--data "method=track.getsimilar" \
				--data "api_key=$apikey" \
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
	radioStop
	touch $dirshm/skip
	state=$( mpcState )
	if [[ $state == play ]]; then
		[[ $( mpc | head -c 4 ) == cdda ]] && notify 'audiocd blink' 'Audio CD' 'Change track ...'
		[[ -e $dirsystem/scrobble ]] && mpcElapsed > $dirshm/elapsed
	fi
	mpc -q play $POS
	[[ ! $ACTION ]] && ACTION=$state
	[[ $ACTION != play ]] && mpc -q $ACTION
	. <( mpc status 'consume=%consume%; songpos=%songpos%' )
	[[ $consume == on ]] && mpc -q del $songpos
	rm -f $dirshm/skip
	[[ -e $dirsystem/librandom ]] && plAddRandom || pushPlaylist
	;;
mpcupdate )
	date +%s > $dirmpd/updatestart # /usr/bin/ - fix date command not found
	pushData mpdupdate
	if [[ $ACTION ]]; then
		echo "\
ACTION=$ACTION
PATHMPD=\"$PATHMPD\"
LATEST=$LATEST" > $dirmpd/updating
	else
		. <( $dirmpd/updating )
	fi
	[[ $PATHMPD == */* ]] && mpc -q $ACTION "$PATHMPD" || mpc -q $ACTION $PATHMPD # NAS SD USB all(blank) - no quotes
	;;
mpcupdatestop )
	pushData mpdupdate $( < $dirmpd/counts )
	systemctl restart mpd
	if [[ -e $dirmpd/listing ]]; then
		killall cmd-list.sh
		rm -f $dirmpd/{listing,updating} $dirshm/listing
	fi
	;;
mpdignore )
	dir=$( basename "$DIR" )
	mpdpath=$( dirname "$DIR" )
	appendSortUnique "/mnt/MPD/$mpdpath/.mpdignore" "$dir"
	[[ ! $( mpc ls "$mpdpath" 2> /dev/null ) ]] && exit
# --------------------------------------------------------------------
	pushData mpdupdate
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
playlistpush )
	pushPlaylist
	;;
relaystimerreset )
	$dirbash/relays-timer.sh &> /dev/null &
	pushData relays '{ "reset": '$( getVar timer $dirsystem/relays.conf )' }'
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
		track=$( sed -n "$FROM p" "$plfile" )
		[[ $FROM < $TO ]] && (( TO++ ))
		sed -i -e "$FROM d" -e "$TO i$track" "$plfile"
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
snapserverlist )
	snapserverList
	;;
titlewithparen )
	! grep -q "$TITLE" /srv/http/assets/data/titles_with_paren && echo -1
	;;
upnpstart )
	echo upnp > $dirshm/player
	playerStart
	;;
volume )
	volume
	;;
webradioadd )
	url=$( urldecode $URL )
	urlname=${url//\//|}
	webradioM3uPlsVerify $url
	file+="$DIR/$urlname"
	[[ -e $file ]] && echo 'Already exists as <wh>'$( head -1 "$file" )'</wh>:' && exit
# --------------------------------------------------------------------
	[[ $CHARSET ]] && CHARSET=$( sed -E 's/UTF-*8|iso *-* *//' <<< $CHARSET )
	echo "\
$NAME

$CHARSET" > "$file"
	chown http:http "$file" # for edit in php
	webradioCount
	webRadioSampling $url "$file" &> /dev/null &
	;;
webradiodelete )
	urlname=${URL//\//|}
	rm -f "$DIR/$urlname"
	path=$dirdata/$MODE
	[[ ! $( find "$path" -name "$urlname" ) ]] && rm -f "$path/img/$urlname".* "$path/img/$urlname-thumb".*
	webradioCount
	;;
webradioedit )
	newurlname=${URL//\//|}
	urlname=${OLDURL//\//|}
	newfile="$DIR/$newurlname"
	prevfile="$DIR/$urlname"
	if [[ $URL == $OLDURL ]]; then
		sampling=$( sed -n 2p "$prevfile" )
	else
		[[ -e $newfile ]] && echo 'URL exists:' && exit
# --------------------------------------------------------------------
		webradioM3uPlsVerify $URL
		rm "$prevfile"
		# stationcover
		imgurl="$dirwebradio/img/$urlname"
		img=$( ls "$imgurl".* | head -1 )
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
	[[ $CHARSET ]] && CHARSET=$( sed -E 's/UTF-*8|iso *-* *//' <<< $CHARSET )
	echo "\
$NAME
$sampling
$CHARSET" > "$newfile"
	pushRadioList
	;;
webradiotitle )
	url=$( getVar file $dirshm/status )
	metaint=$( curl -s -I -H "Icy-MetaData: 1" "$url" \
				| grep -i "icy-metaint" \
				| awk '{print $2}' \
				| tr -d '\r' )
	[[ ! $metaint ]] && exit
# --------------------------------------------------------------------
# stream: ...[N icy-metaint]...StreamTitle='ARTIST - TITLE';StreamUrl='URL';StreamArtwork='ARTWORK';\0\0\0>>>\0[255]...
	curl -s -H 'Icy-MetaData: 1' "$url" \
		| dd bs=1 skip=$metaint count=255 2>/dev/null \
		| tr -d '\0' \
		| grep -o "StreamTitle='[^'][^;]*'" \
		| sed "s/StreamTitle=' *//; s/ *'$//"
	;;
	
esac
