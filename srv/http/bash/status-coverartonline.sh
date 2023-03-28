#!/bin/bash

. /srv/http/bash/common.sh

! internetConnected && exit

if [[ $1 ]]; then
	readarray -t args <<< $1

	Artist=${args[0]}
	Album=${args[1]} # album / title
	Title=$Album
	type=${args[2]}
	discid=${args[3]}
else # debug - no args
	grep -q 'Artist=""' $dirshm/status && echo '(no artist)' && exit
	
	debug=1
	. $dirshm/status
	[[ $webradio == true ]] && type=webradio
fi

name=$( tr -d ' "`?/#&'"'" <<< $Artist$Album )
name=${name,,}

# suppress multiple calls
[[ -e $dirshm/$name ]] && exit

trap "rm -f $dirshm/$name" EXIT

touch $dirshm/$name

### 1 - lastfm ##################################################
if [[ $type == webradio ]]; then
	param="track=${Title//&/ and }"
	method='method=track.getInfo'
else
	param="album=${Album//&/ and }"
	method='method=album.getInfo'
fi
apikey=$( grep -m1 apikeylastfm /srv/http/assets/js/main.js | cut -d"'" -f2 )
data=$( curl -sfG -m 5 \
	--data-urlencode "artist=$Artist" \
	--data-urlencode "$param" \
	--data "$method" \
	--data "api_key=$apikey" \
	--data "format=json" \
	http://ws.audioscrobbler.com/2.0 )
if [[ $debug ]]; then
	echo '
curl -sfG -m 5 \
	--data-urlencode "artist='$Artist'" \
	--data-urlencode "'$param'" \
	--data "'$method'" \
	--data "api_key='$apikey'" \
	--data "format=json" \
	http://ws.audioscrobbler.com/2.0'
	jq <<< $data
fi
[[ $? != 0 || $data =~ '"error":' ]] && exit

if [[ $type == webradio ]]; then
	album=$( jq -r .track.album <<< $data )
else
	album=$( jq -r .album <<< $data )
fi
[[ $album == null ]] && exit

image=$( jq -r .image <<< $album )
if [[ $image && $image != null ]]; then
	extralarge=$( jq -r '.[3]."#text"' <<<  $image )
	if [[ $extralarge ]]; then
		url=$( sed 's|/300x300/|/_/|' <<< $extralarge ) # get larger size than 300x300
	else
### 2 - coverartarchive.org #####################################
		mbid=$( jq -r .mbid <<< $album )
		if [[ $mbid && $mbid != null ]]; then
			imgdata=$( curl -sfL -m 10 https://coverartarchive.org/release/$mbid )
			[[ $? == 0 ]] && url=$( jq -r .images[0].image <<< $imgdata )
		fi
	fi
fi
[[ ! $url || $url == null ]] && exit

ext=${url/*.}
if [[ $type == audiocd ]]; then
	coverfile=$diraudiocd/$discid.$ext
else
	[[ $type ]] && prefix=$type || prefix=online
	coverfile=$dirshm/$prefix/$name.$ext
fi
curl -sfL $url -o $coverfile || exit

data='
  "url"   : "'${coverfile:9}'"
, "type"  : "coverart"'
if [[ $type == webradio ]]; then
	Album=$( jq -r .title <<< $album )
	echo $Album > $dirshm/webradio/$name
	data+='
, "Album" : "'$Album'"'
fi
pushstream coverart "{$data}"
$dirbash/cmd.sh coverfileslimit
