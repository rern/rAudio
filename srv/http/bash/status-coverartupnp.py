#!/usr/bin/python3

import socket
import sys
import upnpp

device = socket.gethostname() +'-UPnP/AV'
srv = upnpp.findTypedService( device, 'avtransport', True )
if not srv: sys.exit() # AVTransport service not found
    
retdata = upnpp.runaction( srv, 'GetMediaInfo', ['0'] )
metadata = retdata[ 'CurrentURIMetaData' ]
if not metadata: sys.exit()

dirc = upnpp.UPnPDirContent()
dirc.parse( metadata )
if dirc.m_items.size() == 0: sys.exit()

mprops = dirc.m_items[0].m_props
if 'upnp:albumArtURI' in mprops: print( mprops['upnp:albumArtURI'] )
