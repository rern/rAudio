#!/bin/bash

. /srv/http/bash/common.sh
dirimg=/srv/http/assets/img

# convert each line to each args
readarray -t args <<< "$1"

addonsListGet() {
	: >/dev/tcp/8.8.8.8/53 || ( echo -2 && exit ) # online check
	
	[[ ! $1 ]] && branch=main || branch=$1
	curl -skL https://github.com/rern/rAudio-addons/raw/$branch/addons-list.json -o $diraddons/addons-list.json || ( echo -1 && exit )
}
equalizerGet() { # sudo - mixer equal is user dependent
	val=$( sudo -u mpd amixer -MD equal contents | awk -F ',' '/: value/ {print $NF}' | xargs )
	filepresets=$dirsystem/equalizer.presets
	[[ -e $dirshm/btreceiver ]] && filepresets+="-$( cat $dirshm/btreceiver )"
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
gifNotify() {
	pushstreamNotifyBlink Thumbnail 'Resize animated GIF ...' coverart
}
gifThumbnail() {
	type=$1
	source=$2
	target=$3
	covername=$4
	imgwh=( $( gifsicle -I "$source" | awk 'NR < 3 {print $NF}' ) )
	[[ ${imgwh[0]} == images ]] && animated=1
	case $type in
		bookmark )
			rm -f "${target:0:-4}".*
			[[ $animated ]] && (( ${imgwh[1]/x*} > 200 || ${imgwh[1]/*x} > 200 )) && gifNotify
			gifsicle -O3 --resize-fit 200x200 "$source" > "$target"
			;;
		coverart )
			dir=$( dirname "$target" )
			rm -f "$dir/cover".*.backup "$dir/coverart".* "$dir/thumb".*
			coverfile=$( ls -1 "$dir/cover".* 2> /dev/null | head -1 )
			[[ -e $coverfile ]] && mv -f "$coverfile" "$coverfile.backup"
			[[ ! -e "$target" ]] && pushstreamNotify ${type^} 'No write permission.' warning && exit
			
			[[ $animated ]] && gifNotify
			gifsicle -O3 --resize-fit 1000x1000 "$source" > "$target"
			gifsicle -O3 --resize-fit 200x200 "$source" > "$dir/coverart.gif"
			gifsicle -O3 --resize-fit 80x80 "$source" > "$dir/thumb.gif"
			rm -f $dirshm/embedded/* $dirshm/local/$covername
			;;
		webradio )
			filenoext=${target:0:-4}
			rm -f $filenoext.* $filenoext-thumb.*
			[[ $animated ]] && gifNotify
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
	covername=$4
	case $type in
		bookmark )
			rm -f "${target:0:-4}".*
			cp -f "$source" "$target"
			;;
		coverart )
			dir=$( dirname "$target" )
			rm -f "$dir/cover".*.backup "$dir/coverart".* "$dir/thumb".*
			coverfile=$( ls -1 "$dir/cover".* 2> /dev/null | head -1 )
			[[ -e $coverfile ]] && mv -f "$coverfile" "$coverfile.backup"
			cp -f "$source" "$dir/cover.jpg" # already resized from client
			[[ ! -e "$target" ]] && pushstreamNotify ${type^} 'No write permission.' warning && exit
			
			convert "$source" -thumbnail 200x200\> -unsharp 0x.5 "$dir/coverart.jpg"
			convert "$dir/coverart.jpg" -thumbnail 80x80\> -unsharp 0x.5 "$dir/thumb.jpg"
			rm -f $dirshm/embedded/* $dirshm/local/$covername
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
}
pladdPlay() {
	pushstreamPlaylist
	if [[ ${1: -4} == play ]]; then
		sleep $2
		mpc -q play $pos
		$dirbash/status-push.sh
	fi
}
pladdPosition() {
	if [[ ${1:0:7} == replace ]]; then
		mpc -q clear
		pos=1
	else
		pos=$(( $( mpc playlist | wc -l ) + 1 ))
	fi
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
snapclientStop() {
	systemctl stop snapclient
	$dirbash/settings/player-conf.sh
	clientip=$( ifconfig | awk '/inet .*broadcast/ {print $2}' )
	sshCommand $( cat $dirshm/serverip ) $dirbash/snapcast.sh remove $clientip
	rm $dirshm/serverip
}
stopRadio() {
	if [[ -e $dirshm/radio ]]; then
		systemctl stop radio
		rm -f $dirshm/{radio,status}
	fi
}
urldecode() { # for webradio url to filename
	: "${*//+/ }"
	echo -e "${_//%/\\x}"
}
volumeGet() {
	if [[ -e $dirshm/btreceiver ]]; then
		for i in {1..5}; do # takes some seconds to be ready
			volume=$( amixer -MD bluealsa 2> /dev/null | awk -F'[%[]' '/%.*dB/ {print $2; exit}' )
			[[ $volume ]] && break
			sleep 1
		done
		return
	fi
	
	[[ -e $dirshm/nosound ]] && volume=-1 && return
	
	mixertype=$( sed -n '/type *"alsa"/,/mixer_type/ p' /etc/mpd.conf \
					| tail -1 \
					| cut -d'"' -f2 )
	if [[ $( cat $dirshm/player ) == mpd && $mixertype == software ]]; then
		volume=$( mpc volume | cut -d: -f2 | tr -d ' %n/a' )
	else
		card=$( cat $dirsystem/asoundcard )
		if [[ ! -e $dirshm/amixercontrol ]]; then
			volume=100
		else
			control=$( cat $dirshm/amixercontrol )
			voldb=$( amixer -c $card -M sget "$control" \
				| grep -m1 '%.*dB' \
				| sed 's/.*\[\(.*\)%\] \[\(.*\)dB.*/\1 \2/' )
			if [[ $voldb ]]; then
				volume=${voldb/ *}
				db=${voldb/* }
			else
				volume=$( amixer -c $card -M sget "$control" \
							| grep -m1 '%]' \
							| sed 's/.*\[\(.*\)%].*/\1/' )
				[[ ! $volume ]] && volume=100
			fi
		fi
	fi
}
volumeSetAt() {
	target=$1
	card=$2
	control=$3
	btreceiver=$( cat $dirshm/btreceiver 2> /dev/null )
	if [[ $btreceiver ]]; then
		amixer -MqD bluealsa sset "$btreceiver" $target% 2> /dev/null
		echo $target > "$dirsystem/btvolume-$btreceiver"
	elif [[ $control ]]; then
		amixer -c $card -Mq sset "$control" $target%
	else
		mpc -q volume $target
	fi
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
		for i in $( seq $current $incr $target ); do
			volumeSetAt $i $card "$control"
			sleep 0.2
		done
		if (( $i != $target )); then
			volumeSetAt $target $card "$control"
		fi
	fi
	pushstreamVolume disable false
	[[ $control && ! -e $dirshm/btreceiver ]] && alsactl store
}
webradioCount() {
	count=$( find -L $dirdata/webradios -type f ! -name "*.jpg" ! -name "*.gif" | wc -l )
	pushstream webradio $count
	sed -i 's/\("webradio": \).*/\1'$count'/' $dirmpd/counts
}
webradioPlaylistVerify() {
	ext=$1
	url=$2
	if [[ $ext == m3u ]]; then
		url=$( curl -s $url 2> /dev/null | grep ^http | head -1 )
	elif [[ $ext == pls ]]; then
		url=$( curl -s $url 2> /dev/null | grep ^File | head -1 | cut -d= -f2 )
	fi
	if [[ $url ]]; then
		urlname=${url//\//|}
	else
		echo -2
		exit
	fi
}
webRadioSampling() {
	url=$1
	file=$2
	timeout 3 wget -q $url -O /tmp/webradio
	if [[ ! -s /tmp/webradio ]]; then
		pushstreamNotify WebRadio "URL cannot be streamed:<br>$url" warning 8000
		exit
	fi
	
	data=( $( ffprobe -v quiet -select_streams a:0 \
				-show_entries stream=sample_rate \
				-show_entries format=bit_rate \
				-of default=noprint_wrappers=1:nokey=1 \
				/tmp/webradio ) )
	if [[ ! $data ]]; then
		pushstreamNotify WebRadio "URL contains no stream data:<br>$url" webradio 8000
		exit
	fi
	
	samplerate=${data[0]}
	bitrate=${data[1]}
	sample="$( awk "BEGIN { printf \"%.1f\n\", $samplerate / 1000 }" ) kHz"
	kb=$(( bitrate / 1000 ))
	rate="$(( ( ( kb + 4 ) / 8 ) * 8 )) kbit/s" # round to modulo 8
	sed -i "2 s|.*|$sample $rate|" "$file"
	rm /tmp/webradio
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
		verinstalled=$( cat $diraddons/$addon )
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
bookmarkreset )
	imagepath=${args[1]}
	name=${args[2]}
	sed -i '2d' "$dirdata/bookmarks/$name"
	rm -f "$imagepath/coverart".*
	data='{"url":"'$imagepath/none'","type":"bookmark"}'
	pushstream coverart "$data"
	;;
bookmarkthumb )
	mpdpath=${args[1]}
	coverartfile=$( ls "/mnt/MPD/$mpdpath/coverart".* )
	echo ${coverartfile: -3} # ext
	;;
camillagui )
	systemctl start camillagui
	sed -i '/Connection reset without closing handshake/ d' /var/log/camilladsp.log
	;;
color )
	hsl=${args[1]}
	file=$dirsystem/color
	if [[ $hsl ]]; then # omit call from addons.sh / datarestore
		[[ $hsl == reset ]] && rm -f $file || echo $hsl > $file
	fi
	if [[ -e $file ]]; then
		hsl=( $( cat $file ) )
	else
		hsl=( $( grep '\-\-cd *:' /srv/http/assets/css/colors.css | sed 's/.*(\(.*\)).*/\1/' | tr ',' ' ' | tr -d % ) )
	fi
	h=${hsl[0]}; s=${hsl[1]}; l=${hsl[2]}
	hs="$h,$s%,"
	hsg="$h,3%,"
	hsl="${hs}$l%"

	sed -i "
 s|\(--cml *: *hsl\).*;|\1(${hs}$(( l + 5 ))%);|
  s|\(--cm *: *hsl\).*;|\1($hsl);|
 s|\(--cma *: *hsl\).*;|\1(${hs}$(( l - 5 ))%);|
 s|\(--cmd *: *hsl\).*;|\1(${hs}$(( l - 15 ))%);|
s|\(--cg75 *: *hsl\).*;|\1(${hsg}75%);|
s|\(--cg60 *: *hsl\).*;|\1(${hsg}60%);|
 s|\(--cgl *: *hsl\).*;|\1(${hsg}40%);|
  s|\(--cg *: *hsl\).*;|\1(${hsg}30%);|
 s|\(--cga *: *hsl\).*;|\1(${hsg}20%);|
 s|\(--cgd *: *hsl\).*;|\1(${hsg}10%);|
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
	[[ ! $rotate ]] && rotate=NORMAL
	rotateSplash $rotate
	hash=$( date +%s )
	sed -i -E 's/\?v=.{10}/?v='$hash'/g' /srv/http/settings/camillagui/build/index.html
	pushstream reload 1
	;;
count )
	count
	;;
coverartget )
	path=${args[1]}
	coverartfile=$( ls -1X "$path"/coverart.* 2> /dev/null \
						| grep -i '\.gif$\|\.jpg$\|\.png$' \
						| head -1 ) # full path
	if [[ $coverartfile ]]; then
		echo $coverartfile | sed 's|^/srv/http||'
		exit
	fi
	
	[[ ${path:0:4} == /srv ]] && exit
	
	coverfile=$( ls -1X "$path" \
					| grep -i '^cover\.\|^folder\.\|^front\.\|^album\.' \
					| grep -i '\.gif$\|\.jpg$\|\.png$' \
					| head -1 ) # filename only
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
	if [[ $( basename "$dir" ) == audiocd ]]; then
		filename=$( basename "$coverfile" )
		id=${filename/.*}
		rm -f "$coverfile"
		$dirbash/status-coverartonline.sh "\
$artist
$album
audiocd
$id" &> /dev/null &
		exit
	fi
	
	covername=$( echo $artist$album | tr -d ' "`?/#&'"'" )
	rm -f "$coverfile" \
		"$dir/coverart".* \
		"$dir/thumb".* \
		$dirshm/embedded/* \
		$dirshm/local/$covername
	backupfile=$( ls -p "$dir"/*.backup | head -1 )
	if [[ -e $backupfile ]]; then
		restorefile=${backupfile:0:-7}
		mv "$backupfile" "$restorefile"
		if [[ ${restorefile: -3} != gif ]]; then
			convert "$restorefile" -thumbnail 200x200\> -unsharp 0x.5 "$dir/coverart.jpg"
			convert "$dir/coverart.jpg" -thumbnail 80x80\> -unsharp 0x.5 "$dir/thumb.jpg"
		else
			gifsicle -O3 --resize-fit 200x200 "$restorefile" > "$dir/coverart.gif"
			gifsicle -O3 --resize-fit 80x80 "$restorefile" > "$dir/thumb.gif"
		fi
	fi
	url=$( $dirbash/status-coverart.sh "\
$artist
$album
$mpdpath" )
	[[ ! $url ]] && url=/mnt/MPD/$mpdpath/none
	data='{"url":"'$url'","type":"coverart"}'
	pushstream coverart "$data"
	;;
coverartsave )
	source=${args[1]}
	path=${args[2]}
	coverfile="$path/cover.jpg"
	jpgThumbnail coverart "$source" "$coverfile"
	rm -f "$source"
	;;
coverfileslimit )
	for type in local online webradio; do
		ls -t $dirshm/$type/* 2> /dev/null | tail -n +10 | xargs rm -f --
	done
	;;
dirpermissions )
	chmod 755 /srv /srv/http /srv/http/* /mnt /mnt/MPD /mnt/MPD/*/
	chown http:http /srv /srv/http /srv/http/* /mnt /mnt/MPD /mnt/MPD/*/
	chmod -R 755 /srv/http/{assets,bash,data,settings}
	chown -R http:http /srv/http/{assets,bash,data,settings}
	chown mpd:audio $dirmpd $dirmpd/mpd.db $dirplaylists 2> /dev/null
	;;
displaysave )
	data=${args[1]}
	pushstream display "$data"
	jq -S . <<< $data > $dirsystem/display
	grep -q '"vumeter".*true' $dirsystem/display && vumeter=1
	[[ -e $dirsystem/vumeter ]] && prevvumeter=1
	[[ $prevvumeter == $vumeter ]] && exit
	
	if [[ $vumeter ]]; then
		mpc | grep -q '\[playing' && cava -p /etc/cava.conf | $dirbash/vu.sh &> /dev/null &
		touch $dirsystem/vumeter
	else
		killall cava &> /dev/null
		rm -f $dirsystem/vumeter
		pushstreamNotifyBlink 'Playback' 'VU meter disable...' 'playback'
	fi
	$dirbash/settings/player-conf.sh
	status=$( $dirbash/status.sh )
	pushstream mpdplayer "$status"
	;;
equalizer )
	type=${args[1]} # preset, delete, rename, new, save
	name=${args[2]}
	newname=${args[3]}
	filepresets=$dirsystem/equalizer.presets
	[[ -e $dirshm/btreceiver ]] && filepresets+="-$( cat $dirshm/btreceiver )"
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
	val=$( sudo -u mpd amixer -D equal contents | awk -F ',' '/: value/ {print $NF}' | xargs )
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
	touch $dirmpd/updating
	path=${args[1]}
	dir=$( basename "$path" )
	mpdpath=$( dirname "$path" )
	echo $dir >> "/mnt/MPD/$mpdpath/.mpdignore"
	pushstream mpdupdate 1
	mpc -q update "$mpdpath" #1 get .mpdignore into database
	mpc -q update "$mpdpath" #2 after .mpdignore was in database
	;;
latestclear )
	> /srv/http/data/mpd/latest
	sed -i 's/\("latest": \).*/\10,/' /srv/http/data/mpd/counts
	pushstreamNotify Latest Cleared. latest
	;;
librandom )
	enable=${args[1]}
	if [[ $enable == false ]]; then
		rm -f $dirsystem/librandom
	else
		mpc -q random 0
		plL=$( mpc playlist | wc -l )
		$dirbash/cmd-librandom.sh start
		touch $dirsystem/librandom
		sleep 1
		mpc -q play $(( plL + 1 ))
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
		rm -f "$lyricsfile"
	elif [[ -e "$lyricsfile" ]]; then
		cat "$lyricsfile"
	else
		if [[ -e $dirsystem/lyricsembedded ]]; then
			file=$cmd
			lyrics=$( kid3-cli -c "select \"$file\"" -c "get lyrics" )
			[[ $lyrics ]] && echo "$lyrics" && exit
		fi
		
		artist=$( echo $artist | sed 's/^A \|^The \|\///g' )
		title=${title//\/}
		query=$( echo $artist/$title \
					| tr -d " '\-\"\!*\(\);:@&=+$,?#[]." )
		lyrics=$( curl -s -A firefox https://www.azlyrics.com/lyrics/${query,,}.html )
		if [[ $lyrics ]]; then
			echo "$lyrics" \
				| sed -n '/id="cf_text_top"/,/id="azmxmbanner"/ p' \
				| sed -e '/^\s*$/ d' -e '/\/div>/,/<br>/ {N;d}' -e 's/<br>//' -e 's/&quot;/"/g' \
				| grep -v '^<' \
				| tee "$lyricsfile"
		fi
	fi
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
		player=$( cat $dirshm/player )
		if [[ $( cat $dirshm/player ) != mpd ]]; then
			$dirbash/cmd.sh playerstop
			exit
		fi
		
		if mpc | grep -q '\[playing'; then
			grep -q webradio=true /srv/http/data/shm/status && command=stop || command=pause
		else
			command=play
		fi
	fi
	if [[ $command == play ]]; then
		mpc | grep -q '^\[paused\]' && pause=1
		mpc -q $command $pos
		[[ $( mpc | head -c 4 ) == cdda && ! $pause ]] && pushstreamNotifyBlink 'Audio CD' 'Start play ...' audiocd
	else
		stopRadio
		[[ -e $dirsystem/scrobble && $command == stop && $pos ]] && cp -f $dirshm/{status,scrobble}
		mpc -q $command
		killall cava &> /dev/null
		[[ -e $dirshm/scrobble ]] && scrobbleOnStop $pos
	fi
	pushstream state '{"state":"'$command'"}'
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
	if mpc | grep -q 'random: on'; then
		pos=$( shuf -n 1 <( seq $length | grep -v $current ) )
		mpc -q play $pos
	else
		if [[ $command == next ]]; then
			(( $current != $length )) && mpc -q play $(( current + 1 )) || mpc -q play 1
			mpc | grep -q 'consume: on' && mpc -q del $current
			[[ -e $dirsystem/librandom ]] && $dirbash/cmd-librandom.sh
		else
			(( $current != 1 )) && mpc -q play $(( current - 1 )) || mpc -q play $length
		fi
	fi
	if [[ $state == play ]]; then
		[[ $( mpc | head -c 4 ) == cdda ]] && pushstreamNotifyBlink 'Audio CD' 'Change track ...' audiocd
	else
		rm -f $dirshm/prevnextseek
		mpc -q stop
	fi
	if [[ -e $dirshm/scrobble ]]; then
		sleep 2
		scrobbleOnStop $elapsed
	fi
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
mpcupdate )
	path=${args[1]}
	if [[ $path == rescan ]]; then
		echo rescan > $dirmpd/updating
		mpc -q rescan
	else
		echo $path > $dirmpd/updating
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
	data=$( jq <<< ${args[1]} )
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
pkgstatus )
	id=${args[1]}
	pkg=$id
	service=$id
	case $id in
		camilladsp )
			conf=/srv/http/data/camilladsp/configs/camilladsp.yml;;
		hostapd )
			conf=/etc/hostapd/hostapd.conf;;
		localbrowser )
			conf=/srv/http/data/system/localbrowser.conf
			pkg=chromium;;
		smb )
			conf=/etc/samba/smb.conf
			pkg=samba;;
		snapclient|snapserver )
			[[ $id == snapclient ]] && conf=/etc/default/snapclient
			pkg=snapcast
			service=$id;;
		* )
			conf=/etc/$id.conf;;
	esac
	[[ -e $conf ]] && catconf="
$( cat $conf )"
	systemctl -q is-active $service && dot='<grn>●</grn>' || dot='<red>●</red>'
	[[ $id != camilladsp ]] && version=$( pacman -Q $pkg ) || version=$( camilladsp -V )
	echo "\
<code>$version</code>$catconf

$dot $( systemctl status $service \
	| sed '1 s|^.* \(.*service\)|<code>\1</code>|' \
	| sed '/^\s*Active:/ s|\( active (.*)\)|<grn>\1</grn>|; s|\( inactive (.*)\)|<red>\1</red>|; s|\(failed\)|<red>\1</red>|ig' \
	| grep -v 'Could not resolve keysym\|Address family not supported by protocol\|ERROR:chrome_browser_main_extra_parts_metrics' )" # omit warning by xkeyboard | chromium
	;;
pladd )
	item=${args[1]}
	cmd=${args[2]}
	delay=${args[3]}
	pladdPosition $cmd
	mpc -q add "$item"
	pladdPlay $cmd $delay
	;;
pladdplaynext )
	mpc -q insert "${args[1]}"
	pushstreamPlaylist
	;;
playerstart )
	newplayer=${args[1]}
	[[ $newplayer == bluetooth ]] && volumeGet save
	mpc -q stop
	stopRadio
	player=$( cat $dirshm/player )
	echo $newplayer > $dirshm/player
	case $player in
		airplay )   restart=shairport-sync;;
		mpd|upnp )  restart=mpd;;
		spotify )   restart=spotifyd;;
	esac
	[[ $restart ]] && systemctl restart $restart || snapclientStop
	pushstream player '{"player":"'$newplayer'","active":true}'
	;;
playerstop )
	elapsed=${args[1]}
	player=$dirshm/player
	[[ -e $dirsystem/scrobble && -e $dirsystem/scrobble.conf/$player ]] && cp -f $dirshm/{status,scrobble}
	killall cava &> /dev/null
	echo mpd > $dirshm/player
	[[ $player != upnp ]] && $dirbash/status-push.sh
	case $player in
		airplay )
			service=shairport-sync
			systemctl stop shairport-meta
			rm -f $dirshm/airplay/start
			;;
		bluetooth )
			rm -f $dirshm/bluetoothdest
			;;
		snapcast )
			service=snapclient
			snapclientStop
			;;
		spotify )
			service=spotifyd
			rm -f $dirshm/spotify/start
			;;
		upnp )
			service=upmpdcli
			mpc -q stop
			tracks=$( mpc -f %file%^%position% playlist | grep 'http://192' | cut -d^ -f2 )
			for i in $tracks; do
				mpc -q del $i
			done
			$dirbash/status-push.sh
			;;
	esac
	[[ $service && $service != snapclient ]] && systemctl restart $service
	pushstream player '{"player":"'$player'","active":false}'
	[[ -e $dirshm/scrobble && $elapsed ]] && scrobbleOnStop $elapsed
	;;
plcrop )
	if mpc | grep -q '\[playing'; then
		mpc -q crop
	else
		mpc -q play
		mpc -q crop
		mpc -q stop
	fi
	systemctl -q is-active libraryrandom && $dirbash/cmd-librandom.sh
	$dirbash/status-push.sh
	pushstreamPlaylist
	;;
plcurrent )
	mpc -q play ${args[1]}
	mpc -q stop
	$dirbash/status-push.sh
	;;
plfindadd )
	if [[ ${args[1]} != multi ]]; then
		type=${args[1]}
		string=${args[2]}
		cmd=${args[3]}
		pladdPosition $cmd
		mpc -q findadd $type "$string"
	else
		type=${args[2]}
		string=${args[3]}
		type2=${args[4]}
		string2=${args[5]}
		cmd=${args[6]}
		pladdPosition $cmd
		mpc -q findadd $type "$string" $type2 "$string2"
	fi
	pladdPlay $cmd $delay
	;;
plload )
	playlist=${args[1]}
	cmd=${args[2]}
	delay=${args[3]}
	pladdPosition $cmd
	mpc -q load "$playlist"
	pladdPlay $cmd $delay
	;;
plloadrange )
	range=${args[1]}
	playlist=${args[2]}
	cmd=${args[3]}
	delay=${args[4]}
	pladdPosition $cmd
	mpc -q --range=$range load "$playlist"
	pladdPlay $cmd $delay
	;;
plls )
	dir=${args[1]}
	cmd=${args[2]}
	delay=${args[3]}
	pladdPosition $cmd
	readarray -t cuefiles <<< $( mpc ls "$dir" | grep '\.cue$' | sort -u )
	if [[ ! $cuefiles ]]; then
		mpc ls "$dir" | mpc -q add &> /dev/null
	else
		for cuefile in "${cuefiles[@]}"; do
			mpc -q load "$cuefile"
		done
	fi
	pladdPlay $cmd $delay
	;;
plorder )
	mpc -q move ${args[1]} ${args[2]}
	pushstreamPlaylist
	;;
plremove )
	pos=${args[1]}
	activenext=${args[2]}
	if [[ $pos ]]; then
		mpc -q del $pos
		[[ $activenext ]] && mpc -q play $activenext && mpc -q stop
	else
		mpc -q clear
	fi
	$dirbash/status-push.sh
	pushstreamPlaylist
	;;
plshuffle )
	mpc -q shuffle
	pushstreamPlaylist
	;;
plsimilar )
	plLprev=$( mpc playlist | wc -l )
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
	echo "$list" | awk 'NF' | mpc -q add
	pushstreamPlaylist
	echo $(( $( mpc playlist | wc -l ) - plLprev ))
	;;
power )
	action=${args[1]}
	if [[ $action == reboot ]]; then
		pushstreamNotifyBlink Power 'Reboot ...' reboot
	else
		pushstreamNotify Power 'Off ...' 'power blink' 10000
	fi
	touch $dirshm/power
	mpc -q stop
	pushstream btreceiver false
	if [[ -e $dirshm/clientip ]]; then
		clientip=$( cat $dirshm/clientip )
		for ip in $clientip; do
			sshCommand $ip $dirbash/cmd.sh playerstop
		done
	fi
	cdda=$( mpc -f %file%^%position% playlist | grep ^cdda: | cut -d^ -f2 )
	[[ $cdda ]] && mpc -q del $cdda
	if [[ -e $dirshm/relayson ]]; then
		$dirbash/settings/relays.sh
		sleep 2
	fi
	systemctl -q is-active camilladsp && $dirbash/settings/camilladsp-gain.py
	ply-image /srv/http/assets/img/splash.png &> /dev/null
	if mount | grep -q /mnt/MPD/NAS; then
		umount -l /mnt/MPD/NAS/* &> /dev/null
		sleep 3
	fi
	[[ -e /boot/shutdown.sh ]] && . /boot/shutdown.sh
	[[ $action == off && -e $dirsystem/lcdchar ]] && $dirbash/lcdchar.py off
	[[ $action == reboot ]] && reboot || poweroff
	;;
radiorestart )
	[[ -e $disshm/radiorestart ]] && exit
	
	touch $disshm/radiorestart
	systemctl -q is-active radio || systemctl start radio
	sleep 1
	rm $disshm/radiorestart
	;;
rebootlist )
	[[ -e $dirshm/reboot ]] && cat $dirshm/reboot \
								| sort -u \
								| tr '\n' ^ \
								| head -c -1
	;;
refreshbrowser )
	pushstream reload 1
	;;
relaystimerreset )
	kill -9 $( pgrep relaystimer ) &> /dev/null
	$dirbash/relaystimer.sh &> /dev/null &
	pushstream relays '{"state":"RESET"}'
	;;
rotatesplash )
	rotateSplash ${args[1]}
	;;
savedpldelete )
	name=${args[1]}
	rm "$dirplaylists/$name.m3u"
	count=$( ls -1 $dirplaylists | wc -l )
	sed -i 's/\(.*playlists": \).*/\1'$count',/' $dirmpd/counts
	list=$( php /srv/http/mpdplaylist.php list )
	pushstream playlists "$list"
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
		sed -i "$to a$file" "$plfile"
	fi
	pushstream playlist '{"playlist":"'${name//\"/\\\"}'"}'
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
	list=$( php /srv/http/mpdplaylist.php list )
	pushstream playlists "$list"
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
	sed -i 's/\(.*playlists": \).*/\1'$count',/' $dirmpd/counts
	list=$( php /srv/http/mpdplaylist.php list )
	pushstream playlists "$list"
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
shareddatareload )
	systemctl restart mpd
	pushstream mpdupdate "$( cat $dirmpd/counts )"
	;;
thumbgif )
	gifThumbnail "${args[@]:1}"
	;;
thumbjpg )
	jpgThumbnail "${args[@]:1}"
	;;
upnpnice )
	for pid in $( pgrep upmpdcli ); do
		ionice -c 0 -n 0 -p $pid &> /dev/null 
		renice -n -19 -p $pid &> /dev/null
	done
	;;
volume )
	current=${args[1]}
	target=${args[2]}
	card=${args[3]}
	control=${args[4]}
	if [[ $current == drag ]]; then
		volumeSetAt $target $card "$control"
		exit
	fi
	
	[[ ! $current ]] && volumeGet && current=$volume
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
	volumeSet $current $target $card "$control"
	;;
volume0db )
	player=$( cat $dirshm/player )
	volumeGet
	amixer -c $card -Mq sset "$control" 0dB
	;;
volumecontrolget )
	volumeGet
	echo $card^$control^$volume # $control not last - keep trailing space if any
	;;
volumeget )
	type=${args[1]}
	volumeGet
	if [[ $type == db ]]; then
		echo $volume $db
	elif [[ $type == push ]]; then
		pushstream volume '{"val":'$volume',"db":"'$db'"}'
	else
		echo $volume
	fi
	;;
volumepushstream )
	[[ -e $dirshm/btreceiver ]] && sleep 1
	volumeGet
	pushstream volume '{"val":'$volume'}'
	[[ $control ]] && alsactl store
	;;
volumesave )
	volumeGet save
	;;
volumeupdown )
	updn=${args[1]}
	if [[ -e $dirshm/btreceiver ]]; then
		amixer -MqD bluealsa sset "$( cat $dirshm/btreceiver )" 1%$updn 2> /dev/null
	else
		card=${args[2]}
		control=${args[3]}
		if [[ $control ]]; then
			amixer -c $card -Mq sset "$control" 1%$updn
		else
			mpc -q volume ${updn}1
		fi
	fi
	volumeGet
	pushstreamVolume updn $volume
	;;
webradioadd )
	name=${args[1]}
	url=$( urldecode ${args[2]} )
	charset=${args[3]}
	dir=${args[4]}
	urlname=${url//\//|}
	ext=${url/*.}
	[[ $ext == m3u || $ext == pls ]] && webradioPlaylistVerify $ext $url
	
	[[ $dir ]] && file="$dirwebradios/$dir/$urlname" || file="$dirwebradios/$urlname"
	[[ -e "$file" ]] && echo -1 && exit
	
	echo "\
$name

$charset" > "$file"
	chown http:http "$file" # for edit in php
	webradioCount
	webRadioSampling $url "$file" &
	;;
webradiocoverreset )
	coverart=${args[1]}
	cover=${coverart:0:-15} # remove .1234567890.jpg
	rm -f "/srv/http$cover"{,-thumb}.*
	pushstream coverart '{"url":"'$coverart'","type":"webradioreset"}'
	;;
webradiodelete )
	url=${args[1]}
	dir=${args[2]}
	urlname=${url//\//|}
	[[ $dir ]] && file="$dirwebradios/$dir/$urlname" || file="$dirwebradios/$urlname"
	rm -f "$file"
	[[ -z $( find $dirwebradios -name $urlname ) ]] && rm -f "${dirwebradios}img/$urlname"{,-thumb}.*
	webradioCount
	;;
webradioedit )
	name=${args[1]}
	url=${args[2]}
	charset=${args[3]}
	dir=${args[4]}
	urlprev=${args[5]}
	urlname=${url//\//|}
	[[ $url != $urlprev ]] && urlchanged=1
	[[ $dir ]] && file="$dirwebradios/$dir/$urlname" || file="$dirwebradios/$urlname"
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
		[[ $dir ]] && rm "$dirwebradios/$dir/$urlprevname" || rm "$dirwebradios/$urlprevname"
		mv ${dirwebradios}img/{$urlprevname,$urlname}.jpg
		mv ${dirwebradios}img/{$urlprevname,$urlname}-thumb.jpg
		webRadioSampling $url "$file" &
	fi
	pushstream webradio -1
	;;
wrdirdelete )
	path=${args[1]}
	if [[ $( ls -A "$dirwebradios/$path" ) ]]; then
		echo -1
	else
		rm -rf "$dirwebradios/$path"
		pushstream webradio -1
	fi
	;;
wrdirnew )
	path=${args[1]}
	mkdir -p "$dirwebradios/$path"
	pushstream webradio -1
	;;
wrdirrename )
	path=${args[1]}
	name=${args[2]}
	newname=${args[3]}
	mv -f "$dirwebradios/$path/$name" "$dirwebradios/$path/$newname"
	pushstream webradio -1
	;;
	
esac
