#!/usr/bin/python

conf = {}
with open( '/srv/http/data/system/lcdchar.conf' ) as f:
  for line in f:
    if line.startswith( '[' ): continue
    
    key, val = line.strip().split( '=' )
    conf[ key ] = val
    
cols = int( conf[ 'cols' ] )
charmap = conf[ 'charmap' ]
backlight = conf[ 'backlight' ] == 'true'
rows = cols == 16 and 2 or 4

if conf[ 'inf' ] == 'i2c':
    address = int( conf[ 'address' ] )
    chip = conf[ 'chip' ]
    from RPLCD.i2c import CharLCD
    lcd = CharLCD( cols=cols, rows=rows, charmap=charmap, address=address, i2c_expander=chip )
else:
    pin_rs = int( conf[ 'pin_rs' ] )
    pin_rw = int( conf[ 'pin_rw' ] )
    pin_e = int( conf[ 'pin_e' ] )
    pins_data = [ int( conf[ 'p0' ] ), int( conf[ 'p1' ] ), int( conf[ 'p2' ] ), int( conf[ 'p3' ] ) ]
    from RPLCD.gpio import CharLCD
    from RPi import GPIO
    lcd = CharLCD( cols=cols, rows=rows, charmap=charmap, numbering_mode=GPIO.BOARD, pin_rs=pin_rs, pin_rw=pin_rw, pin_e=pin_e, pins_data=pins_data )
