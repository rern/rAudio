#!/bin/bash

. /srv/http/bash/common.sh

[[ -e $dirshm/usbdacadd ]] && exit
# --------------------------------------------------------------------
killProcess statuspush
echo $$ > $dirshm/pidstatuspush

if [[ $1 == statusradio ]]; then # from status-radio.sh
	state=play
else
	status=$( $dirbash/status.sh | jq )
	statusnew=$( sed -E -n \
'/^  "Artist|^  "Album|^  "Composer|^  "elapsed|^  "file|^  "player|^  "station"|^  "state|^  "Time|^  "timestamp|^  "Title|^  "webradio/ {
	s/^ *"|,$//g
	s/" *: */=/
	p
}' <<< $status \
| tee $dirshm/statusnew )
	statusprev=$( < $dirshm/status )
	compare='^Artist|^Title|^Album'
	[[ "$( grep -E "$compare" <<< $statusnew | sort )" != "$( grep -E "$compare" <<< $statusprev | sort )" ]] && trackchanged=1
	. <( echo "$statusnew" )
	if [[ $webradio == true ]]; then
		[[ ! $trackchanged && $state == play ]] && exit
# --------------------------------------------------------------------
	else
		compare='^state|^elapsed'
		[[ "$( grep -E "$compare" <<< $statusnew | sort )" != "$( grep -E "$compare" <<< $statusprev | sort )" ]] && statuschanged=1
		[[ ! $trackchanged && ! $statuschanged ]] && exit
# --------------------------------------------------------------------
	fi
########
	pushData mpdplayer "$status"
	if [[ -e $dirsystem/scrobble ]]; then
		cp -f $dirshm/status{,prev}
		timestampnew=$( grep ^timestamp <<< $statusnew | cut -d= -f2 )
	fi
	mv -f $dirshm/status{new,}
fi

if systemctl -q is-active localbrowser; then
	if grep -q onwhileplay=true $dirsystem/localbrowser.conf; then
		export DISPLAY=:0
		[[ $state == play ]] && sudo xset -dpms || sudo xset +dpms
	fi
fi

clientip=$( snapclientIP )
if [[ $clientip ]]; then
	status=$( $dirbash/status.sh snapclient )
	status='{ '${status/,}' }'
	for ip in $clientip; do
		pushWebsocket $ip mpdplayer $status
	done
fi
if [[ -e $dirsystem/lcdchar ]]; then
	status=$( sed -E 's/(true|false)$/\u\1/' $dirshm/status )
	if grep -q ^webradio=true <<< $status && grep -q radioelapsed.*false $dirsystem/display.json; then
		status="\
$( grep -v ^elapsed <<< $status )
elapsed=False"
	fi
	echo "$status" > $dirshm/status.py
	systemctl restart lcdchar
fi

if [[ -e $dirsystem/mpdoled ]]; then
	[[ $state == play ]] && start_stop=start || start_stop=stop
	systemctl $start_stop mpd_oled
fi

[[ -e $dirsystem/vuled || -e $dirsystem/vumeter ]] && cava=1
if [[ $state == play ]]; then
	[[ $cava ]] && systemctl start cava
else
	[[ $cava ]] && systemctl stop cava
	[[ -e $dirsystem/vumeter ]] && pushData vumeter '{ "val": 0 }'
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
