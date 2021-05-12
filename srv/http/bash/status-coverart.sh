#!/bin/bash

readarray -t args <<< "$1"

[[ ${#args[@]} > 1 ]] && mpdpath=${args[2]} || mpdpath=${args[0]} # for mpdlibrary.php
[[ ${mpdpath: -14:10} == .cue/track ]] && mpdpath=$( dirname "$mpdpath" )

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
covername=$( echo "$1" | head -2 | tr -d '\n "`?/#&'"'" ) # Artist Album file > ArtistAlbum
embeddedfile=/srv/http/data/embedded/$covername.jpg
coverfile=/data/embedded/$covername.$date.jpg
if [[ -e $embeddedfile ]]; then
	echo $coverfile
	exit
fi

### 3 - already fetched online-file #########################
fetchedfile=$( ls /srv/http/data/shm/online-$covername.* 2> /dev/null )
echo $fetchedfile > /root/fetchedfile
if [[ -e $fetchedfile ]]; then
	echo /data/shm/online-$covername.$date.${fetchedfile/*.}
	exit
fi

### 4 - embedded ################################################
files=$( mpc ls "$mpdpath" 2> /dev/null )
readarray -t files <<<"$files"
for file in "${files[@]}"; do
	file="/mnt/MPD/$file"
	if [[ -f "$file" ]]; then
		#ffmpeg -i "$file" $file &> /dev/null
		kid3-cli -c "select \"$file\"" -c "get picture:$embeddedfile" &> /dev/null # suppress '1 space' stdout
		[[ -e $embeddedfile ]] && echo $coverfile && exit
	fi
done
