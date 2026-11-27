<?php
/*
 * MphpD
 * http://mphpd.org
 * Copyright (c) 2023 Florian Faber
 * http://www.flofaber.com
 */

namespace FloFaber\MphpD;

require_once __DIR__ . "/Filter.php";

/**
 * Subclass to control the Queue.
 * @example MphpD::queue() : Queue
 */
class Queue
{
  private MphpD $mphpd;

  /**
   * This class is not intended for direct usage.
   * Use `MphpD::queue()` instead to retrieve an instance of this class.
   * @param MphpD $mphpd
   */
  public function __construct(MphpD $mphpd)
  {
    $this->mphpd = $mphpd;
  }


  /**
   * Adds the file `$uri` to the queue (directories add recursively). `$uri` can also be a single file.
   * @param string $uri Can be a single file or folder.
   *                    If connected via Unix socket you may add arbitrary local files (absolute paths)
   * @param int|string $pos If set the song is inserted at the specified position.
   *                 If the parameter starts with + or -, then it is relative to the current song.
   *                 e.g. +0 inserts right after the current song and -0 inserts right before the current song (i.e. zero songs between the current song and the newly added song).
   * @return bool `true` on success and `false` on failure.
   */
  public function add(string $uri, $pos = -1) : bool
  {
    return $this->mphpd->cmd("add", [ $uri, ($pos !== -1 ? $pos : "") ], MPD_CMD_READ_BOOL);
  }


  /**
   * Adds a song to the playlist (non-recursive) and returns the song id.
   * @param string $uri Is always a single file or URL
   * @param int|string $pos If set the song is inserted at the specified position.
   *                 If the parameter starts with + or -, then it is relative to the current song.
   *                 e.g. +0 inserts right after the current song and -0 inserts right before the current song (i.e. zero songs between the current song and the newly added song).
   * @return int|false The song ID on success or `false` on failure.
   */
  public function add_id(string $uri, $pos = -1)
  {
    $add_id = $this->mphpd->cmd("addid", [ $uri, ($pos !== -1 ? $pos : "") ]);
    if(!$add_id){ return false; }
    return $add_id["id"] ?? false;
  }


  /**
   * Same as `search()` but adds the songs into the Queue at position `$pos`.
   * @see DB::search()
   * @param Filter $filter
   * @param string $sort
   * @param array $window
   * @param int $position
   * @return bool `true` on success and `false` on failure.
   */
  public function add_search(Filter $filter, string $sort = "", array $window = [], int $position = -1) : bool
  {
    return $this->mphpd->cmd("searchadd $filter", [
        ($sort ? "sort" : ""), ($sort ?: ""),
        ($window ? "window" : ""), ($window ? Utils::pos_or_range($window) : ""),
        ($position !== -1 ? "position" : ""), ($position !== -1 ? $position : "")
      ], MPD_CMD_READ_BOOL);
  }


  /**
   * Same as `find()` but this adds the matching song to the Queue.
   * @see DB::find()
   * @param Filter $filter
   * @param string $sort
   * @param array $window
   * @param int $pos Optional. If specified the matched songs will be added to this position in the Queue.
   * @return bool `true` on success and `false` on failure.
   */
  public function add_find(Filter $filter, string $sort = "", array $window = [], int $pos = -1): bool
  {
    return $this->mphpd->cmd("findadd $filter", [
      ($sort ? "sort" : ""), ($sort ?: ""),
      ($window ? "window" : ""), ($window ? Utils::pos_or_range($window) : ""),
      ($pos !== -1 ? "position" : ""), ($pos !== -1 ? $pos : "")
    ], MPD_CMD_READ_BOOL);
  }


  /**
   * Clears the queue
   * @return bool `true` on success and `false` on failure.
   */
  public function clear() : bool
  {
    return $this->mphpd->cmd("clear", [], MPD_CMD_READ_BOOL);
  }


  /**
   * Deletes a song or a range of songs from the queue
   * @param int|array $p The song position or Range
   * @return bool `true` on success and `false` on failure.
   */
  public function delete($p) : bool
  {
    return $this->mphpd->cmd("delete", [ Utils::pos_or_range($p) ], MPD_CMD_READ_BOOL);
  }


  /**
   * Deletes the song with ID `$songid` from the Queue
   * @param int $songid The song ID
   * @return bool `true` on success and `false` on failure.
   */
  public function delete_id(int $songid) : bool
  {
    return $this->mphpd->cmd("deleteid", [$songid], MPD_CMD_READ_BOOL);
  }


  /**
   * Moves the song at `$from` to `$to` in the queue
   * @param int|array $from Song position or Range
   * @param string $to If starting with + or -, then it is relative to the current song
   *                   e.g. +0 moves to right after the current song and -0 moves to right before the current song
   *                   (i.e. zero songs between the current song and the moved range).
   * @return bool `true` on success and `false` on failure.
   */
  public function move($from, string $to) : bool
  {
    if(!is_numeric($to))
      $this->mphpd->set_error(new MPDException("\$to is not numeric.", 400));

    return $this->mphpd->cmd("move", [ Utils::pos_or_range($from), $to ], MPD_CMD_READ_BOOL);
  }


  /**
   * Moves the song with `$from` (songid) to `$to` (playlist index) in the queue.
   * @param int $from Song ID
   * @param string $to Playlist Index. If starting with + or -, then it is relative to the current song
   *                   e.g. +0 moves to right after the current song and -0 moves to right before the current song
   *                   (i.e. zero songs between the current song and the moved song).
   * @return bool `true` on success and `false` on failure.
   */
  public function move_id(int $from, string $to) : bool
  {
    if(!is_numeric($to))
      $this->mphpd->set_error(new MPDException("\$to is not numeric.", 400));
    return $this->mphpd->cmd("moveid", [$from, $to], MPD_CMD_READ_BOOL);
  }


  /**
   * Same as Queue::search but case-sensitive
   * @param Filter $filter
   * @param string $sort
   * @param array $window
   * @return array|false `array` on success or `false` on failure.
   */
  public function find(Filter $filter, string $sort = "", array $window = [])
  {
    return $this->mphpd->cmd("playlistfind $filter", [
      ($sort ? "sort" : ""), ($sort ?: ""),
      ($window ? "window" : ""), ($window ? Utils::pos_or_range($window) : "")
    ], MPD_CMD_READ_LIST);
  }


  /**
   * Returns an associative arrays containing information about the song with ID `$songid`.
   * @param int $songid Song ID
   * @return array|false Associative `array` containing song information or `false` on failure.
   */
  public function get_id(int $songid)
  {
    return $this->mphpd->cmd("playlistid", [ $songid ], MPD_CMD_READ_NORMAL);
  }


  /**
   * Returns information about all or specific songs in the Queue.
   * @param $p int|array Optional. Song Position or Range.
   *                     If omitted returns an array of associative arrays containing information about all songs in the Queue.
   *                     If specified returns an associative array containing the given songs information only.
   * @return array|false `array` on success or `false` on failure. An empty `array` is returned if the queue is empty.
   */
  public function get($p = -1)
  {

    $m = MPD_CMD_READ_LIST;
    if(!is_array($p)){
      $m = MPD_CMD_READ_NORMAL;
    }
    if($p === -1){
      $m = MPD_CMD_READ_LIST;
    }
    return $this->mphpd->cmd("playlistinfo", [ Utils::pos_or_range($p) ], $m);
  }


  /**
   * Search the queue for matching songs.
   * @param Filter $filter The Filter.
   * @param string $sort If specified the results are sorted by the specified tag.
   * @param array $window If specified returns only the given portion.
   * @return array|false `array` on success or `false` on failure.
   */
  public function search(Filter $filter, string $sort = "", array $window = [])
  {
    return $this->mphpd->cmd("playlistsearch $filter", [
      ($sort ? "sort" : ""), ($sort ?: ""),
      ($window ? "window" : ""), ($window ? Utils::pos_or_range($window) : "")
    ], MPD_CMD_READ_LIST);
  }


  /**
   * Returns an array of changed songs currently in the playlist since `$version`.
   * @param int $version The current version can be retrieved with `MphpD::status([ "playlist" ])`.
   * @param int|array $range Position of song or Range
   * @param bool $metadata If set to true the metadata will be included.
   *
   *                       If set to false only the position and ID of the changed songs will be returned.
   * @return array|false `array` on success or `false` on failure.
   */
  public function changes(int $version, $range = -1, bool $metadata = false)
  {
    $cmd = "plchangesposid";
    if($metadata === true){
      $cmd = "plchanges";
    }
    return $this->mphpd->cmd($cmd, [ $version, Utils::pos_or_range($range) ], MPD_CMD_READ_LIST);
  }


  /**
   * Sets the priority of given songs to `$priority`.
   * This only has effect when the `random`-mode is enabled.
   * A higher priority means that it will be played first when `random` is enabled.
   * @param int $priority Priority 0-255.
   * @param int|array $range Position of song or Range
   * @return bool `true` on success or `false` on failure.
   */
  public function prio(int $priority, $range = -1) : bool
  {
    return $this->mphpd->cmd("prio", [ $priority, Utils::pos_or_range($range) ], MPD_CMD_READ_BOOL);
  }


  /**
   * Sets the priority of Song ID `$id` to $priority.
   * This only has effect when the `random`-mode is enabled.
   * A higher priority means that it will be played first when `random` is enabled.
   * @param int $priority Priority 0-255.
   * @param int $id Song ID.
   * @return bool `true` on success or `false` on failure.
   */
  public function prio_id(int $priority, int $id) : bool
  {
    return $this->mphpd->cmd("prioid", [ $priority, $id ], MPD_CMD_READ_BOOL);
  }


  /**
   * Set's the portion of the song that should be played.
   * You can't edit the currently playing song!
   * @param int $songid Song ID.
   * @param array $range Range. Start and End are offsets in seconds. If omitted the "play-range" will be removed from the song.
   * @return bool `true` on success or `false` on failure.
   */
  public function range_id(int $songid, array $range = []) : bool
  {
    $pos = Utils::pos_or_range($range);
    if(!$range){
      $pos = ":";
    }
    return $this->mphpd->cmd("rangeid", [ $songid, $pos ], MPD_CMD_READ_BOOL);
  }


  /**
   * Shuffle the Queue.
   * @param array $range If specified only this portion will be shuffled.
   * @return bool `true` on success or `false` on failure.
   */
  public function shuffle(array $range = []) : bool
  {
    return $this->mphpd->cmd("shuffle", [ Utils::pos_or_range($range) ], MPD_CMD_READ_BOOL);
  }


  /**
   * Swap two songs in Queue. By Position.
   * @param int $songpos_1
   * @param int $songpos_2
   * @return bool `true` on success or `false` on failure.
   */
  public function swap(int $songpos_1, int $songpos_2) : bool
  {
    return $this->mphpd->cmd("swap", [$songpos_1, $songpos_2], MPD_CMD_READ_BOOL);
  }


  /**
   * Swap two songs in Queue. By ID.
   * @param int $songid_1 First song ID
   * @param int $songid_2 Second song ID
   * @return bool `true` on success or `false` on failure.
   */
  public function swap_id(int $songid_1, int $songid_2) : bool
  {
    return $this->mphpd->cmd("swapid", [$songid_1, $songid_2], MPD_CMD_READ_BOOL);
  }


  /**
   * Adds a tag to the specified song
   * @param int $songid Song ID
   * @param string $tag Tag name
   * @param string $value Tag value
   * @return bool `true` on success or `false` on failure.
   */
  public function add_tag_id(int $songid, string $tag, string $value) : bool
  {
    return $this->mphpd->cmd("addtagid", [$songid, $tag, $value], MPD_CMD_READ_BOOL);
  }


  /**
   * Removes a tag from the specified song
   * @param int $songid Song ID
   * @param string $tag Tag name
   * @return bool `true` on success or `false` on failure.
   */
  public function clear_tag_id(int $songid, string $tag) : bool
  {
    return $this->mphpd->cmd("cleartagid", [$songid, $tag], MPD_CMD_READ_BOOL);
  }


}
