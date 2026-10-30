<?php
/*
 * MphpD
 * http://mphpd.org
 * Copyright (c) 2023 Florian Faber
 * http://www.flofaber.com
 */

namespace FloFaber\MphpD;

require_once __DIR__ . "/MPDException.php";

// php<8 compatibility
if(!function_exists("str_starts_with")){
  function str_starts_with(string $haystack, string $needle) : bool
  {
    return strpos($haystack, $needle) === 0;
  }
}


/**
 * Class containing several utility or helper functions.
 */
class Utils
{

  /**
   * Function to parse an array of given parameters.
   * @param array $params Array of strings.
   * @param int $flags One or multiple OR-ed together of the following:
   *                  * MPD_ESCAPE_NORMAL        - "beetle's juice" becomes "\"beetle\'s juice\""
   *                  * MPD_ESCAPE_DOUBLE_QUOTES - "beetle's juice" becomes "\\\"beetle\'s juice\\\""
   *                  * MPD_ESCAPE_PREFIX_SPACE  - Adds a space at the params beginning
   *                  * MPD_ESCAPE_SUFFIX_SPACE  - Adds a space at the params ending
   * @return string
   */
  public static function escape_params(array $params, int $flags = MPD_ESCAPE_PREFIX_SPACE): string
  {
    $quote = "\"";
    if($flags & MPD_ESCAPE_DOUBLE_QUOTES){
      $quote = "\\\"";
    }

    $prefix = $suffix = "";
    if($flags & MPD_ESCAPE_PREFIX_SPACE){ $prefix = " "; }
    if($flags & MPD_ESCAPE_SUFFIX_SPACE){ $suffix = " "; }

    $parsed = "";
    foreach($params as $param){
      $param = (string)$param;
      // @ToDo make sure this works aka. test this
      if(strlen($param) === 0){ continue; }
      //$param = str_replace("\\", "\\\\", $param);
      $param = escapeshellcmd($param);
      $parsed .= $prefix.$quote.$param.$quote.$suffix;
    }
    return $parsed;
  }


  /**
   * Function to "convert" int or array to a pos or range argument
   * @param int|array $p
   * @return int|string
   */
  public static function pos_or_range($p)
  {
    if(is_array($p)){
      if(!$p){ return ""; }
      return ($p[0] ?? "").":".($p[1] ?? "");
    }elseif($p !== -1){
      return $p;
    }
    return "";
  }


  /** Function to parse an MPD error string to an array
   * @param string $error The error string. For example "ACK [error@command_listNum] {current_command} message_text"
   * @return MPDException
   */
  public static function parse_error(string $error) : MPDException
  {
    if(!str_starts_with($error, "ACK")){
      return new MPDException($error, 1);
    }
    $s = explode(" ", $error, 4);
    $e = explode("@", trim($s[1], "[]"), 2);
    $s[2] = trim($s[2], "{}");

    $message = $s[3];
    $code = (int)$e[0];
    $commandlist_num = (int)$e[1];
    $command = $s[2];

    return new MPDException($message, $code, null, $command, $commandlist_num);
  }

}










