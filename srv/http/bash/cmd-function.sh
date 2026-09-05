#!/bin/bash

dir2path() {
	if [[ $1 == /* ]]; then
		echo "$1"
	elif [[ $1 == [NSU]* ]]; then
		echo "/mnt/MPD/$1"
	else
		line=$( grep -m1 ^$1 $dirmpd/radio )
		echo "${line/*^}"
	fi
}
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
			rm -f $dirshm/upnp
			systemctl start upmpdcli
			;;
	esac
	if [[ $player == mpd ]]; then
		$dirbash/status-push.sh
	else
		$dirbash/status-push.sh playerstop
	fi
	if [[ -e $dirshm/relayson ]] && grep -q timeron=true $dirsystem/relays.conf; then
		$dirbash/relays-timer.sh &> /dev/null &
	fi
}
plClear() {
	mpc -q clear
	radioStop
	rm -f $dirsystem/librandom $dirshm/playlist*
	[[ $CMD == mpcremove ]] && pushData playlist '{ "blank": true }'
	$dirbash/status-push.sh
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
pushRadioList() {
	pushData radiolist '{ "type": "webradio" }'
}
pushSavedPlaylist() {
	if [[ $( ls $dirdata/playlists ) ]]; then
		pushData playlists $( php /srv/http/playlist.php list )
	else
		pushData playlists '{ "count": 0 }'
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
