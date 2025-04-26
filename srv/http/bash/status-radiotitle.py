#!/usr/bin/python

import sys
import urllib.request

request  = urllib.request.Request( sys.argv[ 1 ], headers={ 'Icy-MetaData': 1 } )
response = urllib.request.urlopen( request )
metaint  = response.headers.get( 'icy-metaint' )
if metaint is None:
    print( -1 )
    sys.exit()
# --------------------------------------------------------------------
buffer        = response.read( int( metaint ) + 255 )
string        = ''
for byte in buffer: string += chr( int( byte ) )
title_pos     = string.find( 'StreamTitle=' )
title_content = string[ title_pos + 13: ]
semicolon_pos = title_content.find( ';' )
title         = title_content[ :semicolon_pos - 1 ]
print( title )
