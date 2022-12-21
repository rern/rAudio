<div id="divmpd" class="section">
<?php
htmlHead( [ //////////////////////////////////
	  'title'  => 'Music Player Daemon'
	, 'status' => 'mpd'
	, 'button' => [ 'playback' => 'play' ]
] );
?>
	<div class="col-l text gr">
		Version
		<br>Database
	</div>
	<div class="col-r text">
		<div id="statusvalue"></div>
	</div>
	<div style="clear:both"></div>
	<div class="helpblock hide">
<?=( echoSetIcon( '| I^play^I | I^pause^I | Playback control' ) )?>
<br>
<a href="https://www.musicpd.org/">MPD</a> - Music Player Daemon is a flexible, powerful, server-side application for playing music.
Through plugins and libraries it can play a variety of sound files while being controlled by its network protocol.
</div>
</div>
<?php
// ----------------------------------------------------------------------------------
$head = [ //////////////////////////////////
	  'title'  => 'Output'
	, 'status' => 'asound'
];
$body = [
	[
			  'label'       => 'Bluetooth'
			, 'sublabel'    => 'bluetoothctl'
			, 'icon'        => 'bluetooth'
			, 'id'          => 'btreceiver'
			, 'status'      => 'bluetooth'
			, 'input'       => '<select id="btaplayname"></select>'
			, 'setting'     => 'custom'
			, 'settingicon' => 'volume'
			, 'help'        => <<< EOF
I^volume^I Volume setting and control:
 · Player: Should be set at 0dB
 · Playback: Should be set at 100%
 · Use device volume to control level
EOF
	]
	, [
		  'label'   => 'Device'
		, 'id'      => 'audiooutput'
		, 'input'   => '<select id="audiooutput"></select>'
		, 'setting' => false
		, 'help'    => 'HDMI device available only when connected before boot.'
	]
	, [
		  'label'       => 'Mixer Device'
		, 'id'          => 'hwmixer'
		, 'input'       => '<select id="hwmixer"></select>'
		, 'setting'     => 'custom'
		, 'settingicon' => 'volume'
		, 'help'  => <<< EOF
| I^volume^I | Control current mixer device.

Available hardware mixers of current device.
EOF
	]
	, [
		  'label'   => 'Volume Control'
		, 'id'      => 'mixertype'
		, 'input'   => '<select id="mixertype"></select>'
		, 'setting' => false
		, 'help'    => <<< EOF
Volume control for each device.
The later in the signal chain the better sound quality.
<pre>
| None / 0dB   | Best  - Amplifier volume - GUI knob hidden
| Mixer device | Good  - DAC hardware via GUI knob
| MPD software | Basic - GUI knob
</pre>Note: | None / 0dB | - Not for devices which still need volume control, e.g., DACs with on-board amplifier
EOF
	]
];
htmlSection( $head, $body, 'output' );
$head = [ 'title' => 'Bit-Perfect' ]; //////////////////////////////////
$body = [
	[
		  'label'       => 'No Volume'
		, 'id'          => 'novolume'
		, 'setting'     => 'custom'
		, 'settingicon' => false
		, 'help'        => <<< EOF
Disable all manipulations for bit-perfect stream from MPD to DAC output.
 · No changes in data stream until it reaches amplifier volume control.
 · Mixer device volume: | 0dB |
 · Volume Control: | None / 0db |
 · Disable options: Cross-fading, Normalization, ReplayGain and SoX Resampler
 · Disable Signal Processors

Note: Not for DACs with on-board amplifier.
EOF
	]
	, [
		  'label'       => 'DSD over PCM'
		, 'id'          => 'dop'
		, 'setting'     => 'custom'
		, 'settingicon' => false
		, 'help'        => <<< EOF
For DSD-capable devices without drivers dedicated for native DSD.
 · Enable if there's static/no sound from the DAC which means not support as native DSD.
 · DoP will repack 16bit DSD stream into 24bit PCM frames and transmit to the DAC. 
 · PCM frames will be reassembled back to original DSD stream, COMPLETELY UNCHANGED, with expense of double bandwith.
 · On-board audio and non-DSD devices will always get DSD converted to PCM stream, no bit-perfect
EOF
	]
];
htmlSection( $head, $body, 'bitperfect' );
$head = [ 'title' => 'Volume' ]; //////////////////////////////////
$body = [
	[	  'label'    => 'Cross-Fading'
		, 'sublabel' => 'crossfade'
		, 'id'       => 'crossfade'
		, 'help'     => <<< EOF
Fade-out to fade-in between playing tracks (same audio format only)
EOF
	]
	, [
		  'label'    => 'Normalization'
		, 'sublabel' => 'volume_normalization'
		, 'id'       => 'normalization'
		, 'setting'  => false
		, 'help'     => <<< EOF
Normalize the volume level of songs as they play. (16 bit PCM only)
EOF
	] 
	, [
		  'label'    => 'ReplayGain'
		, 'sublabel' => 'replaygain'
		, 'id'       => 'replaygain'
		, 'help'     => <<< EOF
<a href="https://en.wikipedia.org/wiki/ReplayGain">ReplayGain</a> - Normalize perceived loudness via ID3v2 ReplayGain tag
Support: FLAC, Ogg Vorbis, Musepack and MP3
EOF
	]
];
htmlSection( $head, $body, 'volume' );
// ----------------------------------------------------------------------------------

$head = [ 'title' => 'Options' ]; //////////////////////////////////
$body = [
	[
		  'label'    => 'Buffer - Audio'
		, 'sublabel' => 'audio_buffer'
		, 'id'       => 'buffer'
		, 'help'     => <<< EOF
Increase to fix intermittent audio.

(default: 4096 kB - 24s of CD-quality audio)
EOF
	]
	, [
		  'label'    => 'Buffer - Output'
		, 'sublabel' => 'max_output_buffer'
		, 'id'       => 'outputbuffer'
		, 'help'     => <<< EOF
Increase to fix missing Album list with large Library.

(default: 8192 kB)
EOF
	]
	, [
		  'label'    => 'FFmpeg'
		, 'sublabel' => 'decoder'
		, 'id'       => 'ffmpeg'
		, 'setting'  => false
		, 'disabled' => '<wh>DAB Radio I^dabradio^I</wh> is currently enabled.'
		, 'help'     => <<< EOF
Should be disabled if not used for faster Library update.
Decoder for audio filetypes: I^help filetype^I
<div id="divfiletype" class="hide" style="margin-left: 20px"></div>
EOF
	]
	, [
		  'label'    => 'Library Auto Update'
		, 'sublabel' => 'auto_update'
		, 'id'       => 'autoupdate'
		, 'setting'  => false
		, 'help'     => 'Automatic update MPD database when files changed.'
	]
	, [
		  'label'    => 'SoX Resampler'
		, 'sublabel' => 'resampler'
		, 'id'       => 'soxr'
		, 'help'     => <<< EOF
<a href="https://sourceforge.net/p/soxr/wiki/Home/">SoX Resampler library</a> - One-dimensional sample-rate conversion

| I^gear^I |
 • Presets:
	(default: Quality - | Very high |, Threads - | Single |)
	
 • Custom quality:
	· Precision - Conversion precision (20 = HQ)
	· Phase Response (50 = Linear)
	· Passband End - 0dB point bandwidth to preserve (100 = Nyquist)
	· Stopband Begin - Aliasing/imaging control
	· Attenuation - Lowers the source to prevent clipping
	· Flags / Extra settings:
<pre>
|  0 - Rolloff - small  | (<= 0.01 dB)
|  1 - Rolloff - medium | (<= 0.35 dB)
|  2 - Rolloff - none   | For Chebyshev bandwidth
|  8 - High precision   | Increase irrational ratio accuracy
| 16 - Double precision | even if Precision <= 20
| 32 - Variable rate    |
</pre>
EOF
	]
	, [
		  'label'    => "User's Configurations"
		, 'sublabel' => 'custom'
		, 'id'       => 'custom'
		, 'help'     => 'Insert custom configurations into <c>mpd.conf</c>.'
	]
];
htmlSection( $head, $body, 'options' );

echo '
<div id="divlists" class="section">
	<heading><span class="headtitle">Lists</span></heading>';
htmlHead( [
	  'title'   => 'Ignored Album'
	, 'id'      => 'albumignore'
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
	, 'id'      => 'mpdignore'
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
	, 'id'      => 'nonutf8'
	, 'subhead' => true
	, 'status'  => 'nonutf8'
	, 'help'    => 'List of files with metadata is not UTF-8 encoding which must be corrected.'
] );
echo '
</div>';
