#!/bin/bash

. /srv/http/bash/common.sh

# webradio
for radio in webradio dabradio; do
	dir_radio=$dirdata/$radio
	[[ ! -e $dir_radio ]] && continue

	while read file; do
		if [[ -d "$file" ]]; then
			[[ -e "$file/data" ]] && list+="\
$( head -1 "$file/data" )^^$file
"
		else
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
				coverart "$dir_station"
			done < <( ls $dir_radio/img/$uri_name* 2> /dev/null )
		fi
		
		dir=$file
		file_cover=$( compgen -G "$dir/cover".* )
		[[ ! $file_cover ]] && continue
		
		compgen -G "$dir/coverart".* > /dev/null && continue
		
		if [[ ${file_cover: -3} == gif ]]; then
			gifsicle -O3 --resize-fit 200x200 "$file_cover" > "$dir/coverart.gif"
		else
			magick "$file_cover" -thumbnail 200x200\> -unsharp 0x.5 "$dir/coverart.jpg"
		fi
	done < <( find $dir_radio )
	n=$( find $dir_radio -type f -name data | wc -l )
	sed -i -E 's/("'$radio'": )[0-9]+(,*)$/\1'$n'\2/' $dirmpd/counts
	rm -rf $dir_radio/img
done

echo -n "$list" > $dirmpd/radio

chown -R http:http $dirdata/{audiocd,webradio,dabradio} &> /dev/null

# order
file=$dirsystem/order.json
[[ -e $file ]] && sed -i 's|".*/|"|' $file

# audio cd
files=$( find $diraudiocd -maxdepth 1 -type f ! -name '*.*' )
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
