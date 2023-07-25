#!/usr/bin/python

import json
import os
import os.path
import sys
from websocket import create_connection

dircamilladsp = '/srv/http/data/camilladsp/'
dirshm        = '/srv/http/data/shm/'

ws = create_connection( 'ws://127.0.0.1:1234' )

def getValue( cmd ):
    ws.send( json.dumps( cmd ) )
    data  = json.loads( ws.recv() )
    return data[ cmd ][ 'value' ]
    
def setValue( cmd, val ):
    ws.send( json.dumps( { cmd: val } ) )

if len( sys.argv ) > 1: # set / save volume on start / stop
    cmd = sys.argv[ 1 ]
    if cmd == 'filters' or cmd == 'pipeline':
        config = json.loads( getValue( 'GetConfigJson' ) )
        target = sys.argv[ 2 ]
        if target == 'all': # flow chart
            from camilladsp_plot.plot_pipeline import plot_pipeline
            buffer = plot_pipeline( config, toimage=True )
            file = dirshm +'pipeline.svg'
            with open( file, 'wb' ) as f: f.write( buffer.getbuffer() )
            with open( file, 'r' ) as f: print( f.read() )
        else:
            from camilladsp_plot import eval_filter, eval_filterstep
            if cmd == 'filters':
                data = eval_filter( config[ 'filters' ][ target ] )
            else: # pipeline
                data  = eval_filterstep( config, int( target ) )
            print( json.dumps( data ) )
            
    filevolume = '/srv/http/data/system/camilla-volume'
    if cmd == 'volumestart':
        with open( filevolume, 'r' ) as f: volume = f.read()
        setValue( 'SetVolume', float( volume ) )
    else: # volumesave
        volume = getValue( 'GetVolume' )
        with open( filevolume, 'w' ) as f: f.write( str( volume ) )
        
    ws.close()
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
    , 'lsconf'     : sorted( os.listdir( dircamilladsp +'configs' ) )
    , 'fileconf'   : os.path.basename( getValue( 'GetConfigName' ) )
}

print( json.dumps( value ) )

ws.close()
