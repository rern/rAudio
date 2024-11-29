<?php
commonVariables( [
	  'buttons' => [ 'camilla', 'equalizer', 'gear', 'pause', 'play', 'stop', 'volume' ]
	, 'labels'  => [ 
		  'DAB Radio'      => 'dabradio'
		, 'Device'         => ''
		, 'DSP'            => 'camilla'
		, 'Equalizer'      => 'equalizer'
		, 'Shared Data'    => 'networks'
		, 'SoX Resampler'  => ''
		, 'Volume Control' => ''
	]
	, 'menus'   => []
	, 'tabs'    => [ 'features', 'system' ]
] );
// ----------------------------------------------------------------------------------
$head      = [
	  'title'  => '<a class="hideN">Music Player Daemon</a><a class="hideW">MPD</a>'
	, 'status' => 'mpd'
	, 'button' => 'play playback'
	, 'help'   => <<< EOF
$B->play$B->pause$B->stop Playback control

<a href="https://www.musicpd.org/">MPD</a> - Music Player Daemon is a flexible, powerful, server-side application for playing music.
Through plugins and libraries it can play a variety of sound files while being controlled by its network protocol.
EOF
];
$labels    = 'Version
	<br>Database
	<br>Since';
$body      = [ htmlSectionStatus( 'status', $labels ) ];
htmlSection( $head, $body, 'mpd' );
// ----------------------------------------------------------------------------------
$head      = [
	  'title'  => 'Output'
	, 'status' => 'output'
];
$body      = [
	[
		  'id'       => 'bluealsa'
		, 'label'    => 'Bluetooth'
		, 'input'    => 'btreceiver'
		, 'help'     => <<< EOF
$B->volume Mixer device - blueALSA volume control
 · Should be set at 0dB and use Bluetooth buttons to control volume
EOF
	]
	, [
		  'id'       => 'device'
		, 'label'    => 'Device'
		, 'sub'      => 'hw_params'
		, 'status'   => true
		, 'input'    => 'device'
		, 'help'     => <<< EOF
$B->camilla$B->equalizer $T->features Signal Processors enabled

Note: HDMI may not be available unless connect before boot.
EOF
	]
	, [
		  'id'       => 'mixer'
		, 'label'    => 'Mixer Device'
		, 'input'    => 'mixer'
		, 'help'     => $B->volume.' Mixer device volume control'
	]
	, [
		  'id'       => 'mixertype'
		, 'label'    => 'Volume Control'
		, 'disabled' => $L->dsp.' is currently enabled.'
		, 'help'     => <<< EOF
$B->gear Type:
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
		, 'label'    => 'Device + Bluetooth'
		, 'help'     => <<< EOF
 · Keep Output $L->device enabled when Bluetooth connected.
 · Should be disabled if not used simultaneously
EOF
	]
];
htmlSection( $head, $body, 'output' );
// ----------------------------------------------------------------------------------
$head      = [ 'title' => 'Bit-Perfect' ];
$body      = [
	[
		  'id'       => 'novolume'
		, 'label'    => 'No Volume'
		, 'help'     => <<< EOF
Disable all manipulations for bit-perfect stream from MPD to DAC output.
 · No changes in data stream until it reaches amplifier volume control.
 · Mixer device volume set at <c>0dB</c>
 · Disable:
	· Output $L->volumecontrol
	· Volume - All options
	· Options  $L->soxresampler
	· $T->features$L->dsp $L->equalizer
EOF
	]
	, [
		  'id'       => 'dop'
		, 'label'    => 'DSD over PCM'
		, 'sub'      => 'dop'
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
$head      = [ 'title' => 'Volume' ];
$body      = [
	[	  'id'       => 'crossfade'
		, 'label'    => 'Cross-Fading'
		, 'sub'      => 'crossfade'
		, 'help'     => <<< EOF
Fade-out to fade-in between playing tracks (same audio format only)
EOF
	]
	, [
		  'id'       => 'normalization'
		, 'label'    => 'Normalization'
		, 'sub'      => 'volume_normalization'
		, 'help'     => <<< EOF
Normalize the volume level of songs as they play. (16 bit PCM only)
EOF
	] 
	, [
		  'id'       => 'replaygain'
		, 'label'    => 'ReplayGain'
		, 'sub'      => 'replaygain'
		, 'help'     => <<< EOF
<a href="https://en.wikipedia.org/wiki/ReplayGain">ReplayGain</a> - Normalize perceived loudness via ID3v2 ReplayGain tag
Support: FLAC, Ogg Vorbis, Musepack and MP3

$B->gear
■ Gain control - Mixer device:
 • <c>replay_gain_handler "mixer"</c>
 • Available when Volume Control = MPD software
EOF
	]
];
htmlSection( $head, $body, 'volume' );
// ----------------------------------------------------------------------------------
$head      = [ 'title' => 'Options' ];
$body      = [
	[
		  'id'       => 'buffer'
		, 'label'    => 'Buffer - Audio'
		, 'sub'      => 'audio_buffer'
		, 'help'     => <<< EOF
Increase to fix intermittent audio.
(default: <c>4096</c> kB - 24s of CD-quality audio)
EOF
	]
	, [
		  'id'       => 'outputbuffer'
		, 'label'    => 'Buffer - Output'
		, 'sub'      => 'max_output_buffer'
		, 'help'     => <<< EOF
Increase to fix missing Album list with large Library.
(default: <c>8192</c> kB)
EOF
	]
	, [
		  'id'       => 'ffmpeg'
		, 'label'    => 'FFmpeg'
		, 'sub'      => 'decoder'
		, 'disabled' => $L->dabradio.' is currently enabled.'
		, 'help'     => <<< EOF
<a href="https://ffmpeg.org/about.html">FFmpeg</a> - <a id="ffmpegfiletype">Decoder for more audio filetypes</a>
<pre id="prefiletype" class="hide"></pre>
Note: Should be disabled for faster Library update if not used.
EOF
	]
	, [
		  'id'       => 'autoupdate'
		, 'label'    => 'Library Auto Update'
		, 'sub'      => 'auto_update'
		, 'help'     => 'Automatic update MPD database when files changed.'
	]
	, [
		  'id'       => 'soxr'
		, 'label'    => 'SoX Resampler'
		, 'sub'      => 'resampler'
		, 'help'     => <<< EOF
<a href="https://sourceforge.net/p/soxr/wiki/Home/">SoX Resampler library</a> - One-dimensional sample-rate conversion
$B->gear
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
		, 'label'    => "User's Configurations"
		, 'sub'      => 'custom'
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

Note: Directory <c>/mnt/MPD/NAS/data</c> reserved for $T->system$L->shareddata
EOF
] );
htmlHead( [
	  'title'   => 'Non UTF-8 Files'
	, 'id'      => 'nonutf8'
	, 'status'  => 'nonutf8'
	, 'help'    => 'List of files with metadata is not UTF-8 encoding which must be corrected.'
] );
