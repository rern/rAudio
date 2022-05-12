#!/usr/bin/python


from websocket import create_connection
import json
import os

ws = create_connection( 'ws://127.0.0.1:1234' )
ws.send( json.dumps( 'GetVolume' ) )
datajson = json.loads( ws.recv() )
gain = str( datajson[ 'GetVolume' ][ 'value' ] )
os.system( 'sed -i "s/--gain=.*/--gain='+ gain +'/" /etc/systemd/system/camilladsp.service.d/override.conf' )
os.system( 'systemctl daemon-reload' )
