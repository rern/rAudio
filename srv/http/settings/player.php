<?php
$id_data = [
	  'audiooutput'   => [ 'name' => 'Device',                                                 'setting' => 'none' ]
	, 'autoupdate'    => [ 'name' => 'Library Auto Update',   'sub' => 'auto_update',          'setting' => false ]
	, 'btreceiver'    => [ 'name' => 'Bluetooth',             'sub' => 'bluealsa',             'setting' => 'custom', 'status' => true ]
	, 'buffer'        => [ 'name' => 'Buffer - Audio',        'sub' => 'audio_buffer' ]
	, 'crossfade'     => [ 'name' => 'Cross-Fading',          'sub' => 'crossfade' ]
	, 'custom'        => [ 'name' => "User's Configurations", 'sub' => 'custom' ]
	, 'dop'           => [ 'name' => 'DSD over PCM',                                           'setting' => 'none' ]
	, 'ffmpeg'        => [ 'name' => 'FFmpeg',                'sub' => 'decoder',              'setting' => false ]
	, 'hwmixer'       => [ 'name' => 'Mixer Device',                                           'setting' => 'custom' ]
	, 'mixertype'     => [ 'name' => 'Volume Control',                                         'setting' => 'none' ]
	, 'normalization' => [ 'name' => 'Normalization',         'sub' => 'volume_normalization', 'setting' => false ]
	, 'novolume'      => [ 'name' => 'No Volume',                                              'setting' => 'none' ]
	, 'outputbuffer'  => [ 'name' => 'Buffer - Output',       'sub' => 'max_output_buffer' ]
	, 'replaygain'    => [ 'name' => 'ReplayGain',            'sub' => 'replaygain' ]
	, 'soxr'          => [ 'name' => 'SoX Resampler',         'sub' => 'resampler' ]
];

$head = [ //////////////////////////////////
	  'title'  => '<a class="hideN">Music Player Daemon</a><a class="hideW">MPD</a>'
	, 'status' => 'mpd'
	, 'button' => [ 'playback' => 'play' ]
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
	, 'button' => [ 'btoutputall' => 'gear' ]
	, 'help'   => <<< EOF
{$Fi( 'gear btn' )} Other outputs while Bluetooth connected
 · Should be disabled if not used simultaneously
EOF
];
$body = [
	[
		  'id'          => 'btreceiver'
		, 'icon'        => true
		, 'input'       => '<select id="btaplayname"></select>'
		, 'settingicon' => 'volume'
		, 'help'        => <<< EOF
{$Fi( 'volume btn' )} Sender volume control
 · Should be set at 0dB and use Bluetooth buttons to control volume
EOF
	]
	, [
		  'id'    => 'audiooutput'
		, 'input' => '<select id="audiooutput"></select>'
		, 'help'  => <<< EOF
HDMI audio:
 · Available when connected before boot only
 · Enable plug and play: {$Ftab( 'player' )}{$FlabelIcon( 'HDMI Hotplug', 'hdmi' )}
EOF
	]
	, [
		  'id'          => 'hwmixer'
		, 'input'       => '<select id="hwmixer"></select>'
		, 'settingicon' => 'volume'
		, 'help'        => <<< EOF
{$Fi( 'volume btn' )}
Mixer device volume control
EOF
	]
	, [
		  'id'    => 'mixertype'
		, 'input' => '<select id="mixertype"></select>'
		, 'help'  => <<< EOF
Volume control for each device.
The later in the signal chain the better sound quality.
<pre>
<c>None / 0dB  </c> Best  Amplifier volume - GUI knob hidden
<c>Mixer device</c> Good  DAC hardware via GUI knob
<c>MPD software</c> Basic GUI knob
</pre>Note: <c>None / 0dB</c> Not for devices which still need volume control, e.g., DACs with on-board amplifier
EOF
	]
];
htmlSection( $head, $body, 'output' );
$head = [ 'title' => 'Bit-Perfect' ]; //////////////////////////////////
$body = [
	[
		  'id'   => 'novolume'
		, 'help' => <<< EOF
Disable all manipulations for bit-perfect stream from MPD to DAC output.
 · No changes in data stream until it reaches amplifier volume control.
 · Mixer device volume: <c>0dB</c>
 · Volume Control: <c>None / 0db</c>
 · Disable options: Cross-fading, Normalization, ReplayGain and SoX Resampler
 · Disable Signal Processors

Note: Not for DACs with on-board amplifier.
EOF
	]
	, [
		  'id'   => 'dop'
		, 'help' => <<< EOF
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
	[	  'id'   => 'crossfade'
		, 'help' => <<< EOF
Fade-out to fade-in between playing tracks (same audio format only)
EOF
	]
	, [
		  'id'   => 'normalization'
		, 'help' => <<< EOF
Normalize the volume level of songs as they play. (16 bit PCM only)
EOF
	] 
	, [
		  'id'   => 'replaygain'
		, 'help' => <<< EOF
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
		  'id'   => 'buffer'
		, 'help' => <<< EOF
Increase to fix intermittent audio.

(default: <c>4096</c> kB - 24s of CD-quality audio)
EOF
	]
	, [
		  'id'   => 'outputbuffer'
		, 'help' => <<< EOF
Increase to fix missing Album list with large Library.

(default: <c>8192</c> kB)
EOF
	]
	, [
		  'id'       => 'ffmpeg'
		, 'disabled' => labelIcon( 'DAB Radio', 'dabradio' ).' is currently enabled.'
		, 'help'     => <<< EOF
<a href="https://ffmpeg.org/about.html">FFmpeg</a> - Decoder for more audio filetypes {$Fi( 'help filetype' )}
<pre id="prefiletype" class="hide"></pre>
Note: Should be disabled for faster Library update if not used.
EOF
	]
	, [
		  'id'   => 'autoupdate'
		, 'help' => 'Automatic update MPD database when files changed.'
	]
	, [
		 'id'    => 'soxr'
		, 'help' => <<< EOF
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
		  'id'   => 'custom'
		, 'help' => 'Insert custom configurations into <c>mpd.conf</c>.'
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
