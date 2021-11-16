#!/bin/bash

. /srv/http/bash/common.sh

if [[ $1 != statusradio ]]; then # from status-radio.sh
	status=$( $dirbash/status.sh )
	statusnew=$( echo "$status" \
		| sed '/^.*"counts"/,/}/ d' \
		| grep '^.*"Artist\|^.*"Title\|^.*"Album\|^.*"station"\|^.*"file\|^.*"state\|^.*"Time\|^.*"elapsed\|^.*"timestamp\|^.*"webradio\|^.*"player"' \
		|  sed 's/^,* *"//; s/" *: */=/' )
	echo "$statusnew" > $dirshm/statusnew
	if [[ -e $dirshm/status ]]; then
		statusprev=$( cat $dirshm/status )
		. <( echo "$statusprev" )
		compare='^Artist\|^Title\|^Album'
		[[ "$( grep "$compare" <<< "$statusnew" | sort )" != "$( grep "$compare" <<< "$statusprev" | sort )" ]] && trackchanged=1
		if [[ $webradio == true ]]; then
			[[ -z $trackchanged ]] && exit
			
		else
			compare='^state\|^elapsed'
			[[ "$( grep "$compare" <<< "$statusnew" | sort )" != "$( grep "$compare" <<< "$statusprev" | sort )" ]] && statuschanged=1
			[[ -z $trackchanged && -z $statuschanged ]] && exit
			
		fi
		[[ -n $trackchanged \
			&& $webradio == false \
			&& -e $dirsystem/scrobble \
			&& ! -e $dirshm/scrobble \
			&& ( $player == mpd || -e $dirsystem/scrobble.conf/$player ) \
			&& $player != snapcast \
			&& -n $Artist \
			&& -n $Title ]] \
			&& (( $Time > 30 )) \
			&& $dirbash/scrobble.sh "\
$Artist
$Title
$Album" &> /dev/null &
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
