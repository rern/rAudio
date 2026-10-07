#!/bin/python

# RPi as renderer - bluealsa-dbus.service > this:
#   - start: set Player dest file
#   - connect/disconnect: networks-bluetooth.sh
#   - status: dbus emits events and data
#       start play - cmd.sh playerstart
#       changed - status-push.sh

import dbus
import dbus.service
import dbus.mainloop.glib
import os
from gi.repository import GLib
from subprocess import Popen

active          = True
path            = '/test/autoagent'

def statusPush():
    Popen( [ '/srv/http/bash/status-push.sh' ] )

def property_changed( interface, changed, invalidated, path ):
    for name, value in changed.items():
        # Player    : /org/bluez/hci0/dev_XX_XX_XX_XX_XX_XX/playerX >>> on connect (sink not emit this data)
        # Connected : 1 | 0 (udev rules)
        # Position  : elapsed                                       >>> status change
        # State     : active | idle | pending
        # Status    : paused | playing | stopped                    >>> state change
        # Track     : metadata                                      >>> status change
        # Type      : dest playerX
        if name == 'Position' or name == 'Track':
            statusPush()
        elif name == 'Status':
            if not active and value == 'playing': Popen( [ '/srv/http/bash/cmd.sh', 'playerbluetooth' ] )
            statusPush()

if __name__ == '__main__':
    dbus.mainloop.glib.DBusGMainLoop( set_as_default=True )
    bus      = dbus.SystemBus()
    bus.add_signal_receiver( property_changed, bus_name='org.bluez',
                             dbus_interface='org.freedesktop.DBus.Properties',
                             signal_name='PropertiesChanged',
                             path_keyword='path' )
    mainloop = GLib.MainLoop()
    obj      = bus.get_object( 'org.bluez', '/org/bluez' )
    mainloop.run()
