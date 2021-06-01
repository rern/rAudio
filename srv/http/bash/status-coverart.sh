#!/bin/bash

readarray -t args <<< "$1"
artistalbum=${args[0]}
file=${args[1]}
[[ ${args[2]} == licover ]] && prefix=licover || prefix=online

date=$( date +%s )
covername=$( echo $artistalbum | tr -d '\n "`?/#&'"'" ) # Artist Album file > ArtistAlbum
urlname=/data/shm/$prefix-$covername

### 1 - already fetched online-file #########################
coverfile=$( ls /srv/http$urlname.* 2> /dev/null )
[[ -n $coverfile ]] && echo $urlname.$date.${coverfile/*.} && exit

### 2 - coverfile in directory ##################################
path="/mnt/MPD/$file"
[[ -f "$path" ]] && path=$( dirname "$path" ) # from status.sh as file
coverfile=$( ls -1 "$path" \
				| grep -i '^cover\.\|^folder\.\|^front\.\|^album\.' \
				| grep -i '.gif$\|.jpg$\|.png$' \
				| head -1 )
[[ -n $coverfile ]] && echo $path/${coverfile/.*}.$date.${coverfile/*.} && exit

### 3 - embedded ################################################
urlname=/data/embedded/$covername
coverfile=/srv/http$urlname.jpg
[[ -e $coverfile ]] && echo $urlname.$date.jpg && exit

kid3-cli -c "select \"/mnt/MPD/$file\"" -c "get picture:$coverfile" &> /dev/null # suppress '1 space' stdout
[[ -e $coverfile ]] && echo $urlname.$date.jpg
