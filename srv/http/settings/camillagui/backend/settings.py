import os
import pathlib
import sys

import yaml
from yaml.scanner import ScannerError

BASEPATH = pathlib.Path(__file__).parent.parent.absolute()
CONFIG_PATH = BASEPATH / 'config' / 'camillagui.yml'
GUI_CONFIG_PATH = BASEPATH / 'config' / 'gui-config.yml'

# Default values for the optional gui config.
GUI_CONFIG_DEFAULTS = {
    "hide_capture_samplerate": False,
    "hide_silence": False,
    "hide_capture_device": False,
    "hide_playback_device": False,
    "applyConfigAutomatically": False,
}

# Default values for the optional settings.
BACKEND_CONFIG_DEFAULTS = {
    "update_symlink": True,
    "on_set_active_config": None,
    "on_get_active_config": None,
    "supported_capture_types": None,
    "supported_playback_types": None,
    "log_file": None,
}

def _load_yaml(path):
    try:
        with open(path) as f:
            config = yaml.safe_load(f)
            return config
    except ScannerError as e:
        print(f"ERROR! Invalid yaml syntax in config file: {path}")
        print(f"Details: {e}")
    except OSError as e:
        print(f"ERROR! Config file could not be opened: {path}")
        print(f"Details: {e}")
    return None
    

def get_config(path):
    config = _load_yaml(path)
    if config is None:
        sys.exit()
    config["config_dir"] = os.path.abspath(os.path.expanduser(config["config_dir"]))
    config["coeff_dir"] = os.path.abspath(os.path.expanduser(config["coeff_dir"]))
    config["default_config"] = absolute_path_or_none_if_empty(config["default_config"])
    config["active_config"] = absolute_path_or_none_if_empty(config["active_config"])
    for key, value in BACKEND_CONFIG_DEFAULTS.items():
        if key not in config:
            config[key] = value
    print("Backend configuration:")
    print(yaml.dump(config))
    return config


def absolute_path_or_none_if_empty(path):
    if path:
        return os.path.abspath(os.path.expanduser(path))
    else:
        return None


def get_gui_config_or_defaults():
    config = _load_yaml(GUI_CONFIG_PATH)
    if config is not None:
        for key, value in GUI_CONFIG_DEFAULTS.items():
            if key not in config:
                config[key] = value
        return config
    else:    
        print("Unable to read gui config file, using defaults")
        return GUI_CONFIG_DEFAULTS



config = get_config(CONFIG_PATH)