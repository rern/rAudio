#!/usr/bin/python

import sys
import os
import configparser
config = configparser.ConfigParser()
conffile = '/etc/lcdchar.conf'
timerfile = '/srv/http/data/shm/lcdchartimer'
if not os.path.exists( conffile ): quit()

os.system( 'killall lcdchartimer.sh &> /dev/null' )

config.read( conffile )
section = 'var'
cols = int( config.get( section, 'cols' ) )
charmap = config.get( section, 'charmap' )
backlight = config.get( section, 'backlight' )

if config.has_option( section, 'address' ):
    address = int( config.get( section, 'address' ), 16 ) # base 16 string > integer ( can be hex or int )
    chip = config.get( section, 'chip' )
else:
    address = ''
    pin_rs = int( config.get( section, 'pin_rs' ) )
    pin_rw = int( config.get( section, 'pin_rw' ) )
    pin_e = int( config.get( section, 'pin_e' ) )
    data = config.get( section, 'pins_data' ).split( ',' )
    data = map( int, data )
    pins_data = list( data )
    
rows = cols == 16 and 2 or 4

if address: # i2c
    from RPLCD.i2c import CharLCD
    lcd = CharLCD( chip, address )
    lcd = CharLCD( cols=cols, rows=rows, charmap=charmap, address=address, i2c_expander=chip, auto_linebreaks=False )
else:
    from RPLCD.gpio import CharLCD
    from RPi import GPIO
    lcd = CharLCD( cols=cols, rows=rows, charmap=charmap, numbering_mode=GPIO.BOARD, pin_rs=pin_rs, pin_rw=pin_rw, pin_e=pin_e, pins_data=pins_data, auto_linebreaks=False )
    
pause = (
    0b00000,
    0b11011,
    0b11011,
    0b11011,
    0b11011,
    0b11011,
    0b00000,
    0b00000,
)
play = (
    0b10000,
    0b11000,
    0b11100,
    0b11110,
    0b11100,
    0b11000,
    0b10000,
    0b00000,
)
stop = (
    0b00000,
    0b11111,
    0b11111,
    0b11111,
    0b11111,
    0b11111,
    0b00000,
    0b00000,
)
logol = (
    0b11111,
    0b11011,
    0b11011,
    0b00000,
    0b11011,
    0b11011,
    0b11111,
    0b11111,
)
logor = (
    0b01110,
    0b10110,
    0b10110,
    0b01110,
    0b01110,
    0b10110,
    0b11010,
    0b11100,
)
dot = (
    0b00000,
    0b00000,
    0b00000,
    0b00011,
    0b00011,
    0b00000,
    0b00000,
    0b00000,
)
char = [ pause, play, stop, logol, logor, dot ]
for i in range( 6 ):
    lcd.create_char( i, char[ i ] )

ipause = '\x00 '
iplay = '\x01 '
istop = '\x02 '
irr = '\x03\x04'
idots = '\x05  \x05  \x05'
rn = '\r\n'

spaces = '     '
splash = ''
if rows == 4:
    spaces += '  '
    splash = rn
splash += spaces + irr + rn + spaces +'rAudio'

if len( sys.argv ) == 1: # no argument = splash
    lcd.write_string( splash )
    lcd.close()
    quit()

if len( sys.argv ) == 2: # 1 argument
    argv1 = sys.argv[ 1 ]
    if argv1 == 'off':   # backlight off
        lcd.backlight_enabled = False
    else:                # string
        lcd.auto_linebreaks = True
        lcd.write_string( argv1.replace( '\n', rn ) )
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

field = [ '', 'artist', 'title', 'album', 'state', 'total', 'elapsed', 'timestamp', 'station', 'file', 'webradio' ] # assign variables
for i in range( 1, 11 ):
    val = sys.argv[ i ][ :cols ].replace( '"', '\"' ) # escape "
    exec( field[ i ] +' = "'+ val.rstrip() +'"' )     # fix last space error - remove
    
if artist == 'false' and webradio != 'false':
    artist = station
    album = file
if artist == 'false' and title == 'false' and album == 'false':
    lcd.write_string( splash )
    quit()

if artist == 'false': artist = idots
if title == 'false': title = rows == 2 and artist or idots
if album == 'false': album = idots

if total != 'false':
    total = round( float( total ) )
    totalhhmmss = second2hhmmss( total )
else:
    totalhhmmss = ''
    
if elapsed != 'false':
    elapsed = round( float( elapsed ) )
    elapsedhhmmss = second2hhmmss( elapsed )
else:
    elapsedhhmmss = ''

if state == 'stop':
    progress = totalhhmmss
else:
    if totalhhmmss != '':
        slash = cols == 20 and ' / ' or '/'
        totalhhmmss = slash + totalhhmmss
        progress = elapsedhhmmss + totalhhmmss
    else:
        progress = ''

istate = state == 'stop' and  istop or ( state == 'pause' and ipause or iplay )
progress = istate + progress

progl = len( progress )
if progl <= cols - 3: progress += ' ' * ( cols - progl - 2 ) + irr

lines = rows == 2 and title or artist + rn + title + rn + album
# remove accents
if charmap == 'A00':
    import unicodedata
    lines = ''.join( c for c in unicodedata.normalize( 'NFD', lines ) if unicodedata.category( c ) != 'Mn' )

lcd.write_string( lines + rn + progress[ :cols ] )
    
if state == 'stop' or state == 'pause':
    lcd.close()
    if backlight == 'True':
        import subprocess
        subprocess.Popen( [ '/srv/http/bash/lcdchartimer.sh' ] )
    quit()

# play
if elapsed == 'false': quit()

import time

row = rows - 1
starttime = time.time()
elapsed += round( starttime - int( timestamp ) / 1000 )

while True:
    sl = 1 - ( ( time.time() - starttime ) % 1 )
    progress = iplay + second2hhmmss( elapsed ) + totalhhmmss
    if len( progress ) > ( cols - 3 ): progress += '  '
    lcd.cursor_pos = ( row, 0 )
    lcd.write_string( progress[ :cols ] )
    elapsed += 1
    time.sleep( sl )
    