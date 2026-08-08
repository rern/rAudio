#!/bin/bash

shopt -s globstar

> $dirmpd/radio

dirdata=/srv/http/data
for dir in $dirdata/webradio $dirdata/dabradio; do
	[[ ! -e $dir ]] && continue
	
	for path in $dir/**; do
		uri_name=$( basename "$path" )
		[[ -d $path || $path == $dir/img/* || $uri_name != http* ]] && continue
		
		mv "$path" /tmp
		mkdir "$path"
		mv "/tmp/$uri_name" "$path/data"
		while read file_prev; do
			[[ ${file_prev: -10:6} == -thumb ]] && name=thumb || name=cover
			file_new="$path/$name.${file_prev: -3}"
			mv $file_prev "$file_new"
		done < <( ls $dir/img/$uri_name* 2> /dev/null )
	done
	rm -rf $dir/img
	find $dir -type f -name data -printf '%h\n' >> $dirmpd/radio
done

