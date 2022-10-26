#!/bin/bash

readarray -t args <<< "$1"
artist=${args[0]}
album=${args[1]}
file=${args[2]}
type=${args[3]}
date=$( date +%s )
covername=$( tr -d ' "`?/#&'"'" <<< $artist$album )
filename=$( basename "$file" )
path="/mnt/MPD/$file"
[[ -f "$path" ]] && path=$( dirname "$path" )

# found cover file
localfile=/srv/http/data/shm/local/$covername
[[ -f $localfile ]] && cat $localfile && exit
# found embedded
embeddedname=$( tr -d ' "`?/#&'"'" <<< ${filename%.*} )
embeddedfile=/srv/http/data/shm/embedded/$embeddedname.jpg
[[ -f "$embeddedfile" ]] && echo ${embeddedfile:9} && exit
# found online
onlinefile=$( ls -1X /srv/http/data/shm/online/$covername.{jpg,png} 2> /dev/null | head -1 )
[[ -f $onlinefile ]] && echo ${onlinefile:9} && exit

##### cover file
coverfile=$( ls -1X "$path"/cover.{gif,jpg,png} 2> /dev/null | head -1 )
[[ ! $coverfile ]] && coverfile=$( ls -1X "$path"/*.{gif,jpg,png} 2> /dev/null \
										| grep -E -i '/album\....$|cover\....$|/folder\....$|/front\....$' \
										| head -1 )
if [[ $coverfile ]]; then
	coverfile=$( php -r "echo rawurlencode( '${coverfile//\'/\\\'}' );" ) # rawurlencode - local path only
	echo $coverfile
	[[ $covername ]] && echo $coverfile > $localfile
	/srv/http/bash/cmd.sh coverfileslimit
	exit
fi

##### embedded
kid3-cli -c "cd \"$path\"" \
		-c "select \"$filename\"" \
		-c "get picture:$embeddedfile" &> /dev/null # suppress '1 space' stdout
if [[ -f $embeddedfile ]]; then
	echo ${embeddedfile:9}
	exit
fi

[[ ! $artist || ! $album ]] && exit

##### online
killall status-coverartonline.sh &> /dev/null
/srv/http/bash/status-coverartonline.sh "\
$artist
$album" &> /dev/null &
