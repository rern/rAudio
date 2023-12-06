#!/bin/bash

. /srv/http/bash/common.sh

pos=$1

. <( mpc playlist -f 'album="%album%"; artist="%artist%"; composer="%composer%"; conductor="%conductor%"; file="%file%"; time=%time%; title="%title%"' | sed -n ${pos}p )
Album=$( stringEscape $album )
Artist=$( stringEscape $artist )
Composer=$( stringEscape $composer )
Conductor=$( stringEscape $conductor )
Title=$( stringEscape $title )
fileheader=${file:0:4}
if [[ 'http rtmp rtp: rtsp' =~ ${fileheader,,} ]]; then
	webradio=true
	urlname=${file//\//|}
	path=$( find $dirwebradio -name $urlname )
	station=$( head -1 "$path" )
	coverfile=$dirwebradio/img/$urlname.jpg
	Time=false
else
	webradio=false
	path=$( dirname "/mnt/MPD/$file" )
	coverfile=$( coverFileGet "$path" )
	colon=$( tr -cd : <<< $time | wc -c )
	if (( $colon == 0 )); then
		time="0:0:$time"
	elif (( $colon == 1 )); then
		time="0:$time"
	fi
	Time=$( date +'%s' -d "1970-01-01 $time Z" )
fi
data='
"Album"     : "'$Album'"
, "Artist"    : "'$Artist'"
, "Composer"  : "'$Composer'"
, "Conductor" : "'$Conductor'"
, "file"      : "'$file'"
, "station"   : "'$station'"
, "Time"      : '$Time'
, "Title"     : "'$Title'"
, "webradio"  : '$webradio
if [[ -e $coverfile ]]; then
	[[ $webradio == true ]] && coverart=${coverfile:9} || coverart=$coverfile
	data+='
, "coverart"  : "'$coverart'"'
fi
pushData mpdplayer "{ $data }"
