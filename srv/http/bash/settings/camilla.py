#!/usr/bin/python

import json
import os
import os.path
import sys
from websocket import create_connection

ws = create_connection( 'ws://127.0.0.1:1234' )

def getValue( cmd ):
    ws.send( json.dumps( cmd ) )
    data  = json.loads( ws.recv() )
    return data[ cmd ][ 'value' ]
    
def setValue( cmd, val ):
    ws.send( json.dumps( { cmd: val } ) )

if len( sys.argv ) > 1: # set / save volume on start / stop
    cmd = sys.argv[ 1 ]
    if cmd == 'save':
        config = getValue( 'GetConfig' )
        file   = getValue( 'GetConfigName' )
        with open( file, 'w' ) as f: f.write( config )
    elif cmd == 'filters' or cmd == 'pipeline':
        config = json.loads( getValue( 'GetConfigJson' ) )
        target = sys.argv[ 2 ]
        if cmd == 'filters':
            from camilladsp_plot import eval_filter
            data = eval_filter( config[ 'filters' ][ target ] )
        else: # pipeline
            from camilladsp_plot import eval_filterstep
            data  = eval_filterstep( config, int( target ) )
        print( json.dumps( data ) )
        
    ws.close()
    sys.exit()

status     = ''
for k in [ 'GetState', 'GetCaptureRate', 'GetRateAdjust', 'GetClippedSamples', 'GetBufferLevel' ]:
    status += str( getValue( k ) ) +'<br>'
    
config     = json.loads( getValue( 'GetConfigJson' ) )
devices    = config[ 'devices' ]
dircamilla = '/srv/http/data/camilladsp/'

value  = {
      'page'               : 'camilla'
    , 'config'             : config
    , 'devicetype'         : getValue( 'GetSupportedDeviceTypes' )
    , 'volume'             : getValue( 'GetVolume' )
    , 'mute'               : getValue( 'GetMute' )
    , 'status'             : status
    , 'lscoef'             : sorted( os.listdir( dircamilla +'coeffs' ) )
    , 'lsconf'             : sorted( os.listdir( dircamilla +'configs' ) )
    , 'fileconf'           : os.path.basename( getValue( 'GetConfigName' ) )
    , 'enable_rate_adjust' : devices[ 'enable_rate_adjust' ]
    , 'enable_resampling'  : devices[ 'enable_resampling' ]
    , 'capture_samplerate' : devices[ 'capture_samplerate' ]
}

print( json.dumps( value ) )

ws.close()
