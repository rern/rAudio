#!/bin/bash

# shairport-meta.service > this:
#    - /tmp/shairport-sync-metadata emits data

dirairplay=/srv/http/data/shm/airplay

pushstreamAirplay() {
	curl -s -X POST http://127.0.0.1/pub?id=airplay -d "$1"
}

card=$( head -1 /etc/asound.conf | tail -c 2 )
control=$( amixer -c $card scontents \
			| grep -A1 ^Simple \
			| sed 's/^\s*Cap.*: /^/' \
			| tr -d '\n' \
			| sed 's/--/\n/g' \
			| grep pvolume \
			| head -1 \
			| cut -d"'" -f2 )

cat /tmp/shairport-sync-metadata | while read line; do
	[[ $line =~ 'encoding="base64"' || $line =~ '<code>'.*'<code>' ]] && continue # skip: no value / double codes
	
	##### code - hex matched
	hex=$( echo $line | sed 's|.*code>\(.*\)</code.*|\1|' )
	if [[ -n $hex ]]; then # found code > [next line]
		case $hex in
			61736172 ) code=Artist   && continue;;
			6d696e6d ) code=Title    && continue;;
			6173616c ) code=Album    && continue;;
			50494354 ) code=coverart && continue;;
			70726772 ) code=progress && continue;;
		esac
	fi
	
	# no line with code found yet > [next line]
	[[ -z $code ]] && continue
	
	##### value - base64 decode
	base64=$( echo ${line/<*} | tr -d '\000' ) # remove tags and null bytes
	# null or not base64 string - reset code= > [next line]
	if [[ -z $base64 || ! $base64 =~ ^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{2}==)?$ ]]; then
		code=
		continue
	fi
	
	if [[ $code == coverart ]]; then
		base64 -d <<< $base64 > $dirairplay/coverart.jpg
		src=/data/shm/airplay/coverart.$( date +%s ).jpg
		pushstreamAirplay '{"coverart":"'$src'","file":""}'
	else
		data=$( base64 -d <<< $base64 2> /dev/null )
		if [[ $code == progress ]]; then # format: start/elapsed/end @44100
			progress=( ${data//\// } ) # format: start/elapsed/end @44100/second
			start=${progress[0]}
			current=${progress[1]}
			end=${progress[2]}
			elapsedms=$( awk "BEGIN { printf \"%.0f\n\", $(( current - start )) / 44.1 }" )
			elapsed=$(( ( elapsedms + 500 ) / 1000 ))
			Time=$(( ( end - start + 22050 ) / 44100 ))
			pushstreamAirplay '{"elapsed":'$elapsed',"Time":'$Time'}'
			timestamp=$( date +%s%3N )
			starttime=$(( timestamp - elapsedms ))
			echo $starttime > $dirairplay/start
			echo $Time > $dirairplay/Time
			/srv/http/bash/cmd-pushstatus.sh
		else
			pushdata='{"'$code'":"'${data//\"/\\\"}'"}' # data may contains spaces
			pushstreamAirplay "$pushdata"
			echo $data > $dirairplay/$code
		fi
	fi
	code= # reset after $code + $data were set
done
