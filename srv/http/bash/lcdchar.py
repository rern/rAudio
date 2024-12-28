#!/usr/bin/python

import sys

with open( '/srv/http/data/system/lcdchar.conf', 'r' ) as f:
    conf = {}
    for line in f:
        kv = line.split( '=' )
        k  = kv[ 0 ]
        v  = kv[ 1 ].rstrip()
        if k == 'address' or k == 'cols':
            v = int( v )
        elif k == 'backlight':
            v = bool( v )
        conf[ k ] = v
locals().update( conf ) # inf, cols, charmap, address, chip, backlight

rows   = cols == 16 and 2 or 4

if inf == 'i2c':
    from RPLCD.i2c import CharLCD
    lcd = CharLCD( cols=cols, rows=rows, charmap=charmap
                 , address=address, i2c_expander=chip )
else:
    pins_data = [ p0, p1, p2, p3 ]
    from RPLCD.gpio import CharLCD
    from RPi import GPIO
    lcd = CharLCD( cols=cols, rows=rows, charmap=charmap
                 , numbering_mode=GPIO.BOARD, pin_rs=pin_rs, pin_rw=pin_rw, pin_e=pin_e, pins_data=pins_data )

pause  = (
    0b00000,
    0b11011,
    0b11011,
    0b11011,
    0b11011,
    0b11011,
    0b00000,
    0b00000,
)
play   = (
    0b10000,
    0b11000,
    0b11100,
    0b11110,
    0b11100,
    0b11000,
    0b10000,
    0b00000,
)
stop   = (
    0b00000,
    0b11111,
    0b11111,
    0b11111,
    0b11111,
    0b11111,
    0b00000,
    0b00000,
)
logol  = (
    0b11111,
    0b11011,
    0b11011,
    0b00000,
    0b11011,
    0b11011,
    0b11111,
    0b11111,
)
logor  = (
    0b01110,
    0b10110,
    0b10110,
    0b01110,
    0b01110,
    0b10110,
    0b11010,
    0b11100,
)
dot    = (
    0b00000,
    0b00000,
    0b00000,
    0b00011,
    0b00011,
    0b00000,
    0b00000,
    0b00000,
)
char   = [ pause, play, stop, logol, logor, dot ]
for i in range( 6 ):
    lcd.create_char( i, char[ i ] )

ICON   = {
      'pause' : '\x00 '
    , 'play'  : '\x01 '
    , 'stop'  : '\x02 '
}
RA     = '\x03\x04'
DOTS   = '\x05  \x05  \x05'
RN     = '\r\n'

SPACES = ' ' * ( ( cols - 6 ) // 2 + 1 )
LOGO   = rows > 2 and RN or ''
LOGO  += SPACES + RA + RN + SPACES +'rAudio'

argvL  = len( sys.argv )
if argvL == 2: # 1 argument
    val = sys.argv[ 1 ]
    if val == 'off': # backlight off
        lcd.backlight_enabled = False
    elif val == 'logo':
        lcd.write_string( LOGO )
    elif val == 'clear':
        lcd.clear()
    else:            # string
        lcd.write_string( val.replace( '\n', RN ) )
    lcd.close()
    sys.exit()
# --------------------------------------------------------------------
import math
import time

def backlightOff():
    time.sleep( 60 )
    lcd.backlight_enabled = False
    lcd.close()
    sys.exit()
# --------------------------------------------------------------------
def second2hhmmss( sec ):
    hh  = math.floor( sec / 3600 )
    mm  = math.floor( ( sec % 3600 ) / 60 )
    ss  = sec % 60
    HH  = hh > 0 and str( hh ) +':' or ''
    mmt = str( mm )
    MM  = hh > 0 and ( mm > 9 and mmt +':' or '0'+ mmt +':' ) or ( mm > 0 and mmt +':' or '' )
    sst = str( ss )
    SS  = mm > 0 and ( ss > 9 and sst or '0'+ sst ) or sst
    return HH + MM + SS
    
sys.path.append( '/srv/http/data/shm' )
from lcdcharstatus import *
keys   = [ 'Album', 'Artist', 'elapsed', 'file', 'station', 'Time', 'timestamp', 'Title' ]
data   = {}

if charmap == 'A00':
    import unicodedata
    def normalize( str ):
        return ''.join( c for c in unicodedata.normalize( 'NFD', str )
                        if unicodedata.category( c ) != 'Mn' )
    for k in keys:
        if k in locals():
            if k in [ 'elapsed', 'Time', 'timestamp' ]:
                data[ k ] = locals()[ k ]
            else:
                data[ k ] = normalize( locals()[ k ] )
        else:
            data[ k ] = ''
else:
    for k in keys:
        data[ k ] = k in locals() and locals()[ k ] or ''

Album     = data[ 'Album' ][ :cols ]
Artist    = data[ 'Artist' ][ :cols ]
file      = data[ 'file' ][ :cols ]
station   = data[ 'station' ][ :cols ]
Title     = data[ 'Title' ][ :cols ]
elapsed   = data[ 'elapsed' ]
Time      = data[ 'Time' ]
timestamp = data[ 'timestamp' ] / 1000

if webradio:
    if state != 'play':
        Artist = station
        Album  = file
    else:
        if not Artist and not Title: Artist = station
        if not Album:                Album  = station or file
        
if not Artist: Artist = DOTS
if not Title:  Title  = DOTS
if not Album:  Album  = DOTS
if rows == 2:
    if state == 'play':
        lines = Title
    elif backlight:
        backlightOff()
else:
    lines = Artist + RN + Title + RN + Album

hhmmss = Time and second2hhmmss( round( float( Time ) ) ) or ''

if state == 'stop':
    progress = ( hhmmss + ' ' * cols )[ :cols - 4 ]
else:
    if elapsed is False: # can be 0
        elapsedhhmmss = ''
        slash         = ''
    else:
        elapsed       = int( elapsed )
        elapsedhhmmss = second2hhmmss( elapsed )
        slash         = cols > 16 and ' / ' or '/'
    if Time: hhmmss = slash + hhmmss
    progress = ( elapsedhhmmss + hhmmss + ' ' * cols )[ :cols - 4 ]

lcd.write_string( lines + RN + ICON[ state ] + progress + RA )

if backlight and state != 'play': backlightOff()

if state != 'play': sys.exit()
# --------------------------------------------------------------------
row       = rows - 1
starttime = time.time()
elapsed  += math.ceil( ( starttime - timestamp ) / 1000 )
PLAY      = ICON[ 'play' ]

while True:
    sl             = 1 - ( ( time.time() - starttime ) % 1 )
    lcd.cursor_pos = ( row, 0 )
    elapsedhhmmss  = second2hhmmss( elapsed )
    lcd.write_string( PLAY + elapsedhhmmss + hhmmss )
    elapsed       += 1
    time.sleep( sl )
    