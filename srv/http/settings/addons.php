<?php
$time = time();
$sudo = '/usr/bin/sudo /usr/bin/';
$diraddons = '/srv/http/data/addons';
$addons = json_decode( file_get_contents( $diraddons.'/addons-list.json' ), true );
?>
<!DOCTYPE html>
<html>
<head>
	<title>addons</title>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
	<meta name="apple-mobile-web-app-capable" content="yes">
	<meta name="apple-mobile-web-app-status-bar-style" content="black">
	<meta http-equiv="X-UA-Compatible" content="IE=edge">
	<meta name="msapplication-tap-highlight" content="no">
	<link rel="icon" href="/assets/img/icon.<?=$time?>.png">
	<style>
		@font-face {
			font-family: rern;
			src        : url( '/assets/fonts/rern.<?=$time?>.woff' ) format( 'woff' ),
			             url( '/assets/fonts/rern.<?=$time?>.ttf' ) format( 'truetype' );
			font-weight: normal;
			font-style : normal;
		}
	</style>
	<link rel="stylesheet" href="/assets/css/colors.<?=$time?>.css">
	<link rel="stylesheet" href="/assets/css/fonts.<?=$time?>.css">
	<link rel="stylesheet" href="/assets/css/info.<?=$time?>.css">
	<link rel="stylesheet" href="/assets/css/banner.<?=$time?>.css">
	<link rel="stylesheet" href="/assets/css/addons.<?=$time?>.css">
	<link rel="stylesheet" href="/assets/css/selectric.<?=$time?>.css">
</head>
<body>
<div class="head">
	<i class="page-icon fa fa-jigsaw"></i><span class="title">ADDONS</span><a href="/"><i id="close" class="fa fa-times"></i></a>
</div>
<div class="container">
<?php
// ------------------------------------------------------------------------------------
$list = '';
$blocks = '';
$updates = 0;
$arrayalias = array_keys( $addons );
foreach( $arrayalias as $alias ) {
	$addon = $addons[ $alias ];
	$version = $addon[ 'version' ] ?? '';
	$nouninstall = $addon[ 'nouninstall' ] ?? '';
	$versioninstalled = file_exists( "$diraddons/$alias" ) ? trim( file_get_contents( "$diraddons/$alias" ) ) : 1;
	$update = 0;
	// hide by conditions
	if ( isset( $addon[ 'hide' ] ) ) {
		$addonhide = $addon[ 'hide' ];
		if ( $addonhide === 1 || exec( $addonhide ) ) continue;
	}
	
	$buttonlabel = $addon[ 'buttonlabel' ] ?? '<i class="fa fa-plus-circle"></i>Install';
	$uninstallfile = file_exists( "/usr/local/bin/uninstall_$alias.sh" );
	if ( $nouninstall || $uninstallfile ) {
		$installed = ' class="installed"';
		$check = '<grn>&bull;</grn> ';
		if ( $nouninstall ) {
			$taphold = ' style="pointer-events: unset"';
			$hide = ' hide';
		} else {
			$taphold = '';
			$hide = '';
		}
		if ( isset( $addon[ 'verify' ] ) ) {
			$verify = $addon[ 'verify' ];
			$notverified = exec( $verify[ 'command' ] ) ? $verify[ 'notverified' ] : '';
		}
		if ( $notverified ) {
			$btnin = '<i class="fa fa-info-circle fa-lg gr info"></i><div class="info">'.$notverified.'</div>';
		} else if ( !$version || $version == $versioninstalled ) {
			$icon = $nouninstall ? '<i class="fa fa-update"></i>' : '';
			// !!! mobile browsers: <button>s submit 'formtemp' with 'get' > 'failed', use <a> instead
			$btnin = '<a class="btn btn-default disabled"'.$taphold.'>'.$icon.$buttonlabel.'</a>';
		} else {
			$updates = 1;
			$update = 1;
			$installed = ' class="installed update"';
			$check = '<grn class="blink">&bull;</grn> ';
			$btnin = '<a class="btn btn-primary"><i class="fa fa-update"></i>Update</a>';
		}
		$btnunattr = isset( $addon[ 'rollback' ] ) ? ' rollback="'.$addon[ 'rollback' ].'"' : '';
		$btnun = '<a class="btn btn-primary red'.$hide.'" '.$btnunattr.'><i class="fa fa-minus-circle"></i>Uninstall</a>';
	} else {
		$installed = '';
		$check = '';
		$btnin = '<a class="btn btn-primary">'.$buttonlabel.'</a>';
		$btnun = '<a class="btn btn-default disabled"><i class="fa fa-minus-circle"></i>Uninstall</a>';
	}
	
	// addon list ---------------------------------------------------------------
	$title = $addon[ 'title' ];
	$list.= '<li alias="'.$alias.'"'.$installed.'>'.$title.'</li>';
	// addon blocks -------------------------------------------------------------
	$revisionclass = $version ? 'revision' : 'revisionnone';
	$addonrevision = $addon[ 'revision' ] ?? '';
	if ( $addonrevision ) {
		if ( is_array( $addonrevision ) ) $addonrevision = implode( '<br>', $addonrevision );
		$revision = str_replace( '\\', '', $addonrevision ); // remove escaped [ \" ] to [ " ]
		$revision = '<p class="revisiontext">'.$revision.'</p>';
	} else {
		$revision = '';
	}
	$description = $addon[ 'description' ];
	if ( is_array( $description ) ) $description = implode( '<br>', $description );
	$description = str_replace( '\\', '', $description );
	$sourcecode = $addon[ 'sourcecode' ];
	if ( $sourcecode && $buttonlabel !== 'Link' ) {
		$detail = '<br><a href="'.$sourcecode.'" target="_blank" class="source">source <i class="fa fa-github"></i></a>';
	} else {
		$detail = '';
	}
	$blocks .= '
		<div id="'.$alias.'" class="boxed-group">';
	$thumbnail = $addon[ 'thumbnail' ] ?? '';
	if ( $thumbnail ) $blocks .= '
		<div style="float: left; width: calc( 100% - 110px);">';
	$blocks .= '
			<legend>
				<span>'.$check.preg_replace( '/\**$/', '', $title ).'</span>
				&emsp;<p><a class="'.$revisionclass.'">'.$version.( $version ? '&ensp;<i class="fa fa-chevron-down"></i>' : '' ).'</a>
				</p><i class="fa fa-arrow-up"></i>
			</legend>
			'.$revision.'
			<form class="form-horizontal" alias="'.$alias.'" version="'.$version.'">
				<p class="detailtext">'.$description.$detail.'</p>';
	$blocks .= $uninstallfile ? $btnin.' &nbsp; '.$btnun : $btnin;
	$blocks .= '
			</form>';
	if ( $thumbnail ) $blocks .= '
		</div>
		<img src="'.preg_replace( '/\.(.*)$/', '.'.$time.'.$1', $thumbnail ).'" class="thumbnail">
		<div style="clear: both;"></div>';
	$blocks .= '
		</div>';
}
if ( $updates ) {
	touch( "$diraddons/update" );
} else {
	@unlink( "$diraddons/update" );
}

// ------------------------------------------------------------------------------------
echo '
	<ul id="list">'.
		$list.'
	</ul>
';
echo $blocks;
?>
</div>
<p id="bottom"></p> <!-- for bottom padding -->

<?php
$keepkey = [ 'title', 'installurl', 'rollback', 'option', 'postinfo' ];
foreach( $arrayalias as $alias ) {
	$addonslist[ $alias ] = array_intersect_key( $addons[ $alias ], array_flip( $keepkey ) );
}
$restartfile = '/srv/http/data/shm/restart';
if ( file_exists( $restartfile ) ) {
	$restart = trim( file_get_contents( $restartfile ) );
	@unlink( $restartfile );
} else {
	$restart = '';
}
?>
<script src="/assets/js/plugin/jquery-2.2.4.min.<?=$time?>.js"></script>
<script src="/assets/js/plugin/jquery.mobile.custom.min.<?=$time?>.js"></script>
<script src="/assets/js/plugin/jquery.selectric.min.<?=$time?>.js"></script>
<script src="/assets/js/info.<?=$time?>.js"></script>
<script src="/assets/js/banner.<?=$time?>.js"></script>
<script src="/assets/js/addons.<?=$time?>.js"></script>
<script>
var addons = <?=json_encode( $addonslist )?>;
var restart = '<?=$restart?>';
if ( restart ) {
	setTimeout( function() {
		$.post( 'cmd.php', { cmd: 'bash', bash: 'systemctl restart '+ restart } );
	}, 1000 );
}
</script>

</body>
</html>
