#!/usr/bin/python

import sys
if len( sys.argv ) == 1: quit()

import os.path
import configparser
config = configparser.ConfigParser()
conffile = '/etc/lcdchar.conf'
if not os.path.exists( conffile ): quit()

config.read( conffile )
section = 'var'
cols = int( config.get( section, 'cols' ) )
charmap = config.get( section, 'charmap' )
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

argv1 = sys.argv[ 1 ] # backlight on/off
if argv1 == 'on' or argv1 == 'off':
    lcd.backlight_enabled = argv1 == 'on' and True or False
    quit()

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
    0b00110,
    0b00110,
    0b00000,
    0b00000,
    0b00000,
)
lcd.create_char( 0, pause )
lcd.create_char( 1, play )
lcd.create_char( 2, stop )
lcd.create_char( 3, logol )
lcd.create_char( 4, logor )
lcd.create_char( 5, dot )

ipause = '\x00 '
iplay = '\x01 '
istop = '\x02 '
irr = '\x03\x04'
idots = ' \x05  \x05  \x05'
rn = '\r\n'

if len( sys.argv ) == 2: # rr - splash or single argument string (^ = linebreak)
    if argv1 == 'rr':
        spaces = '     '
        splash = ''
        if rows == 4:
            spaces += '  '
            splash = rn
        splash += spaces + irr + rn + spaces +'rAudio'
        lcd.write_string( splash )
    else:
        lcd.auto_linebreaks = True
        lcd.clear()
        lcd.write_string( argv1.replace( '^', rn ) )
    lcd.close()
    quit()

lcd.clear()

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

field = [ '', 'artist', 'title', 'album', 'elapsed', 'total', 'state' ] # assign variables
for i in range( 1, 7 ):
    val = sys.argv[ i ][ :cols ].replace( '"', '\\"' ) # escape "
    exec( field[ i ] +' = "'+ val.rstrip() +'"' )      # fix last space error - remove
    
if title == 'false': title = rows == 2 and artist or idots
    
if total != 'false':
    total = round( float( total ) )
    totalhhmmss = second2hhmmss( total )
else:
    total = ''
    totalhhmmss = ''
    
elapsed = elapsed != 'false' and round( float( elapsed ) )
elapsedhhmmss = elapsed and second2hhmmss( elapsed )

if state == 'stop':
    progress = totalhhmmss
else:
    slash = cols == 20 and ' / ' or '/'
    totalhhmmss = total and slash + totalhhmmss
    progress = elapsedhhmmss + totalhhmmss

istate = state == 'stop' and  istop or ( state == 'pause' and ipause or iplay )
progress = istate + progress

progl = len( progress )
if progl <= cols - 3: progress += ' ' * ( cols - progl - 2 ) + irr

if artist == 'false': artist = idots
lines = rows == 2 and title or artist + rn + title + rn + album
# remove accents
if charmap == 'A00':
    import unicodedata
    lines = ''.join( c for c in unicodedata.normalize( 'NFD', lines ) if unicodedata.category( c ) != 'Mn' )

lcd.write_string( lines + rn + progress[ :cols ] )
lcd.close()
    
if state == 'stop' or state == 'pause': quit()

# play
import subprocess
import time

prog = subprocess.getoutput( "mpc | awk '/^.playing/ {print $3}' | cut -d/ -f1" )
elapsed = 0
for each in prog.split( ':' ): elapsed = elapsed * 60 + int( each )
row = rows - 1
starttime = time.time()

while True:
    sl = 1 - ( ( time.time() - starttime ) % 1 )
    time.sleep( sl )
    progress = iplay + second2hhmmss( elapsed ) + totalhhmmss
    if len( progress ) > ( cols - 3 ): progress += '  '
    lcd.cursor_pos = ( row, 0 )
    lcd.write_string( progress[ :cols ] )
    elapsed += 1
