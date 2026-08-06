#!/bin/bash

shopt -s globstar

for radio in dabradio webradio; do
	dir_radio=/srv/http/data/$radio
	[[ ! -e $dir_radio ]] && continue
	
	for file in $dir_radio/**; do
		[[ -d $file \
			|| $file == /srv/http/data/webradio/img/* \
			|| -e "$( dirname "$file" )/data" ]] && continue
			
		readarray -t data < "$file"
		rm "$file"
		station=${data[0]}
		dir="$( dirname "$file" )/$station"
		[[ -e $dir ]] && continue
		
		name=$( basename "$file" )
		sampling=${data[1]}
		charset=${data[2]}
		mkdir -p "$dir"
		echo "\
${name//|/\/}
$sampling
$charset" > "$dir/data"
		coverart=$( ls $dir_radio/img/$name* 2> /dev/null )
		[[ ! $coverart ]] && continue
		
		for f in $coverart; do
			[[ ${f: -10:6} == -thumb ]] && cover=thumb || cover=cover
			file_cover="$dir/$cover${f: -4}"
			mv $f "$file_cover"
		done
	done

	rm -rf $dir_radio/img
done