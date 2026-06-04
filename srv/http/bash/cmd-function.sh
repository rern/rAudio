#!/bin/bash

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
#...............................................................................
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
	case $player in
		airplay )
			systemctl stop shairport # metadata
			systemctl restart shairport-sync
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
			rm -f $dirshm/spotify/start
			systemctl restart spotifyd
			;;
		upnp )
			systemctl stop upmpdcli
			mpc -q clear
			systemctl start upmpdcli
			;;
	esac
	if [[ $player == mpd ]]; then
		$dirbash/status-push.sh
	else
		$dirbash/status-push.sh playerstop
	fi
	[[ -e $dirshm/relayson && $( getVar timeron $dirsystem/relays.conf ) == true ]] && $dirbash/relays-timer.sh &> /dev/null &
}
plClear() {
	mpc -q clear
	radioStop
	rm -f $dirsystem/librandom $dirshm/playlist*
	[[ $CMD == mpcremove ]] && pushData playlist '{ "blank": true }'
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
		data=$( php /srv/http/playlist.php current | tr -d '\n' )
		data=$( pushDataSet playlist "$data" )
		b=$( printf '%s' "$data" | wc -c )
		buffer=$(( b + 100 ))
		websocat --text -B $buffer ws://127.0.0.1:8080 <<< $data
	fi
	( sleep 1 && rm -f $dirshm/pushplaylist ) &
}
pushRadioList() {
	pushData radiolist '{ "type": "webradio" }'
}
pushSavedPlaylist() {
	if [[ $( ls $dirdata/playlists ) ]]; then
		pushData playlists $( php /srv/http/playlist.php list )
	else
		pushData playlists '{ "count": false }'
	fi
}
radioStop() {
	[[ ! -e $dirshm/radio ]] && return
#...............................................................................
	mpc -q stop
	systemctl stop radio dab &> /dev/null
	rm -f $dirshm/radio
	pushStatus
	[[ -e $dirsystem/mpdoled ]] && systemctl stop mpd_oled
}
savedPlCount() {
	playlists=$( ls $dirplaylists | wc -l )
	grep -q '"playlists".*,' $dirmpd/counts && playlists+=,
	sed -i -E 's/("playlists" *: ).*/\1'$playlists'/' $dirmpd/counts
	pushSavedPlaylist
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
#...............................................................................
	if [[ $ext == m3u ]]; then
		url=$( curl -s "$url" 2> /dev/null | grep -m1 ^http )
	elif [[ $ext == pls ]]; then
		url=$( curl -s "$url" 2> /dev/null | grep -m1 ^File | cut -d= -f2 )
	fi
	[[ ! $url ]] && echo 'No valid URL found in:'$url && exit
# --------------------------------------------------------------------
}
webRadioSampling() {
	local bitrate data file kb rate sample samplerate url
	url=$1
	file=$2
	timeout 3 curl -sL "$url" -o /tmp/webradio
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
