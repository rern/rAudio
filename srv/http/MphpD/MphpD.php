<?php
/*
 * MphpD
 * http://mphpd.org
 *
 * Copyright (c) 2023 Florian Faber
 * http://www.flofaber.com
 */

declare(strict_types=1);

namespace FloFaber\MphpD;

// include class-less files
require_once __DIR__ . "/inc/consts.php";
require_once __DIR__ . "/Utils.php";

// include needed subclasses
require_once __DIR__ . "/Socket.php"; // Extended by the main class for socket communication
require_once __DIR__ . "/Filter.php"; // FloFaber\Filter

require_once __DIR__ . "/Channel.php"; // MphpD::channel()
require_once __DIR__ . "/DB.php"; // MphpD::DB
require_once __DIR__ . "/Output.php"; // MphpD::output()
require_once __DIR__ . "/Partition.php"; // MphpD::partition()
require_once __DIR__ . "/Player.php"; // MphpD::player
require_once __DIR__ . "/Playlist.php"; // MphpD::playlist()
require_once __DIR__ . "/Queue.php"; // MphpD::queue
require_once __DIR__ . "/Sticker.php"; // Mphpd::sticker()


/**
 * The Main MphpD class.
 * @example new MphpD(array $config = []) : MphpD
 */
class MphpD extends Socket
{

  private DB $db;
  private Player $player;
  private Queue $queue;

  private bool $in_bulk = false;
  private array $bulk_list = [];


  /**
   * @param array $options Array of options. [Documentation](../guides/Configuration.html)
   */
  public function __construct(array $options = [])
  {
    $this->db = new DB($this);
    $this->player = new Player($this);
    $this->queue = new Queue($this);

    parent::__construct($options);
  }


  // Disconnect on destruction
  public function __destruct(){
    $this->disconnect();
  }


  /**
   * Return the DB instance
   * @return DB
   */
  public function db() : DB
  {
    return $this->db;
  }


  /**
   * Return the Player instance
   * @return Player
   */
  public function player() : Player
  {
    return $this->player;
  }


  /**
   * Return the Queue instance
   * @return Queue
   */
  public function queue() : Queue
  {
    return $this->queue;
  }


  /**
   * Returns a Playlist instance with the given name or null if the name is empty
   * @param string $name The name of the playlist. Must not be empty.
   * @return Playlist|null
   */
  public function playlist(string $name): ?Playlist
  {
    try{
      return new Playlist($this, $name);
    }catch (MPDException $e){
      return null;
    }
  }


  /**
   * Returns a list of playlists.
   * @param bool $metadata If `true` an `array` of associative arrays containing information about the playlists (like last-modified,...) will be returned.
   *
   *                       If `false` or omitted an `array` containing all playlists names is returned.
   * @return array|false `array` on success or `false` on failure.
   */
  public function playlists(bool $metadata = false)
  {
    if($metadata){
      return $this->cmd("listplaylists", [], MPD_CMD_READ_LIST);
    }
    return $this->cmd("listplaylists", [], MPD_CMD_READ_LIST_SINGLE);
  }


  /**
   * Return a new output instance
   * @param int $id The ID of the output
   * @return Output
   */
  public function output(int $id) : Output
  {
    return new Output($this, $id);
  }


  /**
   * Returns an Array of associative arrays containing all available outputs
   * @return array|false `array` on success or `false` on failure.
   */
  public function outputs()
  {
    return $this->cmd("outputs", [], MPD_CMD_READ_LIST);
  }


  /**
   * Return neighbors on the network like available SMB servers
   * @return array|false `array` on success or `false` on failure.
   */
  public function neighbors()
  {
    return $this->cmd("listneighbors", [], MPD_CMD_READ_LIST);
  }


  /**
   * Return a new Partition instance
   * @param string $name The name of the partition
   * @return Partition
   */
  public function partition(string $name) : Partition
  {
    return new Partition($this, $name);
  }


  /**
   * Return a list of all available partitions
   * @return array|false `array` on success or `false` on failure.
   */
  public function partitions()
  {
    return $this->cmd("listpartitions", [], MPD_CMD_READ_LIST_SINGLE);
  }


  /**
   * Return a new Channel instance
   * @param string $name The name of the channel
   * @return Channel
   */
  public function channel(string $name = "") : Channel
  {
    return new Channel($this, $name);
  }


    /**
     * Return a list of available channels
     * @return array|bool `array` on success or `false` on failure.
     */
  public function channels()
  {
    return $this->cmd("channels", [], MPD_CMD_READ_LIST_SINGLE);
  }


  /**
   * Clears the current error
   * @return bool `true` on success or `false` on failure.
   */
  public function clear_error() : bool
  {
    return $this->cmd("clearerror", [], MPD_CMD_READ_BOOL);
  }


  /**
   * Returns the value of the specified key(s) from MPD's status.
   * @param array $items Optional. Array containing the wanted key(s) like `status`, `songid`,...
   *
   *                     If only one item is given only it's value will be returned instead of an associative array.
   *
   *                     If the given item(s) do not exist `null` will be set as their value.
   *
   *                     If omitted, an associative `array` containing all status information will be returned.
   *
   * @return array|false|int|float|null
   *                     `false` on error
   *
   *                     `string`, `int`, `float` or `null` if `$items` contains only one item. If it does not exist `null` will be returned instead.
   *
   *                     Otherwise, an associative `array` containing all available (or specified) keys.
   */
  public function status(array $items = [])
  {
    $status = $this->cmd("status");

    // if status has failed return false
    if($status === false){ return false; }

    // if no items are given return the whole status
    if(!$items){ return $status; }

    // if items contain a single item return it's value or null if it doesn't exist
    if(count($items) === 1){
      return $status[$items[0]] ?? null;
    }

    // otherwise return only the requested items
    $tmp = [];
    foreach($items as $item){
      $tmp[$item] = $status[$item] ?? null;
    }

    return $tmp;
  }


  /**
   * Returns the value of the specified key from MPD's stats.
   * @param array $items Optional. Array containing the wanted stat(s). Example: `[ "artists", "uptime", "playtime" ]`
   *
   *                     If only one item is given only it's value will be returned instead of an associative array.
   *
   *                    If the given item(s) do not exist `null` will be set as their value.
   *
   *                    If omitted, an associative `array` containing all stats will be returned.
   *
   * @return array|false|int|null Returns
   *                     `false` on error
   *
   *                     `string`, `int` or `null` if $items contains only one item. If it does not exist `null` will be returned instead.
   *
   *                     Otherwise, an associative `array` containing all available (or specified) stats.
   */
  public function stats(array $items = [])
  {
    $stats = $this->cmd("stats");

    // if stats failed return false immediately
    if($stats === false){ return false; }

    // if no items are given return all stats
    if(!$items){ return $stats; }

    // if items contain a single item return it's value or null if it doesn't exist
    if(count($items) === 1){
      return $stats[$items[0]] ?? null;
    }

    // otherwise return only the requested items
    $tmp = [];
    foreach($items as $item){
      $tmp[$item] = $stats[$item] ?? null;
    }

    return $tmp;
  }


  /**
   * Returns a Sticker instance
   * @param string $type
   * @param string $uri
   * @return Sticker
   */
  public function sticker(string $type, string $uri) : Sticker
  {
    return new Sticker($this, $type, $uri);
  }


  /**
   * Return a list of all mounts.
   * @return array|false
   */
  public function mounts()
  {
    return $this->cmd("listmounts", [], MPD_CMD_READ_LIST);
  }


  /**
   * Mount `$uri` to path
   * @param string $path
   * @param string $uri The URI to mount
   * @return bool `true` on success or `false` on failure.
   */
  public function mount(string $path, string $uri) : bool
  {
    return $this->cmd("mount", [ $path, $uri ], MPD_CMD_READ_BOOL);
  }


  /**
   * Unmount a path
   * @param string $path The path to unmount
   * @return bool `true` on success or `false` on failure.
   */
  public function unmount(string $path): bool
  {
    return $this->cmd("unmount", [ $path ], MPD_CMD_READ_BOOL);
  }


  /**
   * Function to start a command-list.
   * @return void
   */
  public function bulk_start()
  {
    $this->in_bulk = true;
    $this->bulk_list = [];
  }


  /**
   * Function to end a command-list and execute its commands.
   * The command list is stopped in case an error occurs.
   * @return array|false `array` containing the commands responses or `false` on failure.
   */
  public function bulk_end(): array
  {

    // if there is no command list return false
    if($this->in_bulk === false){ return false; }

    // start the command list at protocol level (without reading the non-existent response)
    $this->cmd("command_list_ok_begin", [], MPD_CMD_READ_NONE);

    // then send every command. Again without reading anything.
    $ret = [];
    foreach($this->bulk_list as $b){
      $this->cmd($b["cmd"], [], MPD_CMD_READ_NONE);
    }

    // end and execute the command list
    $this->cmd("command_list_end", [], MPD_CMD_READ_NONE);

    // then read the response from each command
    // we can do this because readls() stops on OK,ACK and list_OK
    $f_err = false;
    foreach($this->bulk_list as $b){
      $parsed = $this->parse($this->readls(), $b["mode"]);

      if($parsed instanceof MPDException AND $b["mode"] === MPD_CMD_READ_BOOL){
        $ret[] = false;
      }else{
        $ret[] = $parsed;
      }

      // if there is an error -> stop
      if($parsed instanceof MPDException){
        $this->set_error($parsed);
        $f_err = true;
        break;
      }
    }

    // There is a remaining "OK\n" in the socket buffer if all commands in the command list succeeded.
    // We need to read that before sending other commands. If we would not do that the next commands response
    // would be empty as there was still an "OK\n" in the buffer.
    // We only need to do this if the command list did NOT fail!
    if(!$f_err){
      $lb = "";
      $this->readl($lb);
    }

    // disable bulk and return
    $this->in_bulk = false;
    return $ret;
  }


  /**
   * Function to abort the current command list.
   * We can do that because we only start the list at protocol level when bulk_end() is called.
   * @return void
   */
  public function bulk_abort()
  {
    $this->bulk_list = [];
    $this->in_bulk = false;
  }


  /**
   * Function to add a command to the bulk_list.
   * @see MphpD::cmd()
   * @param string $cmd
   * @param array $params
   * @param int $mode
   * @return bool
   */
  public function bulk_add(string $cmd, array $params = [], int $mode = MPD_CMD_READ_BOOL) : bool
  {
    // return false if bulk is not enabled
    if(!$this->in_bulk) {
      return false;
    }

    $cmd = $cmd.Utils::escape_params($params);
    $this->bulk_list[] = [
      "cmd" => $cmd,
      "mode" => $mode
    ];

    return true;
  }


  /**
   * Return a list of all available tag types.
   * @return array|false `array` on success or `false` on failure.
   */
  public function tagtypes()
  {
    return $this->cmd("tagtypes", [], MPD_CMD_READ_LIST_SINGLE);
  }


  /**
   * Disable specified tag types.
   * @param array $tagtypes A list of tag types to disable.
   * @return bool `true` on success or `false` on failure.
   */
  public function tagtypes_disable(array $tagtypes) : bool
  {
    return $this->cmd("tagtypes disable", $tagtypes, MPD_CMD_READ_BOOL);
  }


  /**
   * Enable specified tag types.
   * @param array $tagtypes A list of tag types to enable.
   * @return bool `true` on success or `false` on failure.
   */
  public function tagtypes_enable(array $tagtypes) : bool
  {
    return $this->cmd("tagtypes enable", $tagtypes, MPD_CMD_READ_BOOL);
  }


  /**
   * Remove all tag types from responses.
   * @return bool `true` on success or `false` on failure.
   */
  public function tagtypes_clear() : bool
  {
    return $this->cmd("tagtypes clear", [], MPD_CMD_READ_BOOL);
  }


  /**
   * Enable all available tag types.
   * @return bool `true` on success or `false` on failure.
   */
  public function tagtypes_all() : bool
  {
    return $this->cmd("tagtypes all", [], MPD_CMD_READ_BOOL);
  }


  /**
   * Ping.
   * @return bool `true` on success or `false` on failure.
   */
  public function ping() :  bool
  {
    return $this->cmd("ping", [], MPD_CMD_READ_BOOL);
  }


  /*
   * ################
   *    REFLECTION
   * ################
   */


  /**
   * Returns an associative array of configuration values.
   * This function is only available for client connected via Unix Socket!
   * @return array|false `array` containing configuration parameters on success or `false` on failure.
   */
  public function config()
  {
    return $this->cmd("config");
  }


  /**
   * Returns a list of all available commands.
   * @return array|false `array` on success or `false` on failure.
   */
  public function commands()
  {
    return $this->cmd("commands", [], MPD_CMD_READ_LIST_SINGLE);
  }


  /**
   * Returns a list of all not-available commands.
   * @return array|false `array` on success or `false` on failure.
   */
  public function notcommands()
  {
    return $this->cmd("notcommands", [], MPD_CMD_READ_LIST_SINGLE);
  }


  /**
   * Returns a list of all available urlhandlers. Like smb://, sftp://, http://...
   * @return array|false `array` on success or `false` on failure.
   */
  public function urlhandlers()
  {
    return $this->cmd("urlhandlers", [], MPD_CMD_READ_LIST_SINGLE);
  }


  /**
   * Returns a list of available decoder plugins and their supported suffixes and mimetypes.
   * @return array|false `array` on success or `false` on failure.
   */
  public function decoders()
  {
    return $this->cmd("decoders", [], MPD_CMD_READ_LIST);
  }


} // End MphpD

