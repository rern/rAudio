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
	FN_JSON=JSON.radioParadise
	FN_STATUS=STATUS.radioParadise
else
	icon=radiofrance
	FN_JSON=JSON.radioFrance
	FN_STATUS=STATUS.radioFrance
	if [[ $id == 95 ]]; then # openapi: only needed by hiphop (no coverart for openapi)
		FN_JSON+=.hiphop
		FN_STATUS+=.hiphop
	fi
fi

JSON.radioFrance() {
	curl -sGk -m 5 https://api.radiofrance.fr/livemeta/pull/$id
}
JSON.radioFrance.hiphop() {
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
JSON.radioParadise() {
	curl -sGk -m 5 --data "chan=$id" https://api.radioparadise.com/api/now_playing
}
STATUS.radioFrance() {
	jq '.levels[0]                as $level
		| $level.position         as $position
		| $level.items[$position] as $item
		| .steps[$item]           // empty
		| {
			Album    : (.titreAlbum? // ""),
			Artist   : (.authors?    // (.composers? // "")),
			coverart : (.visual?     // ""),
			timeleft : ((.end?       // now) - now | round),
			Title    : (.title?      // "")
		  }
		' <<< $JSON
}
STATUS.radioFrance.hiphop() {
	jq '{
			Album    : (.track.albumTitle  // ""),
			Artist   : (.track.mainArtists // [] | join(", ")),
			coverart : "",
			timeleft : ((.end?             // now) - now | round),
			Title    : (.track.title       // "")
		  }
		' <<< $JSON
}
STATUS.radioParadise() {
	jq '{
			Album    : (.album?  // ""),
			Artist   : (.artist? // ""),
			coverart : (.cover?  // ""),
			timeleft : ((.time?  // 0) | round ),
			Title    : (.title?  // "")
		}' <<< $JSON
}
metaData() {
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
		metaData 1
		return
# ..............................................................................
	fi
	STATUS=$( $FN_STATUS )
	keys=.Artist,.Title,.Album
	[[ $( jq -jr $keys <<< $STATUS ) == $( jq -jr $keys $dirshm/status.json ) ]] && metaData 5 && return
# ..............................................................................
	timeleft=$( jq .timeleft <<< $STATUS )
	STATUS=$( sed -E '/"timeleft":|^}/ d' <<< $STATUS )
	STATUS+='
, "elapsed"   : '$( mpcElapsed webradio )'
, "file"      : "'$file'"
, "pllength"  : '$( mpc status %length% )'
, "play"      : true
, "state"     : "play"
, "station"   : "'$( sed -n "\|^$file| {s|.*/||; p}" $dirmpd/radio )'"
, "Time"      : 0
, "timestamp" : '$( date +%s%3N )'
, "webradio"  : true
}'
	$dirbash/status-push.sh "$STATUS"
	timeleft=${meta[4]}
	metaData $(( timeleft + 5 )) # add 5s delay
}

metaData 0
