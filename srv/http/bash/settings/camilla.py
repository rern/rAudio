#!/usr/bin/python

import json
import sys

args = json.loads( sys.argv[ 1 ].replace( '\\"', '"' ) )

if 'index' in args: # pipeline
    from camilladsp_plot import eval_filterstep
    data = eval_filterstep( args, args[ 'index' ] )
else:               # filter
    from camilladsp_plot import eval_filter
    data = eval_filter( args )
    
print( json.dumps( data ) )
    