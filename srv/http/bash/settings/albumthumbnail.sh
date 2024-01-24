#!/bin/bash

path=$1
fullpath="/mnt/MPD/$path"
padw='<a class="cbw">  </a>'
padg='<a class="cbg">  </a>'
padgr='<a class="cbgr">  </a>'

. /srv/http/bash/settings/addons.sh

warningWrite() {
	local error
	error="
$warn Unable to create thumbnails.
Directory:  <a class='cc'>$1</a>"
	if (( $( stat -c %a "$1" ) < 755 )); then
		error+="
No write permission: $( stat -c '%A (%a)' "$1" )"
	else
		error+="
Conversion failed."
	fi
	echo "$error"
}

title "$bar Update Album Thumbnails ..."

[[ ! -w "$fullpath" ]] && warningWrite "$fullpath" && exit

SECONDS=0

albumfile=/srv/http/data/mpd/album

if [[ ! $path ]]; then
	mpdpathlist=$( cut -d^ -f7 $albumfile )
else
	mpdpathlist=$( find "$fullpath" -type d | cut -c10- )
fi
unsharp=0x.5

[[ ! $mpdpathlist ]] && echo "$padw No albums found in database." && exit

readarray -t lines <<< $mpdpathlist

count=${#lines[@]}
i=0
for mpdpath in "${lines[@]}"; do
	(( i++ ))
	percent=$(( $i * 100 / $count ))
	if (( $percent > 0 )); then
		sec=$SECONDS
		total=$(( $sec * 100 / $percent ))
	else
		sec=0
		total=0
	fi
	elapse=$( date -d@$sec -u +%H:%M:%S )
	total=$( date -d@$total -u +%H:%M:%S )
	echo $percent% '<a class="cgr">'$elapse/$total'</a>'
	echo $i/$count '<a class="cc">'$mpdpath'</a>'
	
	dir="/mnt/MPD/$mpdpath"
	if ls "$dir/coverart".* &> /dev/null; then
		echo "   $padw Thumbnail already exists."
		continue
	fi
	
	for name in cover folder front album; do # file
		for ext in jpg png gif; do
			coverfile="$dir/$name.$ext"
			[[ -e $coverfile ]] && break 2
			coverfile="$dir/${name^}.$ext" # capitalize
			[[ -e $coverfile ]] && break 2
		done
		coverfile=
	done
	if [[ ! $coverfile ]]; then # embedded
		readarray -t files <<< $( mpc ls "$mpdpath" 2> /dev/null )
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
	if [[ $coverfile ]]; then
		ext=${coverfile: -3}
		if [[ $ext == gif ]]; then
			[[ $( gifsicle -I "$coverfile" | awk 'NR==1 {print $NF}' ) == images ]] && echo "     Resize aninated GIF ..."
			gifsicle -O3 --resize-fit 200x200 "$coverfile" > "$dir/coverart.gif"
			gifsicle -O3 --resize-fit 80x80 "$coverfile" > "$dir/thumb.gif"
		else
			convert "$coverfile" -thumbnail 200x200\> -unsharp $unsharp "$dir/coverart.jpg"
			convert "$coverfile" -thumbnail 80x80\> -unsharp $unsharp "$dir/thumb.jpg"
		fi
		[[ ! -e "$dir/coverart.jpg" ]] && warningWrite "$dir" && exit
		
		(( thumb++ ))
		echo "   $padg #$thumb - Thumbnail created."
	else
		echo "   $padgr No coverart found."
	fi
done

echo "
Duration: $( date -d@$SECONDS -u +%H:%M:%S )

$bar Done.
<hr>
"
