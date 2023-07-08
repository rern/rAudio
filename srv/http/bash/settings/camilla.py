#!/usr/bin/python

import json
import os
import os.path
import sys
from camilladsp import CamillaConnection, CamillaError

cdsp = CamillaConnection( '127.0.0.1', 1234 )
cdsp.connect()

pathconfigs = '/srv/http/data/camilladsp/configs/'

cmd = sys.argv[ 1 ]

if len( sys.argv ) > 2: # set: cmd val
    val = sys.argv[ 2 ]
    match cmd:
        case 'mute':
            cdsp.set_mute( val == 'true' )
        case 'volume':
            cdsp.set_volume( float( val ) )
        case 'load':
            if val[-4:] == '.yml': val = val[0:-4]
            set_config_name( pathconfigs + val +'.yml' )
            cdsp.reload()
        case 'save':
            import yaml
            try:
                config = cdsp.validate_config( json.loads( val ) )
                yml    = yaml.dump( config ).encode( 'utf-8' )
                file   = cdsp.get_config_name()
                with open( file, 'wb' ) as f:
                    f.write( yml )
                cdsp.reload()
            except Exception as e:
                print( -1 )
        case 'validate':
            import yaml
            try:
                cdsp.validate_config( json.loads( val ) )
            except Exception as e:
                print( -1 )
else: # get: cmd
    match cmd:
        case 'config':
            value = cdsp.get_config() # { "key": value, ... }
        case 'configname':
            value = { 'name': os.path.basename( cdsp.get_config_name()[0:-4] ) }
        case 'connected':
            value = { 'connected': cdsp.is_connected() }
        case 'data':
            value             = {}
            value[ 'config' ] = cdsp.get_config()
            value[ 'volume' ] = cdsp.get_volume()
            value[ 'mute' ]   = cdsp.get_mute()
            value[ 'name' ]   = os.path.basename( cdsp.get_config_name() )
            value[ 'status' ] = {
                  'state'           : cdsp.get_state().name
                , 'capture_rate'    : cdsp.get_capture_rate()
                , 'rate_adjust'     : cdsp.get_rate_adjust()
                , 'clipped_samples' : cdsp.get_clipped_samples()
                , 'buffer_level'    : cdsp.get_buffer_level()
            }
            value[ 'lscoef' ] = os.listdir( '/srv/http/data/camilladsp/coeffs' )
            value[ 'lsconf' ] = os.listdir( '/srv/http/data/camilladsp/configs' )
        case 'previous':
            value = cdsp.get_previous_config()
        case 'read':
            name = sys.argv[ 2 ]
            if name[-4:] == '.yml': name = name[0:-4]
            value = cdsp.read_config_file( pathconfigs + name +'.yml' )
        case 'status':
            value = {
                  'state'           : cdsp.get_state().name
                , 'capture_rate'    : cdsp.get_capture_rate()
                , 'rate_adjust'     : cdsp.get_rate_adjust()
                , 'clipped_samples' : cdsp.get_clipped_samples()
                , 'buffer_level'    : cdsp.get_buffer_level()
            }
        case 'version': # camilladsp
            value = {
                  'camilladsp' : '.'.join( cdsp.get_version() )
                , 'library'    : '.'.join( map( str, cdsp.get_library_version() ) )
            }
        case 'volume':
            value = {
                  'mute'   : cdsp.get_mute()
                , 'volume' : cdsp.get_volume()
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
