#!/bin/bash

. /srv/http/bash/common.sh

readarray -t args <<< $1

type=${args[0]}
source=${args[1]}
target=${args[2]}
targetnoext=${target:0:-4}
[[ ${target:9:13} == '/data/audiocd' ]] && type=audiocd
if [[ ${target: -3} == gif ]]; then
	gif=1
	thumbsource=$source[0]
else
	thumbsource=$target
fi
case $type in
	audiocd )
		coverfile=$( ls $targetnoext.* 2> /dev/null | head -1 )
		if [[ -e $coverfile ]]; then
			mv -f $coverfile $coverfile.backup
			rm -f $coverfile
		fi
		if [[ ! $gif ]]; then
			cp -f $source "$target" || magick $source -thumbnail 1000x1000\> -unsharp 0x.5 "$target"
		else
			gifsicle -O3 --resize-fit 600x600 $source > "$target"
		fi
		thumb=$target
		;;
	bookmark | folder )
		name=${args[3]}
		rm -f "$targetnoext".*
		if [[ ! $gif ]]; then
			cp -f $source "$target" || magick $source -thumbnail 200x200\> -unsharp 0x.5 "$target"
		else
			gifsicle -O3 --resize-fit 200x200 $source > "$target"
		fi
		dir=$( dirname "$target" )
		thumb="$dir/thumb.jpg"
		magick "$thumbsource" -thumbnail 80x80\> -unsharp 0x.5 "$thumb"
		;;
	coverart )
		dir=$( dirname "$target" )
		rm -f "$dir/cover".*.backup "$dir/coverart".* "$dir/thumb".*
		coverfile=$( ls "$dir/cover".* 2> /dev/null | head -1 )
		[[ -e $coverfile ]] && mv -f "$coverfile" "$coverfile.backup"
		if [[ ! $gif ]]; then
			cp -f $source "$target" || magick $source -thumbnail 1000x1000\> -unsharp 0x.5 "$target"
			magick "$target" -thumbnail 200x200\> -unsharp 0x.5 "$dir/coverart.jpg"
		else
			gifsicle -O3 --resize-fit 600x600 $source > "$target"
			gifsicle -O3 --resize-fit 200x200 $source > "$dir/coverart.gif"
		fi
		thumb="$dir/thumb.jpg"
		magick "$thumbsource" -thumbnail 80x80\> -unsharp 0x.5 "$thumb"
		;;
	dabradio | webradio )
		rm -f "$targetnoext".* "$targetnoext-thumb".*
		if [[ ! $gif ]]; then
			cp -f $source "$target" || magick $source -thumbnail 1000x1000\> -unsharp 0x.5 "$target"
		else
			gifsicle -O3 --resize-fit 600x600 $source > "$target"
		fi
		thumb="$targetnoext-thumb.jpg"
		magick "$thumbsource" -thumbnail 80x80\> -unsharp 0x.5 "$thumb"
		;;
esac
thumb=$( php -r "echo rawurlencode( '${thumb//\'/\\\'}' );" )
pushData coverart '{ "type": "'$type'", "coverart": "'${target//\'/\\\'}'", "thumb": "'$thumb'" }'
rm -f $dirshm/{embedded,local,online}/*
