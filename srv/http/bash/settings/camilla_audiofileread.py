#!/usr/bin/python

import struct
import csv
import itertools
from camilla_cooley_tukey import fft

NUMBERFORMATS = {
    1: "int",
    3: "float",
    0xFFFE: "extended",
}

SUBFORMAT_FLOAT = (3, 0, 16, 128, 0, 0, 170, 0, 56, 155, 113)
SUBFORMAT_INT = (1, 0, 16, 128, 0, 0, 170, 0, 56, 155, 113)

TYPES_DIRECT = {
    "FLOAT64LE": "<d",
    "FLOAT32LE": "<f",
    "S16LE": "<h",
    "S32LE": "<i",
}

TYPES_INDIRECT = {
    "S24LE": {"pattern": "sssx", "endian": "little"},
    "S24LE3": {"pattern": "sss", "endian": "little"},
}

SCALEFACTOR = {
    "FLOAT64LE": 1.0,
    "FLOAT32LE": 1.0,
    "S16LE": (2**15),
    "S24LE": (2**23),
    "S24LE3": (2**23),
    "S32LE": (2**31),
}

BYTESPERSAMPLE = {
    "FLOAT64LE": 8,
    "FLOAT32LE": 4,
    "S16LE": 2,
    "S24LE": 4,
    "S24LE3": 3,
    "S32LE": 4,
}


def read_coeffs(conf):
    if conf["type"] == "Raw":
        fname = conf["filename"]
        sampleformat = conf.get("format", "TEXT")
        read_nbr = conf.get("read_bytes_lines", None)
        if read_nbr == 0:
            read_nbr = None
        skip_nbr = conf.get("skip_bytes_lines", 0)
        values = read_raw_coeffs(
            fname, sampleformat, skip_nbr=skip_nbr, read_nbr=read_nbr
        )
        return values
    elif conf["type"] == "Wav":
        channel = conf.get("channel", 0)
        fname = conf["filename"]
        values = read_wav_coeffs(fname, channel)
        return values


def read_raw_coeffs(filename, sampleformat=None, skip_nbr=0, read_nbr=None):
    if read_nbr == 0:
        read_nbr = None
    if sampleformat == "TEXT":
        values = read_text_coeffs(filename, skip_nbr, read_nbr)
    else:
        if sampleformat in TYPES_DIRECT:
            values = read_binary_direct_coeffs(
                filename, sampleformat, skip_nbr, read_nbr
            )
        elif sampleformat in TYPES_INDIRECT:
            values = read_binary_indirect_coeffs(
                filename, sampleformat, skip_nbr, read_nbr
            )
        else:
            raise ValueError(f"Unsupported format {sampleformat}")
    return values


def read_text_coeffs(fname, skip_lines, read_lines):
    if read_lines == 0:
        read_lines = None
    with open(fname) as f:
        rawvalues = itertools.islice(csv.reader(f), skip_lines, read_lines)
        values = [float(row[0]) for row in rawvalues]
    return values


def read_binary_direct_coeffs(fname, sampleformat, skip_bytes, read_bytes):

    if read_bytes is None:
        count = -1
    else:
        count = read_bytes

    datatype = TYPES_DIRECT[sampleformat]
    factor = SCALEFACTOR[sampleformat]
    with open(fname, "rb") as f:
        f.seek(skip_bytes)
        data = f.read(count)
    values = [float(val[0]) / factor for val in struct.iter_unpack(datatype, data)]
    return values


def read_binary_indirect_coeffs(fname, sampleformat, skip_bytes, read_bytes):

    if read_bytes is None:
        count = -1
    else:
        count = read_bytes

    pattern = TYPES_INDIRECT[sampleformat]["pattern"]
    factor = SCALEFACTOR[sampleformat]
    endian = TYPES_INDIRECT[sampleformat]["endian"]
    with open(fname, "rb") as f:
        f.seek(skip_bytes)
        data = f.read(count)
    values = [
        int.from_bytes(b"".join(val), endian, signed=True) / factor
        for val in struct.iter_unpack(pattern, data)
    ]
    return values


def read_wav_coeffs(fname, channel):
    params = read_wav_header(fname)
    if params is None:
        raise ValueError(f"Invalid or unsupported wav file '{fname}'")
    if channel >= params["channels"]:
        raise ValueError(
            f"Can't read channel {channel} from {fname} which has {params['channels']} channels"
        )
    allvalues = read_raw_coeffs(
        fname,
        sampleformat=params["sampleformat"],
        skip_nbr=params["dataoffset"],
        read_nbr=params["datalength"],
    )
    values = allvalues[channel :: params["channels"]]
    return values


def analyze_wav_chunk(type, start, length, file, wav_info):
    if type == "fmt ":
        data = file.read(length)
        wav_info["sampleformat"] = NUMBERFORMATS.get(
            struct.unpack("<H", data[0:2])[0], "unknown"
        )
        wav_info["channels"] = struct.unpack("<H", data[2:4])[0]
        wav_info["samplerate"] = struct.unpack("<L", data[4:8])[0]
        wav_info["byterate"] = struct.unpack("<L", data[8:12])[0]
        wav_info["bytesperframe"] = struct.unpack("<H", data[12:14])[0]
        wav_info["bitspersample"] = struct.unpack("<H", data[14:16])[0]
        bytes_per_sample = wav_info["bytesperframe"] / wav_info["channels"]

        # Handle extended fmt chunk
        if wav_info["sampleformat"] == "extended":
            if length != 40:
                print("Invalid extended wav header")
                return
            cb_size = struct.unpack("<H", data[16:18])[0]
            valid_bits_per_sample = struct.unpack("<H", data[18:20])[0]
            if cb_size != 22 or valid_bits_per_sample != wav_info["bitspersample"]:
                print("Invalid extended wav header")
                return
            _channel_mask = struct.unpack("<L", data[20:24])[0]
            subformat = struct.unpack("<LHHBBBBBBBB", data[24:40])
            if subformat == SUBFORMAT_FLOAT:
                wav_info["sampleformat"] = "float"
            elif subformat == SUBFORMAT_INT:
                wav_info["sampleformat"] = "int"
            else:
                wav_info["sampleformat"] = "unknown"

        if wav_info["sampleformat"] == "int":
            if wav_info["bitspersample"] == 16:
                sfmt = "S16LE"
            elif wav_info["bitspersample"] == 24 and bytes_per_sample == 3:
                sfmt = "S24LE3"
            elif wav_info["bitspersample"] == 24 and bytes_per_sample == 4:
                sfmt = "S24LE"
            elif wav_info["bitspersample"] == 32:
                sfmt = "S32LE"
        elif wav_info["sampleformat"] == "float":
            if wav_info["bitspersample"] == 32:
                sfmt = "FLOAT32LE"
            elif wav_info["bitspersample"] == 64:
                sfmt = "FLOAT64LE"
        else:
            sfmt = "unknown"
        wav_info["sampleformat"] = sfmt
    elif type == "data":
        wav_info["dataoffset"] = start + 8
        wav_info["datalength"] = length


def read_wav_header(filename):
    """
    Reads the wav header to extract sample format, number of channels, and location of the audio data in the file
    """
    try:
        with open(filename, "rb") as file_in:
            # Read fixed header
            buf_header = file_in.read(12)
            # Verify that the correct identifiers are present
            if (buf_header[0:4] != b"RIFF") or (buf_header[8:12] != b"WAVE"):
                print("Input file is not a standard WAV file")
                return

            wav_info = {
                "dataoffset": None,
                "datalength": None,
                "sampleformat": None,
                "bitspersample": None,
                "channels": None,
                "byterate": None,
                "samplerate": None,
                "bytesperframe": None,
            }

            # Get file length
            file_in.seek(0, 2)  # Seek to end of file
            input_filesize = file_in.tell()

            next_chunk_location = 12  # skip the fixed header
            while True:
                file_in.seek(next_chunk_location)
                buf_header = file_in.read(8)
                chunk_type = buf_header[0:4].decode("utf-8")
                chunk_length = struct.unpack("<L", buf_header[4:8])[0]
                analyze_wav_chunk(
                    chunk_type, next_chunk_location, chunk_length, file_in, wav_info
                )
                next_chunk_location += 8 + chunk_length
                if next_chunk_location >= input_filesize:
                    break
            if wav_info["datalength"] is not None and wav_info["sampleformat"] not in [
                None,
                "unknown",
            ]:
                return wav_info
    except IOError as err:
        print(
            'Could not open input file: "{}", error: {}'.format(str(filename), str(err))
        )
        return

import sys
import json

conf    = json.loads( sys.argv[ 1 ] )
impulse = read_coeffs( conf )
fft_imp = fft( impulse )
f_i     = [ { "re": z.real, "im": z.imag } for z in fft_imp ]

print( json.dumps( [ impulse, f_i ] ) )
