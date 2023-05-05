#!/bin/bash

. /srv/http/bash/common.sh

killProcess statuspush
echo $$ > $dirshm/pidstatuspush

if [[ $1 == statusradio ]]; then # from status-radio.sh
	state=play
else
	status=$( $dirbash/status.sh )
	statusnew=$( sed '/^, "counts"/,/}/ d' <<< $status \
					| sed -E -n '/^, "Artist|^, "Album|^, "elapsed|^, "file| *"player|^, "station"|^, "state|^, "Time|^, "timestamp|^, "Title|^, "webradio"/ {
						s/^,* *"//; s/" *: */=/; p
						}' )
	echo "$statusnew" > $dirshm/statusnew
	if [[ -e $dirshm/status ]]; then
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
	fi
	mv -f $dirshm/status{new,}
	pushstream mpdplayer "$status"
fi

[[ $trackchanged && $state == play \
	&& -e $dirsystem/scrobble && ! -e $dirshm/scrobble ]] && scrobble=1

if systemctl -q is-active localbrowser; then
	if grep -q onwhileplay=true $dirsystem/localbrowser.conf; then
		export DISPLAY=:0
		[[ $state == play ]] && sudo xset -dpms || sudo xset +dpms
	fi
fi

if [[ -e $dirsystem/lcdchar ]]; then
	sed -E 's/(true|false)$/\u\1/' $dirshm/status > $dirshm/lcdcharstatus.py
	systemctl restart lcdchar
fi

if [[ -e $dirsystem/mpdoled ]]; then
	[[ $state == play ]] && systemctl start mpd_oled || systemctl stop mpd_oled
fi

if [[ -e $dirsystem/vumeter || -e $dirsystem/vuled ]]; then
	killProcess cava
	if [[ $state == play ]]; then
		cava -p /etc/cava.conf | $dirbash/vu.sh &> /dev/null &
		echo $! > $dirshm/pidcava
	else
		pushstream vumeter '{"val":0}'
		if [[ -e $dirsystem/vuled ]]; then
			p=$( < $dirsystem/vuled.conf )
			for i in $p; do
				echo 0 > /sys/class/gpio/gpio$i/value
			done
		fi
	fi
fi
if [[ -e $dirshm/clientip ]]; then
	serverip=$( ipAddress )
	[[ ! $status ]] && status=$( $dirbash/status.sh ) # status-radio.sh
	status=$( sed -E -e '1,/^, "single" *:/ d
					' -e '/^, "file" *:/ s/^,/{/
					' -e '/^, "icon" *:/ d
					' -e 's|^(, "stationcover" *: ")(.+")|\1http://'$serverip'\2|
					' -e 's|^(, "coverart" *: ")(.+")|\1http://'$serverip'\2|' <<< $status )
	clientip=$( < $dirshm/clientip )
	for ip in $clientip; do
		curl -s -X POST http://$ip/pub?id=mpdplayer -d "$status"
	done
fi

[[ -e $dirsystem/librandom && $webradio == false ]] && $dirbash/cmd.sh mpcaddrandom

pushstream refresh '{"page":"player","state":"'$state'"}'
pushstream refresh '{"page":"features","state":"'$state'"}'

[[ ! $scrobble || ! $statusprev ]] && exit # >>>>>>>>>> must be last for $statusprev - webradio and state

. <( echo "$statusprev" ) # status-radio.sh - no $statusprev
[[ ! $Artist || ! $Title || $Time < 30 || $webradio != false || $player == snapcast ]] && exit

[[ $player != mpd ]] && ! grep -q $player=true $dirsystem/scrobble.conf && exit

$dirbash/scrobble.sh "\
$Artist
$Title
$Album
CMD ARTIST TITLE ALBUM" &> /dev/null &
