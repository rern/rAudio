#!/bin/bash

readarray -t args <<< "$1"

date=$( date +%s )
covername=$( echo ${args[0]} | tr -d '\n "`?/#&'"'" ) # Artist Album file > ArtistAlbum

### 1 - already fetched online-file #########################
[[ ${args[2]} == licover ]] && prefix=licover || prefix=online
urlname=/data/shm/$prefix-$covername
coverfile=$( ls /srv/http$urlname.* 2> /dev/null )
[[ -n $coverfile ]] && echo $urlname.$date.${coverfile/*.} && exit

### 2 - coverfile in directory ##################################
mpdpath=${args[1]}
path="/mnt/MPD/$mpdpath"
coverfile=$( ls -1 "$path" \
				| grep -i '^cover\.\|^folder\.\|^front\.\|^album\.' \
				| grep -i '.gif$\|.jpg$\|.png$' \
				| head -1 )
[[ -n $coverfile ]] && echo $path/${coverfile/.*}.$date.${coverfile/*.} && exit

### 3 - embedded ################################################
urlname=/data/embedded/$covername
coverfile=/srv/http$urlname.jpg
[[ -e $coverfile ]] && echo $urlname.$date.jpg && exit

file=$( mpc ls "$mpdpath" 2> /dev/null | head -1 )
kid3-cli -c "select \"/mnt/MPD/$file\"" -c "get picture:$coverfile" &> /dev/null # suppress '1 space' stdout
[[ -e $coverfile ]] && echo $urlname.$date.jpg
