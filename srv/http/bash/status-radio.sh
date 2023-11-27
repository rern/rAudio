#!/bin/bash

. /srv/http/bash/common.sh

readarray -t tmpradio < $dirshm/radio
file=${tmpradio[0]}
station=$( stringEscape ${tmpradio[1]} )
id=${tmpradio[2]}
pos=$( mpc status %songpos% )
total=$( mpc status %length% )
sampling="$pos/$total • ${tmpradio[3]}"
song=$(( $pos - 1 ))

case $id in
	flac )   id=0;;
	mellow ) id=1;;
	rock )   id=2;;
	global ) id=3;;
	fip )           id=7;;  # FIP
	fipelectro )    id=74;; # Electro
	fipgroove )     id=66;; # Groove
	fipjazz )       id=65;; # Jazz
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

radiofranceData() {
	metadata=$( curl -sGk https://api.radiofrance.fr/livemeta/pull/$id )
}
radioparadiseData() {
	readarray -t metadata <<< $( curl -sGk -m 5 \
		--data-urlencode "chan=$id" \
		https://api.radioparadise.com/api/now_playing \
		| jq -r .artist,.title,.album,.cover,.time \
		| sed 's/^null$//' )
}
metadataGet() {
	if [[ $id < 4 ]]; then
		radioparadise=1
		icon=radioparadise
		radioparadiseData
	else
		icon=radiofrance
		radiofranceData
	fi
	if [[ ! $metadata ]]; then
		for i in {1..10}; do
			sleep 1
			metadataGet
			[[ $metadata ]] && break
		done
		[[ ! $metadata ]] && notify $icon Metadata 'Not available' && exit
		return
	fi
	if [[ $radioparadise ]]; then
		artist=$( stringEscape ${metadata[0]} )
		title=$( stringEscape ${metadata[1]} )
		album=$( stringEscape ${metadata[2]} )
		coverurl=${metadata[3]}
		countdown=${metadata[4]} # countdown
	else
		levels=$( jq .levels[0] <<< $data )
		position=$( jq .position <<< $levels )
		item=$( jq .items[$position] <<< $levels )
		step=$( jq .steps[$item] <<< $data )
		now=$( date +%s )
		end=$( jq .end <<< $step )
		countdown=$(( end - now ))
		artist=$( jq .authors <<< $step )
		title=$( jq .title <<< $step )
		album=$( jq .titreAlbum <<< $step )
		coverurl=$( jq .visual <<< $step )
		countdown=$( jq .visual <<< $step )
	fi
	
	if [[ ! $countdown ]]; then
		countdown=5
	elif [[ ${#metadata[@]} == 6 ]]; then
		countdown=$(( countdown - ${metadata[5]} )) # radiofrance
	fi
	if [[ $coverurl && ! -e $dirsystem/vumeter ]]; then
		name=$( tr -d ' \"`?/#&'"'" <<< $artist$title )
		coverart=/data/shm/webradio/$name.jpg
		curl -s $coverurl -o $dirshm/webradio/$name.jpg
	fi
	elapsed=$( mpcElapsed )
	data='{
  "Album"    : "'$album'"
, "Artist"   : "'$artist'"
, "coverart" : "'$coverart'"
, "elapsed"  : '$elapsed'
, "file"     : "'$file'"
, "icon"     : "'$icon'"
, "sampling" : "'$sampling'"
, "state"    : "play"
, "song"     : '$song'
, "station"  : "'$station'"
, "stream"   : true
, "Time"     : false
, "Title"    : "'$title'"
}'
	pushData mpdradio "$data"
	status=$( sed -e '/^{\|^}/ d' -e 's/^.."//; s/" *: /=/' <<< $data )
	status+='
timestamp='$( date +%s%3N )'
webradio=true
player="mpd"'
	[[ -e $dirsystem/scrobble ]] && cp -f $dirshm/status{,prev}
	echo "$status" > $dirshm/status
	$dirbash/status-push.sh statusradio & # for snapcast ssh - for: mpdoled, lcdchar, vumeter, snapclient(need to run in background)
	$dirbash/cmd.sh coverfileslimit
	# next fetch
	sleep $(( countdown + 5 )) # add 5s delay
	metadataGet
}

metadataGet
