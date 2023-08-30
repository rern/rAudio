#!/usr/bin/python

import json
import sys

argvL = len( sys.argv )

if argvL > 2: # graph
    cmd    = sys.argv[ 1 ]
    values = json.loads( sys.argv[ 2 ] )
    if cmd == 'filters':
        from camilladsp_plot import eval_filter
        data = eval_filter( values )
    elif cmd == 'pipeline':
        from camilladsp_plot import eval_filterstep
        data = eval_filterstep( values, int( sys.argv[ 3 ] ) )
    print( json.dumps( data ) )
    sys.exit()
    

from websocket import create_connection

try:
    ws = create_connection( 'ws://127.0.0.1:1234' )
except:
    sys.exit()

def getValue( cmd ):
    ws.send( json.dumps( cmd ) )
    data = json.loads( ws.recv() )
    return data[ cmd ][ 'value' ]
    
if argvL > 1: # save
    config = getValue( 'GetConfig' )
    file   = getValue( 'GetConfigName' )
    with open( file, 'w' ) as f: f.write( config )
    
    ws.close()
    sys.exit()

import os
import os.path

status     = {}
for k in [ 'GetState', 'GetCaptureRate', 'GetBufferLevel', 'GetClippedSamples', 'GetRateAdjust' ]:
    status[ k ] = getValue( k )
    
config     = json.loads( getValue( 'GetConfigJson' ) )
devicetype = getValue( 'GetSupportedDeviceTypes' )
dircamilla = '/srv/http/data/camilladsp/'
value      = {
      'page'       : 'camilla'
    , 'config'     : config
    , 'devicetype' : { 'capture': sorted( devicetype[ 1 ] ), 'playback': sorted( devicetype[ 0 ] ) }
    , 'status'     : status
    , 'configname' : os.path.basename( getValue( 'GetConfigName' ) )
    , 'lscoef'     : sorted( os.listdir( dircamilla +'coeffs' ) )
    , 'lsconf'     : sorted( os.listdir( dircamilla +'configs' ) )
    , 'lsconfbt'   : sorted( os.listdir( dircamilla +'configs-bt' ) )
}
devices    = config[ 'devices' ]
for k in [ 'enable_rate_adjust', 'enable_resampling', 'stop_on_rate_change' ]:
    value[ k ] = devices[ k ]

print( json.dumps( value ) )

ws.close()
