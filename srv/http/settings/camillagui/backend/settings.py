import os
import pathlib

import yaml

BASEPATH = pathlib.Path(__file__).parent.parent.absolute()
CONFIG_PATH = BASEPATH / 'config' / 'camillagui.yml'
GUI_CONFIG_PATH = BASEPATH / 'config' / 'gui-config.yml'

GUI_CONFIG_DEFAULTS = {
    "hide_capture_samplerate": False,
    "hide_silence": False,
    "hide_capture_device": False,
    "hide_playback_device": False,
}

def get_config(path):
    with open(path) as f:
        config = yaml.safe_load(f)
    config["config_dir"] = os.path.abspath(os.path.expanduser(config["config_dir"]))
    config["coeff_dir"] = os.path.abspath(os.path.expanduser(config["coeff_dir"]))
    config["default_config"] = absolute_path_or_none_if_empty(config["default_config"])
    config["active_config"] = absolute_path_or_none_if_empty(config["active_config"])
    if "update_symlink" not in config:
        config["update_symlink"] = True
    if "on_set_active_config" not in config:
        config["on_set_active_config"] = None
    if "on_get_active_config" not in config:
        config["on_get_active_config"] = None
    if "supported_capture_types" not in config:
        config["supported_capture_types"] = None
    if "supported_playback_types" not in config:
        config["supported_playback_types"] = None
    print("Backend configuration:")
    print(yaml.dump(config))
    return config


def absolute_path_or_none_if_empty(path):
    if path:
        return os.path.abspath(os.path.expanduser(path))
    else:
        return None

def get_gui_config_or_defaults():
    try:
        with open(GUI_CONFIG_PATH) as yaml_config:
            json_config = yaml.safe_load(yaml_config)
        return json_config
    except Exception:
        print("Unable to read gui config file, using defaults")
        return GUI_CONFIG_DEFAULTS

config = get_config(CONFIG_PATH)
