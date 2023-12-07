#!/bin/bash

. /srv/http/bash/common.sh

song=$1
nooption=$2 # snapclient / prevnext

filter='Album AlbumArtist Artist Composer Conductor file Name Time Title audio bitrate duration playlistlength random repeat single state'
filter=^${filter// /:|^}: # ^Album|^AlbumArtist|^Artist...
readarray -t lines <<< $( { echo clearerror; echo status; echo playlistinfo $song; sleep 0.05; } \
								| telnet 127.0.0.1 6600 2> /dev/null \
								| grep -E $filter )
for line in "${lines[@]}"; do
	key=${line/:*}
	val=${line#*: }
	case $key in
		audio )
			samplerate=${val/:*}
			bitdepth=${val/*:}
			;;
		bitrate )
			bitrate=$(( val * 1000 ))
			;;
		duration | playlistlength | state | Time )
			printf -v $key '%s' $val
			;; # value of $key as "var name" - value of $val as "var value"
		Album | AlbumArtist | Artist | Composer | Conductor | Name | Title )
			printf -v $key '%s' "$( stringEscape $val )"
			;;                   # string to escape " for json and trim leading/trailing spaces
		file )
			filenoesc=$val # no escape " for coverart and ffprobe
			[[ $filenoesc == *".cue/track"* ]] && filenoesc=$( dirname "$filenoesc" )
			file=$( stringEscape "$val" )
			;;   # escape " for json
		random | repeat | single )
			[[ $val == 1 ]] && val=true || val=false
			printf -v $key '%s' $val
			;;
	esac
done

[[ $2 != prevnext ]] && exit

fileheader=${file:0:4}
if [[ 'http rtmp rtp: rtsp' =~ ${fileheader,,} ]]; then
	webradio=true
	urlname=${file//\//|}
	path=$( find $dirwebradio -name $urlname )
	station=$( head -1 "$path" )
	coverfile=$dirwebradio/img/$urlname.jpg
else
	webradio=false
	path=$( dirname "/mnt/MPD/$file" )
	coverfile=$( coverFileGet "$path" )
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
