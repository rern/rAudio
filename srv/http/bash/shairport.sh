#!/bin/bash

# shairport.service > this:
#    - /tmp/shairport-sync-metadata emits data

. /srv/http/bash/common.sh

dirairplay=$dirshm/airplay
rm -f $dirairplay/{elapsed,pause}
echo stop > $dirairplay/state

pause() {
	echo pause > $dirairplay/state
	elapsed=$( < $dirairplay/elapsed )
	pushData airplay '{ "state": "pause", "elapsed": '$elapsed' }'
}
play() {
	echo play > $dirairplay/state
	$dirbash/status-push.sh
}

cat /tmp/shairport-sync-metadata | while read line; do
	[[ $line == *'>0</length>' || ( $line != '<item'* && $line != *'item>' ) ]] && continue
	
	##### code - hex matched
	hex=$( sed -E 's|.*code>(.*)</code.*|\1|' <<< $line )
	if [[ ${#hex} == 8 ]]; then 
		case $hex in # found code > [next line]
			61736172 | 61736161 ) code=Artist   && continue;; # asar | asaa
			6d696e6d )            code=Title    && continue;; # minm
			6173616c )            code=Album    && continue;; # asal
			50494354 )            code=coverart && continue;; # PICT
			70726772 )            code=progress && continue;; # prgr
			63617073 )            code=state    && continue;; # caps
		esac
	fi
	
	# no line with code found yet > [next line]
	[[ ! $code ]] && continue
	
	##### value - base64 decode
	base64=$( tr -d '\000' <<< ${line/<*} ) # remove tags and null bytes
	# null or not base64 string - reset code= > next line
	if [[ ! $base64 || ! $base64 =~ ^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{2}==)?$ ]]; then
		code=
		continue
	fi
	
	if [[ $code == coverart ]]; then
		base64 -d <<< $base64 > $dirairplay/coverart.jpg
		pushData airplay '{ "coverart": "/data/shm/airplay/coverart.jpg" }'
	elif [[ $code == state ]]; then
		case $base64 in
			AQ== ) play;;
			Ag== ) pause;;
		esac
	else
		data=$( base64 -d <<< $base64 2> /dev/null )
		if [[ $code == progress ]]; then                            # start/current/end @44100/s
			read elapsed Time < <( awk -F'/' '{ printf "%0.f %0.f", ( $2 - $1 ) / 44100, ( $3 - $1 ) / 44100 }' <<< $data )
			pushData airplay '{ "elapsed": '$elapsed', "Time": '$Time' }'
			echo $elapsed > $dirairplay/elapsed
			echo $Time >    $dirairplay/Time
			date +%s%3N >   $dirairplay/timestamp
			play
		else
			echo $data > $dirairplay/$code
			pushData airplay '{ "'$code'": "'$( quoteEscape $data )'" }'
		fi
	fi
	code=
done
