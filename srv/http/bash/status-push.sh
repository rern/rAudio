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
			$dirbash/status-push.sh
			exit
# --------------------------------------------------------------------
		fi
	fi
	[[ ! -e /bin/firefox ]] && return
	! systemctl -q is-active localbrowser && return

	if grep -q onwhileplay=true $dirsystem/localbrowser.conf; then
		export DISPLAY=:0
		if [[ $state == play ]]; then
			sudo xset dpms force on
			sudo xset -dpms
		else
			sudo xset +dpms
		fi
	fi
}

killProcess statuspush
echo $$ > $dirshm/pidstatuspush

if [[ $1 == statusradio ]]; then # from status-radio.sh radioStatusFile
	state=play
	statusradio=1
	onPlay
else
#	grep -q '"state".*""' <<< $status && status=$( $dirbash/status.sh ) # fix: no state on start playing dsd from network (<rpi4)
	status=$( $dirbash/status.sh \
				| jq '{ Artist, Album,   Composer, Conductor, coverart,  elapsed, file,   player
					  , song   ,station, state,    Time,      timestamp, Title,   volume, webradio }' )
	statusnew=$( json2var "$status" | tee $dirshm/statusnew )
	statusprev=$( cat $dirshm/status 2> /dev/null )
	. <( echo "$statusnew" )
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
########
	pushData mpdplayer "$status"
	[[ -e $dirsystem/scrobble ]] && cp -f $dirshm/status{,prev}
	mv -f $dirshm/status{new,}
fi
clientip=$( snapclientIP )
if [[ $clientip ]]; then
	status=$( $dirbash/status.sh snapclient )
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
	[[ ! $statusradio ]] && echo "$status" > $dirshm/status.json
	systemctl restart lcdchar
fi
if [[ -e $dirsystem/mpdoled ]]; then
	[[ $start_stop == stop ]] && pkill -9 cava
	systemctl $start_stop mpd_oled
fi
[[ -e $dirsystem/librandom && $webradio == false ]] && $dirbash/cmd.sh pladdrandom &
[[ ! -e $dirsystem/scrobble ]] && exit
# --------------------------------------------------------------------
[[ ! $trackchanged && ! -e $dirshm/elapsed ]] && exit # track changed || prev/next/stop
# --------------------------------------------------------------------
. $dirshm/statusprev
[[ $state == stop || $webradio == true || ! $Artist || ! $Title || $Time -lt 30 ]] && exit
# --------------------------------------------------------------------
if [[ $player != mpd ]]; then
	! grep -q $player=true $dirsystem/scrobble.conf && exit
# --------------------------------------------------------------------
	if [[ $state =~ ^(play|pause)$ ]]; then # renderers prev/next
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
