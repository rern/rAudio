#!/bin/bash

. /srv/http/bash/common.sh

# convert each line to each args
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
		coverfile=$( ls -1 $targetnoext.* 2> /dev/null | head -1 )
		if [[ -e $coverfile ]]; then
			mv -f $coverfile $coverfile.backup
			rm -f $coverfile
		fi
		if [[ ! $gif ]]; then
			cp -f $source "$target" || convert $source -thumbnail 1000x1000\> -unsharp 0x.5 "$target"
		else
			gifsicle -O3 --resize-fit 600x600 $source > "$target"
		fi
		;;
	bookmark )
		name=${args[3]}
		rm -f "$targetnoext".*
		if [[ ! $gif ]]; then
			cp -f $source "$target" || convert $source -thumbnail 200x200\> -unsharp 0x.5 "$target"
		else
			gifsicle -O3 --resize-fit 200x200 $source > "$target"
		fi
		convert "$thumbsource" -thumbnail 80x80\> -unsharp 0x.5 "$( dirname "$target" )/thumb.jpg"
		;;
	coverart )
		dir=$( dirname "$target" )
		rm -f "$dir/cover".*.backup "$dir/coverart".* "$dir/thumb".*
		coverfile=$( ls -1 "$dir/cover".* 2> /dev/null | head -1 )
		[[ -e $coverfile ]] && mv -f "$coverfile" "$coverfile.backup"
		if [[ ! $gif ]]; then
			cp -f $source "$target" || convert $source -thumbnail 1000x1000\> -unsharp 0x.5 "$target"
			convert "$target" -thumbnail 200x200\> -unsharp 0x.5 "$dir/coverart.jpg"
		else
			gifsicle -O3 --resize-fit 600x600 $source > "$target"
			gifsicle -O3 --resize-fit 200x200 $source > "$dir/coverart.gif"
		fi
		convert "$thumbsource" -thumbnail 80x80\> -unsharp 0x.5 "$dir/thumb.jpg"
		;;
	dabradio | webradio )
		rm -f "$targetnoext".* "$targetnoext-thumb".*
		if [[ ! $gif ]]; then
			cp -f $source "$target" || convert $source -thumbnail 1000x1000\> -unsharp 0x.5 "$target"
		else
			gifsicle -O3 --resize-fit 600x600 $source > "$target"
		fi
		convert "$thumbsource" -thumbnail 80x80\> -unsharp 0x.5 "$targetnoext-thumb.jpg"
		;;
esac
coverart=${target/\/srv\/http}
[[ ${target:0:4} == /mnt ]] && coverart=$( php -r "echo rawurlencode( '${coverart//\'/\\\'}' );" )
[[ ${type: -5} != radio ]] && stationcover=', "stationcover": true'
pushData coverart '{ "url": "'$coverart'"'$stationcover' }'
rm -f $dirshm/{embedded,local,online}/*
