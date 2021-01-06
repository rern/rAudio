#!/bin/bash

[[ $( cat /sys/class/net/eth0/carrier 2> /dev/null ) == 1 ]] && online=1
[[ $( cat /sys/class/net/wlan0/carrier 2> /dev/null ) == 1 ]] && online=1
[[ -z $online ]] && exit

readarray -t args <<< "$1"

artist=${args[0]}
arg1=${args[1]}
type=${args[2]}

dirtmp=/srv/http/data/shm
name=$( echo $artist$arg1 | tr -d ' "`?/#&'"'" )
date=$( date +%s )

onlineCoverart() {
	rm -f $dirtmp/online-*
	coverfile=$dirtmp/online-$name.$ext
	curl -s $url -o $coverfile
	if [[ -e $coverfile ]]; then
		coverart=/data/shm/online-$name.$date.$ext
		curl -s -X POST http://127.0.0.1/pub?id=coverart -d '{ "url": "'$coverart'", "type": "coverart" }'
		exit # for radio paradise
	fi
}

if [[ $type == 'licover' ]]; then
	file=$( ls /srv/http/data/tmp/licover-$name.* 2> /dev/null )
	[[ -e $file ]] && echo /data/tmp/licover-$name.$date.${file/*.} && exit
fi

if [[ $type =~ radioparadise.com ]]; then
	channel=${type/*\/}
	channelname=${channel/-*}
	case $channelname in
		mellow )         chan=1 ;;
		rock )           chan=2 ;;
		world|eclectic ) chan=3 ;;
		* )              chan=0 ;;
	esac
	url=$( jq -r .cover <<< $( wget -qO - https://api.radioparadise.com/api/now_playing?chan=$chan ) )
	[[ -n $url ]] && ext=jpg && onlineCoverart
fi

### 1 - lastfm ##################################################
if [[ $type != title ]]; then
	param="album=$arg1"
	method='method=album.getInfo'
else
	param="track=$arg1"
	method='method=track.getInfo'
fi
apikey=$( grep apikeylastfm /srv/http/assets/js/main.js | cut -d"'" -f2 )
data=$( curl -s -m 5 -G \
	--data-urlencode "artist=$artist" \
	--data-urlencode "$param" \
	--data-urlencode "$method" \
	--data-urlencode "api_key=$apikey" \
	--data-urlencode "autocorrect=1" \
	--data-urlencode "format=json" \
	http://ws.audioscrobbler.com/2.0/ )
error=$( jq -r .error <<< "$data" )
[[ $error != null ]] && exit

if [[ $type == 'title' ]]; then
	album=$( jq -r .track.album <<< "$data" )
else
	album=$( jq -r .album <<< "$data" )
fi
[[ $album == null ]] && exit

image=$( jq -r .image <<< "$album" )
if [[ -n $image || $image != null ]]; then
	extralarge=$( jq -r '.[3]."#text"' <<<  $image )
	if [[ -n $extralarge ]]; then
		url=$( sed 's|/300x300/|/_/|' <<< $extralarge ) # get larger size than 300x300
	else
### 2 - coverartarchive.org #####################################
		mbid=$( jq -r .mbid <<< "$album" )
		[[ -n $mbid || $mbid != null ]] && url=$( curl -s -m 10 -L https://coverartarchive.org/release/$mbid | jq -r .images[0].image )
	fi
fi
[[ -z $url || $url == null ]] && exit

ext=${url/*.}

if [[ $type == 'licover' ]]; then # to save ram - keep all in .../data/tmp - not .../data/shm
	coverfile=/srv/http/data/tmp/licover-$name.$ext
	coverart=/data/tmp/licover-$name.$date.$ext
	if [[ -e $coverfile ]]; then
		echo $coverart
	else
		curl -s $url -o $coverfile
		[[ -e $coverfile ]] && echo $coverart
	fi
else
	onlineCoverart
fi
