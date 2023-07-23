#!/usr/bin/python

import json
import os
import os.path
import sys
from websocket import create_connection

dircamilladsp = '/srv/http/data/camilladsp/'

ws = create_connection( 'ws://127.0.0.1:1234' )

def getValue( cmd ):
    ws.send( json.dumps( cmd ) )
    data  = json.loads( ws.recv() )
    return data[ cmd ][ 'value' ]
    
def setValue( cmd, val ):
    ws.send( json.dumps( { cmd: val } ) )

if len( sys.argv ) > 1: # set / save volume on start / stop
    filevolume = '/srv/http/data/system/camilla-volume'
    if sys.argv[ 1 ] == 'volumestart':
        with open( filevolume, 'r' ) as f:
            volume = f.read()
        setValue( 'SetVolume', float( volume ) )
    else:
        volume = getValue( 'GetVolume' )
        with open( filevolume, 'w' ) as f:
            f.write( str( volume ) )
    sys.exit()

status = ''
for k in [ 'GetState', 'GetCaptureRate', 'GetRateAdjust', 'GetClippedSamples', 'GetBufferLevel' ]:
    status += str( getValue( k ) ) +'<br>'
    
value = {
      'page'       : 'camilla'
    , 'config'     : json.loads( getValue( 'GetConfigJson' ) )
    , 'devicetype' : getValue( 'GetSupportedDeviceTypes' )
    , 'volume'     : getValue( 'GetVolume' )
    , 'mute'       : getValue( 'GetMute' )
    , 'status'     : status
    , 'lscoef'     : sorted( os.listdir( dircamilladsp +'coeffs' ) )
    , 'lsconf'     : sorted( os.listdir( dircamilladsp +'/configs' ) )
    , 'fileconf'   : os.path.basename( getValue( 'GetConfigName' ) )
}

print( json.dumps( value ) )

ws.close()
