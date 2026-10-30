<?php
/*
 * MphpD
 * http://mphpd.org
 *
 * Copyright (c) 2023 Florian Faber
 * http://www.flofaber.com
 */

namespace FloFaber\MphpD;

/**
 * Subclass for [Stickers](https://mpd.readthedocs.io/en/latest/protocol.html#stickers).
 * @example MphpD::sticker(string $type, string $uri) : Sticker
 */
class Sticker
{

  private MphpD $mphpd;
  private string $type;
  private string $uri;

  /**
   * This class is not intended for direct usage.
   * Use `MphpD::sticker()` instead to retrieve an instance of this class.
   * @param MphpD $mphpd
   * @param string $type
   * @param string $uri
   */
  public function __construct(MphpD $mphpd, string $type, string $uri)
  {
    $this->mphpd = $mphpd;
    $this->type = $type;
    $this->uri = $uri;
  }

  /*
   * ##############
   *    STICKERS
   * ##############
   */


  /**
   * Returns the value of the specified sticker
   * @param string $name Name of the sticker.
   * @return false|string `string` on success or `false` on failure.
   */
  public function get(string $name)
  {
    // stickers are returned like this from MPD:
    // sticker: name=value
    // unfortunately we need to parse this

    $s = $this->mphpd->cmd("sticker get", [ $this->type, $this->uri, $name]);
    if($s === false OR !isset($s["sticker"])){ return false; }

    $sticker = explode("=", $s["sticker"], 2);
    if(count($sticker) !== 2){ return false; }

    return $sticker[1];
  }


  /**
   * Add a value to the specified sticker.
   * @param string $name Name of the value.
   * @param string $value Value of the value.
   * @return bool `true` on success or `false` on failure.
   */
  public function set(string $name, string $value) : bool
  {
    return $this->mphpd->cmd("sticker set", [ $this->type, $this->uri, $name, $value ], MPD_CMD_READ_BOOL);
  }


  /**
   * Deletes the value from the specified sticker.
   * @param string $name If omitted all sticker values will be deleted.
   * @return bool `true` on success or `false` on failure.
   */
  public function delete(string $name = ""): bool
  {
    return $this->mphpd->cmd("sticker delete", [ $this->type, $this->uri, $name ], MPD_CMD_READ_BOOL);
  }


  /**
   * Returns an associative array containing sticker names and values of the specified object.
   * @return array|false `array` on success or `false` on failure.
   */
  public function list()
  {
    // stickers are returned like this from MPD:
    // sticker: name=value
    // unfortunately we need to parse this

    $stickers = [];

    $ss = $this->mphpd->cmd("sticker list", [ $this->type, $this->uri ], MPD_CMD_READ_LIST);
    if($ss === false){ return false; }

    foreach($ss as $s){ // say that 5 times in a row
      $sticker = explode("=", $s["sticker"], 2);
      $stickers[$sticker[0]] = $sticker[1];
    }

    return $stickers;
  }


  /**
   * Search the sticker database for sticker with the specified name and/or value in the specified `$uri`
   * @param string $name The sticker name
   * @param string $operator Optional. Can be one of `=`, `<` or `>`. Only in combination with $value.
   * @param string $value Optional. The value to search for. Only in combination with $operator.
   * @return array|false `array` on success or `false` on failure.
   */
  public function find(string $name, string $operator = "", string $value = "")
  {
    // stickers are returned like this from MPD:
    // sticker: name=value
    // unfortunately we need to parse this

    $stickers = [];

    // we need a little cheat here
    $uri = $this->uri;
    if($this->uri === ""){
      $uri = "''";
    }

    $ss = $this->mphpd->cmd("sticker find", [ $this->type, $uri, $name, $operator, $value ], MPD_CMD_READ_LIST);
    if($ss === false){ return false; }

    foreach($ss as $s){
      $sticker = explode("=", $s["sticker"], 2);
      $stickers[] = [
        "file" => $s["file"],
        "sticker" => [
          $sticker[0],
          $sticker[1]
        ]
      ];
    }
    return $stickers;
  }


}