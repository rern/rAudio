#!/bin/bash

. /srv/http/bash/common.sh

if [[ $1 == statusradio ]]; then # from status-radio.sh
	state=play
	data=$2
	pushstream mpdradio "$data"
	cat << EOF > $dirshm/status
$( sed -e '/^{\|^}/ d' -e 's/^.."//; s/" *: /=/' <<< $data )
timestamp=$( date +%s%3N )
webradio=true
player=mpd
EOF
	$dirbash/cmd.sh coverfileslimit
else
	status=$( $dirbash/status.sh )
	statusnew=$( sed '/^, "counts"/,/}/ d' <<< $status \
					| sed -E -n '/^, "Artist|^, "Album|^, "elapsed|^, "file|^, "player|^, "station"|^, "state|^, "Time|^, "timestamp|^, "Title|^, "webradio"/ {
						s/^,* *"//; s/" *: */=/; s/(state=)"(.*)"/\1\2/; p
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

if [[ -e $dirsystem/onwhileplay ]]; then
	export DISPLAY=:0
	[[ $state == play ]] && sudo xset -dpms || sudo xset +dpms
fi

if [[ -e $dirsystem/mpdoled ]]; then
	[[ $state == play ]] && systemctl start mpd_oled || systemctl stop mpd_oled
fi

if [[ -e $dirsystem/lcdchar ]]; then
	sed -E 's/(true|false)$/\u\1/' $dirshm/status > $dirshm/statuslcd.py
	lcdchar.py &> /dev/null &
fi

if [[ -e $dirsystem/vumeter || -e $dirsystem/vuled ]]; then
	if [[ $state == play ]]; then
		if ! pgrep cava &> /dev/null; then
			cava -p /etc/cava.conf | $dirbash/vu.sh &> /dev/null &
		fi
	else
		killall cava &> /dev/null
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

[[ ! $scrobble ]] && exit # >>>>>>>>>> must be last for $statusprev - webradio and state

. $dirsystem/scrobble.conf
. <( echo "$statusprev" )
[[ $webradio == false && $player != snapcast \
	&& ( $player == mpd || ${!player} == true ) \
	&& $Artist && $Title ]] \
	&& (( $Time > 30 )) \
	&& $dirbash/scrobble.sh "\
$Artist
$Title
$Album" &> /dev/null &
