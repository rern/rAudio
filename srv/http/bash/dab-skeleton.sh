#!/bin/bash

. /srv/http/bash/common.sh

LC_CTYPE=C # this is needed to consider the lowercase accented chars outside of "alnum"

dabscan=$( dab-scanner-rtlsdr -C 5A )
services=$( echo "$dabscan" | grep ^audioservice )
if [[ ! $services ]]; then
	pushstreamNotify 'DAB Radio' 'No stations found.' dab
	rm $dirshm/updatingdab
	exit
fi

MYNAME=$( hostname -f )
dirdabradio=$dirdata/dabradio
mkdir -p $dirdabradio
rm -f $dirdabradio/*
fileyml=/etc/rtsp-simple-server.yml
linepaths=$( sed -n '/^paths:/ =' $fileyml )
sed -i "$(( linepaths + 1 )),$ d" $fileyml

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
		legal_name=${legal_nameU,,} # rtsp-simple-server does not like all uppercase/number service names
		echo "\
$service_name
48 kHz 160 kbit/s
" > "$dirdabradio/rtsp:||$MYNAME|R$legal_name"
		cat << EOT >> $fileyml
  $legal_name:
    runOnDemand: /srv/http/bash/dab-start.sh $service_id $service_chan  \$RTSP_PORT \$RTSP_PATH
    runOnDemandRestart: yes
    runOnDemandStartTimeout: 15s
    runOnDemandCloseAfter: 3s
EOT
	fi
done

chown -R http:http $dirdabradio
count=$( ls -1 $dirdabradio | wc -l )
sed -i '/"webradio":/ i\  "dabradio": '$count',' $dirmpd/counts
pushstream mpdupdate "$( cat $dirmpd/counts )"
rm $dirshm/updatingdab
