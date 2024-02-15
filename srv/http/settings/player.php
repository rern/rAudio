<?php
$id_data = [
	  'audiooutput'   => [ 'label' => 'Device',                                                 'setting' => 'none' ]
	, 'autoupdate'    => [ 'label' => 'Library Auto Update',   'sub' => 'auto_update',          'setting' => false ]
	, 'bluealsa'      => [ 'label' => 'Bluetooth',             'sub' => 'bluealsa',             'setting' => 'custom', 'status' => true ]
	, 'buffer'        => [ 'label' => 'Buffer - Audio',        'sub' => 'audio_buffer' ]
	, 'crossfade'     => [ 'label' => 'Cross-Fading',          'sub' => 'crossfade' ]
	, 'custom'        => [ 'label' => "User's Configurations", 'sub' => 'custom' ]
	, 'devicewithbt'  => [ 'label' => 'Device + Bluetooth',                                     'setting' => false ]
	, 'dop'           => [ 'label' => 'DSD over PCM',          'sub' => 'dop',                  'setting' => 'none' ]
	, 'ffmpeg'        => [ 'label' => 'FFmpeg',                'sub' => 'decoder',              'setting' => false ]
	, 'hwmixer'       => [ 'label' => 'Mixer Device',                                           'setting' => 'custom' ]
	, 'mixertype'     => [ 'label' => 'Volume Control',                                         'setting' => 'custom' ]
	, 'normalization' => [ 'label' => 'Normalization',         'sub' => 'volume_normalization', 'setting' => false ]
	, 'novolume'      => [ 'label' => 'No Volume',                                              'setting' => 'none' ]
	, 'outputbuffer'  => [ 'label' => 'Buffer - Output',       'sub' => 'max_output_buffer' ]
	, 'replaygain'    => [ 'label' => 'ReplayGain',            'sub' => 'replaygain' ]
	, 'soxr'          => [ 'label' => 'SoX Resampler',         'sub' => 'resampler' ]
];

$head = [ //////////////////////////////////
	  'title'  => '<a class="hideN">Music Player Daemon</a><a class="hideW">MPD</a>'
	, 'status' => 'mpd'
	, 'button' => [ 'play playback' ]
	, 'help'   => <<< EOF
{$Fi( 'play btn' )} {$Fi( 'pause btn' )} {$Fi( 'stop btn' )} Playback control

<a href="https://www.musicpd.org/">MPD</a> - Music Player Daemon is a flexible, powerful, server-side application for playing music.
Through plugins and libraries it can play a variety of sound files while being controlled by its network protocol.
EOF
];
$labels = 'Version
	<br>Database
	<br>Since';
$body = [ htmlSectionStatus( 'status', $labels ) ];
htmlSection( $head, $body, 'mpd' );
// ----------------------------------------------------------------------------------
$head = [ //////////////////////////////////
	  'title'  => 'Output'
	, 'status' => 'output'
	, 'help'   => <<< EOF
{$Fi( 'gear btn' )} Other outputs while Bluetooth connected
 · Should be disabled if not used simultaneously
EOF
];
$body = [
	[
		  'id'       => 'bluealsa'
		, 'icon'     => true
		, 'input'    => '<select id="btaplayname"></select>'
		, 'help'     => <<< EOF
{$Fi( 'volume btn' )} Sender volume control
 · Should be set at 0dB and use Bluetooth buttons to control volume
EOF
	]
	, [
		  'id'       => 'audiooutput'
		, 'input'    => '<select id="audiooutput"></select>'
		, 'help'     => <<< EOF
HDMI audio:
 · Available when connected before boot only
EOF
	]
	, [
		  'id'       => 'hwmixer'
		, 'input'    => '<select id="hwmixer"></select>'
		, 'help'     => <<< EOF
{$Fi( 'volume btn' )}
Mixer device volume control
EOF
	]
	, [
		  'id'       => 'mixertype'
		, 'help'     => <<< EOF
Volume control for each device.
The later in the signal chain the better sound quality.
<pre>
<c>None / 0dB  </c> Best  Amplifier volume - GUI knob hidden
<c>Mixer device</c> Good  DAC hardware via GUI knob
<c>MPD software</c> Basic GUI knob
</pre>
EOF
	]
	, [
		  'id'       => 'devicewithbt'
		, 'help'     => 'Keep output device enabled when Bluetooth connected.'
	]
];
htmlSection( $head, $body, 'output' );
$head = [ 'title' => 'Bit-Perfect' ]; //////////////////////////////////
$body = [
	[
		  'id'       => 'novolume'
		, 'disabled' => 'Enable any volume settings'
		, 'help'     => <<< EOF
Disable all manipulations for bit-perfect stream from MPD to DAC output.
 · No changes in data stream until it reaches amplifier volume control.
 · Mixer device volume set at <c>0dB</c>
 · Disable:
	· {$FiLabel( 'Volume Control' )}
	· {$FiLabel( 'Cross-Fading' )}
	· {$FiLabel( 'Normalization' )}
	· {$FiLabel( 'ReplayGain' )}
	· {$FiLabel( 'SoX Resampler' )}
	· {$FiTab( 'Features' )}{$FiLabel( 'DSP', 'camilladsp' )} and {$FiLabel( 'Equalizer', 'equalizer' )}
	
Note: If {$FiLabel( "User's Configurations" )} enabled, any volume settings must be removed manually.
EOF
	]
	, [
		  'id'       => 'dop'
		, 'help'     => <<< EOF
<wh>D</wh>SD <wh>o</wh>ver <wh>P</wh>CM for DSD-capable devices that not support native DSD
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
$head = [ 'title' => 'Volume' ]; //////////////////////////////////
$body = [
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

{$Fi( 'gear btn' )}
■ Gain control - Mixer device:
 • <c>replay_gain_handler "mixer"</c>
 • Available when Volume Control = MPD software
EOF
	]
];
htmlSection( $head, $body, 'volume' );
// ----------------------------------------------------------------------------------

$head = [ 'title' => 'Options' ]; //////////////////////////////////
$body = [
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
		, 'disabled' => iLabel( 'DAB Radio', 'dabradio' ).' is currently enabled.'
		, 'help'     => <<< EOF
<a href="https://ffmpeg.org/about.html">FFmpeg</a> - Decoder for more audio filetypes {$Fi( 'help filetype' )}
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
{$Fi( 'gear btn' )}
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

echo '
<div id="divlists" class="section">
	<heading><span class="headtitle">Lists</span></heading>';
htmlHead( [
	  'title'   => 'Ignored Album'
	, 'subhead' => true
	, 'status'  => 'albumignore'
	, 'help'    => <<< EOF
List of albums excluded from Album page.
To restore:
 · Edit <c>/srv/http/data/mpd/albumignore</c>
 · Remove albums to restore
 · Update Library
EOF
] );
htmlHead( [
	  'title'   => 'Ignored Directory'
	, 'subhead' => true
	, 'status'  => 'mpdignore'
	, 'help'    => <<< EOF
List of <c>.mpdignore</c> files contain directories excluded from database.
To restore:
• Edit <c>.../.mpdignore</c>
• Remove directories to restore
• Update Library
EOF
] );
htmlHead( [
	  'title'   => 'Non UTF-8 Files'
	, 'subhead' => true
	, 'status'  => 'nonutf8'
	, 'help'    => 'List of files with metadata is not UTF-8 encoding which must be corrected.'
] );
echo '
</div>';
