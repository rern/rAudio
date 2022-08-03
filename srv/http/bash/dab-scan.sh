#!/bin/bash

. /srv/http/bash/common.sh

dabscan=$( dab-scanner-rtlsdr -C 5A )
services=$( echo "$dabscan" | grep ^audioservice )
if [[ ! $services ]]; then
	pushstreamNotify 'DAB Radio' 'No stations found.' dabradio
	rm $dirshm/updatingdab
	exit
fi

dirdabradio=$dirdata/dabradio
mkdir -p $dirdabradio/img
rm -f $dirdabradio/* 2> /dev/null

pathurl="$dirdabradio/rtsp:||$( hostname -f )"
readarray -t services <<< "$services"
for service in "${services[@]}"; do
	readarray -d ';' -t field <<< $service
	name=$( echo ${field[1]} | xargs )
	channel=$( echo ${field[2]} )
	id=$( echo ${field[3]} )
	station=${id,,}_${channel,,}
	echo "\
$name
48 kHz 160 kbit/s
" > "$pathurl|$station"
	list+="\
  $station:
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
