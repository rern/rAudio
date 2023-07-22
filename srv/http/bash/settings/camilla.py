#!/usr/bin/python

import json
import os
import os.path
import sys
from camilladsp import CamillaConnection, CamillaError

dircamilladsp = '/srv/http/data/camilladsp/'

cdsp = CamillaConnection( '127.0.0.1', 1234 )
cdsp.connect()

if len( sys.argv ) > 1: # set / save volume on start / stop
    filevolume = '/srv/http/data/system/camilla-volume'
    if sys.argv[ 1 ] == 'volumestart':
        with open( filevolume, 'r' ) as f:
            volume = f.read()
        cdsp.set_volume( float( volume ) )
    else:
        with open( filevolume, 'w' ) as f:
            f.write( str( cdsp.get_volume() ) )
    sys.exit()

br = '<br>'

value = {
      'page'       : 'camilla'
    , 'config'     : cdsp.get_config()
    , 'devicetype' : cdsp.get_supported_device_types()
    , 'volume'     : cdsp.get_volume()
    , 'mute'       : cdsp.get_mute()
    , 'status'     : cdsp.get_state().name.capitalize() + br \
                    + str( cdsp.get_capture_rate() ) + br \
                    + str( cdsp.get_rate_adjust() ) + br \
                    + str( cdsp.get_clipped_samples() ) +br \
                    + str( cdsp.get_buffer_level() )
    , 'lscoef'     : sorted( os.listdir( dircamilladsp +'coeffs' ) )
    , 'lsconf'     : sorted( os.listdir( dircamilladsp +'/configs' ) )
    , 'fileconf'   : os.path.basename( cdsp.get_config_name() )
}

value = json.dumps( value )
print( value )

cdsp.disconnect()
