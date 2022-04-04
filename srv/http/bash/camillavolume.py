#!/usr/bin/python

from camilladsp import CamillaConnection
import sys

cdsp = CamillaConnection("127.0.0.1", 1234)
cdsp.connect()

cdsp.set_volume( sys.argv[ 1 ] )
