#!/bin/bash

readarray -t args <<< "$1"
artist=${args[0]}
album=${args[1]}
file=${args[2]}
type=${args[3]}
date=$( date +%s )
dirbash=/srv/http/bash
dirshm=/srv/http/data/shm
covername=$( echo $artist$album | tr -d ' "`?/#&'"'" )

# already got path in temp file
[[ -e $dirshm/local/$covername ]] && cat $dirshm/local/$covername && exit

# cover file
path="/mnt/MPD/$file"
[[ -f "$path" ]] && path=$( dirname "$path" ) # from status.sh as file
coverfile=$( ls -1X "$path"/cover.{gif,jpg,png} 2> /dev/null | head -1 )
[[ ! $coverfile ]] && coverfile=$( ls -1X "$path"/*.{gif,jpg,png} 2> /dev/null \
										| grep -i '/album\....$\|/folder\....$\|/front\....$' \
										| head -1 )
if [[ $coverfile ]]; then
	echo ${coverfile:0:-4}.$date.${coverfile: -3} | tee $dirshm/local/$covername
	$dirbash/cmd.sh coverfileslimit
	exit
fi

# already got embedded
[[ -e /srv/http/data/embedded/$covername.jpg ]] && echo /data/embedded/$covername.jpg && exit

# already got online
coverfile=$( ls -1X $dirshm/online/$covername.{jpg,png} 2> /dev/null | head -1 )
[[ -e $coverfile ]] && echo ${coverfile:9} && exit

# embedded
path="/mnt/MPD/$file"
dir=$( dirname "$path" )
filename=$( basename "$path" )
coverfile=/srv/http/data/embedded/$covername.jpg
kid3-cli -c "cd \"$dir\"" \
		-c "select \"$filename\"" \
		-c "get picture:$coverfile" &> /dev/null # suppress '1 space' stdout
if [[ -e $coverfile ]]; then
	echo ${coverfile:9:-4}.$date.jpg | tee $dirshm/local/$covername
	$dirbash/cmd.sh coverfileslimit
	exit
fi

# online
kill -9 $( pgrep status-coverartonline ) &> /dev/null
$dirbash/status-coverartonline.sh "\
$artist
$album" &> /dev/null &
