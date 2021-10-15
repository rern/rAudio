#!/bin/bash

dirsystem=/srv/http/data/system
file=$dirsystem/relays.conf
if [[ -e $file ]]; then
	. $file
	data='
  "page"    : "relays"
, "pin"     : '$pin'
, "name"    : '$name'
, "on"      : [ '$( echo ${on[@]} | tr ' ' , )' ]
, "ond"     : [ '$( echo ${ond[@]} | tr ' ' , )' ]
, "off"     : [ '$( echo ${off[@]} | tr ' ' , )' ]
, "offd"    : [ '$( echo ${offd[@]} | tr ' ' , )' ]
, "timer"   : '$timer'
, "enabled" : '$( [[ -e $dirsystem/relays ]] && echo true || echo false )
else
	data='
  "page"    : "relays"
, "pin"     : [ 11, 13, 15, 16 ]
, "name"    : [ "DAC", "PreAmp", "Amp", "Subwoofer" ]
, "on"      : [ 11, 13, 15, 16 ]
, "off"     : [ 16, 15, 13, 11 ]
, "ond"     : [ 2, 2, 2 ]
, "offd"    : [ 2, 2, 2 ]
, "timer"   : 5
, "enabled" : false'
fi

echo "{$data}"
