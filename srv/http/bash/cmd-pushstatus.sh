#!/bin/bash

. /srv/http/bash/common.sh

#grep -q '"state".*pause' $dirshm/status && sleep 0.1 # fix: vumeter - resume with wrong track

if [[ $1 != statusradio ]]; then # from status-radio.sh
	status=$( $dirbash/status.sh | jq )
	echo "$status" \
		| grep '^  "Artist\|^  "Title\|^  "Album\|^  "station"\|^  "file\|^  "state\|^  "Time\|^  "elapsed\|^  "timestamp\|^  "webradio' \
		|  sed 's/^ *"\|,$//g; s/": /=/' \
		> $dirshm/statusnew
	grep -q 'webradio.*true' <<< "$status" && webradio=1
	if [[ -e $dirshm/status ]]; then
		filter='^Artist\|^Title\|^Album'
		[[ -z $webradio ]] && filter+='\|^file\|^state\|^Time\|^elapsed'
		[[ $( grep "$filter" $dirshm/statusnew | sort ) == $( grep "$filter" $dirshm/status | sort ) ]] && exit
		
		if [[ -z $webradio \
			&& -e $dirsystem/scrobble \
			&& ! -e $dirshm/player-snapcast \
			&& ! -e $dirshm/prevnextseek ]]; then
			player=$( ls $dirshm/player-* 2> /dev/null | cut -d- -f2 )
			if [[ $player == mpd || -e $dirsystem/scrobble.conf/$player ]]; then
				mv -f $dirshm/{status,scrobble}
				$dirbash/scrobble.sh &> /dev/null &
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
