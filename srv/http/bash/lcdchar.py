#!/usr/bin/python

import sys
import json

with open( '/srv/http/data/system/lcdchar.json' ) as f: CONF = json.load( f )
locals().update( CONF ) # INF, COLS, CHARMAP, BACKLIGHT, [ ADDRESS, CHIP | P* ... ]
rows   = COLS < 20 and 2 or 4
if COLS == 18: COLS = 20 # 20 x 2
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
    
with open( '/srv/http/data/shm/status.json' ) as f: STATUS = json.load( f )
for k in [ 'Album', 'Artist', 'file', 'station', 'Title' ]:
    if k in STATUS:
        v = STATUS[ k ] or DOTS
        if cmA00: STATUS[ k ] = normalize( v ) # character: accent with sequence code > single code
        STATUS[ k ] = v[ :COLS ]               # set width
    else:
        STATUS[ k ] = ''
locals().update( STATUS )

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
    if state == 'play': lines = Title
else:
    lines = Artist + RN + Title + RN + Album

hhmmss = Time and second2hhmmss( round( float( Time ) ) ) or ''

if state == 'stop':
    progress = ( hhmmss + ' ' * COLS )[ :COLS - 4 ]
else:
    if elapsed is False: # can be 0
        elapsedhhmmss = ''
        slash         = ''
    else:
        elapsed       = int( elapsed )
        elapsedhhmmss = second2hhmmss( elapsed )
        slash         = COLS > 16 and ' / ' or '/'
    if Time: hhmmss = slash + hhmmss
    progress = ( elapsedhhmmss + hhmmss + ' ' * COLS )[ :COLS - 4 ]

lcd.write_string( lines + RN + ICON[ state ] + progress + RA )

if BACKLIGHT and state != 'play': backlightOff()

if state != 'play' or elapsed is False: sys.exit()
# --------------------------------------------------------------------
row       = rows - 1
starttime = time.time()
elapsed  += math.ceil( ( starttime * 1000 - timestamp ) / 1000000 )
PLAY      = ICON[ 'play' ]

while True:
    sl             = 1 - ( ( time.time() - starttime ) % 1 )
    lcd.cursor_pos = ( row, 0 )
    elapsedhhmmss  = second2hhmmss( elapsed )
    lcd.write_string( PLAY + elapsedhhmmss + hhmmss )
    elapsed       += 1
    time.sleep( sl )
    