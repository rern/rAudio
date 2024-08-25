<?php
ignore_user_abort( TRUE ); // for 'connection_status()' to work

$alias      = $_POST[ 'alias' ];
$branch     = $_POST[ 'branch' ] ?? '';
$installurl = $_POST[ 'installurl' ] ?? '';
$label      = $_POST[ 'label' ];
$postinfo   = $_POST[ 'postinfo' ] ?? '';
$opt        = $_POST[ 'opt' ] ?? '';
$title      = $_POST[ 'title' ];
$uninstall  = $_POST[ 'uninstall' ] ?? '';
$icon       = '<i class="page-icon i-jigsaw"></i>';
$hrefback   = 'settings.php?p=addons';
$postmsg    = $label.' done.';
$postmsg   .= $postinfo ? '<br><br><i class="i-addons wh"></i>'.$postinfo : '';
if ( $alias === 'albumthumbnail' ) {
	$label    = 'Update';
	$title    = 'Album Thumbnails';
	$icon     = str_replace( 'jigsaw', 'coverart', $icon );
	$hrefback = '/';
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
if ( window.history.replaceState ) window.history.replaceState( null, null, '<?=$hrefback?>' ); // on refresh page
document.title = 'Addons';
E      = {};
[ 'close', 'container', 'info', 'infobtn', 'infox', 'progress', 'titleicon' ].forEach( ( el ) => {
	E[ el ] = document.getElementsByClassName( el )[ 0 ];
} );
E.container.classList.remove( 'hide' );
E.close.addEventListener( 'click', () => location.href = '<?=$hrefback?>' );
[ E.infobtn, E.infox ].forEach( el => el.addEventListener( 'click', () => E.info.remove() ) );
scroll = setInterval( () => E.progress.scrollTop = E.progress.scrollHeight, 500 );
document.body.addEventListener( 'keydown', e => {
	switch( e.key ) {
		case 'Enter':
		case 'Escape':
			E.info.classList.add( 'hide' );
			break
		case 'x':
			if ( e.ctrlKey ) E.close.click();
			break
	}
} );
</script>
<?php
// ......................................................................................
if ( $alias === 'albumthumbnail' ) {
	$command    = '/usr/bin/sudo /srv/http/bash/albumthumbnail.sh "'.$_POST[ 'path' ].'" '.$_POST[ 'overwrite' ];
	$commandtxt = $command;
} else if ( $label === 'Uninstall' ) {
	$command    = 'uninstall_'.$alias.'.sh';
	$commandtxt = $command;
} else {
	$installfile = basename( $installurl );
	$options     = $alias."\n".$label."\n".$branch;
	if ( $opt ) $options.= "\n".preg_replace( '/(["`])/', '\\\\\1', implode( "\n", $opt ) );
	$command    = <<< EOF
curl -sSfLO $installurl
[[ $? != 0 ]] && echo '<a class="cbr"> ! </a> '$label script download failed. && exit

chmod 755 $installfile
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
ob_implicit_flush( true ); // flush each stdout
ob_end_flush();            // turn off buffer

echo $fillbuffer;          // fill buffer to force start output
if ( $label === 'Uninstall' ) sleep( 1 );

// >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
$proc       = proc_open( $command, [ [ 'pipe','r' ], [ 'pipe', 'w' ], [ 'pipe', 'w' ] ], $pipes );
foreach( [ 0, 1, 2 ] as $i ) {
	if ( $i > 0 ) {
		while ( ! feof( $pipes[ $i ] ) ) {
			$std = fgets( $pipes[ $i ] );
			foreach( $skip as $find ) {            // skip line
				if ( stripos( $std, $find ) !== false ) continue 2;
			}
			foreach( $skippacman as $findp ) {     // skip pacman line after output once
				if ( stripos( $std, $findp ) !== false ) $skip[] = $findp; // add skip string to $skip array
			}
			echo $std;                             // output to screen
			echo $fillbuffer;                      // fill buffer after each line
			if ( connection_status() !== 0 || connection_aborted() === 1 ) {
				$pstatus = proc_get_status( $proc );
				$ppid    = $pstatus[ 'pid ' ];
				exec( "ps -o pid --no-heading --ppid $ppid | tr -d ' '", $pids );
				foreach( $pids as $pid ) posix_kill( $pid, 9 );
				proc_terminate( $proc );
			}
		}
	}
	fclose( $pipes[ $i ] );
}
proc_close( $proc );
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
