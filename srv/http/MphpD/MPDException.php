<?php
/*
 * MphpD
 * http://mphpd.org
 *
 * Copyright (c) 2023 Florian Faber
 * http://www.flofaber.com
 */

namespace FloFaber\MphpD;

use Exception;
use Throwable;

/**
 * MPDException is a slightly modified version of a standard Exception.
 * You may call `MPDException::getCode` and `MPDException::getMessage` to retrieve information about the error.
 *
 * In case an error occurs at the protocol level the called methods simply return false.
 *
 * To retrieve the last occurred error call [MphpD::get_last_error](../classes/MphpD.html#get_last_error).
 *
 * @example MphpD::get_last_error() : array
 */
class MPDException extends Exception
{

  private int $commandlist_num = 0;
  private string $command = "";

  public function __construct($message = "", $code = 0, Throwable $previous = null, string $command = "", int $commandlist_num = 0)
  {

    $this->command = $command;
    $this->commandlist_num = $commandlist_num;

    parent::__construct($message, $code, $previous);
  }


  /**
   * Returns all information as string
   * @return string
   */
  public function __toString()
  {
    return __CLASS__ . ": [$this->code];$this->message;$this->command;$this->commandlist_num\n";
  }


  /**
   * Returns the command which caused the error.
   * @return string
   */
  public function getCommand() : string
  {
    return $this->command;
  }


  /**
   * Returns the command's list-number in case a [commandlist](../guides/Commandlist.html) was used.
   * @return int
   */
  public function getCommandlistNum() : int
  {
    return $this->commandlist_num;
  }

}
