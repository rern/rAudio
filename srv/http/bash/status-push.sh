#!/bin/bash

[[ -e /dev/shm/usbdac_rules ]] && exit # debounce usbdac.rules
# --------------------------------------------------------------------
. /srv/http/bash/common.sh

isChanged() {
	for k in $@; do
		prev=$( sed -n -E '/^'$k'/ {s/.*="*|"*$//g; p}' <<< $statusprev )
		[[ $prev != ${!k} ]] && return 0
	done
}
onPlay() {
	if [[ -e $dirsystem/stoptimer ]]; then
		if [[ $state == play ]]; then
			[[ ! -e $dirshm/pidstoptimer ]] && $dirbash/stoptimer.sh &> /dev/null &
		elif [[ -e $dirshm/pidstoptimer ]]; then
			killProcess stoptimer
			if grep -q ^onplay=$ $dirsystem/stoptimer.conf; then
				rm $dirsystem/stoptimer
				pushData refresh '{ "page": "features", "stoptimer": false }'
			fi
			pushStatus
			exit
# --------------------------------------------------------------------
		fi
	fi
	if [[ ! -e /bin/firefox ]] \
			|| ! systemctl -q is-active localbrowser \
			|| ! grep -q onwhileplay=true $dirsystem/localbrowser.conf; then
		return
#...............................................................................
	fi
	export DISPLAY=:0
	if [[ $state == play ]]; then
		sudo xset dpms force on
		sudo xset -dpms
	else
		sudo xset +dpms
	fi
}

killProcess statuspush
echo $$ > $dirshm/pidstatuspush

filter='{ Album,    Artist, Composer, Conductor, coverart, elapsed,   file,  icon,   player, pllength
		, sampling, song,   station,  state,     Time,     timestamp, Title, volume, webradio }'
if [[ $1 == playerstop ]]; then
	status=$( $dirbash/status )
	json2var "$( jq "$filter" <<< $status )" > $dirshm/status
	state=stop
elif [[ $1 ]]; then # from status-dab.sh, status-radio.sh
	args2var "$1"
	elapsed=$( mpcElapsed webradio )
	pllength=$( mpc status %length% )
	timestamp=$( date +%s%3N )
	status='{
  "Album"     : "'$ALBUM'"
, "Artist"    : "'$ARTIST'"
, "coverart"  : "'$COVERART'"
, "elapsed"   : '$elapsed'
, "pllength"  : '$pllength'
, "state"     : "play"
, "Time"      : false
, "timestamp" : '$timestamp'
, "Title"     : "'$TITLE'"
, "webradio"  : true
}'
	[[ ! $COVERART ]] && $dirbash/status-coverartonline.sh "cmd
$ARTIST
$ALBUM
webradio
CMD ARTIST ALBUM MODE" &> /dev/null &
	json2var "$status" > $dirshm/status
	state=play
	webradio=true
	onPlay
else
#	grep -q '"state".*""' <<< $status && status=$( $dirbash/status ) # fix: no state on start playing dsd from network (<rpi4)
	status=$( $dirbash/status | jq "$filter" )
	statusprev=$( cat $dirshm/status 2> /dev/null )
	. <( json2var "$status" | tee $dirshm/status )
	isChanged Artist Title Album && trackchanged=1
	onPlay
	if [[ $webradio == true ]]; then
		[[ ! $trackchanged && $state == play ]] && exit
# --------------------------------------------------------------------
	else
		isChanged state elapsed && statuschanged=1
		[[ ! $trackchanged && ! $statuschanged ]] && exit
# --------------------------------------------------------------------
	fi
fi
########
pushData mpdplayer "$status"
clientip=$( snapclientIP )
if [[ $clientip ]]; then
	status=$( $dirbash/status -s )
	status='{ '${status/,}' }'
	for ip in $clientip; do
		pushWebsocket $ip mpdplayer $status
	done
fi
[[ $state == play ]] && start_stop=start || start_stop=stop
[[ -e $dirsystem/vuled || -e $dirsystem/vumeter ]] && systemctl $start_stop cava
[[ -e $dirsystem/vumeter && $state != play ]] && pushData vumeter '{ "val": 0 }'
[[ -e $dirshm/power ]] && exit
# --------------------------------------------------------------------
if [[ -e $dirsystem/lcdchar ]]; then
	echo "$status" > $dirshm/status.json
	systemctl restart lcdchar
fi
[[ -e $dirsystem/mpdoled ]] && systemctl $start_stop mpd_oled
[[ -e $dirsystem/librandom && $webradio == false ]] && $dirbash/cmd.sh pladdrandom &
[[ ! -e $dirsystem/scrobble || ( ! $trackchanged && ! -e $dirshm/elapsed ) ]] && exit # track changed || prev/next/stop
# --------------------------------------------------------------------
. <( echo $statusprev )
[[ $state == stop || $webradio == true || ! $Artist || ! $Title || $Time -lt 30 ]] && exit
# --------------------------------------------------------------------
if [[ $( < $dirshm/player ) != mpd ]]; then
	! grep -q $player=true $dirsystem/scrobble.conf && exit
# --------------------------------------------------------------------
	if [[ $state == play || $state == pause ]]; then # renderers prev/next
		timestampnew=$( getVar timestamp $dirshm/status )
		elapsed=$(( ( timestampnew - timestamp ) / 1000 ))
		(( $elapsed < $Time )) && echo $elapsed > $dirshm/elapsed
	fi
fi
if [[ -e $dirshm/elapsed ]];then
	elapsed=$( < $dirshm/elapsed )
	rm $dirshm/elapsed
	(( $elapsed < 240 && $elapsed < $(( Time / 2 )) )) && exit
# --------------------------------------------------------------------
fi
$dirbash/scrobble.sh "cmd
$Artist
$Title
CMD ARTIST TITLE"&> /dev/null &
