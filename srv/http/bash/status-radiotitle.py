#!/usr/bin/python

import sys
import urllib.request

request   = urllib.request.Request( sys.argv[ 1 ], headers={ 'Icy-MetaData': 1 } )
response  = urllib.request.urlopen( request )
metaint   = response.headers.get( 'icy-metaint' )
if metaint is None: sys.exit()
# --------------------------------------------------------------------
buffer    = response.read( int( metaint ) + 255 )
string    = buffer.decode( 'utf-8', errors='ignore' ) # ...StreamTitle='TITLE';StreamUrl='URL';StreamArtwork='ARTWORK';...
i_title   = string.find( "StreamTitle='" )            # ...i           ^     i
title     = string[ i_title: ]
i_end     = title.find( "';" ) + 1
print( title[ 13:i_end ].strip() )

# i_artwork = title.find( 'StreamArtwork=' )
# artwork   = title[ i_artwork: ]
# i_end     = i_artwork + artwork.find( "';" ) + 1
# metadata  = title[ :i_end ].replace( ';', '\n' )
# print( '\n'+ metadata )
