#!/bin/bash

shopt -s globstar

for radio in dabradio webradio; do
	dir_radio=/srv/http/data/$radio
	[[ ! -e $dir_radio ]] && continue
	
	for path in $dir_radio/**; do
		[[ -d $path || $path == $dir_radio/img/* ]] && continue
		
		mv $path /tmp
		uri_name=$( basename $path )
		mkdir $path
		mv /tmp/$uri_name $path/data
		while read f; do
			[[ ${f: -10:6} == -thumb ]] && cover=thumb || cover=cover
			file_cover="$path/$cover${f: -4}"
			mv $f "$file_cover"
		done < <( ls $dir_radio/img/$uri_name* 2> /dev/null )
	done
	rm -rf $dir_radio/img
done
