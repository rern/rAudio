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

def getValue( cmd ):
    ws.send( json.dumps( cmd ) )
    data = json.loads( ws.recv() )
    return data[ cmd ][ 'value' ]
    
ws     = create_connection( 'ws://127.0.0.1:1234' )
config = getValue( 'GetConfig' )
file   = getValue( 'GetConfigName' )
with open( file, 'w' ) as f: f.write( config )
ws.close()
