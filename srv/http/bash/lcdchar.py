#!/usr/bin/python

from lcdcharconfig import *
import sys
import os

ICON = {
      'pause' : '\x00 '
    , 'play'  : '\x01 '
    , 'stop'  : '\x02 '
}
RR = '\x03\x04'
DOTS = '\x05  \x05  \x05'
RN = '\r\n'

SPACES = ' ' * ( ( cols - 6 ) // 2 + 1 )
logo = rows > 2 and RN or ''
logo += SPACES + RR + RN + SPACES +'rAudio'

argvL = len( sys.argv )
if argvL == 2: # 1 argument
    val = sys.argv[ 1 ]
    if val == 'off': # backlight off
        lcd.backlight_enabled = False
    elif val == 'logo':
        lcd.write_string( logo )
    elif val == 'clear':
        lcd.clear()
    else:            # string
        lcd.write_string( val.replace( '\n', RN ) )
    lcd.close()
    quit()
    
import math
import time

def backlightOff():
    global backlight
    time.sleep( 60 )
    lcd.backlight_enabled = False
    lcd.close()
    quit()
    
def second2hhmmss( sec ):
    hh = math.floor( sec / 3600 )
    mm = math.floor( ( sec % 3600 ) / 60 )
    ss = sec % 60
    HH = hh > 0 and str( hh ) +':' or ''
    mmt = str( mm )
    MM = hh > 0 and ( mm > 9 and mmt +':' or '0'+ mmt +':' ) or ( mm > 0 and mmt +':' or '' )
    sst = str( ss )
    SS = mm > 0 and ( ss > 9 and sst or '0'+ sst ) or sst
    return HH + MM + SS
    
sys.path.append( '/srv/http/data/shm' )
from statuslcd import *

if 'Artist' not in locals(): Artist = ""
if 'Title' not in locals(): Title = ""
if 'Album' not in locals(): Album = ""
if 'station' not in locals(): station = ""
if 'file' not in locals(): file = ""
if 'webradio' not in locals(): webradio = False

if charmap == 'A00':
    import unicodedata
    def normalize( str ):
        return ''.join( c for c in unicodedata.normalize( 'NFD', str )
                        if unicodedata.category( c ) != 'Mn' )
                        
    if Artist: Artist = normalize( Artist )
    if Title: Title = normalize( Title )
    if Album: Album = normalize( Album )
    if station: station = normalize( station )
    if file: file = normalize( file )
    
Artist = Artist[ :cols ]
Title = Title[ :cols ]
Album = Album[ :cols ]
station = station[ :cols ]
file = file[ :cols ]

if webradio:
    if state != 'play':
        Artist = station
        Album = file
    else:
        if not Artist and not Title: Artist = station
        if not Album: Album = station or file
        
if not Artist: Artist = DOTS
if not Title: Title = DOTS
if not Album: Album = DOTS
if rows == 2:
    if state == 'play':
        lines = Title
    elif backlight:
        backlightOff()
else:
    lines = Artist + RN + Title + RN + Album

Timehhmmss = Time and second2hhmmss( round( float( Time ) ) ) or ''

if state == 'stop':
    progress = ( Timehhmmss + ' ' * cols )[ :cols - 4 ]
else:
    if elapsed is False: # can be 0
        elapsedhhmmss = ''
        slash = ''
    else:
        elapsed = round( float( elapsed ) )
        elapsedhhmmss = second2hhmmss( elapsed )
        slash = cols > 16 and ' / ' or '/'
    if Time: Timehhmmss = slash + Timehhmmss
    progress = ( elapsedhhmmss + Timehhmmss + ' ' * cols )[ :cols - 4 ]

print( lines + RN + ICON[ state ] + progress + RR )
lcd.write_string( lines + RN + ICON[ state ] + progress + RR )

if backlight and state != 'play': backlightOff()

if elapsed is False: quit()

row = rows - 1
starttime = time.time()
elapsed += round( starttime - timestamp / 1000 )
iplay = ICON[ 'play' ]

while True:
    sl = 1 - ( ( time.time() - starttime ) % 1 )
    lcd.cursor_pos = ( row, 0 )
    lcd.write_string( iplay + second2hhmmss( elapsed ) + Timehhmmss )
    elapsed += 1
    time.sleep( sl )
    