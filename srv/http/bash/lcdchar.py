#!/bin/python

import sys
import json

with open( '/srv/http/data/system/lcdchar.json' ) as f: CONF = json.load( f )
locals().update( CONF ) # INF, COLS, CHARMAP, BACKLIGHT, [ ADDRESS, CHIP | P* ... ]
rows   = COLS < 20 and 2 or 4
cmA00  = CHARMAP == 'A00'

if INF == 'i2c':
    from RPLCD.i2c import CharLCD
    lcd = CharLCD( cols=COLS, rows=rows, charmap=CHARMAP
                 , address=ADDRESS, i2c_expander=CHIP )
else:
    from RPLCD.gpio import CharLCD
    from RPi import GPIO
    GPIO.setwarnings( False )
    lcd = CharLCD( cols=COLS, rows=rows, charmap=CHARMAP
                 , numbering_mode=GPIO.BOARD, pin_rs=PIN_RS, pin_rw=PIN_RW, pin_e=PIN_E, pins_data=[ P0, P1, P2, P3 ] )

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

SPACES = ' ' * ( ( COLS - 6 ) // 2 + 1 )
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

if cmA00:
    import unicodedata
    def normalize( str ):
        return ''.join( c for c in unicodedata.normalize( 'NFD', str )
                        if unicodedata.category( c ) != 'Mn' )

def backlightOff():
    time.sleep( 60 )
    lcd.backlight_enabled = False
    lcd.close()
    sys.exit()
# --------------------------------------------------------------------
def second2hms( sec ):
    h, r = divmod( sec, 3600 )
    m, s = divmod( r, 60 )
    if h: return f"{h}:{m:02d}:{s:02d}"
    
    if m: return f"{m}:{s:02d}"
    
    return f"{s}"
    
with open( '/srv/http/data/shm/status.json' ) as f: STATUS = json.load( f )
if 'station' not in STATUS: STATUS[ 'station' ] = ''

for k in [ 'Album', 'Artist', 'file', 'station', 'Title' ]: # no v[ :COLS ] - elapsed, Time, webradio
    v = STATUS[ k ]
    if not v: continue
    
    if cmA00: v = normalize( v )
    STATUS[ k ] = v[ :COLS ]
locals().update( STATUS )

if webradio:
    if not Artist: Artist = station
    if not Album:  Album  = file
elif not Title or not Album:
    from pathlib import Path
    
    path = Path( file )
    if not Title: Title = path_obj.stem        # filename
    if not Album: Album = path_obj.parent.name # dir
        
if not Artist: Artist = DOTS
if not Title:  Title  = DOTS
if not Album:  Album  = DOTS

if rows == 2:
    if state == 'play': lines = Title
else:
    lines = Artist + RN + Title + RN + Album

hhmmss = Time and second2hms( round( float( Time ) ) ) or ''

if state == 'stop':
    progress = ( hhmmss + ' ' * COLS )[ :COLS - 4 ]
else:
    if elapsed == 0:
        elapsedhhmmss = ''
        slash         = ''
    else:
        elapsed       = int( elapsed )
        elapsedhhmmss = second2hms( elapsed )
        slash         = COLS > 16 and ' / ' or '/'
    if Time: hhmmss = slash + hhmmss
    progress = ( elapsedhhmmss + hhmmss + ' ' * COLS )[ :COLS - 4 ]

lcd.write_string( lines + RN + ICON[ state ] + progress + RA )

if BACKLIGHT and state != 'play': backlightOff()

if state != 'play' or elapsed == 0: sys.exit()
# --------------------------------------------------------------------
PLAY      = ICON[ 'play' ]
row       = rows - 1
starttime = time.time()
elapsed  += math.ceil( ( starttime * 1000 - timestamp ) / 1000000 )
time_mon  = time.monotonic()

while True:
    time_mon      += 1.0
    lcd.cursor_pos = ( row, 0 )
    elapsedhhmmss  = second2hms( elapsed )
    lcd.write_string( PLAY + elapsedhhmmss + hhmmss )
    elapsed       += 1
    sleep_time     = time_mon - time.monotonic()
    if sleep_time > 0: time.sleep( sleep_time )
