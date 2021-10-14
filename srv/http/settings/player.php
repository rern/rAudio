<div>
<?php
htmlHead( [ //////////////////////////////////
	  'title'  => 'Music Player Daemon'
	, 'id'     => 'divmpd'
	, 'status' => 'mpd'
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
	<div class="help-block hide">
<a href="https://www.musicpd.org/">MPD</a> - Music Player Daemon is a flexible, powerful, server-side application for playing music.
Through plugins and libraries it can play a variety of sound files while being controlled by its network protocol.
</div>
</div>
<?php
if ( !file_exists( '/srv/http/data/shm/nosound' ) ) {
// ----------------------------------------------------------------------------------
$head = [ //////////////////////////////////
	  'title'  => 'Output'
	, 'status' => 'asound'
];
$body = [
	[
		  'label' => 'Device'
		, 'id'    => 'audiooutput'
		, 'input' => '<select id="audiooutput"></select>'
		, 'help'  => <<<html
HDMI device available only when connected before boot.
html
	]
	, [
		  'label'       => 'Mixer Device'
		, 'id'          => 'hwmixer'
		, 'input'       => '<select id="hwmixer"></select>'
		, 'setting'     => 'self'
		, 'settingicon' => 'volume'
		, 'help'  => <<<html
Available hardware mixers of current device.
&emsp;<i class="fa fa-volume"></i>Control current mixer device.
html
	]
	, [
		  'label' => 'Volume Control'
		, 'id'    => 'mixertype'
		, 'input' => '<select id="mixertype"></select>'
		, 'help'  => <<<html
Volume control for each device.
 • <code>None / 0dB</code> Best sound quality. (Use amplifier volume)
 • <code>Mixer device</code> Good and convenient. (Device hardware volume)
 • <code>MPD software</code> Software volume.
html
	]
	, [
		  'label'   => 'Equalizer'
		, 'id'      => 'equalizer'
		, 'help'    => <<<html
10 band graphic equalizer with user presets.
Control: &emsp; <i class="fa fa-player"></i>Player |&ensp;<i class="fa fa-equalizer"></i>
Presets:
 • <code>Flat</code>: All bands at <code>0dB</code>
 • New: adjust > <i class="fa fa-plus-circle"></i> > <code>NAME</code> > <i class="fa fa-save"></i>
 • Existing: adjust > <i class="fa fa-save"></i>
 • Adjust without <i class="fa fa-save"></i> will be listed as <code>(unnamed)</code>
 • Save <code>(unnamed)</code>: <i class="fa fa-plus-circle"></i>> <code>NAME</code> > <i class="fa fa-save"></i>
html
	]
];
htmlSection( $head, $body );
$head = [ 'title' => 'Bit-Perfect' ]; //////////////////////////////////
$body = [
	[
		  'label' => 'No Volume'
		, 'id'    => 'novolume'
		, 'help'  => <<<html
Disable all manipulations for bit-perfect stream from MPD to DAC output.
 • No changes in data stream until it reaches amplifier volume control.
 • Mixer device volume: 0dB (No amplitude manipulations)
 • Volume Control: <code>None / 0db</code> (Hidden volume in Playback)
 • Equalizer: Disabled
 • Crossfade, Normalization and Replay Gain: Disabled
html
	]
	, [
		  'label' => 'DSD over PCM'
		, 'id'    => 'dop'
		, 'help'  => <<<html
For DSD-capable devices without drivers dedicated for native DSD.
 • Enable if there's static/no sound from the DAC which means not support as native DSD.
 • DoP will repack 16bit DSD stream into 24bit PCM frames and transmit to the DAC. 
 • PCM frames will be reassembled back to original DSD stream, COMPLETELY UNCHANGED, with expense of double bandwith.
 • On-board audio and non-DSD devices will always get DSD converted to PCM stream, no bit-perfect
html
	]
];
htmlSection( $head, $body );
// ----------------------------------------------------------------------------------
}
$head = [ 'title' => 'Volume' ]; //////////////////////////////////
$body = [
	[	  'label'   => 'Crossfade'
		, 'id'      => 'crossfade'
		, 'setting' => true
		, 'help'    => <<<html
<code>mpc crossfade N</code>
Fade-out to fade-in between songs.
html
	]
	, [
		  'label'   => 'Normalization'
		, 'id'      => 'normalization'
		, 'help'    => <<<html
<code>volume_normalization "yes"</code>
Normalize the volume level of songs as they play.
html
	] 
	, [
		  'label'   => 'Replay Gain'
		, 'id'      => 'replaygain'
		, 'setting' => true
		, 'help'    => <<<html
<code>replaygain "N"</code>
Set gain control to setting in replaygain tag.
Currently support: FLAC, Ogg Vorbis, Musepack, and MP3 (through ID3v2 ReplayGain tags, not APEv2)
html
	]
];
htmlSection( $head, $body );
$head = [ //////////////////////////////////
	  'title'  => 'Options'
	, 'status' => 'mpdconf'
];
$body = [
	[
		  'label'    => 'Buffer - Audio'
		, 'id'       => 'buffer'
		, 'sublabel' => 'custom size'
		, 'setting'  => true
		, 'help'     => <<<html
<code>audio_buffer_size "kB"</code>
Default buffer size: 4096 kB (24 seconds of CD-quality audio)
Increase to fix intermittent audio.
html
	]
	, [
		  'label'    => 'Buffer - Output'
		, 'id'       => 'bufferoutput'
		, 'sublabel' => 'custom size'
		, 'setting'  => true
		, 'help'     => <<<html
<code>max_output_buffer_size "kB"</code>
Default buffer size: 8192 kB
Increase to fix missing Album list with large Library.
html
	]
	, [
		  'label'    => 'FFmpeg'
		, 'id'       => 'ffmpeg'
		, 'sublabel' => 'decoder plugin'
		, 'help'     => <<<html
<code>enable "yes"</code>
Should be disabled if not used for faster Sources update.
Decoder for audio filetypes:&emsp;<i id="filetype" class="fa fa-question-circle"></i>
<div id="divfiletype" class="hide" style="margin-left: 20px"><?=( shell_exec( '/srv/http/bash/player.sh filetype' ) )?></div>
html
	]
	, [
		  'label'   => 'Library Auto Update'
		, 'id'      => 'autoupdate'
		, 'help'    => <<<html
<code>auto_update "yes"</code>
Automatic update MPD database when files changed.
html
	]
	, [
		  'label'    => 'SoXR resampler'
		, 'id'       => 'soxr'
		, 'sublabel' => 'custom settings'
		, 'setting'  => true
		, 'help'     => <<<html
<code>quality "custom"</code>
Default quality: very high
SoX Resampler custom settings:
 • Precision - Conversion precision (20 = HQ)
 • Phase Response (50 = Linear)
 • Passband End - 0dB point bandwidth to preserve (100 = Nyquist)
 • Stopband Begin - Aliasing/imaging control
 • Attenuation - Lowers the source to prevent clipping
 • Flags - Extra settings:
 &emsp; 0 - Rolloff - small (<= 0.01 dB)
 &emsp; 1 - Rolloff - medium (<= 0.35 dB)
 &emsp; 2 - Rolloff - none - For Chebyshev bandwidth
 &emsp; 8 - High precision - Increase irrational ratio accuracy
 &emsp; 16 - Double precision - even if Precision <= 20
 &emsp; 32 - Variable rate resampling
html
	]
	, [
		  'label'   => "User's Configurations"
		, 'id'      => 'custom'
		, 'setting' => true
		, 'help'    => <<<html
Insert custom configurations into <code>/etc/mpd.conf</code>.
html
	]
];
htmlSection( $head, $body );
echo '<div>';
htmlHead( [ 'title' => 'Excluded Lists' ] ); //////////////////////////////////
htmlHead( [
	  'title'   => 'Album'
	, 'status'  => 'albumignore'
	, 'subhead' => true
	, 'nohelp'  => true
	, 'help'    => <<<html
List of albums excluded from Album page.
To restore:
 • Edit <code>/srv/http/data/mpd/albumignore</code>
 • Remove albums to restore
 • Update Library
html
] );
htmlHead( [
	  'title'   => 'Directory'
	, 'status'  => 'mpdignore'
	, 'subhead' => true
	, 'nohelp'  => true
	, 'help'    => <<<html
List of <code>.mpdignore</code> files contain directories excluded from database.
To restore:
 • Edit <code>.../.mpdignore</code>
 • Remove directories to restore
 • Update Library
</p>
html
] );
echo '</div>';
