<?php
ignore_user_abort( TRUE ); // for 'connection_status()' to work

$fileflag    = '/srv/http/data/shm/addonsprogress';
if ( file_exists( $fileflag ) ) { // close on refresh
	header( 'Location: settings.php?p=addons' );
	exit();
}

$dirsettings = '/usr/bin/sudo /srv/http/bash/settings/';
$alias       = $_POST[ 'alias' ];
if ( $alias === 'albumthumbnail' ) {
	$label       = 'Update';
	$title       = 'Album Thumbnails';
	$icon        = '<i class="page-icon i-coverart"></i>';
	$hrefback    = '/';
} else {
	$branch      = $_POST[ 'branch' ];
	$installurl  = $_POST[ 'installurl' ];
	$label       = $_POST[ 'label' ];
	$postinfo    = $_POST[ 'postinfo' ] ?? '';
	$title       = $_POST[ 'title' ];
	$uninstall   = $_POST[ 'uninstall' ] ?? '';
	$opt         = $_POST[ 'opt' ] ?? '';

	$icon        = '<i class="page-icon i-jigsaw"></i>';
	$hrefback    = 'settings.php?p=addons';
	$installfile = basename( $installurl );
	$options     = $alias."\n".$label."\n".$branch;
	if ( $opt ) $options.= "\n".preg_replace( '/(["`])/', '\\\\\1', implode( "\n", $opt ) );
	$postmsg     = $label.' done.';
	if ( $postinfo ) $postmsg.= '<br><br><i class="i-addons wh"></i>'.$postinfo;
	touch( $fileflag );
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
pre hr {
	margin : 10px 0 -10px -10px;
	border : 1px solid var( --cml );
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
.cbm  { background: var( --cml ); }
.cbg  { background: #00ff00; }
.cbgr { background: var( --cg ); }
.cbr  { background: #ff0000; }
.cbw  { background: var( --cw ); }
.cby  { background: #ffff00; }
.cc   { color: var( --cm60 ) }
.cgr  { color: var( --cg ) }
.ck   { color: #000 }
.cw   { color: var( --cw ) }
</style>

<div id="infoOverlay" class="info hide">
	<div id="infoBox">
		<div id="infoTopBg">
			<div id="infoTop"><i class="i-jigsaw"></i><a id="infoTitle"><?=$title?></a></div><i id="infoX" class="i-close infox"></i>
		</div>
		<div id="infoList"><div class="infomessage"><?=$postmsg?></div></div>
		<div class="infobtn infobtn-primary">OK</div>
	</div>
</div>
<br>
<p class="addontitle gr"><i class="titleicon i-gear<?=( $localhost ? '' : ' blink' )?>"></i>&ensp;<wh><?=$title?></wh> - <?=$label?> ...</p>
<pre class="progress">
<script> // js must be here before php flush start
E        = {};
[ 'close', 'container', 'helphead', 'info', 'infobtn', 'infox', 'progress', 'titleicon' ].forEach( ( el ) => {
	E[ el ] = document.getElementsByClassName( el )[ 0 ];
} );

document.title = 'Addons';
E.helphead.remove();
E.container.classList.remove( 'hide' );

E.close.addEventListener( 'click', () => location.href = '<?=$hrefback?>' );
[ E.infobtn, E.infox ].forEach( el => el.addEventListener( 'click', () => E.info.remove() ) );
scroll = setInterval( () => E.progress.scrollTop = E.progress.scrollHeight, 500 );
</script>
<?php
// ......................................................................................
$getinstall = <<< EOF
curl -sSfLO $installurl
[[ $? != 0 ]] && echo '<a class="cbr"> ! </a> '$label script download failed. && exit

chmod 755 $installfile
EOF;

if ( $alias === 'albumthumbnail' ) {
	$command    = $dirsettings.'albumthumbnail.sh';
	if ( isset( $_POST[ 'path' ] ) ) $command.= ' "'.$_POST[ 'path' ].'"';
	$commandtxt = $command;
} else if ( $label === 'Uninstall' ) {
	$command    = "uninstall_$alias.sh";
	$commandtxt = $command;
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
	if ( $label === 'Update' && $uninstall ) $commandtxt = str_replace( './', "uninstall_$alias.sh\n./", $commandtxt );
}
echo $commandtxt.'<br>';

$skip       = ['warning:', 'permissions differ', 'filesystem:', 'uninstall:', 'y/n' ];
$skippacman = [ 'downloading core.db', 'downloading extra.db', 'downloading alarm.db', 'downloading aur.db' ];
$fillbuffer = '<p class="hide">'.str_repeat( '.', 40960 ).'</p>';
ob_implicit_flush( true ); // start flush: bypass buffer - output to screen
ob_end_flush();            // force flush: current buffer (run after flush started)

echo $fillbuffer;          // fill buffer to force start output
if ( $label === 'Uninstall' ) sleep( 1 );
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
		exec( $dirsettings.'addons.sh abort '.$installfile.' '.$alias );
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
</script>

</body>
</html>
