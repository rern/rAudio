#!/bin/bash

. /srv/http/bash/common.sh

killProcess statuspush
echo $$ > $dirshm/pidstatuspush

if [[ $1 == statusradio ]]; then # from status-radio.sh
	state=play
else
	status=$( $dirbash/status.sh )
	statusnew=$( sed '/^, "counts"/,/}/ d' <<< $status \
					| sed -E -n '/^, "Artist|^, "Album|^, "Composer|^, "elapsed|^, "file| *"player|^, "station"|^, "state|^, "Time|^, "timestamp|^, "Title|^, "webradio"/ {
						s/^,* *"//; s/" *: */=/; p
						}' )
	echo "$statusnew" > $dirshm/statusnew
	statusprev=$( < $dirshm/status )
	compare='^Artist|^Title|^Album'
	[[ "$( grep -E "$compare" <<< $statusnew | sort )" != "$( grep -E "$compare" <<< $statusprev | sort )" ]] && trackchanged=1
	. <( echo "$statusnew" )
	if [[ $webradio == true ]]; then
		[[ ! $trackchanged && $state == play ]] && exit # >>>>>>>>>>
		
	else
		compare='^state|^elapsed'
		[[ "$( grep -E "$compare" <<< $statusnew | sort )" != "$( grep -E "$compare" <<< $statusprev | sort )" ]] && statuschanged=1
		[[ ! $trackchanged && ! $statuschanged ]] && exit # >>>>>>>>>>
		
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

if [[ -e $dirshm/clientip ]]; then
	serverip=$( ipAddress )
	[[ ! $status ]] && status=$( $dirbash/status.sh ) # $statusradio
	status=$( sed -E -e '1,/^, "single" *:/ d;/^, "icon" *:/ d; /^, "login" *:/ d; /^}/ d
					' -e '/^, "stationcover"|^, "coverart"/ s|(" *: *")|\1http://'$serverip'|' <<< $status )
	data='{ "channel": "mpdplayer", "data": { ${status:1} }'
	clientip=$( < $dirshm/clientip )
	for ip in $clientip; do
		data=$( tr -d '\n' <<< $data )
		echo "$data" | websocat ws://127.0.0.1:8080
	done
fi
if [[ -e $dirsystem/lcdchar ]]; then
	sed -E 's/(true|false)$/\u\1/' $dirshm/status > $dirshm/lcdcharstatus.py
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

[[ -e $dirsystem/librandom && $webradio == false ]] && $dirbash/cmd.sh mpclibrandom

for p in player features camilla; do
	pushData refresh '{ "page": "'$p'", "state": "'$state'" }'
done

[[ ! -e $dirsystem/scrobble ]] && exit

[[ ! $trackchanged && ! -e $dirshm/elapsed ]] && exit # track changed || prev/next/stop

. $dirshm/statusprev
[[ $state == stop || $webradio == true || ! $Artist || ! $Title || $Time -lt 30 ]] && exit

if [[ $player != mpd ]]; then
	! grep -q $player=true $dirsystem/scrobble.conf && exit
	
	if [[ $state =~ ^(play|pause)$ ]]; then # renderers prev/next
		elapsed=$(( ( timestampnew - timestamp ) / 1000 ))
		(( $elapsed < $Time )) && echo $elapsed > $dirshm/elapsed
	fi
fi
if [[ -e $dirshm/elapsed ]];then
	elapsed=$( < $dirshm/elapsed )
	rm $dirshm/elapsed
	(( $elapsed < 240 && $elapsed < $(( Time / 2 )) )) && exit
	
fi
$dirbash/scrobble.sh "cmd
$Artist
$Title
CMD ARTIST TITLE"&> /dev/null &
