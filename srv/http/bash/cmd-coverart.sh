#!/bin/bash

# album coverart   : cover.*    - max 2400 x 2400 ( generic 600 x 4 )
# album thumbnail  : coverart.* - 200 x 200       ( imgW    100 x 2 )
# folder thumbnail : thumb.jpg  - 80 x 80         ( imgW     80 x 2 )

. /srv/http/bash/common.sh

args2var "$1"

imageSave() {
	local size source target
	source=$1
	target=$2
	size=$3
	if [[ ${target: -3} == gif ]]; then
		gifsicle -O3 --resize-fit $sizex$size "$source" > "$target"
	else
		[[ ${source: -3} == gif ]] && source+='[0]'
		magick "$source" -thumbnail $sizex$size\> -unsharp 0x.5 "$target"
	fi
}

dir=$( dirname "$FILE" )
[[ $CMD == coverart ]] && imageSave "$FILE" "$dir/coverart.${FILE: -3}" 200
imageSave "$FILE" "$dir/thumb.jpg" 80

if [[ $CMD == bookmark ]]; then
	pushBookmark
else
	coverart=$( php -r "echo rawurlencode( '${FILE/\/srv\/http\//}' );" )
	pushData coverart '{ "coverart" : "'$coverart'" }'
fi
