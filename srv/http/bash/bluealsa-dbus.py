#!/bin/python

import dbus
import dbus.service
import dbus.mainloop.glib
import time
from gi.repository import GLib
from subprocess import Popen

file_btsource = '/srv/http/data/shm/btsource'
file_player   = '/srv/http/data/shm/player'
STARTED       = False

def statusPush():
    Popen( [ '/srv/http/bash/status-push.sh' ] )
    
def fileWrite( file, text ):
    with open( file, 'w' ) as f: f.write( str( text ) )

def property_changed( interface, changed, invalidated, path ):
    global STARTED
    for name, value in changed.items():
        # Player      : /org/bluez/hci0/dev_XX_XX_XX_XX_XX_XX/playerX
        #   Connected : 1 | 0
        # Position    : elapsed
        #   State     : active | idle | pending
        # Status      : paused | playing | stopped
        # Track       : metadata
        #   Type      : dest playerX
        if name == 'Position':
            statusPush()
        elif name == 'Track':
            time.sleep( 1 ) # delay to pass: stopped > playing on track changed
            statusPush()
        elif name == 'Status':
            if value == 'playing' and not STARTED:
                STARTED = True
                fileWrite( file_player, 'bluetooth' )
            statusPush()
        elif name == 'Player':
            fileWrite( file_btsource, value )

def main():
    dbus.mainloop.glib.DBusGMainLoop( set_as_default=True )
    bus = dbus.SystemBus()
    bus.add_signal_receiver( property_changed, bus_name='org.bluez',
                             dbus_interface='org.freedesktop.DBus.Properties',
                             signal_name='PropertiesChanged',
                             path_keyword='path' )
    GLib.MainLoop().run()

if __name__ == '__main__':
    main()
    