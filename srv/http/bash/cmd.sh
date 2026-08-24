#!/bin/bash

. /srv/http/bash/common.sh

args2var "$1" # $2 $3 ... if any, still valid

. $dirbash/cmd-function.sh

case $CMD in

albumignore )
	sed -i "\|\^$ALBUM^^$ARTIST^| d" $dirmpd/$MODE
	sed -i "\|\^$ARTIST^^$ALBUM^| d" $dirmpd/${MODE}byartist
	sed -i "\|\^$ARTIST^^.*^^$ALBUM^| d" $dirmpd/${MODE}byartist-year
	[[ $MODE == album ]] && appendSortUnique $dirmpd/albumignore "$ALBUM^^$ARTIST"
	n=$( wc -l < $dirmpd/$MODE )
	sed -i -E 's/(.*"'$MODE'": ).*/\1'$n',/' $dirmpd/counts
	pushData counts '{ "'$MODE'": '$n' }'
	;;
albumthumbnail )
	echo $DIR > $dirshm/dir
	[[ $OVERWRITE ]] && touch $dirshm/overwrite
	;;
bioimage )
	data=$( curl -sfG -m 5 \
				--data "api_key=06f56465de874e4c75a2e9f0cc284fa3" \
				https://webservice.fanart.tv/v3.2/music/$MBID )
	if [[ $data ]]; then
		jq '{musicbanner,artistthumb}' <<< $data
	else
		echo '{"error":"Artist not found"}'
	fi
	;;
bookmark )
	file_order=$dirsystem/order.json
	[[ -e $file_order ]] && order=1
	if [[ $DIR ]]; then
		echo "$DIR" > "$dirbookmarks/$NAME"
		[[ $order ]] && json=$( jq --arg name "$NAME" '. += [$name]' $file_order )
	elif [[ $NEWNAME ]]; then
		mv -f $dirbookmarks/{"$NAME","$NEWNAME"}
		if [[ $order ]]; then
			i=$( jq --arg name "$NAME" 'index($name)' $file_order )
			json=$( jq --argjson i $i --arg newname "$NEWNAME" '.[$i] = $newname' $file_order )
		fi
	else
		rm "$file_bk"
		[[ $json ]] && json=$( jq --arg name "$NAME" 'del(.[$name])' $file_order )
	fi
	[[ $order ]] && echo "$json" > $file_order
	pushLibraryHome
	;;
bookmarksubdir )
	while read path; do
		dir=$( < "$path" )
		if [[ $dir == http* || $dir == rtsp* ]]; then
			dir=$( grep "^$dir" $dirmpd/radio )
			dir=${dir/*^}
		elif [[ ${dir:0:1} != / ]]; then
			dir="/mnt/MPD/$dir"
		fi
		coverart=$( $dirbash/status -C "$dir" )
		[[ ! $coverart ]] && subdir+=', "'$( basename "$path" )'" '
	done < <( ls $dirbookmarks/* )
	echo "[ ${subdir:1} ]"
	;;
cachebust )
	cacheBust
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
	! grep -q "?v='.time()" /srv/http/common.php && cacheBust
	;;
countmnt )
	counts=$( countMnt )
	echo '{ '${counts/,}' }'
	;;
dirdelete )
	if fileExist "$DIR"/*; then
		[[ ! $CONFIRM ]] && echo -1 && exit
# --------------------------------------------------------------------
	fi
	rm -rf "$DIR"
	pushData radiolist '{ "dirdelete": "'$DIR'", "name": "'$NAME'" }'
	webradioCount
	;;
dirnew )
	mkdir -p "$DIR"
	chown -h http:http "$DIR"
	chmod 755 "$DIR"
	pushRadioList
	;;
dirrename )
	mv -f "$DIR/$NAME" "$DIR/$NEWNAME"
	pushRadioList
	;;
display )
	pushStatus
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
	if [[ ! $ACTION && $( < $dirshm/player ) == mpd && $FILE =~ ^(USB|NAS|NVME|SATA|SD) ]]; then
		filelrc="/mnt/MPD/${FILE%.*}.lrc"
		if [[ -e $filelrc ]]; then
			grep -v ']$' "$filelrc" | sed -e 's/\[.*]//' -e '1,/^$/ d'
			exit
# --------------------------------------------------------------------
		fi
		lyrics=$( $dirbash/status -L "/mnt/MPD/$FILE" )
		[[ $lyrics ]] && echo "$lyrics" && exit
# --------------------------------------------------------------------
	fi
	name="$ARTIST - $TITLE"
	name=${name##*/}
	lyricsfile="$dirlyrics/${name,,}.txt"
	if [[ $ACTION == save ]]; then
		echo -e "$DATA" > "$lyricsfile"
	elif [[ $ACTION == delete ]]; then
		rm -f "$lyricsfile"
	elif [[ $ACTION != refresh && -e "$lyricsfile" ]]; then
		cat "$lyricsfile"
	else
		lyricsGet() {
			query=$( alphaNumeric $artist )/$( alphaNumeric $TITLE )
			curl -sL -A firefox $url/$query.html | sed -n "/$start/,\|$end| p"
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
	pushStatus
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
	[[ ! $ACTION ]] && mpcPlayback && exit
# --------------------------------------------------------------------
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
			pushStatus
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
	readarray -t lines < <( mpc ls -f %artist%^%title% "$FILE" | tr ^ '\n' )
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
	state=$( mpcState )
	if [[ $state == play ]]; then
		[[ $( mpc current ) == cdda* ]] && notify 'audiocd blink' 'Audio CD' 'Change track ...'
		[[ -e $dirsystem/scrobble ]] && mpcElapsed > $dirshm/elapsed
	fi
	mpc -q play $POS
	[[ ! $ACTION ]] && ACTION=$state
	[[ $ACTION != play ]] && mpc -q stop
	. <( mpc status 'consume=%consume%; songpos=%songpos%' )
	[[ $consume == on ]] && mpc -q del $songpos
	[[ -e $dirsystem/librandom ]] && plAddRandom || pushPlaylist
	;;
mpcupdate )
	rm -f $dirshm/updatedone
	date +%s > $dirmpd/updatestart
	pushData mpdupdate '{ "updating": true }'
	if [[ ! $ACTION ]]; then
		if [[ -e $dirsystem/mpcupdate.conf ]]; then
			. <( cat $dirsystem/mpcupdate.conf )
			ACTION=$action
			PATHMPD=$pathmpd
		else
			ACTION=rescan
		fi
	fi
	[[ $PATHMPD == */* ]] && mpc -q $ACTION "$PATHMPD" || mpc -q $ACTION $PATHMPD # NAS SD USB all(blank) - no quotes
	;;
mpcupdatestop )
	notify 'refresh-library blink' 'Library Update' 'Cancel ...' -1
	systemctl restart mpd
	if [[ -e $dirmpd/listing ]]; then
		killall cmd-list.sh
		rm -f $dirmpd/{listing,updating}
	fi
	$dirbash/cmd-list.sh
	;;
mpdignore )
	dir=$( basename "$DIR" )
	mpdpath=$( dirname "$DIR" )
	appendSortUnique "/mnt/MPD/$mpdpath/.mpdignore" "$dir"
	[[ ! $( mpc ls "$mpdpath" 2> /dev/null ) ]] && exit
# --------------------------------------------------------------------
	pushData mpdupdate '{ "updating": true }'
	echo "\
action=update
mpdpath=\"$mpdpath\"" > $dirsystem/mpcupdate.conf
	mpc -q update "$mpdpath" #1 get .mpdignore into database
	mpc -q update "$mpdpath" #2 after .mpdignore was in database
	;;
multiraudiolist )
	echo '{
  "current" : "'$( ipAddress )'"
, "list"    : '$( < $dirsystem/multiraudio.json )'
}'
	;;
password )
	rm -f /boot/password
	chpasswd <<< root:$PASSWORD
	[[ $HEADLESS ]] && localBrowserOff
	[[ -e $dirshm/startup ]] && pushData startup { "ready": true }
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
pushVolume ) # mpd-idle
	volumeGet push
	;;
remount )
	mount -a
	;;
savedpldelete )
	mpc -q rm "$NAME"
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
	mpc renplaylist "$NAME" "$NEWNAME"
	pushSavedPlaylist
	;;
savedplsave )
	if [[ $REPLACE ]]; then
		mpc -q rm "$NAME"
	elif [[ -e "$dirplaylists/$NAME.m3u" ]]; then
		echo -1
		exit
# --------------------------------------------------------------------
	fi
	mpc -q save "$NAME"
	savedPlCount
	;;
screenoff )
	DISPLAY=:0 xset dpms force off
	;;
shairport )
	if ! playerActive airplay; then
		echo airplay > $dirshm/player
		pushStatus
		playerStart
	fi
	systemctl start shairport
	;;
shareddataupdate )
	systemctl restart mpd
	notify refresh-library 'Library Update' Done
	pushStatus
	;;
snapserverlist )
	snapserverList
	;;
thumbnailreset )
	rm -f "$DIR/coverart".* "$DIR/thumb".*
	pushData coverart '{ "thumbnail": true }'
	;;
titlewithparen )
	! grep -q "${TITLE//’/\'}" /srv/http/assets/data/titles_with_paren && echo -1
	;;
upnpstart )
	echo upnp > $dirshm/player
	playerStart
	;;
volume )
	volume
	;;
webradiodelete )
	rm -rf "$DIR"
	webradioCount
	;;
webradioedit )
	CHARSET=$( webradioCharset $CHARSET )
	if [[ $DIR == $OLDDIR ]]; then
		echo "\
$URL
$( sed -n 2p "$DIR/data" )
$CHARSET" > "$DIR/data"
		pushRadioList
	else
		webradioVerify $URL "$DIR"
		[[ $OLDDIR ]] && rm "$DIR"
	fi
	;;

esac
