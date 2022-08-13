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
filename=$( basename "$file" )
path="/mnt/MPD/$file"
[[ -f "$path" ]] && path=$( dirname "$path" )

# found cover file
localfile=$dirshm/local/$covername
[[ -e $localfile ]] && cat $localfile && exit
# found embedded
embeddedname=$( echo ${filename%.*} | tr -d ' "`?/#&'"'" )
embeddedfile=$dirshm/embedded/$embeddedname.jpg
[[ -e "$embeddedfile" ]] && echo ${embeddedfile:9} && exit
# found online
onlinefile=$( ls -1X $dirshm/online/$covername.{jpg,png} 2> /dev/null | head -1 )
[[ -e $onlinefile ]] && echo ${onlinefile:9} && exit

##### cover file
coverfile=$( ls -1X "$path"/cover.{gif,jpg,png} 2> /dev/null | head -1 )
[[ ! $coverfile ]] && coverfile=$( ls -1X "$path"/*.{gif,jpg,png} 2> /dev/null \
										| egrep -i '/album\....$|cover\....$|/folder\....$|/front\....$' \
										| head -1 )
if [[ $coverfile ]]; then
	php -r "echo rawurlencode( '${coverfile//\'/\\\'}' );" | tee $localfile # rawurlencode - local path only
	$dirbash/cmd.sh coverfileslimit
	exit
fi

##### embedded
kid3-cli -c "cd \"$path\"" \
		-c "select \"$filename\"" \
		-c "get picture:$embeddedfile" &> /dev/null # suppress '1 space' stdout
if [[ -e $embeddedfile ]]; then
	echo ${embeddedfile:9}
	exit
fi

##### online
kill -9 $( pgrep status-coverartonline ) &> /dev/null
$dirbash/status-coverartonline.sh "\
$artist
$album" &> /dev/null &
