#!/bin/bash

# shairport.service > this:
#    - /tmp/shairport-sync-metadata emits data

. /srv/http/bash/common.sh

dirairplay=$dirshm/airplay
rm -f $dirairplay/{elapsed,pause,start}
echo stop > $dirairplay/state

pause() {
	echo pause > $dirairplay/state
	touch $dirairplay/pause
	elapsed=$( < $dirairplay/elapsed )
	pushData airplay '{ "state": "pause", "elapsed": '$elapsed' }'
}
play() {
	[[ -e $dirairplay/pause ]] && rm $dirairplay/{elapsed,pause}
	echo play > $dirairplay/state
	$dirbash/status-push.sh
}

cat /tmp/shairport-sync-metadata | while read line; do
	[[ $line =~ 'encoding="base64"' || $line =~ '<code>'.*'<code>' ]] && continue # skip: no value / double codes
	
	##### code - hex matched
	hex=$( sed -E 's|.*code>(.*)</code.*|\1|' <<< $line )
	if [[ ${#hex} == 8 ]]; then # found code > [next line]
		case $hex in
			61736172|61736161 ) code=Artist   && continue;; # asar|asaa
			6d696e6d )          code=Title    && continue;; # minm
			6173616c )          code=Album    && continue;; # asal
			50494354 )          code=coverart && continue;; # PICT
			70726772 )          code=progress && continue;; # prgr
			63617073 )          code=state    && continue;; # caps
		esac
	fi
	
	# no line with code found yet > [next line]
	[[ ! $code ]] && continue
	
	##### value - base64 decode
	base64=$( tr -d '\000' <<< ${line/<*} ) # remove tags and null bytes
	# null or not base64 string - reset code= > [next line]
	if [[ ! $base64 || ! $base64 =~ ^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{2}==)?$ ]]; then
		code=
		continue
	fi
	
	if [[ $code == coverart ]]; then
		base64 -d <<< $base64 > $dirairplay/coverart.jpg
		pushData airplay '{ "coverart": "/data/shm/airplay/coverart.jpg" }'
	elif [[ $code == state ]]; then
		if [[ $base64 == 'AQ==' ]]; then # 1
			play
		elif [[ $base64 == 'Ag==' ]]; then # 2
			pause
		fi
	else
		data=$( base64 -d <<< $base64 2> /dev/null )
		if [[ $code == progress ]]; then # format: start/elapsed/end @44100/s
			play
			progress=( ${data//\// } )
			start=${progress[0]}
			current=${progress[1]}
			end=${progress[2]}
			elapsedms=$( awk 'BEGIN { printf "%.0f", '$(( current - start ))/44.1' }' )
			elapsed=$(( ( elapsedms + 500 ) / 1000 ))
			Time=$(( ( end - start + 22050 ) / 44100 ))
			pushData airplay '{ "elapsed": '$elapsed', "Time": '$Time' }'
			timestamp=$( date +%s%3N )
			starttime=$(( timestamp - elapsedms ))
			echo $elapsed > $dirairplay/elapsed
			echo $starttime > $dirairplay/start
			echo $timestamp > $dirairplay/timestamp
			echo $Time > $dirairplay/Time
			$dirbash/status-push.sh
		else
			echo $data > $dirairplay/$code
			pushData airplay '{ "'$code'": "'$( stringEscape $data )'" }'
		fi
	fi
	code= # reset after $code + $data were set
done

[[ ! -e $dirairplay/pause ]] && pause # fix - if no state emits (script always exits)
