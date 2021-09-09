#!/usr/bin/python

from lcdcharconfig import *
import sys
import os

os.system( 'killall lcdchartimer.sh &> /dev/null' )

icon = {
      'pause' : '\x00 '
    , 'play'  : '\x01 '
    , 'stop'  : '\x02 '
}
irr = '\x03\x04'
idots = '\x05  \x05  \x05'
rn = '\r\n'

spaces = ' ' * ( ( cols - 6 ) // 2 + 1 )
splash = rows > 2 and rn or ''
splash += spaces + irr + rn + spaces +'rAudio'

argvL = len( sys.argv )
if argvL == 1: # no argument
    lcd.write_string( splash )
    lcd.close()
    quit()

if argvL == 2: # 1 argument
    val = sys.argv[ 1 ]
    if val == 'off': # backlight off
        lcd.backlight_enabled = False
    else:            # string
        lcd.write_string( val.replace( '\n', rn ) )
        lcd.close()
    quit()
    
import math

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
    
if charmap == 'A00':
    import unicodedata
    noaccented = True
    
field = [ '', 'artist', 'title', 'album', 'station', 'file', 'state', 'total', 'elapsed', 'timestamp', 'webradio' ]
for i in range( 1, 11 ):
    val = sys.argv[ i ].rstrip()
    if val and i < 6:
        if noaccented:
            val = ''.join( c for c in unicodedata.normalize( 'NFD', val )
                           if unicodedata.category( c ) != 'Mn' )
        val = val[ :cols ].replace( 'º', '°' ).replace( "'", "\\'" )
    exec( field[ i ] +" = '"+ val +"'" )
    
if webradio == 'true':
    if state != 'play':
        artist = station
        album = file
    else:
        if not artist and not title: artist = station
        if not album: album = station or file
        
if not artist: artist = idots
if not title: title = idots
if not album: album = idots
if rows == 2:
    if state == 'stop' or state == 'pause':
        if backlight == 'True' or backlight == 'true':
            os.system( 'sleep 60 && /srv/http/bash/lcdchar.py off &' )
        lcd.close()
        quit()
        
    else:
        lines = title
else:
    lines = artist + rn + title + rn + album

if elapsed != 'false':
    elapsed = round( float( elapsed ) )
    elapsedhhmmss = elapsed > 0 and second2hhmmss( elapsed ) or ''
else:
    elapsedhhmmss = ''

if total != 'false':
    if elapsedhhmmss:
        totalhhmmss = cols > 16 and ' / ' or '/'
    else:
        totalhhmmss = ''
    total = round( float( total ) )
    totalhhmmss += second2hhmmss( total )
else:
    totalhhmmss = ''
    
progress = state == 'stop' and totalhhmmss or elapsedhhmmss + totalhhmmss
progress = ( progress + ' ' * cols )[ :cols - 4 ]

lcd.write_string( lines + rn + icon[ state ] + progress + irr )

if state == 'stop' or state == 'pause':
    if backlight == 'True' or backlight == 'true':
        os.system( 'sleep 60 && /srv/http/bash/lcdchar.py off &' )
    lcd.close()
    quit()

# play
if elapsed == 'false': quit()

import time

row = rows - 1
starttime = time.time()
elapsed += round( starttime - int( timestamp ) / 1000 )
iplay = icon[ 'play' ]

while True:
    sl = 1 - ( ( time.time() - starttime ) % 1 )
    lcd.cursor_pos = ( row, 0 )
    lcd.write_string( iplay + second2hhmmss( elapsed ) + totalhhmmss )
    elapsed += 1
    time.sleep( sl )
    