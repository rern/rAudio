#!/bin/bash

shopt -s globstar

for radio in dabradio webradio; do
	dir_radio=/srv/http/data/$radio
	[[ ! -e $dir_radio ]] && continue
	
	for path in $dir_radio/**; do
		uri_name=$( basename "$path" )
		[[ -d $path || $path == $dir_radio/img/* || $uri_name != http* ]] && continue
		
		mv "$path" /tmp
		mkdir "$path"
		mv "/tmp/$uri_name" "$path/data"
		while read file_prev; do
			[[ ${file_prev: -10:6} == -thumb ]] && name=thumb || name=cover
			file_new="$path/$name.${file_prev: -3}"
			mv $file_prev "$file_new"
		done < <( ls $dir_radio/img/$uri_name* 2> /dev/null )
	done
	rm -rf $dir_radio/img
done
