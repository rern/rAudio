#!/bin/bash

# shairport-meta.service > this:
#    - /tmp/shairport-sync-metadata emits data

dirbash=/srv/http/bash
dirshm=/srv/http/data/shm
dirsystem=/srv/http/data/system
dirairplay=$dirshm/airplay
dirscrobble=$dirsystem/scrobble.conf
filestart=$dirairplay/start
filetime=$dirairplay/Time

pushstreamAirplay() {
	curl -s -X POST http://127.0.0.1/pub?id=airplay -d "$1"
}
scrobble() {
	[[ $code == Artist && $data != $( cat $dirairplay/Artist ) ]] && changedArtist=1
	[[ $code == Title && $data != $( cat $dirairplay/Title ) ]] && changedTitle=1
	[[ -z $changedArtist || -z $changedTitle ]] && return
	
	$dirbash/cmd.sh scrobble
	for key in Artist Title Album state Time start; do
		printf -v $key '%s' "$( cat $dirairplay/$key )"
	done
	cat << EOF > $dirshm/scrobble
Artist="$Artist"
Title="$Title"
Album="$Album"
state=$state
Time=$Time
start=$(( ( $start + 500 ) / 1000 ))
EOF
	changedArtist=
	changedTitle=
}

for pid in $( pgrep shairport-sync ); do
	ionice -c 0 -n 0 -p $pid &> /dev/null 
	renice -n -19 -p $pid &> /dev/null
done

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
	[[ $line =~ '>70726772<' ]] && code=Time     && timestamp=$( date +%s%3N ) && continue
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
	else
		data=$( base64 -d <<< $base64 2> /dev/null )
		if [[ $code == Time ]]; then # format: start/elapsed/end @44100
			start=${data/\/*}
			current=$( echo $data | cut -d/ -f2 )
			end=${data/*\/}
			data=$(( ( end - start + 22050 ) / 44100 ))
			elapsedms=$( awk "BEGIN { printf \"%.0f\n\", $(( current - start )) / 44.1 }" )
			(( $elapsedms > 0 )) && elapsed=$(( ( elapsedms + 500 ) / 1000 )) || elapsed=0
			pushstreamAirplay '{"elapsed":'$elapsed'}'
			starttime=$(( timestamp - elapsedms ))
			echo $data > $filetime
			echo $starttime > $filestart
		elif [[ $code == volume ]]; then # format: airplay,current,limitH,limitL
			data=$( amixer -M -c $card sget "$control" \
						| awk -F'[%[]' '/%/ {print $2}' \
						| head -1 )
			pushstreamAirplay '{"volume":'$data'}'
		else
			echo $data > $dirairplay/$code
			[[ -e $dirscrobble/scrobble && -e $dirscrobble/airplay ]] && scrobble
			data=${data//\"/\\\"}
		fi
		
		[[ ' start Time volume ' =~ " $code " ]] && status='"'$code'":'$data || status='"'$code'":"'$data'"'
		
		pushstreamAirplay "{$status}"
	fi
	[[ -e $dirsystem/lcdchar ]] && $dirbash/cmd.sh lcdcharrefresh
	code= # reset after $code + $data were complete
done
