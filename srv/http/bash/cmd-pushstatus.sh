#!/bin/bash

dirbash=/srv/http/bash
dirsystem=/srv/http/data/system
dirshm=/srv/http/data/shm
filescrobble=$dirsystem/scrobble

#[[ $( sed -n 6p $dirshm/status ) == pause ]] && sleep 0.1 # fix: vumeter - resume with wrong track

pushstream() {
	curl -s -X POST http://127.0.0.1/pub?id=$1 -d "$2"
}

status=$( $dirbash/status.sh )
statusdata=$( echo $status \
	| jq -r '.Artist, .Title, .Album, .station, .file, .state, .Time, .elapsed, .timestamp, .webradio' \
	| sed 's/null//' )
readarray -t data <<< "$statusdata"
state=${data[5]}
webradio=${data[9]}
if [[ -e $dirshm/status ]]; then
	dataprev=$( cat $dirshm/status )
	[[ $webradio == false ]] && n=8 || n=3
	datanew=$( head -$n <<< $statusdata | tr -d '\n ' )
	dataprev=$( head -$n <<< $dataprev | tr -d '\n ' )
	[[ $datanew == $dataprev ]] && exit
fi

pushstream mpdplayer "$status"
echo "$statusdata" > $dirshm/status

[[ -e $dirsystem/mpdoled && $state != play ]] && systemctl stop mpd_oled

if [[ -e $dirsystem/lcdchar ]]; then
	killall lcdchar.py &> /dev/null
	readarray -t lcddata <<< "${statusdata//\"/\\\"}"
	$dirbash/lcdchar.py "${lcddata[@]}" &
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

if [[ -e $dirshm/snapclientip ]]; then
	status=$( echo $status | jq . | sed '/"player":/,/"single":/ d' )
	readarray -t clientip < $dirshm/snapclientip
	for ip in "${clientip[@]}"; do
		[[ -n $ip ]] && pushstream mpdplayer "$status"
	done
fi

[[ -e $dirsystem/librandom ]] && $dirbash/cmd-librandom.sh

if [[ $webradio == false && -e $filescrobble && ! -e $dirshm/player-snapclient ]]; then
	player=$( ls $dirshm/player-* 2> /dev/null | cut -d- -f2 )
	[[ $player != mpd && ! -e $filescrobble.conf/$player ]] && exit
	
	[[ -e $dirshm/scrobble ]] && $dirbash/cmd.sh scrobble # file not yet exist on initial play
	cat << EOF > $dirshm/scrobble
Artist="${data[0]}"
Title="${data[1]}"
Album="${data[2]}"
state=${data[5]}
Time=${data[6]}
start=$(( ${data[8]} - ${data[7]} ))
EOF
fi
