#!/bin/bash

dir2path() {
	if [[ $1 == /* ]]; then
		echo "$1"
	elif [[ $1 == [NSU]* ]]; then
		echo "/mnt/MPD/$1"
	else
		line=$( grep -m1 ^$1 $dirmpd/radio )
		echo "${line/*^}"
	fi
}
plAddRandom() {
	local ab cuefile dir dirlast mpcls plL range
	dir=$( shuf -n 1 $dirmpd/album | cut -d^ -f7 )
	dirlast=$( dirname "$( mpc -f %file% playlist | tail -n 1 )" )
	if [[ $dir == $dirlast ]]; then # force different album
		[[ $( sed -n '$p' $dirmpd/album ) == $dir ]] && ab=B1 || ab=A1
		dir=$( grep -$ab "\^$dir$" $dirmpd/album | head -n 1 | cut -d^ -f7 )
	fi
	if [[ -s $dirsystem/librandom ]]; then # album
		mpc -q add "$dir"
	else
		mpcls=$( mpc ls "$dir" )
		cuefile=$( grep -m1 '\.cue$' <<< $mpcls )
		if [[ $cuefile ]]; then
			plL=$(( $( grep -c '^\s*TRACK' "/mnt/MPD/$cuefile" ) - 1 ))
			range=$( shuf -i 0-$plL -n 1 )
			mpc --range=$range load "$cuefile"
		else
			mpc -q add "$( shuf -n 1 <<< $mpcls )"
		fi
	fi
	plAddRandom
}
pushRadioList() {
	pushData radiolist '{ "type": "webradio" }'
}
pushSavedPlaylist() {
	if [[ $( ls $dirdata/playlists ) ]]; then
		pushData playlists $( php /srv/http/playlist.php playlists )
	else
		pushData playlists '{ "count": 0 }'
	fi
}
savedPlCount() {
	playlists=$( ls $dirplaylists | wc -l )
	grep -q '"playlists".*,' $dirmpd/counts && playlists+=,
	sed -i -E 's/("playlists" *: ).*/\1'$playlists'/' $dirmpd/counts
	pushSavedPlaylist
}
urldecode() { # for webradio url to filename
	: "${*//+/ }"
	echo -e "${_//%/\\x}"
}
webradioCount() {
	local counts
	counts=$( grep -vE '{|radio|}' $dirmpd/counts | sed '$ s/,$//' )
	counts+=$( countRadio )
	echo '{ '${counts:1}' }' | jq -S > $dirmpd/counts
	pushRadioList
}
