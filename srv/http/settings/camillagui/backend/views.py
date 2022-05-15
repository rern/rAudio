from os.path import isfile, expanduser
import yaml
import threading
import time
from aiohttp import web
from camilladsp import CamillaError
from camilladsp_plot import eval_filter, eval_filterstep

from .filemanagement import (
    path_of_configfile, store_files, list_of_files_in_directory, delete_files,
    zip_response, zip_of_files, get_yaml_as_json, set_as_active_config, get_active_config, save_config,
    new_config_with_absolute_filter_paths, coeff_dir_relative_to_config_dir,
    replace_relative_filter_path_with_absolute_paths, new_config_with_relative_filter_paths,
    make_absolute, replace_tokens_in_filter_config
)
from .filters import defaults_for_filter, filter_options, pipeline_step_options
from .settings import get_gui_config_or_defaults
from .version import VERSION

async def get_gui_index(request):
    raise web.HTTPFound("/gui/index.html")

def _reconnect(cdsp):
    done = False
    while not done:
        try:
            cdsp.connect()
            done = True
        except IOError:
            time.sleep(1)

async def get_status(request):
    cdsp = request.app["CAMILLA"]
    reconnect_thread = request.app["RECONNECT_THREAD"]
    cdsp_version = None
    state_str = "Offline"
    is_online = False
    try:
        state = cdsp.get_state()
        state_str = state.name
        cdsp_version = cdsp.get_version()
        is_online = True
    except IOError:
        if reconnect_thread is None or not reconnect_thread.is_alive():
            reconnect_thread = threading.Thread(target=_reconnect, args=(cdsp,), daemon=True)
            reconnect_thread.start()
            request.app["RECONNECT_THREAD"] = reconnect_thread
    if cdsp_version is None:
        cdsp_version = ['x', 'x', 'x']
    status = {
        "cdsp_status": state_str,
        "cdsp_version": version_string(cdsp_version),
        "py_cdsp_version": version_string(cdsp.get_library_version()),
        "backend_version": version_string(VERSION),
    }
    if is_online:
        try:
            status.update({
                "capturesignalrms": cdsp.get_capture_signal_rms(),
                "capturesignalpeak": cdsp.get_capture_signal_peak(),
                "playbacksignalrms": cdsp.get_playback_signal_rms(),
                "playbacksignalpeak": cdsp.get_playback_signal_peak(),
                "capturerate": cdsp.get_capture_rate(),
                "rateadjust": cdsp.get_rate_adjust(),
                "bufferlevel": cdsp.get_buffer_level(),
                "clippedsamples": cdsp.get_clipped_samples(),
            })
        except IOError:
            pass
    return web.json_response(status)


def version_string(version_array):
    return str(version_array[0]) + "." + str(version_array[1]) + "." + str(version_array[2])


async def get_param(request):
    # Get a parameter value
    name = request.match_info["name"]
    cdsp = request.app["CAMILLA"]
    if name == "volume":
        result = cdsp.get_volume()
    elif name == "signalrange":
        result = cdsp.get_signal_range()
    elif name == "signalrangedb":
        result = cdsp.get_signal_range_dB()
    elif name == "capturerateraw":
        result = cdsp.get_capture_rate_raw()
    elif name == "updateinterval":
        result = cdsp.get_update_interval()
    elif name == "configname":
        result = cdsp.get_config_name()
    elif name == "configraw":
        result = cdsp.get_config_raw()
    else:
        raise web.HTTPNotFound(text=f"Unknown parameter {name}")
    return web.Response(text=str(result))


async def get_list_param(request):
    # Get a parameter value as a list
    name = request.match_info["name"]
    cdsp = request.app["CAMILLA"]
    if name == "capturesignalpeak":
        result = cdsp.get_capture_signal_peak()
    elif name == "playbacksignalpeak":
        result = cdsp.get_playback_signal_peak()
    else:
        result = "[]"
    return web.json_response(result)


async def set_param(request):
    # Set a parameter
    value = await request.text()
    name = request.match_info["name"]
    cdsp = request.app["CAMILLA"]
    if name == "volume":
        cdsp.set_volume(value)
    elif name == "updateinterval":
        cdsp.set_update_interval(value)
    elif name == "configname":
        cdsp.set_config_name(value)
    elif name == "configraw":
        cdsp.set_config_raw(value)
    return web.Response(text="OK")


async def eval_filter_values(request):
    # Plot a filter
    content = await request.json()
    config_dir = request.app["config_dir"]
    config = content["config"]
    replace_relative_filter_path_with_absolute_paths(config, config_dir)
    channels = content["channels"]
    samplerate = content["samplerate"]
    filter_file_names = list_of_files_in_directory(request.app["coeff_dir"])
    if "filename" in config["parameters"]:
        filename = config["parameters"]["filename"]
        options = filter_options(filter_file_names, filename)
    else:
        options = []
    replace_tokens_in_filter_config(config, samplerate, channels)
    data = eval_filter(
        config,
        name=(content["name"]),
        samplerate=samplerate,
        npoints=300,
    )
    data["channels"] = channels
    data["options"] = options
    return web.json_response(data)


async def eval_filterstep_values(request):
    # Plot a filter step
    content = await request.json()
    config = content["config"]
    step_index = content["index"]
    config_dir = request.app["config_dir"]
    samplerate = content["samplerate"]
    channels = content["channels"]
    config["devices"]["samplerate"] = samplerate
    config["devices"]["capture"]["channels"] = channels
    plot_config = new_config_with_absolute_filter_paths(config, config_dir)
    filter_file_names = list_of_files_in_directory(request.app["coeff_dir"])
    options = pipeline_step_options(filter_file_names, config, step_index)
    for _, filt in plot_config["filters"].items():
        replace_tokens_in_filter_config(filt, samplerate, channels)
    data = eval_filterstep(
        plot_config,
        step_index,
        name="Filterstep {}".format(step_index),
        npoints=1000,
    )
    data["channels"] = channels
    data["options"] = options
    return web.json_response(data)


async def get_config(request):
    # Get running config
    cdsp = request.app["CAMILLA"]
    config = cdsp.get_config()
    return web.json_response(config)


async def set_config(request):
    # Apply a new config to CamillaDSP
    json = await request.json()
    json_config = json["config"]
    filename = json.get("filename", None)
    config_dir = request.app["config_dir"]
    cdsp = request.app["CAMILLA"]
    validator = request.app["VALIDATOR"]
    json_config_with_absolute_filter_paths = new_config_with_absolute_filter_paths(json_config, config_dir)
    if cdsp.is_connected():
        try:
            cdsp.set_config(json_config_with_absolute_filter_paths)
        except CamillaError as e:
            return web.Response(status=500, text=str(e))
    else: 
        validator.validate_config(json_config_with_absolute_filter_paths)
        errors = validator.get_errors()
        if len(errors) > 0:
            return web.json_response(data=errors)
    if filename:
        save_config(filename, json_config, request)
    return web.Response(text="OK")


async def get_active_config_file(request):
    active_config = request.app["active_config"]
    default_config = request.app["default_config"]
    config_dir = request.app["config_dir"]
    if active_config and isfile(active_config):
        config = active_config
    elif default_config and isfile(default_config):
        config = default_config
    else:
        return web.Response(status=404, text="No active or default config")
    try:
        json_config = new_config_with_relative_filter_paths(get_yaml_as_json(request, config), config_dir)
    except CamillaError as e:
        return web.Response(status=500, text=str(e))
    except Exception as e:
        return web.Response(status=500, text=str(e))
    active_config_name = get_active_config(request)
    if active_config_name:
        json = {"configFileName": active_config_name, "config": json_config}
    else:
        json = {"config": json_config}
    return web.json_response(json)


async def set_active_config_name(request):
    json = await request.json()
    config_name = json["name"]
    config_file = path_of_configfile(request, config_name)
    set_as_active_config(request, config_file)
    return web.Response(text="OK")


async def get_config_file(request):
    config_dir = request.app["config_dir"]
    config_name = request.query["name"]
    config_file = path_of_configfile(request, config_name)
    try:
        json_config = new_config_with_relative_filter_paths(get_yaml_as_json(request, config_file), config_dir)
    except CamillaError as e:
        return web.Response(status=500, text=str(e))
    return web.json_response(json_config)


async def save_config_file(request):
    json = await request.json()
    save_config(json["filename"], json["config"], request)
    return web.Response(text="OK")


async def config_to_yml(request):
    # Convert a json config to yml string (for saving to disk etc)
    content = await request.json()
    conf_yml = yaml.dump(content)
    return web.Response(text=conf_yml)


async def yml_to_json(request):
    # Parse a yml string and return as json
    config_ymlstr = await request.text()
    validator = request.app["VALIDATOR"]
    validator.validate_yamlstring(config_ymlstr)
    config = validator.get_config()
    return web.json_response(config)


async def validate_config(request):
    # Validate a config, returned completed config
    config_dir = request.app["config_dir"]
    config = await request.json()
    config_with_absolute_filter_paths = new_config_with_absolute_filter_paths(config, config_dir)
    validator = request.app["VALIDATOR"]
    validator.validate_config(config_with_absolute_filter_paths)
    errors = validator.get_errors()
    if len(errors) > 0:
        return web.json_response(status=500, data=errors)
    return web.Response(text="OK")


async def store_coeffs(request):
    folder = request.app["coeff_dir"]
    return await store_files(folder, request)


async def store_configs(request):
    folder = request.app["config_dir"]
    return await store_files(folder, request)


async def get_stored_coeffs(request):
    coeff_dir = request.app["coeff_dir"]
    coeffs = list_of_files_in_directory(coeff_dir)
    return web.json_response(coeffs)


async def get_stored_configs(request):
    config_dir = request.app["config_dir"]
    configs = list_of_files_in_directory(config_dir)
    return web.json_response(configs)


async def delete_coeffs(request):
    coeff_dir = request.app["coeff_dir"]
    files = await request.json()
    delete_files(coeff_dir, files)
    return web.Response(text="ok")


async def delete_configs(request):
    config_dir = request.app["config_dir"]
    files = await request.json()
    delete_files(config_dir, files)
    return web.Response(text="ok")


async def download_coeffs_zip(request):
    coeff_dir = request.app["coeff_dir"]
    files = await request.json()
    zip_file = zip_of_files(coeff_dir, files)
    return await zip_response(request, zip_file, "coeffs.zip")


async def download_configs_zip(request):
    config_dir = request.app["config_dir"]
    files = await request.json()
    zip_file = zip_of_files(config_dir, files)
    return await zip_response(request, zip_file, "configs.zip")


async def get_gui_config(request):
    gui_config = get_gui_config_or_defaults()
    gui_config["coeff_dir"] = coeff_dir_relative_to_config_dir(request)
    gui_config["supported_capture_types"] = request.app["supported_capture_types"]
    gui_config["supported_playback_types"] = request.app["supported_playback_types"]
    return web.json_response(gui_config)


async def get_defaults_for_coeffs(request):
    path = request.query["file"]
    absolute_path = make_absolute(path, request.app["config_dir"])
    defaults = defaults_for_filter(absolute_path)
    return web.json_response(defaults)


async def get_log_file(request):
    log_file_path = request.app["log_file"]
    try:
        with open(expanduser(log_file_path)) as log_file:
            text = log_file.read()
            return web.Response(body=text)
    except OSError:
        print("Unable to read logfile at " + log_file_path)
    if log_file_path:
        error_message = "Please configure CamillaDSP to log to: " + log_file_path
    else:
        error_message = "Please configure a valid 'log_file' path"
    return web.Response(body=error_message)

