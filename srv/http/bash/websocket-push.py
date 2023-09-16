#!/usr/bin/env python

import sys
from websocket import create_connection

ip = len( sys.argv ) > 2 and sys.argv[ 2 ] or '127.0.0.1'

ws = create_connection( 'ws://'+ ip +':8080' )
ws.send( sys.argv[ 1 ] )
ws.close()
