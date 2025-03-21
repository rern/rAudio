#!/bin/bash

# album coverart   : cover.*    - max 2400 x 2400 ( generic 600 x 4 )
# album thumbnail  : coverart.* - 200 x 200       ( imgW    100 x 2 )
# folder thumbnail : thumb.jpg  - 80 x 80         ( imgW     80 x 2 )

. /srv/http/bash/common.sh

args2var "$1"

if [[ $CMD == reset ]]; then
	case $TYPE in
		coverart )
			dir=$( dirname "$FILE" )
			rm -f "$dir/cover".* "$dir/coverart".* "$dir/thumb".* $dirshm/{embedded,local,online}/*
			pushData coverart '{ "coverart": "'$FILE'", "current": '$CURRENT' }'
			;;
		folderthumb )
			rm -f "$DIR/coverart".* "$DIR/thumb".*
			pushData coverart '{ "coverart": "'$DIR'/coverart.jpg" }'
			;;
		stationart )
			rm "$FILENOEXT".* "$FILENOEXT-thumb".*
			pushData coverart '{ "coverart": "'$FILENOEXT'.jpg", "current": '$CURRENT' }'
			;;
	esac
	exit
# --------------------------------------------------------------------
fi

imageSave() {
	source=$1
	target=$2
	size=$3
	if [[ ${target: -3} == gif ]]; then
		gifsicle -O3 --resize-fit $sizex$size "$source" > "$target"
	else
		magick "$source" -thumbnail $sizex$size\> -unsharp 0x.5 "$target"
	fi
}

targetnoext=${TARGET:0:-4}

[[ ${TARGET:9:13} == '/data/audiocd' ]] && TYPE=audiocd
case $CMD in
	bookmark | folder )
		imageSave "$TARGET" "$( dirname "$TARGET" )"/thumb.jpg 80
		;;
	coverart )
		dir=$( dirname "$TARGET" )
		imageSave "$TARGET" "$dir"/coverart.${TARGET: -3} 200
		imageSave "$TARGET" "$dir"/thumb.jpg 80
		;;
	dabradio | webradio )
		imageSave "$TARGET" "$targetnoext"-thumb.jpg 80
		;;
esac
pushData coverart '{
  "coverart" : "'$( php -r "echo rawurlencode( '${TARGET//\'/\\\'}' );" )'"
, "current"  : '$CURRENT'
}'
rm -f $dirshm/{embedded,local,online}/*
