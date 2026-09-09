#!/bin/bash

# run by status  - systemctl start radio

. /srv/http/bash/common.sh

touch $dirshm/radio

file=$( mpc current -f %file% )
basename=$( basename $file )
id=${basename/-*} # ID-...
[[ $id == francemusique* && $id != francemusique ]] && id=${id:13} # francemusiqueID

case $id in
	beyond ) id=5;;
	flac )   id=0;;
	global ) id=3;;
	mellow ) id=1;;
	rock )   id=2;;
#	x )      id=?;;
#	y )      id=?;;
	fip )           id=7;;  # FIP                             FIP
	fipelectro )    id=74;; # Electro                         FIP_ELECTRO
	fipgroove )     id=66;; # Groove                          FIP_GROOVE
	fiphiphop )     id=95;; # Hip-Hop                         FIP_HIP_HOP ***openapi
	fipjazz )       id=65;; # Jazz                            FIP_JAZZ
	fipmetal )      id=77;; # Metal                           FIP_METAL
	fipnouveautes ) id=70;; # Nouveautés                      FIP_NOUVEAUTES
	fippop )        id=78;; # Pop                             FIP_POP
	fipreggae )     id=71;; # Reggae                          FIP_REGGAE
	fiprock )       id=64;; # Rock                            FIP_ROCK
	fipworld )      id=69;; # Monde                           FIP_WORLD
	
	francemusique )       id=4;;   # France Musique           FRANCEMUSIQUE
	baroque )             id=408;; # La Baroque               FRANCEMUSIQUE_LA_BAROQUE
	classiqueplus )       id=402;; # Classique Plus           FRANCEMUSIQUE_CLASSIQUE_PLUS
	concertsradiofrance ) id=403;; # Concerts Radio France    FRANCEMUSIQUE_CONCERT_RF
	easyclassique )       id=401;; # Classique Easy           FRANCEMUSIQUE_CLASSIQUE_EASY
	labo )                id=407;; # Musique de Films         FRANCEMUSIQUE_LA_BO
	lacontemporaine )     id=406;; # La Contemporaine         FRANCEMUSIQUE_LA_CONTEMPORAINE
	lajazz )              id=405;; # La Jazz                  FRANCEMUSIQUE_LA_JAZZ
	ocoramonde )          id=404;; # Ocora Musiques du Monde  FRANCEMUSIQUE_OCORA_MONDE
	opera )               id=409;; # Opéra                    FRANCEMUSIQUE_OPERA
#	pianozen )            id=410;; # Piano Zen                FRANCEMUSIQUE_PIANO_ZEN ***openapi
esac

if [[ $id < 4 || $id == 5 ]]; then
	radioparadise=1
	icon=radioparadise
	FN_JSON=radioParadise.json
	FN_STATUS=radioParadise.status
else
	icon=radiofrance
	FN_JSON=radioFrance.json
	FN_STATUS=radioFrance.status
	if [[ $id == 95 ]]; then # openapi: only needed by hiphop (no coverart for openapi)
		FN_JSON+=.hiphop
		FN_STATUS+=.hiphop
	fi
fi

radioFrance.json() {
	curl -sGk -m 5 https://api.radiofrance.fr/livemeta/pull/$id
}
radioFrance.status() {
	jq '.levels[0]                as $level
		| $level.position         as $position
		| $level.items[$position] as $item
		| .steps[$item]           // empty
		| {
			Album     : (.titreAlbum? // ""),
			Artist    : (.authors?    // (.composers? // "")),
			countdown : ((.end?       // now) - now | round),
			coverurl  : (.visual?     // ""),
			Title     : (.title?      // "")
		  }
		' <<< $JSON
}
radioFrance.json.hiphop() {
	curl -s 'https://openapi.radiofrance.fr/v1/graphql' \
		-H 'Accept-Encoding: gzip, deflate, br' \
		-H 'Content-Type: application/json' \
		-H 'Accept: application/json' \
		-H 'Connection: keep-alive' \
		-H 'DNT: 1' \
		-H 'Origin: https://openapi.radiofrance.fr' \
		-H "x-token: 0390600a-5407-4e86-b439-24e5d48427dc" \
		--compressed \
		--data-binary '{ "query": "{ live( station: FIP_HIP_HOP ) { song { end track { title albumTitle mainArtists } } } }" }' \
			| jq .data.live.song
}
radioFrance.status.hiphop() {
	jq '.track as $track
		| {
			Album     : ($track.albumTitle  // ""),
			Artist    : ($track.mainArtists // [] | join(", ")),
			countdown : ((.end?             // now) - now | round),
			coverurl  : "",
			Title     : ($track.title       // "")
		  }
		' <<< $JSON
}
radioParadise.json() {
	curl -sGk -m 5 --data "chan=$id" https://api.radioparadise.com/api/now_playing
}
radioParadise.status() {
	jq '{
			Album     : (.album?  // ""),
			Artist    : (.artist? // ""),
			countdown : ((.time?  // 0) | round ),
			coverurl  : (.cover?  // ""),
			Title     : (.title?  // "")
		}' <<< $JSON
}
metadataGet() {
	sleep $1
	JSON=$( $FN_JSON )
	if ! jq -e 'type == "object" and .error == null' <<< $JSON &>/dev/null; then
		(( i++ ))
		if [[ $i == 1 ]]; then
			notify "$icon blink" Metadata 'Retry ...'
		elif [[ $i == 10 ]]; then
			notify $icon Metadata 'Not available'
			systemctl stop radio
			exit
# ------------------------------------------------------------------------------
		fi
		metadataGet 1
		return
# ..............................................................................
	fi
	STATUS=$( $FN_STATUS )
	keys=.Artist,.Title,.Album
	readarray -t meta < <( jq -r $keys,.coverurl,.countdown <<< $STATUS )
	[[ ${meta[@]:0:3} == $( jq -jr $keys $dirshm/status.json ) ]] && metadataGet 5 && return
# ..............................................................................
	if [[ ! -e $dirsystem/vumeter ]]; then
		coverurl=${meta[3]}
		artist=${meta[0]}
		if [[ $coverurl ]]; then
			title=${meta[1]}
			name=$( alphaNumeric $artist$title )
			ext=${coverurl/*.}
			coverart=$dirshm/online/$name.$ext
			curl -s $coverurl -o $coverart
		else
			album=${meta[2]}
			name=$( alphaNumeric $artist$album )
			coverart=$( compgen -G $dirshm/online/$name.* )
		fi
	else
		coverart=
	fi
	
	STATUS=$( sed -E '/"countdown":|"coverurl":|^}/ d' <<< $STATUS )
	STATUS+='
, "coverart"  : "'${coverart:9}'"
, "elapsed"   : '$( mpcElapsed webradio )'
, "file"      : "'$file'"
, "pllength"  : '$( mpc status %length% )'
, "play"      : true
, "state"     : "play"
, "station"   : "'$( sed -n "\|^$file| {s|.*/||; p}" $dirmpd/radio )'"
, "Time"      : false
, "timestamp" : '$( date +%s%3N )'
, "webradio"  : true
}'
	$dirbash/status-push.sh "$STATUS"
	countdown=${meta[4]}
	metadataGet $(( countdown + 5 )) # add 5s delay
}

metadataGet 0
