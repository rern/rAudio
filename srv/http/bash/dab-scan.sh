#!/bin/bash

. /srv/http/bash/common.sh

LC_CTYPE=C # this is needed to consider the lowercase accented chars outside of "alnum"

dabscan=$( dab-scanner-rtlsdr -C 5A )
services=$( echo "$dabscan" | grep ^audioservice )
if [[ ! $services ]]; then
	pushstreamNotify 'DAB Radio' 'No stations found.' dabradio
	rm $dirshm/updatingdab
	exit
fi

MYNAME=$( hostname -f )
dirdabradio=$dirdata/dabradio
mkdir -p $dirdabradio/img
rm -f $dirdabradio/*

readarray -t services <<< "$services"
for service in "${services[@]}"; do
	readarray -d ';' -t field <<< $service
	service_name=$( echo ${field[1]} | xargs )
	service_chan=$( echo ${field[2]} | xargs )
	service_id=$( echo ${field[3]} | xargs )
	legal_nameU=${service_name//[^[:alnum:]]/_}
	legal_name=${legal_nameU,,} # rtsp-simple-server does not like all uppercase/number service names
	echo "\
$service_name
48 kHz 160 kbit/s
" > "$dirdabradio/rtsp:||$MYNAME|$legal_name"
	list+=$( cat << EOF
  $legal_name:
    runOnDemand: /srv/http/bash/dab-start.sh $service_id $service_chan \$RTSP_PORT \$RTSP_PATH
    runOnDemandRestart: yes
    runOnDemandStartTimeout: 15s
    runOnDemandCloseAfter: 3s
EOF
)
done

fileyml=/etc/rtsp-simple-server.yml
linepaths=$( sed -n '/^paths:/ =' $fileyml )
sed -i "$(( linepaths + 1 )),$ d" $fileyml
echo "$list" >> $fileyml

chown -R http:http $dirdabradio
count=$( ls -1 $dirdabradio | grep -v ^img$ | wc -l )
sed -i 's/\("dabradio": \).*/\1'$count',/' $dirmpd/counts
pushstream mpdupdate "$( cat $dirmpd/counts )"
rm $dirshm/updatingdab
