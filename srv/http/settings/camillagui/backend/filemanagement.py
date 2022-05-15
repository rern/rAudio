import io
import os
import zipfile
from copy import deepcopy
from os.path import isfile, islink, split, join, relpath, normpath, isabs, commonpath

import yaml
from aiohttp import web


def file_in_folder(folder, filename):
    if '/' in filename or '\\' in filename:
        raise IOError("Filename may not contain any slashes/backslashes")
    return os.path.abspath(os.path.join(folder, filename))


def path_of_configfile(request, config_name):
    config_folder = request.app["config_dir"]
    return file_in_folder(config_folder, config_name)


async def store_files(folder, request):
    data = await request.post()
    i = 0
    while True:
        filename = "file{}".format(i)
        if filename not in data:
            break
        file = data[filename]
        filename = file.filename
        content = file.file.read()
        with open(file_in_folder(folder, filename), "wb") as f:
            f.write(content)
        i += 1
    return web.Response(text="Saved {} file(s)".format(i))


def list_of_files_in_directory(folder):
    files = [file_in_folder(folder, file)
             for file in os.listdir(folder)
             if os.path.isfile(file_in_folder(folder, file))]
    files_list = []
    for f in files:
        fname = os.path.basename(f)
        files_list.append(fname)
    return sorted(files_list, key=lambda x: x.lower())


def delete_files(folder, files):
    for file in files:
        path = file_in_folder(folder, file)
        os.remove(path)


async def zip_response(request, zip_file, file_name):
    response = web.StreamResponse()
    response.headers.add("Content-Disposition", "attachment; filename=" + file_name)
    await response.prepare(request)
    await response.write(zip_file)
    await response.write_eof()
    return response


def zip_of_files(folder, files):
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "a", zipfile.ZIP_DEFLATED, False) as zip_file:
        for file_name in files:
            file_path = file_in_folder(folder, file_name)
            with open(file_path, 'r') as file:
                zip_file.writestr(file_name, file.read())
    return zip_buffer.getvalue()


def get_yaml_as_json(request, path):
    validator = request.app["VALIDATOR"]
    validator.validate_file(path)
    return validator.get_config()


def get_active_config(request):
    active_config = request.app["active_config"]
    on_get = request.app["on_get_active_config"]
    if not on_get:
        if islink(active_config) and isfile(active_config):
            target = os.readlink(active_config)
            _head, tail = split(target)
            return tail
        else:
            return None
    else:
        try:
            print(f"Running command: {on_get}")
            stream = os.popen(on_get)
            result = stream.read().strip()
            _head, tail = split(result)
            print(f"Command result: {result}, filename: {tail}")
            return tail
        except Exception as e:
            print(f"Failed to run on_get_active_config command, error: {e}")
            return None


def set_as_active_config(request, file):
    active_config = request.app["active_config"]
    update = request.app["update_symlink"]
    on_set = request.app["on_set_active_config"]
    if update:
        if not active_config:
            return
        try:
            if islink(active_config):
                os.unlink(active_config)
            os.symlink(file, active_config)
        except Exception as e:
            print(f"Failed to update symlink, error: {e}")
            if os.name == "nt":
                print("Creating symlinks on Windows requires special privileges or admin rights.")
    if on_set:
        try:
            cmd = on_set.format(f'"{file}"')
            print(f"Running command: {cmd}")
            os.system(cmd)
        except Exception as e:
            print(f"Failed to run on_set_active_config command, error: {e}")


def save_config(config_name, json_config, request):
    config_file = path_of_configfile(request, config_name)
    yaml_config = yaml.dump(json_config).encode('utf-8')
    with open(config_file, "wb") as f:
        f.write(yaml_config)


def coeff_dir_relative_to_config_dir(request):
    relative_coeff_dir = relpath(request.app["coeff_dir"], start=request.app["config_dir"])
    coeff_dir_with_folder_separator_at_end = join(relative_coeff_dir, '')
    return coeff_dir_with_folder_separator_at_end


def new_config_with_absolute_filter_paths(json_config, config_dir):
    def conversion(path): return make_absolute(path, config_dir)
    return new_config_with_paths_converted(json_config, conversion)


def new_config_with_relative_filter_paths(json_config, config_dir):
    def conversion(path): return make_relative(path, config_dir)
    return new_config_with_paths_converted(json_config, conversion)


def new_config_with_paths_converted(json_config, conversion):
    config = deepcopy(json_config)
    filters = config["filters"]
    for filterName in filters:
        filt = filters[filterName]
        convert_filter_path(filt, conversion)
    return config


def convert_filter_path(json_filter, conversion):
    ftype = json_filter["type"]
    parameters = json_filter["parameters"]
    if ftype == "Conv" and parameters["type"] in ["Raw", "Wav"]:
        parameters["filename"] = conversion(parameters["filename"])


def replace_relative_filter_path_with_absolute_paths(json_filter, config_dir):
    def conversion(path): return make_absolute(path, config_dir)
    convert_filter_path(json_filter, conversion)


def make_absolute(path, base_dir):
    return path if isabs(path) else normpath(join(base_dir, path))


def replace_tokens_in_filter_config(filterconfig, samplerate, channels):
    ftype = filterconfig["type"]
    parameters = filterconfig["parameters"]
    if ftype == "Conv" and parameters["type"] in ["Raw", "Wav"]:
        parameters["filename"] = parameters["filename"]\
            .replace("$samplerate$", str(samplerate))\
            .replace("$channels$", str(channels))


def make_relative(path, base_dir):
    return relpath(path, start=base_dir) if isabs(path) else path


def is_path_in_folder(path, folder):
    return folder == commonpath([path, folder])
