#!/bin/bash

path=$1
[[ $2 == true ]] && overwrite=1
fullpath="/mnt/MPD/$path"
padw='<a class="cbw">  </a>'
padg='<a class="cbg">  </a>'
padgr='<a class="cbgr">  </a>'

. /srv/http/bash/settings/addons.sh

warningWrite() {
	echo "   $warn No write permission: <a class='cc'>$1</a> $( stat -c '%A (%a)' "$1" )"
}

title "$bar Update Album Thumbnails ..."
echo Path: '<a class="cc">'$fullpath'</a>'
echo

[[ ! -w "$fullpath" ]] && warningWrite "$fullpath" && exit
# --------------------------------------------------------------------
SECONDS=0

albumfile=/srv/http/data/mpd/album

if [[ ! $path ]]; then
	mpdpathlist=$( cut -d^ -f7 $albumfile )
else
	mpdpathlist=$( find "$fullpath" -type d | cut -c10- )
fi
unsharp=0x.5

[[ ! $mpdpathlist ]] && echo "$padw No albums found in database." && exit
# --------------------------------------------------------------------
count=$( wc -l <<< $mpdpathlist )
while read mpdpath; do
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
	if [[ ! $overwrite ]] && ls "$dir/coverart".* &> /dev/null; then
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
		files=$( mpc ls "$mpdpath" 2> /dev/null )
		while read file; do
			file="/mnt/MPD/$file"
			if [[ -f "$file" ]]; then
				coverfile="$dir/cover.jpg"
				kid3-cli -c "select \"$file\"" -c "get picture:\"$coverfile\"" &> /dev/null
				[[ ! -e $coverfile ]] && coverfile=
				break
			fi
		done <<< $files
	fi
	if [[ $coverfile ]]; then
		error=
		ext=${coverfile: -3}
		if [[ $ext == gif ]]; then
			[[ $( gifsicle -I "$coverfile" | awk 'NR==1 {print $NF}' ) == images ]] && echo "     Resize aninated GIF ..."
			gifsicle -O3 --resize-fit 200x200 "$coverfile" > "$dir/coverart.gif"
			[[ $? == 0 ]] && gifsicle -O3 --resize-fit 80x80 "$coverfile" > "$dir/thumb.gif" || error=1
		else
			magick "$coverfile" -thumbnail 200x200\> -unsharp $unsharp "$dir/coverart.jpg"
			[[ $? == 0 ]] && magick "$coverfile" -thumbnail 80x80\> -unsharp $unsharp "$dir/thumb.jpg" || error=1
		fi
		if [[ $error ]]; then
			if [[ ! -w "$dir" ]]; then
				warningWrite "$dir"
				errorwrite+="
$dir"
			else
				echo "   $warn Coversion failed: <a class='cc'>$coverfile</a>"
				errorconvert+="
$coverfile"
			fi
		else
			(( thumb++ ))
			echo "   $padg #$thumb - Thumbnail created."
		fi
	else
		echo "   $padgr No coverart found."
	fi
done <<< $mpdpathlist

[[ $errorwrite ]] && echo "
$warn No write permission:
$errorwrite"
[[ $errorconvert ]] && echo "
$warn Coversion failed:
$errorconvert"

echo "
Duration: $( date -d@$SECONDS -u +%H:%M:%S )

$bar Done.
<hr>
"
