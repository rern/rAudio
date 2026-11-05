#!/bin/python
"""Drain ALSA's file PCM pipe without letting a FIFO reader stall playback."""

import errno
import os
import stat
import sys


def main():
    frame_bytes = int(sys.argv[1]) * int(sys.argv[2]) // 8
    # Writes no larger than PIPE_BUF are atomic: dropping a full chunk keeps
    # the reader aligned to PCM frames even when its FIFO buffer fills up.
    chunk_bytes = 4096 // frame_bytes * frame_bytes
    if not chunk_bytes:
        return
    fd = None
    try:
        while True:
            chunk = sys.stdin.buffer.read(chunk_bytes)
            if not chunk:
                break
            try:
                if fd is None:
                    fd = os.open('/tmp/alsa-tap.fifo',
                                 os.O_WRONLY | os.O_NONBLOCK | os.O_NOFOLLOW)
                    if not stat.S_ISFIFO(os.fstat(fd).st_mode):
                        os.close(fd)
                        fd = None
                        continue
                os.write(fd, chunk)
            except OSError as error:
                if error.errno not in (errno.EAGAIN, errno.EWOULDBLOCK):
                    if fd is not None:
                        os.close(fd)
                        fd = None
    finally:
        if fd is not None:
            os.close(fd)


if __name__ == '__main__':
    main()
