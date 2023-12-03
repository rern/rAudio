#!/bin/bash

. /srv/http/bash/common.sh

. $dirshm/radio

case $id in
	flac )   id=0;;
	mellow ) id=1;;
	rock )   id=2;;
	global ) id=3;;
	fip )           id=7;;  # FIP
	fipelectro )    id=74;; # Electro
	fipgroove )     id=66;; # Groove
	fiphiphop )     id=95;; # Hip-Hop
	fipjazz )       id=65;; # Jazz
	fipmetal )      id=77;; # Metal
	fipnouveautes ) id=70;; # Nouveautés
	fippop )        id=78;; # Pop
	fipreggae )     id=71;; # Reggae
	fiprock )       id=64;; # Rock
	fipworld )      id=69;; # Monde
	
	francemusique )       id=4;;   # France Musique
	baroque )             id=408;; # La Baroque
	classiqueplus )       id=402;; # Classique Plus
	concertsradiofrance ) id=403;; # Concerts Radio France
	easyclassique )       id=401;; # Classique Easy
	labo )                id=407;; # Musique de Films
	lacontemporaine )     id=406;; # La Contemporaine
	lajazz )              id=405;; # La Jazz
	ocoramonde )          id=404;; # Ocora Musiques du Monde
	opera )               id=409;; # Opéra
esac

i=0
metadataGet() {
	if [[ $id < 4 ]]; then
		radioparadise=1
		icon=radioparadise
		json=$( curl -sGk -m 5 --data-urlencode "chan=$id" https://api.radioparadise.com/api/now_playing )
	else
		icon=radiofrance
		if [[ $id == 95 ]]; then # openapi: only needed by hiphop (no coverart for openapi)
			hiphop=1
			query='{ "query": "{ live( station: FIP_HIP_HOP ) { song { end track { title albumTitle mainArtists } } } }" }'
			json=$( curl -s 'https://openapi.radiofrance.fr/v1/graphql' \
						-H 'Accept-Encoding: gzip, deflate, br' \
						-H 'Content-Type: application/json' \
						-H 'Accept: application/json' \
						-H 'Connection: keep-alive' \
						-H 'DNT: 1' \
						-H 'Origin: https://openapi.radiofrance.fr' \
						-H "x-token: 0390600a-5407-4e86-b439-24e5d48427dc" \
						--compressed \
						--data-binary "$query" )
		else # api: current until switched to openapi ( except hophop)
			json=$( curl -sGk -m 5 https://api.radiofrance.fr/livemeta/pull/$id )
		fi
	fi
	if [[ ! $json || ${json:0:1} != '{' ]]; then
		(( i++ ))
		if [[ $i == 1 ]]; then
			notify "$icon blink" Metadata 'Retry ...' -1
			status=$( $dirbash/status.sh )
			pushData mpdradio "$status"
		elif [[ $i == 10 ]]; then
			notify $icon Metadata 'Not available'
			systemctl stop radio
			exit
		fi
		
		sleep 1
		metadataGet
		return
	fi
	
	if [[ $radioparadise ]]; then
		readarray -t metadata <<< $( jq -r '.artist,.title,.album,.cover,.time // empty' <<< $json )
		countdown=${metadata[4]} # countdown
	else 
		if [[ $hiphop ]]; then
			song=$( jq -r '.data.live.song // empty' <<< $json )
			if [[ ! $song ]]; then
				sleep 5
				metadataGet
				return
			fi
			
			track=$( jq .track <<< $song )
			artists=$(  jq -r '.mainArtists[]' <<< $track )
			readarray -t metadata <<< "\
${artists//$'\n'/, }
$( jq -r .title <<< $track )
$( jq -r .albumTitle <<< $track )"
			end=$( jq -r .end <<< $song )
		else
			levels=$( jq .levels[0] <<< $json )
			position=$( jq .position <<< $levels )
			item=$( jq .items[$position] <<< $levels )
			step=$( jq .steps[$item] <<< $json )
			readarray -t metadata <<< $( jq -r '.authors,.title,.titreAlbum,.visual,.end // empty' <<< $step )
			end=$( jq -r .end <<< $step )
		fi
		now=$( date +%s )
		countdown=$(( end - now ))
	fi
	dataprev="$artist $title $album"
	artist=$( stringEscape ${metadata[0]} )
	title=$( stringEscape ${metadata[1]} )
	album=$( stringEscape ${metadata[2]} )
	coverurl=${metadata[3]}
	if [[ ! $title || "$artist $title $album" == $dataprev ]]; then
		sleep 5
		metadataGet
		return
	fi
	
	[[ ! $artist ]] && artist=$( jq -r '.composers // empty' <<< $step )
	if [[ ! -e $dirsystem/vumeter ]]; then
		if [[ $coverurl ]]; then
			name=$( tr -d ' \"`?/#&'"'" <<< $artist$title )
			ext=${coverurl/*.}
			coverart=/data/shm/webradio/$name.$ext
			curl -s $coverurl -o $dirshm/webradio/$name.$ext
		else
			name=$( tr -d ' "`?/#&'"'" <<< $artist$album )
			coverfile=$( ls $dirshm/webradio/${name,,}.* )
			coverart=${coverfile:9}
		fi
	fi
	elapsed=$( mpcElapsed )
	data='
  "Album"        : "'$album'"
, "Artist"       : "'$artist'"
, "elapsed"      : '$elapsed'
, "file"         : "'$file'"
, "icon"         : "'$icon'"
, "sampling"     : "'$sampling'"
, "state"        : "play"
, "station"      : "'$station'"
, "stationcover" : "'$stationcover'"
, "Time"         : false
, "Title"        : "'$title'"
, "webradio"     : true'
	if [[ $coverart ]]; then
		data+='
, "coverart"     : "'$coverart'"'
	else
		$dirbash/status-coverartonline.sh "cmd
$artist
$album
webradio
CMD ARTIST ALBUM TYPE" &> /dev/null &
	fi
	pushData mpdradio "{ $data }"
	[[ -e $dirsystem/scrobble ]] && cp -f $dirshm/status{,prev}
	sed 's/^.."//; s/" *: /=/' <<< $data > $dirshm/status
	$dirbash/status-push.sh statusradio & # for snapcast ssh - for: mpdoled, lcdchar, vumeter, snapclient(need to run in background)
	[[ $coverart ]] && $dirbash/cmd.sh coverfileslimit
	# next fetch
	[[ ! $countdown || $countdown -lt 0 ]] && countdown=0
	sleep $(( countdown + 5 )) # add 5s delay
	metadataGet
}

metadataGet
