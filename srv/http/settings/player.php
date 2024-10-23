<?php
$id_data = [
	  'autoupdate'    => [ 'label' => 'Library Auto Update',   'sub' => 'auto_update',          'setting' => false ]
	, 'bluealsa'      => [ 'label' => 'Bluetooth',             'sub' => 'bluealsa',             'setting' => 'custom', 'status' => true ]
	, 'buffer'        => [ 'label' => 'Buffer - Audio',        'sub' => 'audio_buffer' ]
	, 'crossfade'     => [ 'label' => 'Cross-Fading',          'sub' => 'crossfade' ]
	, 'custom'        => [ 'label' => "User's Configurations", 'sub' => 'custom' ]
	, 'device'        => [ 'label' => 'Device',                                                 'setting' => 'none' ]
	, 'devicewithbt'  => [ 'label' => 'Device + Bluetooth',                                     'setting' => false ]
	, 'dop'           => [ 'label' => 'DSD over PCM',          'sub' => 'dop',                  'setting' => 'none' ]
	, 'ffmpeg'        => [ 'label' => 'FFmpeg',                'sub' => 'decoder',              'setting' => false ]
	, 'mixer'         => [ 'label' => 'Mixer Device',                                           'setting' => 'custom' ]
	, 'mixertype'     => [ 'label' => 'Volume Control',                                         'setting' => 'custom' ]
	, 'normalization' => [ 'label' => 'Normalization',         'sub' => 'volume_normalization', 'setting' => false ]
	, 'novolume'      => [ 'label' => 'No Volume',                                              'setting' => 'none' ]
	, 'outputbuffer'  => [ 'label' => 'Buffer - Output',       'sub' => 'max_output_buffer' ]
	, 'replaygain'    => [ 'label' => 'ReplayGain',            'sub' => 'replaygain' ]
	, 'soxr'          => [ 'label' => 'SoX Resampler',         'sub' => 'resampler' ]
];
commonVariables( [
	  'buttons' => [ 'gear', 'pause', 'play', 'stop', 'volume' ]
	, 'labels'  => [ 
		  [ 'DAB Radio',   'dabradio' ]
		, [ 'Device' ]
		, [ 'Shared Data', 'networks' ]
		, [ 'SoX Resampler' ]
		, [ 'Volume Control' ]
	]
	, 'tabs'    => [ 'features', 'system' ]
] );
// ----------------------------------------------------------------------------------
$head    = [
	  'title'  => '<a class="hideN">Music Player Daemon</a><a class="hideW">MPD</a>'
	, 'status' => 'mpd'
	, 'button' => 'play playback'
	, 'help'   => <<< EOF
$B_play $B_pause $B_stop Playback control

<a href="https://www.musicpd.org/">MPD</a> - Music Player Daemon is a flexible, powerful, server-side application for playing music.
Through plugins and libraries it can play a variety of sound files while being controlled by its network protocol.
EOF
];
$labels  = 'Version
	<br>Database
	<br>Since';
$body    = [ htmlSectionStatus( 'status', $labels ) ];
htmlSection( $head, $body, 'mpd' );
// ----------------------------------------------------------------------------------
$head    = [
	  'title'  => 'Output'
	, 'status' => 'output'
];
$body    = [
	[
		  'id'       => 'bluealsa'
		, 'icon'     => 'btreceiver'
		, 'input'    => 'btreceiver'
		, 'help'     => <<< EOF
$B_volume Mixer device - blueALSA volume control
 · Should be set at 0dB and use Bluetooth buttons to control volume
EOF
	]
	, [
		  'id'       => 'device'
		, 'input'    => 'device'
		, 'help'     => <<< EOF
Note: HDMI may not be available unless connect before boot.
EOF
	]
	, [
		  'id'       => 'mixer'
		, 'input'    => 'mixer'
		, 'help'     => $B_volume.' Mixer device volume control'
	]
	, [
		  'id'       => 'mixertype'
		, 'help'     => <<< EOF
$B_gear Type:
 · Mixer device: Good - DAC hardware via GUI knob (if available)
 · MPD software: Basic - GUI knob
 
Note: Should be disabled for best sound quality
 - GUI knob hidden
 - Use amplifier volume
(The later in the signal chain the better sound quality.)
EOF
	]
	, [
		  'id'       => 'devicewithbt'
		, 'help'     => <<< EOF
 · Keep Output $L_device enabled when Bluetooth connected.
 · Should be disabled if not used simultaneously
EOF
	]
];
htmlSection( $head, $body, 'output' );
// ----------------------------------------------------------------------------------
$head    = [ 'title' => 'Bit-Perfect' ];
$body    = [
	[
		  'id'       => 'novolume'
		, 'help'     => <<< EOF
Disable all manipulations for bit-perfect stream from MPD to DAC output.
 · No changes in data stream until it reaches amplifier volume control.
 · Mixer device volume set at <c>0dB</c>
 · Disable:
	· Output $L_volumecontrol
	· Volume - All options
	· Options  $L_soxresampler
	· $T_features Signal Processors
EOF
	]
	, [
		  'id'       => 'dop'
		, 'help'     => <<< EOF
For DSD-capable devices that not support native DSD
 · DoP repacks 16bit DSD stream into 24bit PCM frames. 
 · PCM frames transmitted to DAC and reassembled back to original DSD stream.
 · DoP is bit-perfect by itself. (with expense of double bandwith)
 · Enabled:
	· if DAC not support native DSD.
	· If there's static/no sound of DSD.
 · Disabled without native DSD support
	· DSD converted to PCM stream. (no bit-perfect)
EOF
	]
];
htmlSection( $head, $body, 'bitperfect' );
// ----------------------------------------------------------------------------------
$head    = [ 'title' => 'Volume' ];
$body    = [
	[	  'id'       => 'crossfade'
		, 'help'     => <<< EOF
Fade-out to fade-in between playing tracks (same audio format only)
EOF
	]
	, [
		  'id'       => 'normalization'
		, 'help'     => <<< EOF
Normalize the volume level of songs as they play. (16 bit PCM only)
EOF
	] 
	, [
		  'id'       => 'replaygain'
		, 'help'     => <<< EOF
<a href="https://en.wikipedia.org/wiki/ReplayGain">ReplayGain</a> - Normalize perceived loudness via ID3v2 ReplayGain tag
Support: FLAC, Ogg Vorbis, Musepack and MP3

$B_gear
■ Gain control - Mixer device:
 • <c>replay_gain_handler "mixer"</c>
 • Available when Volume Control = MPD software
EOF
	]
];
htmlSection( $head, $body, 'volume' );
// ----------------------------------------------------------------------------------
$head    = [ 'title' => 'Options' ];
$body    = [
	[
		  'id'       => 'buffer'
		, 'help'     => <<< EOF
Increase to fix intermittent audio.
(default: <c>4096</c> kB - 24s of CD-quality audio)
EOF
	]
	, [
		  'id'       => 'outputbuffer'
		, 'help'     => <<< EOF
Increase to fix missing Album list with large Library.
(default: <c>8192</c> kB)
EOF
	]
	, [
		  'id'       => 'ffmpeg'
		, 'disabled' => $L_dabradio.' is currently enabled.'
		, 'help'     => <<< EOF
<a href="https://ffmpeg.org/about.html">FFmpeg</a> - <a id="ffmpegfiletype">Decoder for more audio filetypes</a>
<pre id="prefiletype" class="hide"></pre>
Note: Should be disabled for faster Library update if not used.
EOF
	]
	, [
		  'id'       => 'autoupdate'
		, 'help'     => 'Automatic update MPD database when files changed.'
	]
	, [
		 'id'        => 'soxr'
		, 'help'     => <<< EOF
<a href="https://sourceforge.net/p/soxr/wiki/Home/">SoX Resampler library</a> - One-dimensional sample-rate conversion
$B_gear
 • Presets:
	(default: Quality <c>Very high</c>  Threads <c>Single</c>)
	
 • Custom quality:
	· Precision - Conversion precision (20 = HQ)
	· Phase Response (50 = Linear)
	· Passband End - 0dB point bandwidth to preserve (100 = Nyquist)
	· Stopband Begin - Aliasing/imaging control
	· Attenuation - Lowers the source to prevent clipping
	· Flags / Extra settings:
<pre>
<c> 0 - Rolloff - small </c> (<= 0.01 dB)
<c> 1 - Rolloff - medium</c> (<= 0.35 dB)
<c> 2 - Rolloff - none  </c> For Chebyshev bandwidth
<c> 8 - High precision  </c> Increase irrational ratio accuracy
<c>16 - Double precision</c> even if Precision <= 20
<c>32 - Variable rate   </c>
</pre>
EOF
	]
	, [
		  'id'       => 'custom'
		, 'help'     => 'Insert custom configurations into <c>mpd.conf</c>.'
	]
];
htmlSection( $head, $body, 'options' );
// ----------------------------------------------------------------------------------
htmlHead( [
	  'title'   => 'Excluded Albums'
	, 'id'      => 'albumignore'
	, 'status'  => 'albumignore'
	, 'help'    => <<< EOF
List of albums excluded from Library Album list.
To restore:
 · Edit <c>/srv/http/data/mpd/albumignore</c>
 · Remove albums to restore
 · Update Library
EOF
] );
htmlHead( [
	  'title'   => 'Excluded Directories'
	, 'id'      => 'mpdignore'
	, 'status'  => 'mpdignore'
	, 'help'    => <<< EOF
List of <c>.mpdignore</c> files contain directories/folders excluded from database.
To restore:
• Edit file <c>.../.mpdignore</c> in parent directory
• Remove lines contain directory to restore
• Update Library

Note: Directory <c>/mnt/MPD/NAS/data</c> reserved for $T_system$L_shareddata
EOF
] );
htmlHead( [
	  'title'   => 'Non UTF-8 Files'
	, 'id'      => 'nonutf8'
	, 'status'  => 'nonutf8'
	, 'help'    => 'List of files with metadata is not UTF-8 encoding which must be corrected.'
] );
