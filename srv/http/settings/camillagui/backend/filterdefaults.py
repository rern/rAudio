from os.path import splitext


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