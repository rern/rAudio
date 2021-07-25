#!/bin/bash

# Radio Paradise metadata
# status-radioparadise.sh FILENAME
dirtmp=/srv/http/data/shm/
file=$1
station=$2
id=$3
case $id in
	flacm )  id=0;;
	mellow ) id=1;;
	rock )   id=2;;
	world )  id=3;;
esac

readarray -t metadata <<< $( curl -sL \
	https://api.radioparadise.com/api/now_playing?chan=$id \
	| jq -r .artist,.title,.album,.cover \
	| sed 's/^null$//' )
datanew=${metadata[@]:0:3}
dataprev=$( head -3 /srv/http/data/shm/status 2> /dev/null | tr -d '\n ' )
[[ ${datanew// } == $dataprev ]] && exit

artist=${metadata[0]}
title=${metadata[1]}
album=${metadata[2]}
coverurl=${metadata[3]}
if [[ -n $coverurl && ! -e /srv/http/data/system/vumeter ]]; then
	name=$( echo $artist$title | tr -d ' "`?/#&'"'" )
	coverfile=$dirtmp/webradio-$name.jpg
	curl -s $coverurl -o $coverfile
	[[ -e $coverfile ]] && coverart=/data/shm/webradio-$name.$( date +%s ).jpg
fi

echo "\
$artist
$title
$album
play
false
false
true
$station
$file
$coverart" > $dirtmp/status

artist=${artist//\"/\\\"}
title=${title//\"/\\\"}
album=${album//\"/\\\"}
station=${station//\"/\\\"}
data='{
  "Artist"   : "'$artist'"
, "Title"    : "'$title'"
, "Album"    : "'$album'"
, "coverart" : "'$coverart'"
, "station"  : "'$station'"
, "file"     : "'$file'"
, "rprf"     : 1
, "webradio" : true
}'
curl -s -X POST http://127.0.0.1/pub?id=mpdplayer -d "$data"
if [[ -e /srv/http/data/system/lcdchar ]]; then
	elapsed=$( { echo clearerror; echo status; sleep 0.05; } \
				| telnet 127.0.0.1 6600 2> /dev/null \
				| awk '/elapsed/ {print $NF}' )
	data=( "$artist" "$title" "$album" play false "$elapsed" $( date +%s%3N ) true "$station" "$file" )
	killall lcdchar.py &> /dev/null
	/srv/http/bash/lcdchar.py "${data[@]}" &
fi
/srv/http/bash/cmd.sh onlinefileslimit
