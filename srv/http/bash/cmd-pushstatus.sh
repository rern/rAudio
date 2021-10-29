#!/bin/bash

dirbash=/srv/http/bash
dirsystem=/srv/http/data/system
dirshm=/srv/http/data/shm

#[[ $( sed -n 6p $dirshm/status ) == pause ]] && sleep 0.1 # fix: vumeter - resume with wrong track

status=$( $dirbash/status.sh )
statusdata=$( echo $status \
	| jq -r '.Artist, .Title, .Album, .station, .file, .state, .Time, .elapsed, .timestamp, .webradio' \
	| sed 's/null//' )
state=$( sed -n 6p <<< "$statusdata" )
webradio=$( sed -n 10p <<< "$statusdata" )
if [[ -e $dirshm/status ]]; then
	dataprev=$( cat $dirshm/status )
	[[ $webradio == false ]] && n=8 || n=3
	datanew=$( head -$n <<< $statusdata | tr -d '\n ' )
	dataprev=$( head -$n <<< $dataprev | tr -d '\n ' )
	[[ $datanew == $dataprev ]] && exit
fi

curl -s -X POST http://127.0.0.1/pub?id=mpdplayer -d "$status"
echo "$statusdata" > $dirshm/status

[[ -e $dirsystem/mpdoled && $state != play ]] && systemctl stop mpd_oled

if [[ -e $dirsystem/lcdchar ]]; then
	killall lcdchar.py &> /dev/null
	readarray -t data <<< "${statusdata//\"/\\\"}"
	$dirbash/lcdchar.py "${data[@]}" &
fi

if [[ -e $dirsystem/vumeter || -e $dirsystem/vuled ]]; then
	if [[ $state == play ]]; then
		if ! pgrep cava &> /dev/null; then
			cava -p /etc/cava.conf | $dirbash/vu.sh &> /dev/null &
		fi
	else
		killall cava &> /dev/null
		curl -s -X POST http://127.0.0.1/pub?id=vumeter -d '{"val":0}'
		if [[ -e $dirsystem/vuled ]]; then
			p=$( cat $dirsystem/vuled.conf )
			for i in $p; do
				echo 0 > /sys/class/gpio/gpio$i/value
			done
		fi
	fi
fi

if [[ -e $dirshm/snapclientip ]]; then
	status=$( echo $status | jq . | sed '/"player":/,/"single":/ d' )
	readarray -t clientip < $dirshm/snapclientip
	for ip in "${clientip[@]}"; do
		[[ -n $ip ]] && curl -s -X POST http://$ip/pub?id=mpdplayer -d "$status"
	done
fi

[[ -e $dirsystem/librandom ]] && $dirbash/cmd-librandom.sh

[[ ! -e $dirsystem/scrobble || $webradio == true || -e $dirshm/player-snapclient ]] && exit

$dirbash/cmd.sh "scrobble
$( head -3 <<< "$dataprev" )"
