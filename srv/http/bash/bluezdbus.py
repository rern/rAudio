#!/usr/bin/python

# RPi as renderer - bluezdbus.service > this:
#    - init:        set player-bluetooth
#    - start:       cmd.sh bluetoothplayer
#    - connect:     cmd.sh bluetoothplayerconnect
#    - status:      dbus emits events and data
#    - disconnect : cmd.sh bluetoothplayerconnect

import dbus
import dbus.service
import dbus.mainloop.glib
from gi.repository import GLib
import os
import requests
import subprocess

AGENT_INTERFACE = 'org.bluez.Agent1'
path = '/test/autoagent'

def pushstream( data ):
    requests.post( 'http://127.0.0.1/pub?id=mpdplayer', json=data )

def property_changed( interface, changed, invalidated, path ):
    if not os.path.isfile( '/srv/http/data/shm/player-bluetooth' ): return
    
    cmdsh = '/srv/http/bash/cmd.sh'
    for name, value in changed.items():
        # Player    : /org/bluez/hci0/dev_XX_XX_XX_XX_XX_XX/playerX (sink not emit this data)
        # Connected : 1 | 0                                         (1 emitted after Player)
        # Position  : elapsed
        # State     : active | idle | pending
        # Status    : paused | playing | stopped
        # Track     : metadata
        # Type      : dest playerX
        if name == 'Player':
            subprocess.Popen( [ cmdsh, 'bluetoothplayer\n'+ value ] )
        elif name == 'Connected':
            subprocess.Popen( [ cmdsh, 'bluetoothplayerconnect\n'+ str( value ) ] )
        elif name == 'Position':
            pushstream( { "elapsed" : value == 0 and 0 or int( round( value / 1000, 0 ) ) } )
        elif name == 'State':
            state = value == 'idle' and pushstream( { "state" : "pause" } )
        elif name == 'Status':
            state = value == 'paused' and 'pause' or ( value == 'playing' and 'play' or 'stop' )
            pushstream( { "state" : state } )
        elif name == 'Track':
            Artist = value[ 'Artist' ]
            Title = value[ 'Title' ]
            Album = value[ 'Album' ]
            Duration = value[ 'Duration' ] or 0
            Time = Duration == 0 and 0 or int( round( Duration / 1000, 0 ) )
            pushstream( {
                  "Artist" : Artist
                , "Title"  : Title
                , "Album"  : Album
                , "Time"   : Time
            } )
            if os.path.isfile( '/srv/http/data/system/scrobble' ):
                filescrobble = '/srv/http/data/shm/bluetooth/scrobble'
                if os.path.isfile( filescrobble ):
                    with open( filescrobble ) as f: data = f.read()
                    subprocess.Popen( [ cmdsh, data ] )
                with open( filescrobble, 'w' ) as f: f.write( 'scrobble\n'+ Artist +'\n'+ Title +'\n'+ Album )
            
class Agent( dbus.service.Object ):
    @dbus.service.method( AGENT_INTERFACE, in_signature='os', out_signature='' )
    def AuthorizeService( self, device, uuid ):
        return

    @dbus.service.method( AGENT_INTERFACE, in_signature='o', out_signature='' )
    def RequestAuthorization( self, device ):
        return

if __name__ == '__main__':
    dbus.mainloop.glib.DBusGMainLoop( set_as_default=True )

    bus = dbus.SystemBus()
    
    bus.add_signal_receiver( property_changed, bus_name='org.bluez',
            dbus_interface='org.freedesktop.DBus.Properties',
            signal_name='PropertiesChanged',
            path_keyword='path' )
            
    Agent( bus, path )
    
    mainloop = GLib.MainLoop()

    obj = bus.get_object( 'org.bluez', '/org/bluez' );
    manager = dbus.Interface( obj, 'org.bluez.AgentManager1' )
    manager.RegisterAgent( path, 'NoInputNoOutput' )
    manager.RequestDefaultAgent( path )

    mainloop.run()
