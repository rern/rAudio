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
	# no value / double values > [next line]
	[[ $line =~ 'encoding="base64"' || $line =~ '<code>'.*'<code>' ]] && continue
	
	##### code ##### matched hex code > [next line] (is value line)
	[[ $line =~ '>61736172<' ]] && code=Artist   && continue
	[[ $line =~ '>6d696e6d<' ]] && code=Title    && continue
	[[ $line =~ '>6173616c<' ]] && code=Album    && continue
	[[ $line =~ '>50494354<' ]] && code=coverart && continue
	[[ $line =~ '>70726772<' ]] && code=progress && timestamp=$( date +%s%3N ) && continue
	[[ $line =~ '>70766f6c<' ]] && code=volume   && continue
	
	# no line with code found yet > [next line]
	[[ -z $code ]] && continue
	
	##### value #### base64 decode
	base64=$( echo ${line/<\/data><\/item>} | tr -d '\000' ) # remove tags and null bytes
	# null or not base64 string - reset code= > [next line]
	if [[ -z $base64 || ! $base64 =~ ^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{2}==)?$ ]]; then
		code=
		continue
	fi
	
	if [[ $code == coverart ]]; then
		base64 -d <<< $base64 > $dirairplay/coverart.jpg
		data=/data/shm/airplay/coverart.$( date +%s ).jpg
		pushstreamAirplay '{"coverart":"'$data'","file":""}'
		echo $data > $dirairplay/coverart
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
			starttime=$(( timestamp - elapsedms ))
			echo $starttime > $dirairplay/start
			echo $Time > $dirairplay/Time
			/srv/http/bash/cmd-pushstatus.sh
		elif [[ $code == volume ]]; then # format: airplay,current,limitH,limitL
			vol=$( amixer -M -c $card sget "$control" \
						| awk -F'[%[]' '/%/ {print $2}' \
						| head -1 )
			curl -s -X POST http://127.0.0.1/pub?id=volume '{"val":'$vol'}'
		else
			pushdata='{"'$code'":"'${data//\"/\\\"}'"}' # data may contains spaces
			pushstreamAirplay "$pushdata"
			echo $data > $dirairplay/$code
		fi
	fi
	code= # reset after $code + $data were set
done
