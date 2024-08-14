#!/bin/bash

. /srv/http/bash/common.sh

mpc idleloop | while read changed; do
	case $changed in
		mixer ) # for upmpdcli
			playerActive upnp && volumeGet push
			;;
		playlist )
			if [[ $( mpc status %consume% ) == on ]]; then
				if [[ $( mpc status %length% ) == 0 ]]; then
					data='{ "blank": true }'
				else
					sec=$( sed -n '1 {s/.*data-time="//; s/".*//; p}' $dirshm/playlist )
					. <( sed -E 's/^\{|}$|"//g; s/:/=/g; s/,/\n/g'  $dirshm/playlistcount )
					echo '{"radio":'$radio',"song":'$(( song - 1 ))',"time":'$(( time - sec ))',"upnp":'$upnp'}' > $dirshm/playlistcount
					sed -i 1d $dirshm/playlist
					data=$( php /srv/http/playlist.php current )
				fi
				pushData playlist $data
			fi
			;;
		player )
			if [[ ! -e $dirshm/radio && ! -e $dirshm/skip && ! -e $dirshm/cdstart ]]; then
				$dirbash/status-push.sh & # need to run in background for snapcast ssh
			fi
			;;
		update )
			if [[ ! -e $dirshm/listing ]]; then
				! mpc | grep -q -m1 '^Updating' && $dirbash/cmd-list.sh
			fi
			;;
	esac
done
