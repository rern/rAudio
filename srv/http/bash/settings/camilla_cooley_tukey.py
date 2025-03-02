# Adapted from https://jeremykun.com/2012/07/18/the-fast-fourier-transform/
import cmath
import math

try:
    import numpy.fft as npfft
except ImportError:
    npfft = None


def omega(p, q):
    return cmath.exp((2.0 * cmath.pi * 1j * q) / p)


OMEGA41 = omega(4, -1)
OMEGA81 = omega(8, -1)
OMEGA82 = omega(8, -2)
OMEGA83 = omega(8, -3)

TWIDDLES = {}


def get_twiddles(n):
    if n in TWIDDLES:
        return TWIDDLES[n]
    else:
        tw = [omega(n, -m) for m in range(int(n / 2))]
        TWIDDLES[n] = tw
        return tw


def _fft4(signal):
    Fe0 = signal[0] + signal[2]
    Fe1 = signal[0] - signal[2]
    Fo0 = signal[1] + signal[3]
    Fo1 = signal[1] - signal[3]

    F11 = OMEGA41 * Fo1
    return (
        Fe0 + Fo0,
        Fe1 + F11,
        Fe0 - Fo0,
        Fe1 - F11,
    )


def _fft8(signal):
    Feven = _fft4(signal[0::2])
    Fodd = _fft4(signal[1::2])
    t0 = Fodd[0]
    t1 = Fodd[1] * OMEGA81
    t2 = Fodd[2] * OMEGA82
    t3 = Fodd[3] * OMEGA83
    return (
        Feven[0] + t0,
        Feven[1] + t1,
        Feven[2] + t2,
        Feven[3] + t3,
        Feven[0] - t0,
        Feven[1] - t1,
        Feven[2] - t2,
        Feven[3] - t3,
    )


def _fft(signal):
    n = len(signal)
    if n == 8:
        return _fft8(signal)
    elif n == 4:
        return _fft4(signal)
    elif n == 1:
        return signal
    else:
        Feven = _fft(signal[0::2])
        Fodd = _fft(signal[1::2])
        tw = get_twiddles(n)
        twiddled = [t * fo for fo, t in zip(Fodd, tw)]
        combined = [fe + ft for fe, ft in zip(Feven, twiddled)] + [
            fe - ft for fe, ft in zip(Feven, twiddled)
        ]
        return combined


def pyfft(signal):
    orig_len = len(signal)
    fft_len = 2 ** (math.ceil(math.log2(orig_len)))
    padding = [0.0 for _n in range(fft_len - orig_len)]
    signal.extend(padding)
    fftsig = _fft(signal)
    return fftsig


def fft(signal):
    orig_len = len(signal)
    fft_len = 2 ** (math.ceil(math.log2(orig_len)))
    padding = [0.0 for _n in range(fft_len - orig_len)]
    signal.extend(padding)
    if npfft is not None:
        fftsig = npfft.fft(signal)
    else:
        fftsig = _fft(signal)
    return fftsig


if __name__ == "__main__":
    # testing area, compare to numpy fft
    import numpy as np
    import numpy.fft as npfft
    import time

    data_test = [n for n in range(16)]
    pyf = pyfft(data_test)
    npf = npfft.fft(data_test)

    for n in range(len(pyf)):
        print(abs(pyf[n] - npf[n]))

    data = [float(n) for n in range(2**16)]

    start = time.time()
    nf = npfft.fft(data)
    print(f"numpy took {(time.time()-start)*1000} ms")
    start = time.time()
    pf = pyfft(data)
    print(f"python fft took {(time.time()-start)*1000} ms")
    start = time.time()
    af = fft(data)
    print(f"auto fft took {(time.time()-start)*1000} ms")

    for n in range(len(nf)):
        val = abs(pf[n] - nf[n])
        if val > 0.001:
            print("bad!", n, val)
            