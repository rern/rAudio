from aiohttp import web
from camilladsp import CamillaConnection
from camilladsp_plot.validate_config import CamillaValidator

from backend.routes import setup_routes, setup_static_routes
from backend.settings import config

app = web.Application(client_max_size=1024 ** 3)
app["config_dir"] = config["config_dir"]
app["coeff_dir"] = config["coeff_dir"]
app["default_config"] = config["default_config"]
app["active_config"] = config["active_config"]
app["update_symlink"] = config["update_symlink"]
app["on_set_active_config"] = config["on_set_active_config"]
app["on_get_active_config"] = config["on_get_active_config"]
setup_routes(app)
setup_static_routes(app)

camillaconnection = CamillaConnection(config["camilla_host"], config["camilla_port"])
camillavalidator = CamillaValidator()
if config["supported_capture_types"] is not None:
    camillavalidator.set_supported_capture_types(config["supported_capture_types"])
if config["supported_playback_types"] is not None:
    camillavalidator.set_supported_playback_types(config["supported_playback_types"])
#camillaconnection.connect()
app["CAMILLA"] = camillaconnection
app["VALIDATOR"] = camillavalidator
web.run_app(app, port=config["port"])
