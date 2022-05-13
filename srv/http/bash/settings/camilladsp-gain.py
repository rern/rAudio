#!/usr/bin/python

from camilladsp import CamillaConnection
import os.path
import sys

cdsp = CamillaConnection( '127.0.0.1', 1234 )
cdsp.connect()

file = '/srv/http/data/system/camillagain'
if len( sys.argv ) > 1: # set
    if os.path.exists( file ):
        with open( file, 'r' ) as f: gain = f.read()
    else:
        gain = 0
    cdsp.set_volume( float( gain ) )
else: # save
    gain = cdsp.get_volume()
    with open( file, 'w' ) as f: f.write( str( gain ) )
