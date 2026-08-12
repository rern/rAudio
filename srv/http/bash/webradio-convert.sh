#!/bin/bash

shopt -s globstar

dirdata=/srv/http/data
for radio in webradio dabradio; do
	dir_radio=$dirdata/$radio
	[[ ! -e $dir_radio ]] && continue

	for file in $dir_radio/**; do
		if [[ -d "$file" ]]; then
			[[ -e "$file/data" ]] && list+="\
$( head -1 "$file/data" )^^$file
"
			continue
		fi

		uri_name=$( basename "$file" )
		[[ $file == $dir_radio/img/* || $uri_name != http* ]] && continue

		dir=$( dirname "$file" )
		readarray -t data < "$file"
		uri=${uri_name//|/\/}
		station=${data[0]}
		sampling=${data[1]}
		charset=${data[2]}
		dir_station="$dir/$station"
		mkdir -p "$dir_station"
		echo "\
$uri
$sampling
$charset" > "$dir_station/data"
		rm "$file"
		list+="\
$uri^^$dir_station
"

		while read file_prev; do
			[[ ${file_prev: -10:6} == -thumb ]] && name=thumb || name=cover
			file_new="$dir_station/$name.${file_prev: -3}"
			mv $file_prev "$file_new"
		done < <( ls $dir_radio/img/$uri_name* 2> /dev/null )
	done
	rm -rf $dir_radio/img
done

echo -n "$list" > $dirdata/mpd/radio

while read file; do
	(( $( wc -l < "$file" ) > 1 )) && continue

	dir=$( < "$file" )
	[[ $dir != http* && $dir != rtsp* ]] && continue

	line=$( grep ^$dir $dirmpd/radio )
	echo "\
$dir
${line/*^}" > "$file"
done < <( ls $dirbookmarks/* )
