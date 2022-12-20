#!/bin/bash

. /srv/http/bash/common.sh

readarray -t args <<< $1
artist=${args[0]}
album=${args[1]}
file=${args[2]}
type=${args[3]}
filename=$( basename "$file" )
path="/mnt/MPD/$file"
[[ -f "$path" ]] && path=$( dirname "$path" )

# found cover file
localname=$( tr -d ' "`?/#&'"'" <<< $path )
localfile=$dirshm/local/$localname
if [[ -f $localfile ]]; then
	localpath=$( cat $localfile )
	if [[ -e $localpath ]]; then
		echo $localpath
		exit
	else
		rm $localfile
	fi
fi

# found embedded
embeddedname=$( tr -d ' "`?/#&'"'" <<< $filename ).jpg
embeddedfile=$dirshm/embedded/$embeddedname
[[ -f "$embeddedfile" ]] && echo ${embeddedfile:9} && exit
# found online
covername=$( tr -d ' "`?/#&'"'" <<< $artist$album )
onlinefile=$( ls -1X $dirshm/online/${covername,,}.{jpg,png} 2> /dev/null | head -1 )
[[ -f $onlinefile ]] && echo ${onlinefile:9} && exit

##### cover file
coverfile=$( ls -1X "$path"/cover.{gif,jpg,png} 2> /dev/null | head -1 )
[[ ! $coverfile ]] && coverfile=$( ls -1X "$path"/*.{gif,jpg,png} 2> /dev/null | grep -E -i -m1 '/album\....$|cover\....$|/folder\....$|/front\....$' )
if [[ $coverfile ]]; then
	echo $coverfile > $localfile
	php -r "echo rawurlencode( '${coverfile//\'/\\\'}' );"
	$dirbash/cmd.sh coverfileslimit
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
$dirbash/status-coverartonline.sh "\
$artist
$album" &> /dev/null &
