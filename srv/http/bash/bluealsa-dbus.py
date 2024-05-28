#!/usr/bin/python

# RPi as renderer - bluealsa-dbus.service > this:
#   - start: set Player dest file
#   - connect/disconnect: networks-bluetooth.sh
#   - status: dbus emits events and data
#       start play - cmd.sh playerstart
#       changed - status-push.sh

import dbus
import dbus.service
import dbus.mainloop.glib
from gi.repository import GLib
from subprocess import Popen

AGENT_INTERFACE = 'org.bluez.Agent1'
path = '/test/autoagent'
filesink = '/srv/http/data/shm/bluetoothsink'

def statusPush():
    Popen( [ '/srv/http/bash/status-push.sh' ] )

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
            statusPush()
        elif name == 'Status':
            if value == 'playing' and not os.path.isfile( filesink ):
                open( filesink, 'a' )
                Popen( [ '/srv/http/bash/cmd.sh', 'playerstart' ] )
            statusPush()

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
