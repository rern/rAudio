#!/bin/bash

. /srv/http/bash/common.sh

args2var "$1"

tagUpdate() {
	[[ -f $FILE ]] && dirupdate=$( dirname "${FILE:9}" ) # /mnt/MPD/path/dir/... > path/dir
	mpcUpdate update "$dirupdate"
}

if [[ $FILE != *.cue ]]; then
	[[ ! $TRACK ]] && all='/*.*'
	argslast=${args[@]: -1}
	TAGS=( ${argslast/CMD FILE } ) # CMD FILE ALBUM ARTIST ... > ALBUM ARTIST ...
	for T in "${TAGS[@]}"; do
		v=$( quoteEscape ${!T} )
		kid3-cli -c "set ${T,,} \"$v\"" "$FILE"$all
	done
	tagUpdate
	exit
#-------------------------------------------------------------------------------
fi

head -c3 "$FILE" | grep -q $'^\xEF\xBB\xBF' && sed -i '1s/^\xEF\xBB\xBF//' "$FILE" # remove bom
grep -q $'\r' "$FILE" && perl -0777 -pi -e 's/\r\n?/\n/g' "$FILE"                  # remove \r
if [[ ! $TRACK ]]; then # album level -------------------------------------
	for T in COMPOSER CONDUCTOR DATE GENRE; do # less priority than in track
		v=${!T}
		if [[ $v && $v != '*' ]]; then
			tag+="
REM $T \"$v\""
			del+="|$T"
		fi
	done
	[[ $ALBUM ]]       && tag+="
TITLE \"$ALBUM\""
	[[ $ALBUMARTIST ]] && tag+="
PERFORMER \"$ALBUMARTIST\""
	tag+="
$( grep ^FILE "$FILE" )"
	echo "$tag" > $dirshm/tag
	line=$(( $( sed -n -E '/^\s+TRACK 01 / {=; q}' "$FILE" ) - 1 ))
	sed -i -E -e "1 e cat $dirshm/tag
" -e "1,$line d
" -e "/^\s+REM (${del:1})/ d
" "$FILE"
else # track level ---------------------------------------------------------
	(( $TRACK < 10 )) && TRACK=0$TRACK
	data=$( sed -n -E "/^\s+TRACK $TRACK /,/^\s+INDEX/ p" "$FILE" )
	tag="\
$( head -n 1 <<< $data )
    TITLE \"$TITLE\""
	[[ $ARTIST ]] && tag+="
    PERFORMER \"$ARTIST\""
	for T in COMPOSER CONDUCTOR DATE GENRE; do
		[[ ${!T} ]] && tag+="
    REM $T \"${!T}\""
	done
	tag+="
$( tail -n 1 <<< $data )"
	echo "$tag" > $dirshm/tag
	sed -i -E -e "/^\s+TRACK $TRACK /,/^\s+INDEX/ {/^\s+TRACK $TRACK /r $dirshm/tag" -e 'd}' "$FILE"
fi
rm $dirshm/tag
tagUpdate
