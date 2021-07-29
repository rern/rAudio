#!/bin/bash

# commom script for status-radioparadise.sh and status-radiofrance.sh
artist=${metadata[0]}
title=${metadata[1]}
album=${metadata[2]}
coverurl=${metadata[3]}
countdown=${metadata[4]} # countdown
[[ -z $countdown ]] && countdown=0
[[ ${#metadata[@]} == 6 && $countdown > 0 ]] && countdown=$(( countdown - ${metadata[5]} )) # radiofrance

if [[ -n $coverurl && ! -e $dirsystem/vumeter ]]; then
	name=$( echo $artist$title | tr -d ' "`?/#&'"'" )
	coverfile=$dirtmp/webradio-$name.jpg
	curl -s $coverurl -o $coverfile
	coverart=/data/shm/webradio-$name.$( date +%s ).jpg
fi
echo "\
$artist
$title
$album
$coverart" > $dirtmp/status
artist=${artist//\"/\\\"}
title=${title//\"/\\\"}
album=${album//\"/\\\"}
station=${station//\"/\\\"}
elapsed=$( { echo clearerror; echo status; sleep 0.01; } \
			| telnet 127.0.0.1 6600 2> /dev/null \
			| awk '/elapsed/ {print $NF}' )
[[ -z $elapsed ]] && elapsed=0
data='{
"Artist"   : "'$artist'"
, "Title"    : "'$title'"
, "Album"    : "'$album'"
, "coverart" : "'$coverart'"
, "station"  : "'$station'"
, "file"     : "'$file'"
, "elapsed"  : '$elapsed'
, "rprf"     : 1
, "webradio" : true
}'
curl -s -X POST http://127.0.0.1/pub?id=mpdplayer -d "$data"
if [[ -e $dirsystem/lcdchar ]]; then
	status=( "$artist" "$title" "$album" play false "$elapsed" $( date +%s%3N ) true "$station" "$file" )
	killall lcdchar.py &> /dev/null
	/srv/http/bash/lcdchar.py "${status[@]}" &
fi
if [[ -e $dirtmp/snapclientip ]]; then
	readarray -t clientip < $dirtmp/snapclientip
	for ip in "${clientip[@]}"; do
		[[ -n $ip ]] && curl -s -X POST http://$ip/pub?id=mpdplayer -d "$data"
	done
fi
/srv/http/bash/cmd.sh onlinefileslimit
# next fetch
sleep $(( countdown + 5 )) # add 5s delay
metadataGet
