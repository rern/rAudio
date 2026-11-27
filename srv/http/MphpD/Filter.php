<?php
/*
 * MphpD
 * http://mphpd.org
 *
 * Copyright (c) 2023 Florian Faber
 * http://www.flofaber.com
 */

namespace FloFaber\MphpD;

require_once __DIR__ . "/Utils.php";

/**
 * Filters provide a way to search for specific songs. They take care of parsing and escaping.
 * They are used in various other methods like [DB::search](../classes/DB#search), [Playlist::add_search](../classes/Playlist#add_search) and more.
 * Refer to the [MPD documentation](https://mpd.readthedocs.io/en/latest/protocol.html#filters) for more information about filters.
 * @example new FloFaber\MphpD\Filter(string $tag, string $operator, string $value) : Filter
 */
class Filter
{

  private array $tags = [];
  private array $operators = [];
  private array $values = [];


  /**
   * Creates a new filter. If $tag or $operator is empty, an empty Filter is returned.
   * @param string $tag Tag to be searched for. Like artist, title,...
   * @param string $operator Comparison operator. Like ==, contains, ~=,...
   * @param string $value The value to search for. Unescaped.
   */
  public function __construct(string $tag = "", string $operator = "", string $value = "")
  {
    $this->and($tag, $operator, $value);
  }


  /**
   * Used to chain multiple filters together with a logical AND. If $tag or $operator is empty, the condition is not added to the Filter.
   * @param string $tag
   * @param string $operator
   * @param string $value
   * @return $this
   */
  public function and(string $tag, string $operator, string $value): Filter
  {

    if($tag === "" || $operator === ""){ return $this; }

    if($value === ""){
      $value = "''";
    }else{
      $value = Utils::escape_params([ $value ], MPD_ESCAPE_DOUBLE_QUOTES);
    }

    $this->tags[] = $tag;
    $this->operators[] = $operator;
    $this->values[] = $value;
    return $this;
  }


  /**
   * Generate and return the Filter string.
   * @return string
   */
  public function __toString()
  {
    $s = "\"";
    if(count($this->tags) > 1){
      $s .= "(";
    }

    for($i = 0; $i < count($this->tags); $i++){

      $t = $this->tags[$i];
      $o = $this->operators[$i];
      $v = $this->values[$i];

      if($i > 0){
        $s .= " AND ";
      }

      $s .= "($t $o $v)";

    }

    if(count($this->tags) > 1){
      $s .= ")";
    }

    return $s."\"";
  }

}
