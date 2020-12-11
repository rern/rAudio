#!/usr/bin/python
import RPi.GPIO as GPIO
import json
import sys
import os
import subprocess
import time
from urllib.request import urlopen
from urllib.request import Request

ON = 1
OFF = 0
relaysfile = '/srv/http/data/shm/relaystimer'

with open( '/etc/relays.conf' ) as jsonfile:
    gpio = json.load( jsonfile )

name = gpio[ 'name' ]
pin = name.keys();
pin = [ int( n ) for n in pin ]

GPIO.setwarnings( 0 )
GPIO.setmode( GPIO.BOARD )
GPIO.setup( pin, GPIO.OUT )

on   = gpio[ 'on' ]
on1  = on[ 'on1' ]
ond1 = on[ 'ond1' ]
on2  = on[ 'on2' ]
ond2 = on[ 'ond2' ]
on3  = on[ 'on3' ]
ond3 = on[ 'ond3' ]
on4  = on[ 'on4' ]
onpins = [ on1, on2, on3, on4 ]
onenable = [ n for n in onpins if n != 0 ]

ond = ond1 + ond2 + ond3

state = GPIO.input( onenable[ 0 ] )

off   = gpio[ 'off' ]
off1  = off[ 'off1' ]
offd1 = off[ 'offd1' ]
off2  = off[ 'off2' ]
offd2 = off[ 'offd2' ]
off3  = off[ 'off3' ]
offd3 = off[ 'offd3' ]
off4  = off[ 'off4' ]
offpins = [ off1, off2, off3, off4 ]
offenable = [ n for n in offpins if n != 0 ]

offd = offd1 + offd2 + offd3

timer = gpio[ 'timer' ]

onorder = []
on1 != 0 and onorder.append( name[ str( on1 ) ] ) # name[ key ] - keys are strings
on2 != 0 and onorder.append( name[ str( on2 ) ] )
on3 != 0 and onorder.append( name[ str( on3 ) ] )
on4 != 0 and onorder.append( name[ str( on4 ) ] )

offorder = []
off1 != 0 and offorder.append( name[ str( off1 ) ] )
off2 != 0 and offorder.append( name[ str( off2 ) ] )
off3 != 0 and offorder.append( name[ str( off3 ) ] )
off4 != 0 and offorder.append( name[ str( off4 ) ] )

# broadcast pushstream
def pushstream( data ):
    req = Request(
        'http://127.0.0.1/pub?id=relays',
        json.dumps( data ).encode( 'utf-8' ),
        { 'Content-type': 'application/json' }
    )
    urlopen( req )

if sys.argv[ 1 ] == 'on':
    pushstream( { 'state': True, 'order': onorder } )

    if on1 != 0:
        GPIO.output( on1, ON )
    if on2 != 0:
        time.sleep( ond1 )
        GPIO.output( on2, ON )
        pushstream( { 'on': 2 } )
    if on3 != 0:
        time.sleep( ond2 )
        GPIO.output( on3, ON )
        pushstream( { 'on': 3 } )
    if on4 != 0:
        time.sleep( ond3 )
        GPIO.output( on4, ON )
        pushstream( { 'on': 4 } )

    time.sleep( 1 )
    pushstream( { 'done': True } )
    
    if timer == 0: quit()
    
    with open( relaysfile, 'w' ) as file:
        file.write( str( timer ) )
    os.chmod( relaysfile, 0o777 )

    subprocess.Popen( [ '/srv/http/bash/relaystimer.sh' ] )

elif sys.argv[ 1 ] == 'off':
    os.path.exists( relaysfile ) and os.remove( relaysfile )

    pushstream( { 'state': False, 'order': offorder } )

    if off1 != 0:
        GPIO.output( off1, OFF )
    if off2 != 0:
        time.sleep( offd1 )
        GPIO.output( off2, OFF )
        pushstream( { 'off': 2 } )
    if off3 != 0:
        time.sleep( offd2 )
        GPIO.output( off3, OFF )
        pushstream( { 'off': 3 } )
    if off4 != 0:
        time.sleep( offd3 )
        GPIO.output( off4, OFF )
        pushstream( { 'off': 4 } )

    time.sleep( 1 )
    pushstream( { 'done': False } )
