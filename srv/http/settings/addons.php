<?php
$diraddons  = '/srv/http/data/addons';
$addons     = json_decode( file_get_contents( $diraddons.'/addons-list.json' ), true );
// ------------------------------------------------------------------------------------
$updates    = 0;
$arrayalias = array_keys( $addons );
$list       = '<ul id="list">';
$blocks     = '';
foreach( $arrayalias as $alias ) {
	$addon            = $addons[ $alias ];
	$version          = $addon[ 'version' ] ?? '';
	$nouninstall      = $addon[ 'nouninstall' ] ?? '';
	$versioninstalled = file_exists( "$diraddons/$alias" ) ? trim( file_get_contents( "$diraddons/$alias" ) ) : 1;
	$update           = 0;
	// hide by conditions
	if ( isset( $addon[ 'hide' ] ) ) {
		$addonhide = $addon[ 'hide' ];
		if ( $addonhide === 1 || exec( $addonhide ) ) continue;
	}
	
	$buttonlabel      = $addon[ 'buttonlabel' ] ?? '<i class="i-plus-circle"></i> Install';
	$uninstallfile    = file_exists( "/usr/local/bin/uninstall_$alias.sh" );
	if ( $nouninstall || $uninstallfile ) {
		$installed = 'class="installed"';
		$check     = '<grn>•</grn> ';
		$hide      = $nouninstall ? 'hide' : '';
		if ( isset( $addon[ 'verify' ] ) ) {
			$verify      = $addon[ 'verify' ];
			$notverified = exec( $verify[ 'command' ] ) ? $verify[ 'notverified' ] : '';
		}
		if ( $notverified ) {
			$btnin     = '<i class="i-info-circle i-lg gr info"></i><div class="info">'.$notverified.'</div>';
		} else if ( ! $version || $version == $versioninstalled ) {
			$icon      = $nouninstall ? '<i class="i-update"></i>' : '';
			// !!! mobile browsers: <button>s submit 'formtemp' with 'get' > 'failed', use <a> instead
			$btnin     = '<a class="infobtn infobtn-default disabled">'.$icon.' '.$buttonlabel.'</a>';
		} else {
			$updates   = 1;
			$update    = 1;
			$installed = 'class="installed update"';
			$check     = '<grn class="blink">•</grn> ';
			$btnin     = '<a class="infobtn infobtn-primary"><i class="i-update"></i> Update</a>';
		}
		$btnunattr = isset( $addon[ 'rollback' ] ) ? ' rollback="'.$addon[ 'rollback' ].'"' : '';
		$btnun     = '<a class="infobtn infobtn-primary red '.$hide.'" '.$btnunattr.'><i class="i-minus-circle"></i> Uninstall</a>';
	} else {
		$installed = '';
		$check     = '';
		$btnin     = '<a class="infobtn infobtn-primary">'.$buttonlabel.'</a>';
		$btnun     = '<a class="infobtn disabled"><i class="i-minus-circle"></i> Uninstall</a>';
	}
	
	// addon list ---------------------------------------------------------------
	$title         = $addon[ 'title' ];
	$list         .= '<li data-alias="'.$alias.'" '.$installed.'>'.$title.'</li>';
	// addon blocks -------------------------------------------------------------
	$revisionclass = $version ? 'revision' : 'revisionnone';
	$addonrevision = $addon[ 'revision' ] ?? '';
	if ( $addonrevision ) {
		if ( is_array( $addonrevision ) ) $addonrevision = implode( '<br><gr>•</gr> ', $addonrevision );
		$revision  = str_replace( '\\', '', $addonrevision ); // remove escaped [ \" ] to [ " ]
		$revision  = '<p class="revisiontext hide"><gr>•</gr> '.$revision.'</p>';
	} else {
		$revision  = '';
	}
	$description   = $addon[ 'description' ];
	if ( is_array( $description ) ) $description = implode( '<br>', $description );
	$description   = str_replace( '\\', '', $description );
	$sourcecode    = $addon[ 'sourcecode' ];
	if ( $sourcecode && $buttonlabel !== 'Link' ) {
		$detail   = '<br><a href="'.$sourcecode.'" class="source">source <i class="i-github"></i></a>';
	} else {
		$detail   = '';
	}
	$blocks      .= '
		<div id="'.$alias.'" class="boxed-group">';
	$thumbnail    = $addon[ 'thumbnail' ] ?? '';
	if ( $thumbnail ) $blocks .= '
		<div style="float: left; width: calc( 100% - 110px);">';
	$blocks      .= '
			<legend>
				<span>'.$check.preg_replace( '/\**$/', '', $title ).'</span>
				&emsp;<p><a class="'.$revisionclass.'">'.$version.( $version ? ' <i class="i-help"></i>' : '' ).'</a>
				</p>
			</legend>
			'.$revision.'
			<form class="form-horizontal" data-alias="'.$alias.'">
				<p class="detailtext">'.$description.$detail.'</p>';
	$blocks     .= $uninstallfile ? $btnin.' &nbsp; '.$btnun : $btnin;
	$blocks     .= '
			</form>';
	if ( $thumbnail ) $blocks .= '
		</div>
		<img src="'.$thumbnail.$hash.'" class="thumbnail">
		<div style="clear: both;"></div>';
	$blocks     .= '
		</div>';
}
if ( $updates ) {
	touch( "$diraddons/update" );
} else {
	@unlink( "$diraddons/update" );
}
// ------------------------------------------------------------------------------------
echo $list.'
	</ul>'.
	$blocks.'
	<p class="bottom"></p>
</div>';

$keepkey = [ 'title', 'installurl', 'option', 'postinfo', 'version' ];
foreach( $arrayalias as $alias ) {
	$addonslist[ $alias ] = array_intersect_key( $addons[ $alias ], array_flip( $keepkey ) );
}
?>

<script>
var addons = <?=json_encode( $addonslist )?>;
</script>
