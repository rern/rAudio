#!/usr/bin/python

conf = {}
with open( '/srv/http/data/system/lcdchar.conf' ) as f:
  for line in f:
    if line.startswith( '[' ): continue
      
    key, val = line.strip().split( '=' )
    conf[ key ] = val
    
cols = int( conf[ 'cols' ] )
charmap = conf[ 'charmap' ]
backlight = conf[ 'backlight' ]
rows = cols == 16 and 2 or 4

if 'address' in conf: # i2c
    address = conf[ 'address' ]
    chip = conf[ 'chip' ]
    from RPLCD.i2c import CharLCD
    lcd = CharLCD( cols=16, rows=2, charmap=charmap, address=address, i2c_expander=chip )
else:
    pin_rs = conf[ 'pin_rs' ]
    pin_rw = conf[ 'pin_rw' ]
    pin_e = conf[ 'pin_e' ]
    pins_data = [ conf[ 'p0' ], conf[ 'p1' ], conf[ 'p2' ], conf[ 'p3' ] ]
    from RPLCD.gpio import CharLCD
    from RPi import GPIO
    lcd = CharLCD( cols=cols, rows=rows, charmap=charmap, numbering_mode=GPIO.BOARD, pin_rs=pin_rs, pin_rw=pin_rw, pin_e=pin_e, pins_data=pins_data )
