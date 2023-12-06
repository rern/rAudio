#!/bin/bash

. /srv/http/bash/common.sh

pos=$1
nooption=$2 # snapclient / prevnext

filter='Album AlbumArtist Artist Composer Conductor audio bitrate duration file Name state Time Title'
[[ ! $nooptions ]] && filter+=' playlistlength random repeat single'
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

exit

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
