#!/bin/bash

. /srv/http/bash/common.sh

args2var "$1"

if playerActive upnp; then
	upnp=1
	name=$( alphaNumeric $ARTIST$ALBUM )
	localfile=$dirshm/local/${name,,}
else
	filename=$( basename "$FILE" )
	path="/mnt/MPD/$FILE"
	[[ -f "$path" ]] && path=$( dirname "$path" )
	localfile=$dirshm/local/$( alphaNumeric $path )
fi
# found cover file
if [[ -f $localfile ]]; then
	cat $localfile
	exit
fi

# found embedded
embeddedname=$( alphaNumeric $filename ).jpg
embeddedfile=$dirshm/embedded/$embeddedname
[[ -f "$embeddedfile" ]] && echo ${embeddedfile:9} && exit
# --------------------------------------------------------------------
# found online
covername=$( alphaNumeric $ARTIST$ALBUM )
onlinefile=$( ls -X $dirshm/online/${covername,,}.{jpg,png} 2> /dev/null | head -1 )
[[ -f $onlinefile ]] && echo ${onlinefile:9} && exit
# --------------------------------------------------------------------
##### cover file
[[ $upnp ]] && coverfile=$( $dirbash/status-coverartupnp.py ) || coverfile=$( coverFileGet "$path" )
if [[ $coverfile ]]; then
	echo "$coverfile" | tee $localfile
	$dirbash/cmd.sh coverfileslimit
	exit
# --------------------------------------------------------------------
fi
##### embedded
kid3-cli -c "cd \"$path\"" \
		 -c "select \"$filename\"" \
		 -c "get picture:$embeddedfile" &> /dev/null # suppress '1 space' stdout
if [[ -f $embeddedfile ]]; then
	echo ${embeddedfile:9}
	exit
# --------------------------------------------------------------------
fi
[[ ! $ARTIST || ! $ALBUM ]] && exit
# --------------------------------------------------------------------
##### online
$dirbash/status-coverartonline.sh "cmd
$ARTIST
$ALBUM
CMD ARTIST ALBUM" &> /dev/null &
