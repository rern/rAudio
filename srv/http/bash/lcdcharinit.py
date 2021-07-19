#!/usr/bin/python

import configparser

config = configparser.ConfigParser()
config.read( '/etc/lcdchar.conf' )
section = 'var'
cols = int( config.get( section, 'cols' ) )
charmap = config.get( section, 'charmap' )
rows = cols == 16 and 2 or 4

if config.has_option( section, 'address' ): # i2c
    address = int( config.get( section, 'address' ), 16 ) # base 16 string > integer ( can be hex or int )
    chip = config.get( section, 'chip' )
    from RPLCD.i2c import CharLCD
    lcd = CharLCD( cols=cols, rows=rows, charmap=charmap, address=address, i2c_expander=chip, auto_linebreaks=False )
else:
    pin_rs = int( config.get( section, 'pin_rs' ) )
    pin_rw = int( config.get( section, 'pin_rw' ) )
    pin_e = int( config.get( section, 'pin_e' ) )
    data = config.get( section, 'pins_data' ).split( ',' )
    data = map( int, data )
    pins_data = list( data )
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
