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
    data = cdsp.get_state().name.capitalize() + br \
         + str( cdsp.get_capture_rate() ) + br \
         + str( cdsp.get_rate_adjust() ) + br \
         + str( cdsp.get_clipped_samples() ) +br \
         + str( cdsp.get_buffer_level() )
    return data
    
value = {
      'page'     : 'camilla'
    , 'config'   : cdsp.get_config()
    , 'volume'   : cdsp.get_volume()
    , 'mute'     : cdsp.get_mute()
    , 'status'   : status()
    , 'lscoef'   : sorted( os.listdir( '/srv/http/data/camilladsp/coeffs' ) )
    , 'lsconf'   : sorted( os.listdir( pathconfigs ) )
    , 'fileconf' : os.path.basename( cdsp.get_config_name() )
}

value = json.dumps( value )
print( value )

cdsp.disconnect()
