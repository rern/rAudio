#!/bin/bash

shopt -s globstar

dirdata=/srv/http/data
for dir in $dirdata/webradio $dirdata/dabradio; do
	[[ ! -e $dir ]] && continue
	
	for file in $dir/**; do
		uri_name=$( basename "$file" )
		[[ -d $file || $file == $dir/img/* || $uri_name != http* ]] && continue
		
		dir=$( dirname "$file" )
		readarray -t data < "$file"
		uri=${uri_name//|/\/}
		station=${data[0]}
		sampling=${data[1]}
		charset=${data[2]}
		mkdir "$dir/$station"
		echo "\
$uri
$sampling
$charset" > "$dir/$station/data"
		rm "$file"
		list+="\
$uri^^$dir/$station
"
		
		while read file_prev; do
			[[ ${file_prev: -10:6} == -thumb ]] && name=thumb || name=cover
			file_new="$dir/$station/$name.${file_prev: -3}"
			mv $file_prev "$file_new"
		done < <( ls $dir/img/$uri_name* 2> /dev/null )
	done
	rm -rf $dir/img
done

echo -n "$list" > $dirdata/mpd/radio
