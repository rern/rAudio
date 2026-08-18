#!/bin/bash

. /srv/http/bash/common.sh

PATH_MPD=$1
[[ $2 == true ]] && OVERWRITE=1

basename $0 .sh > $dirshm/script

bar='<a class="cbm">  </a>'
padw='<a class="cbw">  </a>'
padg='<a class="cbg">  </a>'
padgr='<a class="cbgr">  </a>'
warn='<a class="cbr cw"> ! </a>'

hhmmss() {
	local fmt
	(( $1 < 3600 )) && fmt='+%M:%S' || fmt='+%H:%M:%S'
	date -d@$1 -u $fmt
}
tagColor() {
	echo '<a class="cc">'$@'</a>'
}
warningWrite() {
	echo "   $warn" No write permission: $( tagColor $dir ) $( stat -c '%A (%a)' "$dir" )
}

path="/mnt/MPD/$PATH_MPD"
[[ ! -w "$path" ]] && warningWrite && exit
# --------------------------------------------------------------------
echo -e "\nDirectory: $( tagColor $path )\n"
if [[ ! $PATH_MPD ]]; then
	directories=$( sed 's|.*^|/mnt/MPD/|' $dirmpd/album )
else
	directories=$( find "$path" -type d )
fi
[[ ! $directories ]] && echo "$padw No albums found in database." && exit
# --------------------------------------------------------------------
SECONDS=0
unsharp=0x.5
count=$( wc -l <<< $directories )
while read dir; do
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
	echo $i/$count $( tagColor $dir )

	if [[ ! $OVERWRITE ]] && fileExist "$dir/coverart.*"; then
		echo "   $padw Thumbnail already exists."
		continue
	fi
	
	file0=
	while read f; do
		f="/mnt/MPD/$f"
		[[ -f "$f" ]] && file0=$f && break
		
	done < <( mpc ls "${dir:9}" )
	[[ ! $file0 ]] && continue
	
	coverfile=$( $dirbash/status -C "$file0" ) # find in parent dir then embedded
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
done <<< $directories

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
rm -f $dirshm/script
