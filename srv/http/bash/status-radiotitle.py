#!/usr/bin/python

import sys
import urllib.request

request  = urllib.request.Request( sys.argv[ 1 ], headers={ 'Icy-MetaData': 1 } )
response = urllib.request.urlopen( request )
metaint  = response.headers.get( 'icy-metaint' )
if metaint is None: sys.exit()
# --------------------------------------------------------------------
buffer   = response.read( int( metaint ) + 255 )
string   = ''
for byte in buffer: string += chr( int( byte ) )
start    = string.find( 'StreamTitle=' )
title    = string[ start: ]
end      = title.find( "';" )
title    = title[ 13:end ]
print( title )
