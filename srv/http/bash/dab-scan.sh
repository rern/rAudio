#!/bin/bash

. /srv/http/bash/common.sh

dabscan=$( dab-scanner-rtlsdr -C 5A )
services=$( echo "$dabscan" | grep '^Ensemble\|^audioservice' )
if ! grep -q ^audioservice <<< "$services"; then
	pushstreamNotify 'DAB Radio' 'No id_channels found.' dabradio
	rm $dirshm/updatingdab
	exit
fi

dirdabradio=$dirdata/dabradio
mkdir -p $dirdabradio/img
rm -f $dirdabradio/* 2> /dev/null

pathurl="$dirdabradio/rtsp:||$( hostname -f )"
readarray -t services <<< "$services"
for service in "${services[@]}"; do
	if [[ ${service:0:8} == Ensemble ]]; then
		station=$( echo ${service/;*} | cut -d' ' -f2- | xargs )
		continue
	fi
	
	readarray -d ';' -t field <<< $service
	name=$( echo ${field[1]} | xargs )
	channel=$( echo ${field[2]} )
	id=$( echo ${field[3]} )
	channel_id=${channel,,}_${id,,}
	echo "\
$station - $name
48 kHz 160 kbit/s
" > "$pathurl|$channel_id"
	list+="\
  $channel_id:
    runOnDemand: /srv/http/bash/dab-start.sh $id $channel \$RTSP_PORT \$RTSP_PATH
    runOnDemandRestart: yes
    runOnDemandStartTimeout: 15s
    runOnDemandCloseAfter: 3s
"
done

fileyml=/etc/rtsp-simple-server.yml
linepaths=$( sed -n '/^paths:/ =' $fileyml )
sed -i "$(( linepaths + 1 )),$ d" $fileyml
echo "$list" >> $fileyml

chown -R http:http $dirdabradio
count=$( ls -1p $dirdata/dabradio | grep -v /$ | wc -l )
sed -i 's/\("dabradio": \).*/\1'$count',/' $dirmpd/counts
pushstream mpdupdate "$( cat $dirmpd/counts )"
rm $dirshm/updatingdab
