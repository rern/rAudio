import re
from os.path import splitext, basename

FORMAT_MAP = {
    ".txt": "TEXT", 
    ".csv": "TEXT", 
    ".tsv": "TEXT",
    ".dbl": "FLOAT64LE",
    ".raw": "S32LE",
    ".pcm": "S32LE",
    ".dat": "S32LE",
    ".sam": "S32LE",
    ".f32": "FLOAT32LE", 
    ".f64": "FLOAT64LE", 
    ".i32": "S32LE",
    ".i24": "S24LE3",
    ".i16": "S16LE",
}


def defaults_for_filter(file_path):
    extension = splitext(file_path)[1].lower()
    if extension == ".wav":
        return {"type": "Wav"}
    elif extension in FORMAT_MAP.keys():
        return {
            "type": "Raw",
            "format": FORMAT_MAP[extension],
            "skip_bytes_lines": 0,
            "read_bytes_lines": 0,
        }
    else:
        return {}


def filter_options(filter_file_names, filename):
    filename_pattern = pattern_from_filter_file_name(filename)
    options = []
    for file in filter_file_names:
        match = filename_pattern.match(file)
        if match:
            option = {"name": file}
            groups = match.groupdict()
            if "samplerate" in groups:
                option["samplerate"] = int(groups["samplerate"])
            if "channels" in groups:
                option["channels"] = int(groups["channels"])
            options.append(option)
    return options


def pattern_from_filter_file_name(path):
    filename = re.escape(basename(path))
    pattern = filename.replace(r"\$samplerate\$", "(?P<samplerate>\\d*)")\
        .replace(r"\$channels\$", "(?P<channels>\\d*)")
    return re.compile(pattern)


def pipeline_step_options(filter_file_names, config, step_index):
    samplerates_and_channels_for_filter = map_of_samplerates_and_channels_per_filter(
        config, filter_file_names,step_index)
    all_samplerate_and_channel_options = set_of_all_samplerate_and_channel_options(samplerates_and_channels_for_filter)
    samplerate_and_channel_options = set_of_samplerate_and_channel_options_available_for_all_filters(
        all_samplerate_and_channel_options, samplerates_and_channels_for_filter)
    return options_as_json(samplerate_and_channel_options)


def map_of_samplerates_and_channels_per_filter(config, filter_file_names, step_index):
    step_filters = config["pipeline"][step_index]["names"]
    default_samplerate = config["devices"]["samplerate"]
    default_channels = config["devices"]["capture"]["channels"]
    samplerates_and_channels_for_filter = {}
    for filter_name in step_filters:
        filter = config["filters"][filter_name]
        parameters = filter["parameters"]
        if filter["type"] == "Conv" and parameters["type"] in {"Raw", "Wav"}:
            filename = parameters["filename"]
            samplerates_and_channels_for_filter[filter_name] = samplerate_and_channel_pairs_from_options(
                filter_options(filter_file_names, filename),
                default_samplerate,
                default_channels
            )
    return samplerates_and_channels_for_filter


def samplerate_and_channel_pairs_from_options(options, default_samplerate, default_channels):
    pairs = set()
    for option in options:
        samplerate = option["samplerate"] if "samplerate" in option else default_samplerate
        channels = option["channels"] if "channels" in option else default_channels
        pairs.add((samplerate, channels))
    return pairs


def set_of_all_samplerate_and_channel_options(samplerates_and_channels_for_filter):
    samplerate_and_channel_options = set()
    for filter_name in samplerates_and_channels_for_filter:
        samplerate_and_channel_options.update(samplerates_and_channels_for_filter[filter_name])
    return samplerate_and_channel_options


def set_of_samplerate_and_channel_options_available_for_all_filters(samplerate_and_channel_options,
                                                                    samplerates_and_channels_for_filter):
    options_available_for_all_filters = set(samplerate_and_channel_options)
    for filter_name in samplerates_and_channels_for_filter:
        options_available_for_all_filters.intersection_update(samplerates_and_channels_for_filter[filter_name])
    return options_available_for_all_filters


def options_as_json(samplerate_and_channel_options):
    step_options = []
    for option in samplerate_and_channel_options:
        samplerate = option[0]
        channels = option[1]
        step_options.append(
            {
                "name": str(samplerate) + " Hz - " + str(channels) + " Channels",
                "samplerate": samplerate,
                "channels": channels
            }
        )
    step_options.sort(key=lambda x: x["name"])
    return step_options
