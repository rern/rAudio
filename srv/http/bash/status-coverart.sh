#!/bin/bash

readarray -t args <<< "$1"
artist=${args[0]}
album=${args[1]}
file=${args[2]}
type=${args[3]}
date=$( date +%s )
dirtmp=/srv/http/data/shm
covername=local-$( echo $artist$album | tr -d ' "`?/#&'"'" )

coverFilesLimit() {
	/srv/http/bash/cmd.sh coverfileslimit
}
# already got path in temp file
coverfile=$( ls $dirtmp/$covername 2> /dev/null )
if [[ -n $coverfile ]]; then
	cat $coverfile
	exit
fi
# already got embedded
if [[ -e /srv/http/data/embedded/$covername.jpg ]]; then
	echo /data/embedded/$covername.$date.jpg | tee $dirtmp/$covername
	coverFilesLimit
	exit
fi
# cover file
path="/mnt/MPD/$file"
[[ -f "$path" ]] && path=$( dirname "$path" ) # from status.sh as file
coverfile=$( ls -1 "$path" \
				| grep -i '^cover\.\|^folder\.\|^front\.\|^album\.' \
				| grep -i '.gif$\|.jpg$\|.png$' \
				| head -1 )
if [[ -n $coverfile ]]; then
	jq -Rr @uri <<< "$path/${coverfile/.*}.$date.${coverfile/*.}" | tee $dirtmp/$covername
	coverFilesLimit
	exit
fi
# embedded
path="/mnt/MPD/$file"
dir=$( dirname "$path" )
filename=$( basename "$path" )
coverfile=/srv/http/data/embedded/$covername.jpg
kid3-cli -c "cd \"$dir\"" \
		-c "select \"$filename\"" \
		-c "get picture:$coverfile" &> /dev/null # suppress '1 space' stdout
if [[ -e $coverfile ]]; then
	echo /data/embedded/$covername.$date.jpg | tee $dirtmp/$covername
	coverFilesLimit
fi
