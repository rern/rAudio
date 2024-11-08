#!/bin/bash

path=$1
[[ $2 == true ]] && overwrite=1
bar='<a class="cbm">  </a>'
padw='<a class="cbw">  </a>'
padg='<a class="cbg">  </a>'
padgr='<a class="cbgr">  </a>'
warn='<a class="cbr cw"> ! </a>'

. /srv/http/bash/common.sh

basename $0 .sh > $dirshm/script

hhmmss() {
	local fmt
	(( $total < 3600 )) && fmt='+%M:%S' || fmt='+%H:%M:%S'
	date -d@$1 -u $fmt
}
tagColor() {
	echo '<a class="cc">'$@'</a>'
}
warningWrite() {
	echo "   $warn" No write permission: $( tagColor $dir ) $( stat -c '%A (%a)' "$dir" )
}

dir="/mnt/MPD/$path"
[[ ! -w "$dir" ]] && warningWrite && exit
# --------------------------------------------------------------------

echo -e "\nDirectory: $( tagColor $dir )\n"

SECONDS=0

albumfile=/srv/http/data/mpd/album

if [[ ! $path ]]; then
	mpdpathlist=$( cut -d^ -f7 $albumfile )
else
	mpdpathlist=$( find "$dir" -type d | cut -c10- )
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
	echo $percent'% <a class="gr">'$( hhmmss $sec )/$( hhmmss $total )'</a>'
	echo $i/$count $( tagColor $mpdpath )
	
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
				warningWrite
				errorwrite+="
$dir"
			else
				echo "   $warn Coversion failed: $( tagColor $coverfile )"
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
Duration: $( hhmmss $SECONDS )

$bar Done.
<hr>
"
