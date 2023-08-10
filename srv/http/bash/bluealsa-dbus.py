#!/usr/bin/python

# RPi as renderer - bluealsa-dbus.service > this:
#   - start: set Player dest file
#   - connect/disconnect: bluetoothcommand.sh
#   - status: dbus emits events and data
#       start play - cmd.sh playerstart
#       changed - status-push.sh

import dbus
import dbus.service
import dbus.mainloop.glib
from gi.repository import GLib
import os

AGENT_INTERFACE = 'org.bluez.Agent1'
path = '/test/autoagent'

def property_changed( interface, changed, invalidated, path ):
    for name, value in changed.items():
        # Player    : /org/bluez/hci0/dev_XX_XX_XX_XX_XX_XX/playerX (sink not emit this data)
        # Connected : 1 | 0                                         (use udev rules instead)
        # Position  : elapsed
        # State     : active | idle | pending
        # Status    : paused | playing | stopped
        # Track     : metadata
        # Type      : dest playerX
        if name == 'Player':
            with open( '/srv/http/data/shm/bluetoothdest', 'w' ) as f: f.write( value )
        elif name == 'Position' or name == 'Track':
            os.system( '/srv/http/bash/status-push.sh' )
        elif name == 'Status':
            with open( '/srv/http/data/shm/player' ) as f: player = f.read().rstrip()
            if value == 'playing' and player != 'bluetooth':
                f.write( 'bluetooth' )
                os.system( "/srv/http/bash/cmd.sh playerstart" )
            os.system( '/srv/http/bash/status-push.sh' )

if __name__ == '__main__':
    dbus.mainloop.glib.DBusGMainLoop( set_as_default=True )
    bus = dbus.SystemBus()
    bus.add_signal_receiver( property_changed, bus_name='org.bluez',
                             dbus_interface='org.freedesktop.DBus.Properties',
                             signal_name='PropertiesChanged',
                             path_keyword='path' )
    mainloop = GLib.MainLoop()
    obj = bus.get_object( 'org.bluez', '/org/bluez' )
    mainloop.run()
