#!/bin/bash

readarray -t args <<< "$1"
artist=${args[0]}
album=${args[1]}
file=${args[2]}
type=${args[3]}
date=$( date +%s )

### 1 - coverfile in directory ##################################
path="/mnt/MPD/$file"
[[ -f "$path" ]] && path=$( dirname "$path" ) # from status.sh as file
coverfile=$( ls -1 "$path" \
				| grep -i '^cover\.\|^folder\.\|^front\.\|^album\.' \
				| grep -i '.gif$\|.jpg$\|.png$' \
				| head -1 )
if [[ -n $coverfile ]]; then
	jq -Rr @uri <<< "$path/${coverfile/.*}.$date.${coverfile/*.}" # urlencode
	exit
fi

covername=$( echo $artist$album | tr -d '\n "`?/#&'"'" ) # Artist Album file > ArtistAlbum
### 2 - embedded ################################################
embeddedname=/data/embedded/$covername
coverfile=/srv/http$embeddedname.jpg
[[ -e $coverfile ]] && echo $embeddedname.$date.jpg && exit

path="/mnt/MPD/$file"
dir=$( dirname "$path" )
filename=$( basename "$path" )
kid3-cli -c "cd \"$dir\"" \
		-c "select \"$filename\"" \
		-c "get picture:$coverfile" &> /dev/null # suppress '1 space' stdout
[[ -e $coverfile ]] && echo $embeddedname.$date.jpg && exit

[[ $type == reset ]] && exit

### 3 - already fetched online-file #########################
[[ $type == licover ]] && prefix=licover || prefix=online
urlname=/data/shm/$prefix-$covername
coverfile=$( ls /srv/http$urlname.* 2> /dev/null )
[[ -n $coverfile ]] && echo $urlname.$date.${coverfile/*.}
