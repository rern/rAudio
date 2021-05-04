#!/bin/bash

readarray -t args <<< "$1"

mpdpath=${args[0]}
[[ ${mpdpath: -14:10} == .cue/track ]] && mpdpath=$( dirname "$mpdpath" )
artistalbumtype=$( sed '1 d' <<< "$1" )

path="/mnt/MPD/$mpdpath"
### 1 - coverfile in directory ##################################
[[ -d $path ]] && dir=$path || dir=$( dirname "$path" )
for name in cover folder front album; do
	for ext in jpg png gif; do
		coverfile="$dir/$name"
		[[ -e "$coverfile.$ext" ]] && break 2
		coverfile="$dir/${name^}" # capitalize
		[[ -e "$coverfile.$ext" ]] && break 2
	done
	coverfile=
done

date=$( date +%s )

if [[ -n $coverfile ]]; then
	coverfile=$( php -r "echo rawurlencode( '${coverfile//\'/\\\'}' );" )
	echo $coverfile.$date.$ext
	exit
fi

[[ ${#args[@]} == 1 ]] && exit

### 2 - already extracted embedded-file #########################
name=$( echo $artistalbumtype | tr -d ' "`?/#&'"'" )
embeddedname=$( sed 's/licover$//' <<< $name ) # remove licover from end (mpdlibrary.php line #3)
embeddedfile=/srv/http/data/embedded/$embeddedname.jpg
coverfile=/data/embedded/$embeddedname.$date.jpg
[[ -e $embeddedfile ]] && echo $coverfile && exit

### 3 - embedded ################################################
files=$( mpc ls "$mpdpath" 2> /dev/null )
readarray -t files <<<"$files"
for file in "${files[@]}"; do
	file="/mnt/MPD/$file"
	if [[ -f "$file" ]]; then
		#ffmpeg -i "$file" $embeddedfile &> /dev/null
		kid3-cli -c "select \"$file\"" -c "get picture:$embeddedfile" &> /dev/null # suppress '1 space' stdout
		[[ -e $embeddedfile ]] && echo $coverfile && exit
		break
	fi
done

### 4 - previously downloaded ###################################
onlinefile=$( ls /srv/http/data/shm/online-$name.* 2> /dev/null ) # jpg / png
if [[ -e $onlinefile ]]; then
	echo /data/shm/online-$name.$date.${onlinefile/*.}
	exit
else
	rm -f /srv/http/data/shm/online-*
fi

### 5 - get online ##############################################
#killall status-coverartonline.sh &> /dev/null # kill if still running
/srv/http/bash/status-coverartonline.sh "$artistalbumtype" &> /dev/null &
