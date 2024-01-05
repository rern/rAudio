#!/bin/bash

. /srv/http/bash/common.sh

. <( mpc playlist -f 'album="%album%"; artist="%artist%"; composer="%composer%"; conductor="%conductor%"; file="%file%"; time=%time%; title="%title%"' | sed "$1 q;d" )

fileheader=${file:0:4}
if [[ 'http rtmp rtp: rtsp' =~ ${fileheader,,} ]]; then
	urlname=${file//\//|}
	path=$( find $dirwebradio -name $urlname )
	[[ ! $path ]] && exit
	
	readarray -t station_sampling < "$path"
	station=${station_sampling[0]}
	sampling=${station_sampling[1]}
	coverfile=$dirwebradio/img/$urlname.jpg
	time=false
	webradio=true
	host=$( cut -d/ -f3 <<< $file )
	case $host in
		icecast.radiofrance.fr )   icon=radiofrance;;
		stream.radioparadise.com ) icon=radioparadise;;
	esac
	ext=Radio
else
	album=$( stringEscape $album )
	artist=$( stringEscape $artist )
	composer=$( stringEscape $composer )
	conductor=$( stringEscape $conductor )
	title=$( stringEscape $title )
	path=$( dirname "/mnt/MPD/$file" )
	coverfile=$( coverFileGet "$path" )
	time=$(( ${time:0:-3} * 60 + ${time: -2} ))
	webradio=false
	ext=${file/*.}
fi

data='
  "Album"     : "'$album'"
, "Artist"    : "'$artist'"
, "Composer"  : "'$composer'"
, "Conductor" : "'$conductor'"
, "ext"       : "'$ext'"
, "file"      : "'$file'"
, "icon"      : "'$icon'"
, "song"      : '$(( $1 - 1 ))'
, "station"   : "'$station'"
, "Time"      : '$time'
, "Title"     : "'$title'"
, "webradio"  : '$webradio
if [[ -e $coverfile ]]; then
	[[ $webradio == true ]] && coverart=${coverfile:9} || coverart=$coverfile
	data+='
, "coverart"  : "'$coverart'"'
fi
[[ $sampling ]] && data+='
, "sampling"  : "'$sampling'"'

pushData mpdplayer "{ $data }"
