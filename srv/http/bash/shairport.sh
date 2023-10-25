#!/bin/bash

# shairport.service > this:
#    - /tmp/shairport-sync-metadata emits data

. /srv/http/bash/common.sh
dirairplay=$dirshm/airplay
rm -f $dirairplay/{elapsed,pause,start}

pause() {
	echo pause > $dirairplay/state
	touch $dirairplay/pause
	pushData airplay '{ "state": "pause" }'
}

cat /tmp/shairport-sync-metadata | while read line; do
	[[ $line =~ 'encoding="base64"' || $line =~ '<code>'.*'<code>' ]] && continue # skip: no value / double codes
	
	##### code - hex matched
	hex=$( sed -E 's|.*code>(.*)</code.*|\1|' <<< $line )
	if [[ $hex ]]; then # found code > [next line]
		case $hex in
			61736172 ) code=Artist   && continue;;
			6d696e6d ) code=Title    && continue;;
			6173616c ) code=Album    && continue;;
			50494354 ) code=coverart && continue;;
			70726772 ) code=progress && continue;;
			63617073 ) code=state    && continue;;
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
	elif [[ $code == state ]]; then # play: 1-AQ==, pause: 2-Ag==
		[[ $base64 == 'Ag==' ]] && pause
	else
		data=$( base64 -d <<< $base64 2> /dev/null )
		if [[ $code == progress ]]; then # format: start/elapsed/end @44100/s
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
			echo $starttime > $dirairplay/start
			echo $Time > $dirairplay/Time
			echo $elapsed > $dirairplay/elapsed
			$dirbash/status-push.sh
		else
			echo $data > $dirairplay/$code
			pushData airplay '{ "'$code'": "'$( stringEscape $data )'" }'
		fi
	fi
	code= # reset after $code + $data were set
done

pause # fix - sometime no state emits but script always exits
