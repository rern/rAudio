#!/bin/bash

[[ -e /dev/shm/usbdac_rules ]] && exit # debounce usbdac.rules
# --------------------------------------------------------------------
. /srv/http/bash/common.sh

killProcess statuspush
echo $$ > $dirshm/pidstatuspush

if [[ $1 == statusradio ]]; then # from status-radio.sh radioStatusFile
	state=play
	statusradio=1
else
	status=$( $dirbash/status.sh | jq )
	for k in Artist Album Composer Conductor elapsed file player station state Time timestamp Title volume webradio; do
		filter+='|^  "'$k'"'
	done
	statuslines=$( grep -E "${filter:1}" <<< $status )
	statusnew=$( sed -E 's/^ *"|,$//g; s/" *: */=/' <<< $statuslines | tee $dirshm/statusnew )
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
	[[ ! $statusradio ]] && jq <<< "{ ${statuslines%,} }" > $dirshm/status.json # remove trailing ,
	systemctl restart lcdchar
fi

[[ $state == play ]] && start_stop=start || start_stop=stop
[[ -e $dirsystem/mpdoled ]] && systemctl $start_stop mpd_oled

if [[ -e $dirsystem/vuled || -e $dirsystem/vumeter ]]; then
	systemctl $start_stop cava
	[[ $state != play && -e $dirsystem/vumeter ]] && pushData vumeter '{ "val": 0 }'
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
