#!/bin/bash

. /srv/http/bash/common.sh

dabscan=$( dab-scanner-rtlsdr -C 5A )
services=$( echo "$dabscan" | grep ^audioservice )
if [[ ! $services ]]; then
	pushstreamNotify 'DAB Radio' 'No stations found.' dab
	rm $dirshm/updatingdab
	exit
fi

mkdir -p $dirwebradios/DAB

LC_CTYPE=C # this is needed to consider the lowercase accented chars outside of "alnum"
BASE_YML="$dirbash/dab/rtsp-simple-server.yml"
NEW_YML="/etc/rtsp-simple-server/rtsp-simple-server.yml"
MYNAME=$( hostname -f )

cp $BASE_YML $NEW_YML
rm -f "$dirwebradios/DAB/rtsp:||$MYNAME:8554"*
rm -f "${dirwebradios}img/rtsp:||$MYNAME:8554"*

trim() {
	local var="$*"
	var="${var%"${var##*[![:space:]]}"}"   
	printf '%s' "$var"
}

readarray -t services <<< "$services"
for service in "${services[@]}"; do
	if grep -q "^audioservice" <<< $service; then
		readarray -d ';' -t field <<< $service
		service_name=$(trim "${field[1]}")
		service_chan=$(trim "${field[2]}")
		service_id=$(trim "${field[3]}")
		legal_nameU=${service_name//[^[:alnum:]]/_}
		legal_name=${legal_nameU,,} # rtsp-simple-server does not like all uppercase service names neither all numbers names
		[[ "$legal_name" == "$legal_name" ]]  && legal_name=R${legal_name}
		cat <<EOT >>$NEW_YML
  $legal_name:
    runOnDemand: /srv/http/bash/dab/dabstart.sh $service_id $service_chan  \$RTSP_PORT \$RTSP_PATH
    runOnDemandRestart: yes
    runOnDemandStartTimeout: 15s
    runOnDemandCloseAfter: 3s
EOT

		echo "$service_name" > "$dirwebradios/DAB/rtsp:||${MYNAME}:8554|$legal_name"
		ln -s ${dirwebradios}img/{dablogo,"rtsp:||$MYNAME:8554|$legal_name"}.jpg
		ln -s ${dirwebradios}img/{dablogo,"rtsp:||$MYNAME:8554|$legal_name"}-thumb.jpg
	fi
done

chown -R http:http $dirwebradios*
count=$( find -L $dirwebradios -type f | wc -l )
sed -i 's/\("webradio": \).*/\1'$count'/' $dirmpd/counts
pushstream webradio $count
rm $dirshm/updatingdab
