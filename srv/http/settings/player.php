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
	<span class="help-block hide">
		&nbsp;<br>
		<a href="https://www.musicpd.org/">MPD</a> - Music Player Daemon is a flexible, powerful, server-side application for playing music.
		Through plugins and libraries it can play a variety of sound files while being controlled by its network protocol.
	</span>
</div>
<div style="clear:both"></div>

<?php
if ( !file_exists( '/srv/http/data/shm/nosound' ) ) {
// ----------------------------------------------------------------------------------
htmlHead( [ //////////////////////////////////
	  'title'  => 'Output'
	, 'status' => 'asound'
] );
htmlSetting( [
	  'label' => 'Device'
	, 'id'    => 'audiooutput'
	, 'input' => '<select id="audiooutput"></select>'
	, 'help'  => <<<html
HDMI device available only when connected before boot.
html
] );
htmlSetting( [
	  'label'       => 'Mixer Device'
	, 'id'          => 'hwmixer'
	, 'input'       => '<select id="hwmixer"></select>'
	, 'setting'     => 'self'
	, 'settingicon' => 'volume'
] );
htmlSetting( [
	  'label' => 'Volume Control'
	, 'id'    => 'mixertype'
	, 'input' => '<select id="mixertype"></select>'
	, 'help'  => <<<html
Volume control for each device.
<p>
&bull; <code>None / 0dB</code> Best sound quality. (Use amplifier volume)
<br>&bull; <code>Mixer device</code> Good and convenient. (Device hardware volume)
<br>&bull; <code>MPD software</code> Software volume.
</p>
html
] );
$iplus = '<i class="fa fa-plus-circle"></i>';
$isave = '<i class="fa fa-save"></i>';
htmlSetting( [
	  'label'   => 'Equalizer'
	, 'id'      => 'equalizer'
	, 'help'    => <<<html
10 band graphic equalizer with user presets.
<br>Console: &ensp;<i class="fa fa-player"></i>Player |&ensp;<i class="fa fa-equalizer"></i>
<br>Presets:
<p>
	&bull; <code>Flat</code>: All bands at <code>0dB</code>
<br>&bull; New: adjust > <?=$iplus?>> <code>NAME</code> > <?=$isave?>
<br>&bull; Existing: adjust > <?=$isave?>
<br>&bull; Adjust without <?=$isave?>will be listed as <code>(unnamed)</code>
<br>&bull; Save <code>(unnamed)</code>: <?=$iplus?>> <code>NAME</code> > <?=$isave?>
</p>
html
] );
htmlHead( [ 'title' => 'Bit-Perfect' ] ); //////////////////////////////////
htmlSetting( [
	  'label' => 'No Volume'
	, 'id'    => 'novolume'
	, 'help'  => <<<html
Disable all manipulations for bit-perfect stream from MPD to DAC output.
<p>
	&bull; No changes in data stream until it reaches amplifier volume control.
<br>&bull; Mixer device volume: 0dB (No amplitude manipulations)
<br>&bull; Volume Control: <code>None / 0db</code> (Hidden volume in Playback)
<br>&bull; Equalizer: Disabled
<br>&bull; Crossfade, Normalization and Replay Gain: Disabled
</p>
html
] );
htmlSetting( [
	  'label' => 'DSD over PCM'
	, 'id'    => 'dop'
	, 'help'  => <<<html
For DSD-capable devices without drivers dedicated for native DSD.
<p>
	&bull; Enable if there's static/no sound from the DAC which means not support as native DSD.
<br>&bull; DoP will repack 16bit DSD stream into 24bit PCM frames and transmit to the DAC. 
<br>&bull; PCM frames will be reassembled back to original DSD stream, COMPLETELY UNCHANGED, with expense of double bandwith.
<br>&bull; On-board audio and non-DSD devices will always get DSD converted to PCM stream, no bit-perfect
</p>
html
] );
// ----------------------------------------------------------------------------------
}
htmlHead( [ 'title' => 'Volume' ] ); //////////////////////////////////
htmlSetting( [
	  'label'   => 'Crossfade'
	, 'id'      => 'crossfade'
	, 'setting' => 'preenable'
	, 'help'    => <<<html
	<code>mpc crossfade N</code>
<br>Fade-out to fade-in between songs.
html
] );
htmlSetting( [
	  'label'   => 'Normalization'
	, 'id'      => 'normalization'
	, 'help'    => <<<html
	<code>volume_normalization "yes"</code>
<br>Normalize the volume level of songs as they play.
html
] );
htmlSetting( [
	  'label'   => 'Replay Gain'
	, 'id'      => 'replaygain'
	, 'setting' => 'preenable'
	, 'help'    => <<<html
	<code>replaygain "N"</code>
<br>Set gain control to setting in replaygain tag.
<br>Currently support: FLAC, Ogg Vorbis, Musepack, and MP3 (through ID3v2 ReplayGain tags, not APEv2)
html
] );
htmlHead( [ //////////////////////////////////
	  'title'  => 'Options'
	, 'status' => 'mpdconf'
] );
htmlSetting( [
	  'label'    => 'Buffer - Audio'
	, 'id'       => 'buffer'
	, 'sublabel' => 'custom size'
	, 'setting'  => 'preenable'
	, 'help'     => <<<html
<code>audio_buffer_size "kB"</code>
<br>Default buffer size: 4096 kB (24 seconds of CD-quality audio)
<br>Increase to fix intermittent audio.
html
] );
htmlSetting( [
	  'label'    => 'Buffer - Output'
	, 'id'       => 'bufferoutput'
	, 'sublabel' => 'custom size'
	, 'setting'  => 'preenable'
	, 'help'     => <<<html
<code>max_output_buffer_size "kB"</code>
<br>Default buffer size: 8192 kB
<br>Increase to fix missing Album list with large Library.
html
] );
htmlSetting( [
	  'label'    => 'FFmpeg'
	, 'id'       => 'ffmpeg'
	, 'sublabel' => 'decoder plugin'
	, 'help'     => <<<html
<code>enable "yes"</code>
<br>Should be disabled if not used for faster Sources update.
<br>Decoder for audio filetypes:&emsp;<i id="filetype" class="fa fa-question-circle"></i>
<div id="divfiletype" class="hide" style="margin-left: 20px"><?=( shell_exec( '/srv/http/bash/player.sh filetype' ) )?></div>
html
] );
htmlSetting( [
	  'label'   => 'Library Auto Update'
	, 'id'      => 'autoupdate'
	, 'help'    => <<<html
<code>auto_update "yes"</code>
<br>Automatic update MPD database when files changed.
html
] );
htmlSetting( [
	  'label'    => 'SoXR resampler'
	, 'id'       => 'soxr'
	, 'sublabel' => 'custom settings'
	, 'setting'  => 'preenable'
	, 'help'     => <<<html
<code>quality "custom"</code>
<br>Default quality: very high
<br>SoX Resampler custom settings:
<p>
	&bull; Precision - Conversion precision (20 = HQ)
<br>&bull; Phase Response (50 = Linear)
<br>&bull; Passband End - 0dB point bandwidth to preserve (100 = Nyquist)
<br>&bull; Stopband Begin - Aliasing/imaging control
<br>&bull; Attenuation - Lowers the source to prevent clipping
<br>&bull; Flags - Extra settings:
<br> &emsp; 0 - Rolloff - small (<= 0.01 dB)
<br> &emsp; 1 - Rolloff - medium (<= 0.35 dB)
<br> &emsp; 2 - Rolloff - none - For Chebyshev bandwidth
<br> &emsp; 8 - High precision - Increase irrational ratio accuracy
<br> &emsp; 16 - Double precision - even if Precision <= 20
<br> &emsp; 32 - Variable rate resampling
</p>
html
] );
htmlSetting( [
	  'label'   => "User's Configurations"
	, 'id'      => 'custom'
	, 'setting' => 'preenable'
	, 'help'    => <<<html
Insert custom configurations into <code>/etc/mpd.conf</code>.
html
] );
htmlHead( [ 'title' => 'Excluded Lists' ] ); //////////////////////////////////
htmlHead( [
	  'title'   => 'Album'
	, 'status'  => 'albumignore'
	, 'subhead' => true
	, 'help'    => <<<html
List of albums excluded from Album page.
<br>To restore:
<p>
	&bull; Edit <code>/srv/http/data/mpd/albumignore</code>
<br>&bull; Remove albums to restore
<br>&bull; Update Library
</p>
html
] );
htmlHead( [
	  'title'   => 'Directory'
	, 'status'  => 'mpdignore'
	, 'subhead' => true
	, 'help'    => <<<html
List of <code>.mpdignore</code> files contain directories excluded from database.
<br>To restore:
<p>
	&bull; Edit <code>.../.mpdignore</code>
<br>&bull; Remove directories to restore
<br>&bull; Update Library
</p>
html
] );
echo '
</div>'; // last closing for no following htmlHead()
