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

addonsListGet() {
	: >/dev/tcp/8.8.8.8/53 || exit -2 # online check
	
	[[ -z $1 ]] && branch=main || branch=$1
	curl -skL https://github.com/rern/rAudio-addons/raw/$branch/addons-list.json -o $diraddons/addons-list.json || exit -1
}
gifNotify() {
	pushstreamNotify Thumbnail 'Resize animated GIF ...' coverart
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
	pushstreamThumb gif $type
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
	pushstreamThumb jpg $type
}
mpdoledLogo() {
	systemctl stop mpd_oled
	type=$( grep mpd_oled /etc/systemd/system/mpd_oled.service | cut -d' ' -f3 )
	mpd_oled -o $type -L
	( sleep 60 && mpd_oled -o $type ) &
}
pladdPlay() {
	pushstreamPlaylist
	if [[ ${1: -4} == play ]]; then
		sleep $2
		mpc play $pos
		[[ -e $dirsystem/mpdoled ]] && systemctl start mpd_oled
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
pushstreamNotify() {
	if [[ $1 == Power ]]; then
		[[ $3 == power ]] && power=',"power":"off"' || power=',"power":"reboot"'
	fi
	data='{"title":"'$1'","text":"'$2'","icon":"'$3' blink","delay":-1'$power'}'
	pushstream notify "$data"
}
pushstreamPlaylist() {
	pushstream playlist "$( php /srv/http/mpdplaylist.php current )"
}
pushstreamThumb() {
	coverfile=${target:0:-4}
	coverfile=$( php -r "echo rawurlencode( '${coverfile//\'/\\\'}' );" )
	pushstream coverart '{"url":"'$coverfile.$( date +%s ).$1'","type":"'$2'"}'
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
	killall $script curl pacman &> /dev/null
	rm -f /var/lib/pacman/db.lck /srv/http/*.zip $diraddons/$alias /usr/local/bin/uninstall_$alias.sh
	;;
addonslist )
	addonsListGet ${args[1]}
	
	bash=$( jq -r .push.bash $diraddons/addons-list.json ) # push bash
	if [[ -n $bash ]]; then
		eval "$bash" || exit
	fi
	
	url=$( jq -r .push.url $diraddons/addons-list.json ) # push download
	[[ -n $url ]] && bash <( curl -sL $url )
	;;
addonsupdates )
	addonsListGet

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
albumignore )
	album=${args[1]}
	artist=${args[2]}
	sed -i "/\^$album^^$artist^/ d" $dirdata/mpd/album
	sed -i "/\^$artist^^$album^/ d" $dirdata/mpd/albumbyartist
	echo $album^^$artist >> $dirdata/mpd/albumignore
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
	elif [[ $val == 0 ]]; then # disconnected
		rm -f $dirtmp/{player-*,btclient}
		touch $dirtmp/player-mpd
	else
		mpc stop
		rm -f $dirtmp/{player-*,btclient}
		echo $val > $dirtmp/player-bluetooth
		sleep 1
		volume0dB
	fi
	if [[ $val == 1 || $val == 0 ]]; then
		data=$( /srv/http/bash/networks-data.sh )
		pushstream refresh "$data"
	else
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
	mpdpath=${args[1]}
	rm -f "/mnt/MPD/$mpdpath/"coverart.*
	data='{"url":"'/mnt/MPD/$mpdpath/none'","type":"bookmark"}'
	pushstream coverart "$data"
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
	
	covername=$( echo $artist$album | tr -d ' "`?/#&'"'" )
	rm -f "$coverfile" \
		"$dir/coverart".* \
		"$dir/thumb".* \
		$dirtmp/local-$covername \
		$dirdata/embedded/$covername*
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
$mpdpath" )
	[[ -z $url ]] && url=/mnt/MPD/$mpdpath/none
	data='{"url":"'$url'","type":"coverart"}'
	pushstream coverart "$data"
	;;
coverexists )
	ls -1 "/mnt/MPD/${args[1]}" \
		| grep -i '^cover\.\|^folder\.\|^front\.\|^album\.' \
		| grep -i '.gif$\|.jpg$\|.png$' \
		| head -1
	;;
coverfileslimit )
	for type in local online webradio; do
		files=$( ls -1t $dirtmp/$type-* 2> /dev/null )
		(( $( echo "$files" | wc -l ) > 10 )) && rm -f "$( echo "$files" | tail -1 )"
	done
	;;
coversave )
	source=${args[1]}
	path=${args[2]}
	covername=${args[3]}
	coverfile="$path/cover.jpg"
	jpgThumbnail coverart "$source" "$coverfile"
	rm -f $dirtmp/local-$covername*
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
, "equalizer"  : '$( [[ -e $dirsystem/equalizer ]] && echo true || echo false )'
, "lock"       : '$( [[ -e $dirsystem/login ]] && echo true || echo false )'
, "order"      : '$( cat $dirsystem/order 2> /dev/null || echo false )'
, "relays"     : '$( [[ -e $dirsystem/relays ]] && echo true || echo false )'
, "snapclient" : '$( [[ -e $dirsystem/snapclient ]] && echo true || echo false )'
, "volumenone" : '$volumenone'
}'
	echo "$data"
	;;
displaysave )
	data=${args[1]}
	pushstream display "$data"
	jq . <<< $data > $dirsystem/display
	grep -q '"vumeter".*true' $dirsystem/display && vumeter=1
	[[ -e $dirsystem/vumeter ]] && prevvumeter=1
	[[ $prevvumeter == $vumeter ]] && exit
	
	if [[ -n $vumeter ]]; then
		mpc | grep -q '\[playing' && cava -p /etc/cava.conf | $dirbash/vu.sh &> /dev/null &
		touch $dirsystem/vumeter
	else
		killall cava &> /dev/null
		rm -f $dirsystem/vumeter
		pushstreamNotify 'Playback' 'VU meter disable...' 'playback'
	fi
	$dirbash/mpd-conf.sh
	status=$( $dirbash/status.sh )
	pushstream mpdplayer "$status"
	;;
equalizer )
	type=${args[1]} # none = get values
	name=${args[2]}
	newname=${args[3]}
	flat='60 60 60 60 60 60 60 60 60 60'
	if [[ -n $type ]]; then
		if [[ $type == preset ]]; then
			[[ $name == Flat ]] && v=( $flat ) || v=( $( grep "^$name\^" $dirsystem/equalizer.conf | cut -d^ -f2- ) )
		else # remove then save again with current values
			append=1
			sed -i "/^$name\^/ d" $dirsystem/equalizer.conf
			if [[ $type == delete ]]; then
				v=( $flat )
				name=Flat
			elif [[ $type == rename ]]; then
				name=$newname
			fi
		fi
		freq=( 31 63 125 250 500 1 2 4 8 16 )
		for (( i=0; i < 10; i++ )); do
			(( i < 5 )) && unit=Hz || unit=kHz
			band=( "0$i. ${freq[i]} $unit" )
			[[ -n $v ]] && su mpd -c "amixer -MqD equal sset \"$band\" ${v[i]}%"
		done
		echo $name > $dirsystem/equalizer
	else
		name=$( cat $dirsystem/equalizer )
	fi
	val=$( su mpd -c 'amixer -D equal contents' | awk -F ',' '/: val/ {print $NF}' | xargs )
	[[ -n $append && $name != Flat ]] && echo $name^$val >> $dirsystem/equalizer.conf
	[[ $type == save ]] && exit
	
	[[ $name == '(unnamed)' ]] && presets='"(unnamed)",'
	presets+='"Flat"'
	readarray -t lines <<< $( cut -d^ -f1 $dirsystem/equalizer.conf | sort )
	if [[ -n $lines ]]; then
		for line in "${lines[@]}"; do
			presets+=',"'$line'"'
		done
	fi
#############
	data='{
  "current" : "'$name'"
, "values"  : [ '${val// /,}' ]
, "presets" : [ '$presets' ]
}'
	[[ -n $type ]] && pushstream equalizer "$data"
	echo $data
	;;
equalizerupdn )
	band=${args[1]}
	val=${args[2]}
	su mpd -c "amixer -D equal sset \"$band\" $val"
	echo '(unnamed)' > $dirsystem/equalizer
	;;
hashFiles )
	path=/srv/http/assets
	for dir in css fonts js; do
		[[ $dir == js ]] && d=d
		files+=$( ls -p$d "$path/$dir/"* | grep -v '/$' )$'\n'
	done
	date=$( date +%s )
	for file in ${files[@]}; do
		mv $file ${file/.*}.$date.${file/*.}
		pages=$( grep -rl "assets/js" /srv | grep 'php$' )
		for page in ${pages[@]}; do
			name=$( basename $file )
			newname=${name/.*}.$date.${name/*.}
			sed -i "s|$name|$newname|" $page
		done
	done
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
		[[ $( mpc | head -c 4 ) == cdda && -z $pause ]] && pushstreamNotify 'Audio CD' 'Start play ...' audiocd
		killall relaystimer.sh &> /dev/null
		[[ -e $dirsystem/mpdoled ]] && systemctl start mpd_oled
	else
		killall cava &> /dev/null
		[[ $command == stop ]] && rm -f $dirtmp/status
		[[ -e $dirtmp/relayson ]] && $dirbash/relaystimer.sh &> /dev/null &
	fi
	;;
mpcprevnext )
	command=${args[1]}
	current=$(( ${args[2]} + 1 ))
	length=${args[3]}
	rm -f $dirtmp/status
	touch $dirtmp/nostatus
	systemctl stop radio mpd_oled
	if mpc | grep -q '^\[playing\]'; then
		playing=1
		mpc stop
		rm -f $dirtmp/nostatus
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
		rm -f $dirtmp/nostatus
		mpc stop
	else
		[[ $( mpc | head -c 4 ) == cdda ]] && pushstreamNotify 'Audio CD' 'Change track ...' audiocd
		[[ -e $dirsystem/mpdoled ]] && systemctl start mpd_oled
	fi
	;;
mpcseek )
	seek=${args[1]}
	state=${args[2]}
	if [[ $state == stop ]]; then
		touch $dirtmp/nostatus
		mpc play
		mpc pause
		rm $dirtmp/nostatus
	fi
	mpc seek $seek
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
mpdoledlogo )
	mpdoledLogo
	;;
nicespotify )
	for pid in $( pgrep spotifyd ); do
		ionice -c 0 -n 0 -p $pid &> /dev/null 
		renice -n -19 -p $pid &> /dev/null
	done
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
	[[ -e $dirsystem/mpdoled ]] && mpdoledLogo
	cdda=$( mpc -f %file%^%position% playlist | grep ^cdda: | cut -d^ -f2 )
	[[ -n $cdda ]] && mpc del $cdda
	if [[ -e $dirtmp/relayson ]]; then
		$dirbash/relays.sh
		sleep 2
	fi
	if [[ -n $reboot ]]; then
		pushstreamNotify Power 'Reboot ...' reboot
	else
		pushstreamNotify Power 'Off ...' power
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
rebootlist )
	[[ -e $dirtmp/reboot ]] && cat $dirtmp/reboot \
								| sort -u \
								| tr '\n' ^ \
								| head -c -1
	;;
refreshbrowser )
	pushstream reload 1
	;;
relaystimerreset )
	killall relaystimer.sh &> /dev/null
	$dirbash/relaystimer.sh &> /dev/null &
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
