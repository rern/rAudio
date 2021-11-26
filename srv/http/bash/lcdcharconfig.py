#!/usr/bin/python

import configparser

config = configparser.ConfigParser()
config.read( '/srv/http/data/system/lcdchar.conf' )
section = 'var'
cols = int( config.get( section, 'cols' ) )
charmap = config.get( section, 'charmap' )
backlight = config.get( section, 'backlight' ) == 'true' and True or False
rows = cols == 16 and 2 or 4

if config.has_option( section, 'address' ): # i2c
    address = int( config.get( section, 'address' ) )
    chip = config.get( section, 'chip' )
    from RPLCD.i2c import CharLCD
    lcd = CharLCD( cols=cols, rows=rows, charmap=charmap, address=address, i2c_expander=chip )
else:
    import json
    pin_rs = int( config.get( section, 'pin_rs' ) )
    pin_rw = int( config.get( section, 'pin_rw' ) )
    pin_e = int( config.get( section, 'pin_e' ) )
    pins_data = json.loads( config.get( section, 'pins_data' ) )
    from RPLCD.gpio import CharLCD
    from RPi import GPIO
    lcd = CharLCD( cols=cols, rows=rows, charmap=charmap, numbering_mode=GPIO.BOARD, pin_rs=pin_rs, pin_rw=pin_rw, pin_e=pin_e, pins_data=pins_data )
