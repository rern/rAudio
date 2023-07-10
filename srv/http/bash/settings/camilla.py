#!/usr/bin/python

import json
import os
import os.path
import sys
from camilladsp import CamillaConnection, CamillaError

cdsp = CamillaConnection( '127.0.0.1', 1234 )
cdsp.connect()

pathconfigs = '/srv/http/data/camilladsp/configs/'

# with open( '/srv/http/data/system/save.json', 'r' ) as f:
#    config = json.load( f )
# cdsp.validate_config( config )

cmd = sys.argv[ 1 ]

if len( sys.argv ) > 2: # set: cmd val
    val = sys.argv[ 2 ]
    with open( '/srv/http/data/shm/xpython', 'w' ) as f:
        json.dump( sys.argv[ 2 ], f )
    match cmd:
        case 'mute':
            cdsp.set_mute( val == 'true' )
        case 'volume':
            cdsp.set_volume( float( val ) )
        case 'load':
            if val[-4:] == '.yml': val = val[0:-4]
            set_config_name( pathconfigs + val +'.yml' )
            cdsp.reload()
        case 'read':
            if val[-4:] == '.yml': val = val[0:-4]
            value = cdsp.read_config_file( pathconfigs + val +'.yml' )
        case 'save': # json file to yml
            import yaml
            try:
                with open( val, 'r' ) as f:
                    config = json.load( f )
                yml  = yaml.dump( config ).encode( 'utf-8' )
                file = cdsp.get_config_name()
                with open( file, 'wb' ) as f:
                    f.write( yml )
                cdsp.reload()
            except Exception as e:
                print( -1 )
        case 'validate': # json file
            import yaml
            try:
                with open( val, 'r' ) as f:
                    config = json.load( f )
                cdsp.validate_config( config )
            except Exception as e:
                print( -1 )
else: # get: cmd
    match cmd:
        case 'configname':
            value = { 'name': os.path.basename( cdsp.get_config_name() ) }
        case 'connected':
            value = { 'connected': cdsp.is_connected() }
        case 'data':
            value = {
                  'page'   : 'camilla'
                , 'config' : cdsp.get_config()
                , 'volume' : cdsp.get_volume()
                , 'mute' : cdsp.get_mute()
                , 'name' : os.path.basename( cdsp.get_config_name() )
                , 'status' : {
                      'state'           : cdsp.get_state().name
                    , 'capture_rate'    : cdsp.get_capture_rate()
                    , 'rate_adjust'     : cdsp.get_rate_adjust()
                    , 'clipped_samples' : cdsp.get_clipped_samples()
                    , 'buffer_level'    : cdsp.get_buffer_level()
                }
                , 'lscoef' : os.listdir( '/srv/http/data/camilladsp/coeffs' )
                , 'lsconf' : os.listdir( '/srv/http/data/camilladsp/configs' )
            }
        case 'previous':
            value = cdsp.get_previous_config()
        case 'version': # camilladsp
            value = {
                  'camilladsp' : '.'.join( cdsp.get_version() )
                , 'library'    : '.'.join( map( str, cdsp.get_library_version() ) )
            }
    
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
