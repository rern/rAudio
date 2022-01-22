#!/usr/bin/python

import configparser

config = configparser.ConfigParser()
config.read( '/srv/http/data/system/lcdchar.conf' )
section = 'var'
cols = config.getint( section, 'cols' )
charmap = config.get( section, 'charmap' )
backlight = config.getboolean( section, 'backlight' )
rows = cols == 16 and 2 or 4

if config.has_option( section, 'address' ): # i2c
    address = config.getint( section, 'address' )
    chip = config.get( section, 'chip' )
    from RPLCD.i2c import CharLCD
    lcd = CharLCD( cols=cols, rows=rows, charmap=charmap, address=address, i2c_expander=chip )
else:
    import json
    pin_rs = config.getint( section, 'pin_rs' )
    pin_rw = config.getint( section, 'pin_rw' )
    pin_e = config.getint( section, 'pin_e' )
    pins_data = json.loads( config.get( section, 'pins_data' ) )
    from RPLCD.gpio import CharLCD
    from RPi import GPIO
    lcd = CharLCD( cols=cols, rows=rows, charmap=charmap, numbering_mode=GPIO.BOARD, pin_rs=pin_rs, pin_rw=pin_rw, pin_e=pin_e, pins_data=pins_data )
