<?php
$uid = exec( "$sudo/id -u mpd" );
$gid = exec( "$sudo/id -g mpd" );
?>
<div>
<heading class="noline">Devices<i id="addnas" class="fa fa-plus-circle"></i>&emsp;<i id="refreshing" class="fa fa-networks blink hide"></i><?=$help?></heading>
<ul id="list" class="entries" data-uid="<?=$uid?>" data-gid="<?=$gid?>"></ul>
<p class="brhalf"></p>
<span class="help-block hide">
	Available sources, local USB and NAS mounts, for Library.
	<br>USB drive will be found and mounted automatically. Network shares must be manually configured.
	<br>
	<br><i class="fa fa-plus-circle"></i>&ensp; Add network share commands:
	<br> &emsp; <gr>(If mount failed, try in SSH terminal.)</gr>
	<br>#1:
	<pre>mkdir -p "/mnt/MPD/NAS/<bll>NAME</bll>"</pre>
	#2:
	<br>CIFS:
	<pre>mount -t cifs "//<bll>IP</bll>/<bll>SHARENAME</bll>" "/mnt/MPD/NAS/<bll>NAME</bll>" -o noauto,username=<bll>USER</bll>,password=<bll>PASSWORD</bll>,uid=<?=$uid?>,gid=<?=$gid?>,iocharset=utf8</pre>
	NFS:
	<pre>mount -t nfs "<bll>IP</bll>:<bll>/SHARE/PATH</bll>" "/mnt/MPD/NAS/<bll>NAME</bll>" -o defaults,noauto,bg,soft,timeo=5</pre>
	(Append more options if required.)
</span>
</div>

<div>
<heading data-status="mount" class="status">Mounts<i class="fa fa-code"></i></heading>
<pre id="codemount" class="hide"></pre>
</div>

<?php /*<div>
<heading class="noline">Network Shares<i id="refreshshares" class="fa fa-refresh hide"></i></heading>
<ul id="listshare" class="entries">
	<li><i class="fa fa-search"></i><gr>Scan</gr></li>
</ul>
<p class="brhalf"></p>
<span class="help-block hide">
	Available Windows and CIFS shares in WORKGROUP. Scan and select a share to mount as Library source files.
</span>
</div> */ ?>

<div>
<heading data-status="fstab" class="status">File System Table<i class="fa fa-code"></i></heading>
<pre id="codefstab" class="hide"></pre>
</div>

<div style="clear: both"></div>
