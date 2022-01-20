#!/bin/bash

. /srv/http/bash/common.sh

if [[ $1 == statusradio ]]; then # from status-radio.sh
	state=play
else
	status=$( $dirbash/status.sh )
	statusnew=$( echo "$status" \
		| sed '/^, "counts"/,/}/ d' \
		| grep -E '^, "Artist|^, "Title|^, "Album|^, "station"|^, "file|^, "state|^, "Time|^, "elapsed|^, "timestamp|^, "webradio|^, "player"' \
		| sed 's/^,* *"//; s/" *: */=/' )
	echo "$statusnew" > $dirshm/statusnew
	if [[ -e $dirshm/status ]]; then
		statusprev=$( cat $dirshm/status )
		compare='^Artist\|^Title\|^Album'
		[[ "$( grep "$compare" <<< "$statusnew" | sort )" != "$( grep "$compare" <<< "$statusprev" | sort )" ]] && trackchanged=1
		. <( echo "$statusnew" )
		if [[ $webradio == true ]]; then
			[[ ! $trackchanged && $state == play ]] && exit
			
		else
			compare='^state\|^elapsed'
			[[ "$( grep "$compare" <<< "$statusnew" | sort )" != "$( grep "$compare" <<< "$statusprev" | sort )" ]] && statuschanged=1
			[[ ! $trackchanged && ! $statuschanged ]] && exit
			
		fi
	fi
	mv -f $dirshm/status{new,}
	pushstream mpdplayer "$status"
fi

[[ $trackchanged && $state == play \
	&& -e $dirsystem/scrobble && ! -e $dirshm/scrobble ]] && scrobble=1

if [[ -e $dirsystem/onwhileplay ]]; then
	[[ ! $state ]] && state=$( awk -F'"' '/^state/ {print $2}' $dirshm/status ) # $1 == statusradio
	export DISPLAY=:0
	[[ $state == play ]] && sudo xset -dpms || sudo xset +dpms
fi

if [[ -e $dirsystem/mpdoled ]]; then
	[[ $state == play ]] && systemctl start mpd_oled || systemctl stop mpd_oled
fi

if [[ -e $dirsystem/lcdchar ]]; then
	sed 's/\(true\|false\)$/\u\1/' $dirshm/status > $dirshm/statuslcd.py
	kill -9 $( pgrep lcdchar ) &> /dev/null
	$dirbash/lcdchar.py &
fi

if [[ -e $dirshm/clientiplcdchar ]]; then
	clientip=$( cat $dirshm/clientiplcdchar )
	for ip in $clientip; do
		sshpass -p ros ssh -qo StrictHostKeyChecking=no root@$ip "$dirbash/cmd.sh lcdcharsnapclient"
	done
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
			p=$( cat $dirsystem/vuled.conf )
			for i in $p; do
				echo 0 > /sys/class/gpio/gpio$i/value
			done
		fi
	fi
fi
if [[ -e $dirshm/clientip ]]; then
	serverip=$( ifconfig | awk '/inet .*broadcast/ {print $2}' )
	[[ ! $status ]] && status=$( $dirbash/status.sh ) # status-radio.sh
	status=$( echo "$status" \
				| sed -e '1,/^, "single" *:/ d
					' -e '/^, "file" *:/ s/^,/{/
					' -e '/^, "icon" *:/ d
					' -e 's|^\(, "stationcover" *: "\)\(.\+"\)|\1http://'$serverip'\2|
					' -e 's|^\(, "coverart" *: "\)\(.\+"\)|\1http://'$serverip'\2|' )
	clientip=( $( cat $dirshm/clientip ) )
	for ip in "${clientip[@]}"; do
		curl -s -X POST http://$ip/pub?id=mpdplayer -d "$status"
	done
fi

[[ -e $dirsystem/librandom && $webradio == false ]] && $dirbash/cmd-librandom.sh

[[ ! $scrobble ]] && exit # must be last for $statusprev - webradio and state

. <( echo "$statusprev" )
[[ $webradio == false && $player != snapcast \
	&& ( $player == mpd || -e $dirsystem/scrobble.conf/$player ) \
	&& $Artist && $Title ]] \
	&& (( $Time > 30 )) \
	&& $dirbash/scrobble.sh "\
$Artist
$Title
$Album" &> /dev/null &
