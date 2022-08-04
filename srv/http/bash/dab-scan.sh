#!/bin/bash

. /srv/http/bash/common.sh

dabscan=$( dab-scanner-rtlsdr -C 5A )
services=$( egrep '^Ensemble|^audioservice' <<< "$dabscan" )
if ! grep -q ^audioservice <<< "$services"; then
	pushstreamNotify 'DAB Radio' 'No stations found.' dabradio
	rm $dirshm/updatingdab
	exit
fi

dirdabradio=$dirdata/dabradio
mv $dirdabradio/img $dirshm &> /dev/null
rm -rf $dirdabradio
mkdir -p $dirdabradio/img
mv $dirshm/img $dirdabradio &> /dev/null

host=$( hostname -f )
readarray -t services <<< "$services"
for service in "${services[@]}"; do
	if [[ ${service:0:8} == Ensemble ]]; then
		ensemble=$( cut -d' ' -f2- <<< ${service/;*} | xargs )
		mkdir "$dirdabradio/$ensemble"
		continue
	fi
	
	readarray -d ';' -t field <<< $service
	name=$( echo ${field[1]} | xargs )
	channel=${field[2]}
	id=${field[3]}
	channel_id=${channel,,}_${id,,}
	echo "\
$name
48 kHz 160 kbit/s
" > "$dirdabradio/$ensemble/rtsp:||$host|$channel_id"
	list+="\
  $channel_id:
    runOnDemand: /srv/http/bash/dab-start.sh $id $channel \$RTSP_PORT \$RTSP_PATH
    runOnDemandRestart: yes
    runOnDemandStartTimeout: 15s
    runOnDemandCloseAfter: 3s
"
done

fileyml=/etc/rtsp-simple-server/rtsp-simple-server.yml
sed -i '1,/^paths:/ !d' $fileyml
echo "$list" >> $fileyml

chown -R http:http $dirdabradio
dabradio=$( find -L $dirdata/dabradio -type f ! -path '*/img/*' | wc -l )
sed -i -E 's/("dabradio": ).*/\1'$dabradio',/' $dirmpd/counts
pushstream mpdupdate "$( cat $dirmpd/counts )"
rm $dirshm/updatingdab
