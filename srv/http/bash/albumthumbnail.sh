#!/bin/bash

. /srv/http/bash/addons.sh

SECONDS=0

title "$bar Update Album Thumbnails ..."

Sstart=$( date +%s )

albumfile=/srv/http/data/mpd/album

if [[ -z $1 ]]; then
	mpdpathlist=$( cat $albumfile | cut -d^ -f7 )
else
	mpdpathlist=$( find "/mnt/MPD/$1" -type d | cut -c10- )
fi
dirtmp=/srv/http/data/shm
unsharp=0x.5
color=( K R G Y B M C W Gr )
cL=${#color[@]}
for (( i=1; i < $cL; i++ )); do
	printf -v pad${color[$i]} '%s' "$( tcolor . $i $i )"
done

readarray -t lines <<< "$mpdpathlist"

count=${#lines[@]}
i=0
for mpdpath in "${lines[@]}"; do
	(( i++ ))
	percent=$(( $i * 100 / $count ))
	elapse=$(( $( date +%s ) - $Sstart ))
	[[ $percent > 0 ]] && total=$( formatTime $(( $elapse * 100 / $percent )) ) || total=0
	elapse=$( formatTime $elapse )
	echo "${percent}% $( tcolor "$elapse/$total $i/$count" 8 ) $( tcolor "$mpdpath" )"
	
	dir="/mnt/MPD/$mpdpath"
	if ls "$dir/coverart".* &> /dev/null; then
		echo "   $padW Thumbnail already exists."
		continue
	fi
	
	for name in cover folder front album; do # file
		for ext in jpg png gif; do
			coverfile="$dir/$name.$ext"
			[[ -e "$coverfile" ]] && break 2
			coverfile="$dir/${name^}.$ext" # capitalize
			[[ -e "$coverfile" ]] && break 2
		done
		coverfile=
	done
	if [[ -z $coverfile ]]; then # embedded
		files=$( mpc ls "$mpdpath" 2> /dev/null )
		readarray -t files <<<"$files"
		for file in "${files[@]}"; do
			file="/mnt/MPD/$file"
			if [[ -f "$file" ]]; then
				coverfile="$dir/cover.jpg"
				kid3-cli -c "select \"$file\"" -c "get picture:\"$coverfile\"" &> /dev/null
				[[ ! -e $coverfile ]] && coverfile=
				break
			fi
		done
	fi
	if [[ -n $coverfile ]]; then
		ext=${coverfile: -3}
		if [[ $ext == gif ]]; then
			[[ $( gifsicle -I "$coverfile" | awk 'NR==1 {print $NF}' ) == images ]] && echo "     Resize aninated GIF ..."
			gifsicle -O3 --resize-fit 200x200 "$coverfile" > "$dir/coverart.gif"
			gifsicle -O3 --resize-fit 80x80 "$coverfile" > "$dir/thumb.gif"
		else
			convert "$coverfile" -thumbnail 200x200\> -unsharp $unsharp "$dir/coverart.jpg"
			convert "$coverfile" -thumbnail 80x80\> -unsharp $unsharp "$dir/thumb.jpg"
		fi
		(( thumb++ ))
		echo "   $padG #$thumb - Thumbnail created."
	else
		echo "   $padGr No coverart found."
	fi
done

echo Duration: $( formatTime $SECONDS )

title -l '=' "$bar Done"
