#!/bin/bash

. /srv/http/bash/common.sh
file=$dirsystem/relays.conf
. $file
data='
  "page"    : "relays"
, "pin"     : '$pin'
, "name"    : '$name'
, "on"      : [ '$( tr ' ' , <<< ${on[@]} )' ]
, "ond"     : [ '$( tr ' ' , <<< ${ond[@]} )' ]
, "off"     : [ '$( tr ' ' , <<< ${off[@]} )' ]
, "offd"    : [ '$( tr ' ' , <<< ${offd[@]} )' ]
, "timer"   : '$timer'
, "enabled" : '$( [[ -e $dirsystem/relays ]] && echo true || echo false )

data2json "$data" $1
