#!/usr/bin/python3

import socket
import upnpp

device = socket.gethostname() +'-UPnP/AV'
srv    = upnpp.findTypedService( device, 'avtransport', True ) # AVTransport service
if srv:
    retdata  = upnpp.runaction( srv, 'GetMediaInfo', ['0'] )
    metadata = retdata[ 'CurrentURIMetaData' ]
    if metadata:
        dirc = upnpp.UPnPDirContent()
        dirc.parse( metadata )
        if dirc.m_items.size():
            mprops = dirc.m_items[0].m_props
            if 'upnp:albumArtURI' in mprops: print( mprops['upnp:albumArtURI'] )
