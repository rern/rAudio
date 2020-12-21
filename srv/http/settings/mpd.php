<div> <!-- ---------------------------------------------------------- -->
<heading>Audio Output<?=$help?></heading>
<div class="col-l control-label">Device</div>
<div class="col-r">
	<select id="audiooutput" data-style="btn-default btn-lg"></select>
</div>
<div class="col-l control-label">Mixer Control</div>
<div class="col-r">
	<select id="mixertype" data-style="btn-default btn-lg"></select>
	<i id="setting-mixertype" class="settingedit fa fa-gear hwmixer"></i><br>
	<span class="hwmixer"><span class="help-block hide"><i class="fa fa-gear"></i>&ensp;Manually select hardware mixer only if the current one is not working.</span></span>
	<span class="help-block hide">
			Set volume/mixer control for each device.
		<p>
			&bull; Disable: best sound quality. (DAC hardware volume will be reset to 0dB.)
		<br>&bull; DAC hardware: good and convenient.
		<br>&bull; MPD software: depends on users preferences.
		</p>
	</span>
</div>
</div> <!-- ---------------------------------------------------------- -->

<div>
<heading data-status="aplay" class="status">Devices<i class="fa fa-code"></i></heading>
<pre id="codeaplay" class="hide"></pre>
</div>

<div id="divamixer">
<heading data-status="amixer" class="status">Hardware Mixers<i class="fa fa-code"></i></heading>
<pre id="codeamixer" class="hide"></pre>
</div>

<div style="clear: both;"></div>
	
<div> <!-- ---------------------------------------------------------- -->
<heading>Bit-Perfect<?=$help?></heading>
<div class="col-l">No Volume</div>
<div class="col-r">
	<input id="novolume" type="checkbox">
	<div class="switchlabel" for="novolume"></div>
	<span class="help-block hide">
		Disable all software volume manipulations for bit-perfect stream from MPD to DAC.
		<p>
			&bull; Disable Mixer Control.
		<br>&bull; Reset DAC hardware volume to 0dB to preserve full amplitude stream.
		<br>&bull; Disable Crossfade, Normalization and Replay Gain.
		</p>
	</span>
</div>

<div id="divdop">
	<div class="col-l dop">DSD over PCM</div>
	<div class="col-r dop">
		<input id="dop" type="checkbox">
		<div class="switchlabel" for="dop"></div>
		<span class="help-block hide">For DSD-capable devices without drivers dedicated for native DSD. Enable if there's no sound from the DAC.
			<br>DoP will repack 16bit DSD stream into 24bit PCM frames and transmit to the DAC. 
			Then PCM frames will be reassembled back to original DSD stream, COMPLETELY UNCHANGED, with expense of double bandwith.
			<br>On-board audio and non-DSD devices will always get DSD converted to PCM stream, no bit-perfect</span>
	</div>
</div>
</div> <!-- ---------------------------------------------------------- -->

<div> <!-- ---------------------------------------------------------- -->
<heading>Volume<?=$help?></heading>
<div data-status="crossfade" class="col-l double status">
	<a>Crossfade
	<br><gr>mpc<i class="fa fa-code"></i></gr></a>
</div>
<div class="col-r">
	<input id="crossfade" class="enable" type="checkbox">
	<div class="switchlabel" for="crossfade"></div>
	<i id="setting-crossfade" class="setting fa fa-gear"></i>
	<span class="help-block hide">
			<code>mpc crossfade N</code>
		<br>Fade-out to fade-in between songs.
	</span>
</div>
<pre id="codecrossfade" class="hide"></pre>
<div class="col-l double">
	<a>Normalization
	<br><gr>option</gr></a>
</div>
<div class="col-r">
	<input id="normalization" class="enablenoset" type="checkbox">
	<div class="switchlabel" for="normalization"></div>
	<span class="help-block hide">
			<code>volume_normalization "yes"</code>
		<br>Normalize the volume level of songs as they play.
	</span>
</div>
<div class="col-l double">
	<a>Replay Gain
	<br><gr>option</gr></a>
</div>
<div class="col-r">
	<input id="replaygain" class="enable" type="checkbox">
	<div class="switchlabel" for="replaygain"></div>
	<i id="setting-replaygain" class="setting fa fa-gear"></i>
	<span class="help-block hide">
			<code>replaygain "N"</code>
		<br>Set gain control to setting in replaygain tag.
		<br>Currently support: FLAC, Ogg Vorbis, Musepack, and MP3 (through ID3v2 ReplayGain tags, not APEv2)
	</span>
</div>
</div> <!-- ---------------------------------------------------------- -->

<div> <!-- ---------------------------------------------------------- -->
<heading>Options<?=$help?></heading>
<div class="col-l double">
	<a>Auto Update
	<br><gr>Library</gr></a>
</div>
<div class="col-r">
	<input id="autoupdate"  class="enablenoset" type="checkbox">
	<div class="switchlabel" for="autoupdate"></div>
	<span class="help-block hide">
			<code>auto_update "yes"</code>
		<br>Automatic update MPD database when files changed.
	</span>
</div>
<div class="col-l double">
	<a>FFmpeg
	<br><gr>decoder</gr></a>
</div>
<div class="col-r">
	<input id="ffmpeg"  class="enablenoset" type="checkbox">
	<div class="switchlabel" for="ffmpeg"></div>
	<span class="help-block hide">
			<code>enable "yes"</code>
		<br>Should be disabled if not used for faster Sources update.
		<br>Decoder for audio filetypes:&emsp;<i id="filetype" class="fa fa-question-circle"></i>
		<div id="divfiletype" class="hide" style="margin-left: 20px"><?=( shell_exec( '/srv/http/bash/mpd.sh filetype' ) )?></div>
	</span>
</div>
<div class="col-l double">
	<a>Audio Buffer
	<br><gr>custom size</gr></a>
</div>
<div class="col-r">
	<input id="buffer" class="enable" type="checkbox">
	<div class="switchlabel" for="buffer"></div>
	<i id="setting-buffer" class="setting fa fa-gear"></i>
	<span class="help-block hide">
			<code>audio_buffer_size "kB"</code>
		<br>Default buffer size: 4096 kB (24 seconds of CD-quality audio)
		<br>Increase to fix intermittent audio.
	</span>
</div>
<div class="col-l double">
		<a>Output Buffer
	<br><gr>custom size</gr></a>
</div>
<div class="col-r">
	<input id="bufferoutput" class="enable" type="checkbox">
	<div class="switchlabel" for="bufferoutput"></div>
	<i id="setting-bufferoutput" class="setting fa fa-gear"></i>
	<span class="help-block hide">
		<code>max_output_buffer_size "kB"</code>
		<br>Default buffer size: 8192 kB
		<br>Increase to fix missing Album list with large Library.
	</span>
</div>
<div class="col-l double">
		<a>Resampling
	<br><gr>SoXR custom settings</gr></a>
</div>
<div class="col-r">
	<input id="soxr" class="enable" type="checkbox">
	<div class="switchlabel" for="soxr"></div>
	<i id="setting-soxr" class="setting fa fa-gear"></i>
	<span class="help-block hide">
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
	</span>
</div>
<div class="col-l">User's Custom Settings</div>
<div class="col-r">
	<input id="custom" class="enable" type="checkbox">
	<div class="switchlabel" for="custom"></div>
	<i id="setting-custom" class="setting fa fa-gear"></i>
	<span class="help-block hide">Insert settings into <code>/etc/mpd.conf</code>.</span>
</div>

</div> <!-- ---------------------------------------------------------- -->

<div>
<heading data-status="mpdconf" class="status">Configuration<i class="fa fa-code"></i></heading>
<pre id="codempdconf" class="hide"></pre>
</div>
<div>
<heading data-status="mpd" class="status">Status<i class="fa fa-code"></i><i id="mpdrestart" class="fa fa-reboot"></i><?=$help?></heading>
<span class="help-block hide"><i class="fa fa-reboot"></i>Restart MPD</span>
<pre id="codempd" class="hide"></pre>
</div>

<div style="clear: both"></div>
