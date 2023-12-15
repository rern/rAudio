#!/usr/bin/python

import json
import sys

argvL = len( sys.argv )
# graph
if argvL > 2:
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
    