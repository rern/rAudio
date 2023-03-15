<?php
ignore_user_abort( TRUE ); // for 'connection_status()' to work

$sudobash = '/usr/bin/sudo /srv/http/bash/';
if ( $alias === 'cove' ) {
	$icon = '<i class="page-icon i-coverart"></i>';
	$href = '/';
	$name = 'Album Thumbnails';
	$path = $type === '/' ? '' : $type; // path = $opt[ 1 ]
	$type = 'Update';
} else {
	$list     = file_get_contents( '/srv/http/data/shm/addons-list.json' );
	$addons   = json_decode( $list, true );
	$opt      = $_POST[ 'opt' ] ?? [ 'r1', 'Debug', 'debug' ]; // [ alias, type, branch, opt1, opt2, ... ]
	$alias    = $opt[ 0 ];
	$type     = $opt[ 1 ];
	$branch   = $opt[ 2 ] ?? '';
	$addon    = $addons[ $alias ];
	$icon = '<i class="page-icon i-jigsaw"></i>';
	$href = 'settings.php?p=addons';
	$name = $addon[ 'title' ];
	$options = preg_replace( '/(["`])/', '\\\\\1', implode( "\n", $opt ) );
	if ( isset( $addon[ 'option' ][ 'password' ] ) ) { // hide password
		$i             = array_search( 'password', array_keys( $addon[ 'option' ] ) );
		$opt[ $i + 3 ] = '***';
	}
	$postmsg  = $type.' done.';
	$postinfo = $addon[ 'postinfo' ] ?? '';
	if ( $postinfo ) {
		$c0 = $postinfo[ 0 ];
		if ( $c0 === '/' || $c0 === '[' ) $postinfo = exec( $postinfo );
		if ( $postinfo ) $postmsg  .= '<br><br><i class="i-info-circle wh"></i>'.$postinfo;
	}
	$installurl    = $addon[ 'installurl' ];
	$installfile   = basename( $installurl );
	$uninstallfile = "/usr/local/bin/uninstall_$alias.sh";
	if ( $branch && $branch !== $addon[ 'version' ] ) $installurl = str_replace( 'raw/main', 'raw/'.$branch, $installurl );
}
?>

<style>
body {
	height: 100vh;
}
.addontitle {
	font-size      : 18px;
	letter-spacing : 5px;
}
.flushdot {
	height   : 0;
	margin   : 0;
	color    : #191a1a;
	overflow : hidden;
}
pre hr {
	margin : 10px 0 -10px -10px;
	border : 1px solid #00ffff;
}
pre hr.hrlight {
	border-top: none;
}
.progress {
	display      : block;
	max-height   : calc(100vh - 160px);
	width        : 100%;
	margin       : 10px 0 0 0;
	padding-left : 10px;
	tab-size     : 20px;
	font-family  : Inconsolata;
	line-height  : 20px;
	background   : var( --cgd );
	overflow     : auto;
	user-select  : text;
	-webkit-overflow-scrolling: touch;
}
.cbc  { color: #00ffff; background: #00ffff; }
.cbg  { color: #00ff00; background: #00ff00; }
.cbgr { color: #808080; background: #808080; }
.cbr  { color: #ff0000; background: #ff0000; }
.cbw  { color: #ffffff; background: #ffffff; }
.cby  { color: #ffff00; background: #ffff00; }
.cc   { color: #00ffff }
.cgr  { color: #808080 }
.ck   { color: #000 }
.cw   { color: #fff }
</style>

<div id="infoOverlay" class="info hide">
	<div id="infoBox">
		<div id="infoTopBg"><div id="infoTop"><i class="i-jigsaw"></i><a id="infoTitle"><?=$name?></a></div></div>
		<div id="infoContent"><div class="infomessage"><?=$postmsg?></div></div>
		<div class="infobtn infobtn-primary">OK</div>
	</div>
</div>
<br>
<p class="addontitle gr"><i class="titleicon i-gear<?=( $localhost ? '' : ' blink' )?>"></i>&ensp;<wh><?=$name?></wh> - <?=$type?> ...</p>
<pre class="progress">
<script> // js must be here before php flush start
E        = {};
[ 'close', 'container', 'helphead', 'info', 'infobtn', 'progress', 'titleicon' ].forEach( ( el ) => {
	E[ el ] = document.getElementsByClassName( el )[ 0 ];
} );

document.title = 'Addons';
E.helphead.remove();
E.container.classList.remove( 'hide' );

E.close.addEventListener( 'click', () => location.href = '<?=$href?>' );
scroll = setInterval( () => E.progress.scrollTop = E.progress.scrollHeight, 500 );
</script>
<?php
// ......................................................................................
if ( $alias === 'cove' ) {
	$commandtxt = 'albumthumbnail.sh'.( $path ? ' "'.$path.'"' : '' );
	$command    = $sudobash.$commandtxt;
} else {
	$getinstall = <<< EOF
curl -sSfLO $installurl
[[ $? != 0 ]] && echo '<a class="cwbr"> ! </a> '$type script download failed. && exit

chmod 755 $installfile
cmd;
$uninstall = <<<cmd
/usr/bin/sudo $uninstallfile
EOF;
	if ( $type === 'Uninstall' ) {
		$command    = $uninstall;
		$commandtxt = "uninstall_$alias.sh";
	} else if ( $type === 'Update' && ! isset( $addon[ 'nouninstall' ] ) ) {
		$command    = <<< EOF
$getinstall
$uninstall
/usr/bin/sudo ./$installfile "$options"
EOF;
		$commandtxt = <<< EOF
curl -sSfLO $installurl
chmod 755 $installfile
uninstall_$alias.sh
./$installfile "$options"
EOF;
	} else {
		$command    = <<< EOF
$getinstall
/usr/bin/sudo ./$installfile "$options"
EOF;
		$commandtxt = <<< EOF
curl -sSfLO $installurl
chmod 755 $installfile
./$installfile "$options"
EOF;
	}
	echo $commandtxt.'<br>';

	if ( $type === 'Debug' ) {
		$listtext = htmlspecialchars( $list );
		echo <<< EOF

<hr>
<a class="cbc"> . </a> Addons List
<hr>
$listtext

<a class="cbc"> . </a> Done
<hr class="hrlight">
</pre>
<script>setTimeout( () => clearInterval( scroll ), 1000 );</script>
</body>
</html>
EOF;
		exit;
	}
}
$skip       = ['warning:', 'permissions differ', 'filesystem:', 'uninstall:', 'y/n' ];
$skippacman = [ 'downloading core.db', 'downloading extra.db', 'downloading alarm.db', 'downloading aur.db' ];
$fillbuffer = '<p class="flushdot">'.str_repeat( '.', 40960 ).'</p>';
ob_implicit_flush( true ); // start flush: bypass buffer - output to screen
ob_end_flush();            // force flush: current buffer (run after flush started)

echo $fillbuffer;          // fill buffer to force start output
if ( $type === 'Uninstall' ) sleep( 1 );
// >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
$popencmd = popen( "$command 2>&1", 'r' ); // start bash
while ( ! feof( $popencmd ) ) {            // get stdout until eof
	$std = fgets( $popencmd );             // get each line
	foreach( $skip as $find ) {            // skip line
		if ( stripos( $std, $find ) !== false ) continue 2;
	}
	foreach( $skippacman as $findp ) {     // skip pacman line after output once
		if ( stripos( $std, $findp ) !== false ) $skip[] = $findp; // add skip string to $skip array
	}
	echo $std;                             // output to screen
	echo $fillbuffer;                      // fill buffer after each line
	
	// abort on browser back/close
	if ( connection_status() !== 0 || connection_aborted() === 1 ) {
		pclose( $popencmd );
		exec( $sudobash.'addons.sh abort '.$installfile.' '.$alias );
		exit;
	}
}
sleep( 1 );
pclose( $popencmd );
// <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
?>
</pre>

<script> // run after php flush end
setTimeout( () => clearInterval( scroll ), 1000 );
E.titleicon.classList.remove( 'blink' );
E.info.classList.remove( 'hide' );
E.infobtn.addEventListener( 'click', () => E.info.remove() );
</script>

</body>
</html>
<!-- ...................................................................................... -->
