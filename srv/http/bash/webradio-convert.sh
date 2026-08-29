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
		station=$( head -1 "$file" )
		dir_station="$dir/$station"
		mkdir -p "$dir_station"
		uri=${uri_name//|/\/}
		sed "1 s|.*|$uri|" "$file" > "$dir_station/data"
		rm "$file"
		list+="$uri^^$dir_station"$'\n'
		while read file_prev; do
			[[ ${file_prev: -10:6} == -thumb ]] && name=thumb || name=cover
			file_new="$dir_station/$name.${file_prev: -3}"
			mv $file_prev "$file_new"
		done < <( ls $dir_radio/img/$uri_name* 2> /dev/null )
	done
	rm -rf $dir_radio/img
done

echo -n "$list" > $dirdata/mpd/radio

# audio cd
files=$( find $dirdata/audiocd -maxdepth 1 -type f ! -name *.* )
[[ ! $files ]] && exit
#-------------------------------------------------------------------------------
for f in $files; do
	lines=$( < $f ) # artist^album^title^time
	read artist album < <( head -1 <<< $lines | awk F'^' '{print $1" "$2}' )
	data="\
$album
$artist"
	while read l; do # artist^album^title^time
		data+="
$( awk F'^' '{print $1"^^"$3"^^"$4}' <<< $l )"
	done <<< $lines
	rm $f
	mkdir $f
	echo "$data" > $f/data
	f_cover=$( compgen -G $f.* )
	[[ $f_cover ]] && mv $f_cover $f/cover.${f_cover: -3}
done

for d in audiocd webradio dabradio; do
	chown -R http:http /srv/http/data/$d
done
