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
 * This subclass is used for client-to-client communication over MPD
 * @example MphpD::channel(string $name) : Channel
 */
class Channel
{

  /*
   * ######################
   *    CLIENT TO CLIENT
   * ######################
   */

  private MphpD $mphpd;
  private string $name;
  private static array $unread_messages = [];

  /**
   * This class is not intended for direct usage.
   * Use `MphpD::channel()` instead to retrieve an instance of this class.
   * @param MphpD $mphpd
   * @param string $name
   */
  public function __construct(MphpD $mphpd, string $name)
  {
    $this->mphpd = $mphpd;
    $this->name = $name;
  }


  /**
   * Subscribe to the channel.
   * @return bool `true` on success or `false` on failure.
   */
  public function subscribe(): bool
  {
    return $this->mphpd->cmd("subscribe", [ $this->name ], MPD_CMD_READ_BOOL);
  }


  /**
   * Unsubscribe the channel.
   * @return bool `true` on success or `false` on failure.
   */
  public function unsubscribe(): bool
  {
    return $this->mphpd->cmd("unsubscribe", [ $this->name ], MPD_CMD_READ_BOOL);
  }


  /**
   * Returns a list of the channel's messages.
   * @return array|false `array` containing the messages on success or `false` on failure.
   */
  public function read()
  {

    $messages = $this->mphpd->cmd("readmessages", [], MPD_CMD_READ_LIST);
    if($messages === false){ return false; }

    $msgs = [];

    // loop through the unread messages and add those in the wanted channel to the $msgs array.
    foreach(Channel::$unread_messages as $key => $unread_message){
      if($unread_message["channel"] === $this->name){
        $msgs[] = $unread_message["message"];

        // remove message and re-index
        unset(Channel::$unread_messages[$key]);
        Channel::$unread_messages = array_values(Channel::$unread_messages);
      }
    }

    foreach($messages as $message){
      if($message["channel"] === $this->name){
        $msgs[] = $message["message"];
      }else{
        // if the channel is not the channel we want, save the message in case the user wants to retrieve later on
        Channel::$unread_messages[] = $message;
      }
    }

    return $msgs;
  }


  /**
   * Send a message to the channel.
   * @param string $message The message text.
   * @return bool `true` on success or `false` on failure.
   */
  public function send(string $message) : bool
  {
    return $this->mphpd->cmd("sendmessage", [ $this->name, $message ], MPD_CMD_READ_BOOL);
  }
}