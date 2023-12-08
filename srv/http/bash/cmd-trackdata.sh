#!/bin/bash

# cmd-trackdata.sh POS

. /srv/http/bash/common.sh

. <( mpc playlist -f 'album="%album%"; artist="%artist%"; composer="%composer%"; conductor="%conductor%"; file="%file%"; time=%time%; title="%title%"' | sed "$1 q;d" )
fileheader=${file:0:4}
if [[ 'http rtmp rtp: rtsp' =~ ${fileheader,,} ]]; then
	urlname=${file//\//|}
	path=$( find $dirwebradio -name $urlname )
	station=$( head -1 "$path" )
	coverfile=$dirwebradio/img/$urlname.jpg
	time=false
	webradio=true
else
	album=$( stringEscape $album )
	artist=$( stringEscape $artist )
	composer=$( stringEscape $composer )
	conductor=$( stringEscape $conductor )
	title=$( stringEscape $title )
	path=$( dirname "/mnt/MPD/$file" )
	coverfile=$( coverFileGet "$path" )
	(( ${#time} < 6 )) && time="0:$time"
	time=$( date +'%s' -d "1970-01-01 $time Z" )
	webradio=false
fi
data='
  "Album"     : "'$album'"
, "Artist"    : "'$artist'"
, "Composer"  : "'$composer'"
, "Conductor" : "'$conductor'"
, "file"      : "'$file'"
, "station"   : "'$station'"
, "Time"      : '$time'
, "Title"     : "'$title'"
, "webradio"  : '$webradio
if [[ -e $coverfile ]]; then
	[[ $webradio == true ]] && coverart=${coverfile:9} || coverart=$coverfile
	data+='
, "coverart"  : "'$coverart'"'
fi
pushData mpdplayer "{ $data }"
