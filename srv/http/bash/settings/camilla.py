#!/usr/bin/python

import json
import os
import os.path
import sys
from camilladsp import CamillaConnection, CamillaError

cdsp = CamillaConnection( '127.0.0.1', 1234 )
cdsp.connect()

pathconfigs = '/srv/http/data/camilladsp/configs/'

def status():
    br = '<br>'
    data = cdsp.get_state().name + br \
         + str( cdsp.get_capture_rate() ) + br \
         + str( cdsp.get_rate_adjust() ) + br \
         + str( cdsp.get_clipped_samples() ) +br \
         + str( cdsp.get_buffer_level() )
    return data
    
cmd = sys.argv[ 1 ]

if len( sys.argv ) > 2: # set: cmd val
    val = sys.argv[ 2 ]
    match cmd:
        case 'mute':
            cdsp.set_mute( val == 'true' )
        case 'volume':
            cdsp.set_volume( float( val ) )
        case 'save':
            import yaml
            try:
                config = json.loads( val )
                cdsp.validate_config( config )
                yml    = yaml.dump( config ).encode( 'utf-8' )
                file   = cdsp.get_config_name()
                with open( file, 'wb' ) as f:
                    f.write( yml )
                cdsp.reload()
            except Exception as e:
                print( e )
        case 'switch':
            print( pathconfigs + val +'.yml' )
            cdsp.set_config_name( pathconfigs + val +'.yml' )
else: # get: cmd
    match cmd:
        case 'configfile':
            value = { 'name' : os.path.basename( cdsp.get_config_name() ) }
        case 'data':
            value = {
                  'page'     : 'camilla'
                , 'config'   : cdsp.get_config()
                , 'volume'   : cdsp.get_volume()
                , 'mute'     : cdsp.get_mute()
                , 'status'   : status()
                , 'lscoef'   : os.listdir( '/srv/http/data/camilladsp/coeffs' )
                , 'lsconf'   : os.listdir( '/srv/http/data/camilladsp/configs' )
                , 'fileconf' : os.path.basename( cdsp.get_config_name().rsplit( '.' )[ 0 ] )
            }
        case 'status':
            value = { 'page': 'camilla', 'status': status() }
    
    value = json.dumps( value )
    print( value )
    
cdsp.disconnect()


# get ########################################################################################
sys.exit()
volume_in        = cdsp.get_capture_signal_rms()   # [ -8.446171, -8.365935 ]
volume_in_peak   = cdsp.get_capture_signal_peak()  # [ -16.462996, -16.014568 ]
volume_out       = cdsp.get_playback_signal_rms()  # [ -8.446171, -8.365935 ]
volume_out_peak  = cdsp.get_playback_signal_peak() # [ -16.462996, -16.014568 ]

signal_range     = cdsp.get_signal_range()
signal_range_db  = cdsp.get_signal_range_dB()
capture_rate_raw = cdsp.get_capture_rate_raw()
update_interval  = cdsp.get_update_interval()

# set ########################################################################################
cdsp.set_update_interval( 100 )
