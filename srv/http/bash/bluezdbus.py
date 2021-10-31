#!/usr/bin/python

# RPi as renderer - bluezdbus.service > this:
#   - start: set Player dest file
#   - connect/disconnect: networks-data.sh bt
#   - status: dbus emits events and data
#       start play - cmd.sh bluetoothrenderer
#       changed - cmd-pushstatus.sh

import dbus
import dbus.service
import dbus.mainloop.glib
from gi.repository import GLib
import os
import subprocess
import time

AGENT_INTERFACE = 'org.bluez.Agent1'
path = '/test/autoagent'

def property_changed( interface, changed, invalidated, path ):
    for name, value in changed.items():
        # Player    : /org/bluez/hci0/dev_XX_XX_XX_XX_XX_XX/playerX (sink not emit this data)
        # Connected : 1 | 0                                         (1 emitted after Player)
        # Position  : elapsed
        # State     : active | idle | pending
        # Status    : paused | playing | stopped
        # Track     : metadata
        # Type      : dest playerX
        if name == 'Player':
            with open( '/srv/http/data/shm/bluetoothdest', 'w' ) as f: f.write( value )
        elif name == 'Connected':
            subprocess.Popen( [ '/srv/http/bash/networks-data.sh', 'bt' ] )
        elif name == 'Position' or name == 'Track':
            os.system( '/srv/http/bash/cmd-pushstatus.sh' )
        elif name == 'Status':
            if value == 'playing' and not os.path.isfile( '/srv/http/data/shm/player-bluetooth' ):
                subprocess.Popen( [ '/srv/http/bash/cmd.sh', 'bluetoothrenderer' ] )
            else:
                os.system( '/srv/http/bash/cmd-pushstatus.sh' )

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
