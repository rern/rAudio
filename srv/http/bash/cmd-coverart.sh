#!/bin/bash

# album coverart   : cover.*    - max 2400 x 2400 ( generic 600 x 4 )
# album thumbnail  : coverart.* - 200 x 200       ( imgW    100 x 2 )
# folder thumbnail : thumb.jpg  - 80 x 80         ( imgW     80 x 2 )

. /srv/http/bash/common.sh

readarray -t args <<< $1

type=${args[0]}

if [[ $type == reset ]]; then
	case ${args[1]} in
		coverart )
			coverart=${args[2]}
			dir=$( dirname "$coverart" )
			rm -f "$dir/cover".* "$dir/coverart".* "$dir/thumb".* $dirshm/{embedded,local,online}/*
			pushData coverart '{ "coverart": "'$coverart'", "current": '${args[3]}' }'
			;;
		folder )
			dir=${args[2]}
			rm -f "$dir/coverart".* "$dir/thumb".*
			pushData coverart '{ "coverart": "'$dir'/coverart.jpg" }'
			;;
		stationart )
			filenoext=${args[2]}
			rm "$filenoext".* "$filenoext-thumb".*
			pushData coverart '{ "coverart": "'$filenoext'.jpg", "current": '${args[3]}' }'
			;;
	esac
	exit
# --------------------------------------------------------------------
fi

imageSave() {
	src=$1
	targ=$2
	size=$3
	if [[ ${targ: -3} == gif ]]; then
		gifsicle -O3 --resize-fit $sizex$size "$src" > "$targ"
	else
		magick "$src" -thumbnail $sizex$size\> -unsharp 0x.5 "$targ"
	fi
}

source=${args[1]}
target=${args[2]}
current=${args[3]}
[[ ! $current ]] && current=false
targetnoext=${target:0:-4}
rm -f "$targetnoext".*

[[ ${target:9:13} == '/data/audiocd' ]] && type=audiocd
case $type in
	audiocd )
		imageSave "$source" "$target" 1000
		;;
	bookmark | folder )
		imageSave "$source" "$target" 200
		imageSave "$target" "$( dirname "$target" )"/thumb.jpg 80
		;;
	coverart )
		dir=$( dirname "$target" )
		imageSave "$source" "$target" 1000
		imageSave "$target" "$dir"/coverart.${target: -3} 200
		imageSave "$target" "$dir"/thumb.jpg 80
		;;
	dabradio | webradio )
		imageSave $source "$target" 1000
		imageSave "$target" "$targetnoext"-thumb.jpg 80
		;;
esac
pushData coverart '{
  "coverart" : "'$( php -r "echo rawurlencode( '${target//\'/\\\'}' );" )'"
, "current"  : '$current'
}'
rm -f $dirshm/{embedded,local,online}/*
