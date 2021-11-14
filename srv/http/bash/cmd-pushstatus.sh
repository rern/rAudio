#!/bin/bash

. /srv/http/bash/common.sh

if [[ $1 != statusradio ]]; then # from status-radio.sh
	status=$( $dirbash/status.sh | jq )
	statusnew=$( echo "$status" \
		| grep '^  "Artist\|^  "Title\|^  "Album\|^  "station"\|^  "file\|^  "state\|^  "Time\|^  "elapsed\|^  "timestamp\|^  "webradio' \
		|  sed 's/^ *"\|,$//g; s/": /=/' )
	echo "$statusnew" > $dirshm/statusnew
	if [[ -e $dirshm/status ]]; then
		statusprev=$( cat $dirshm/status )
		filter='^Artist\|^Title\|^Album'
		[[ "$( grep "$filter" <<< "$statusnew" | sort )" != "$( grep "$filter" <<< "$statusprev" | sort )" ]] && trackchanged=1
		grep -q 'webradio.*true' <<< "$statusprev" && webradio=1
		if [[ -n $webradio ]]; then
			[[ -z $trackchanged  ]] && exit
		else
			filter='^state\|^elapsed'
			[[ "$( grep "$filter" <<< "$statusnew" | sort )" != "$( grep "$filter" <<< "$statusprev" | sort )" ]] && statuschanged=1
			[[ -z $trackchanged && -z $statuschanged ]] && exit
		fi
		
		if [[ -z $webradio && -e $dirsystem/scrobble && ! -e $dirshm/player-snapcast && ! -e $dirshm/scrobble ]]; then
			if [[ -n $trackchanged ]]; then # play - track end
				player=$( ls $dirshm/player-* 2> /dev/null | cut -d- -f2 )
				if [[ $player == mpd || -e $dirsystem/scrobble.conf/$player ]]; then
					. $dirshm/status
					if (( $Time > 30 )) && [[ -n $Artist && -n $Title ]]; then
						$dirbash/scrobble.sh "\
$Artist
$Title
$Album" &> /dev/null &
					fi
				fi
			fi
		fi
	fi
	
	mv -f $dirshm/status{new,}
	pushstream mpdplayer "$status"
fi

[[ -e $dirsystem/mpdoled && $state != play ]] && systemctl stop mpd_oled

if [[ -e $dirsystem/lcdchar ]]; then
	sed 's/=true$/=True/; s/=false/=False/' $dirshm/status > $dirshm/statuslcd.py
	killall lcdchar.py &> /dev/null
	$dirbash/lcdchar.py &
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
	[[ -z $status ]] && status=$( $dirbash/status.sh | jq ) # status-radio.sh
	status=$( echo "$status" | sed -e '/"player":/,/"single":/ d' -e 's#"coverart" *: "\|"stationcover" *: "#&http://'$serverip'#' )
	clientip=( $( cat $dirshm/clientip ) )
	for ip in "${clientip[@]}"; do
		curl -s -X POST http://$ip/pub?id=mpdplayer -d "$status"
	done
fi

[[ -e $dirsystem/librandom && -z $webradio ]] && $dirbash/cmd-librandom.sh
