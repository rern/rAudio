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
 * This subclass is used to configure audio outputs.
 * Have a look at the [MPD doc](https://mpd.readthedocs.io/en/latest/protocol.html#audio-output-devices) for more.
 * @example MphpD::output(int $id) : Output
 */
class Output
{

  private MphpD $mphpd;
  private int $id;


  /**
   * This class is not intended for direct usage.
   * Use `MphpD::output()` instead to retrieve an instance of this class.
   * @param MphpD $mphpd
   * @param int $id
   */
  public function __construct(MphpD $mphpd, int $id)
  {
    $this->mphpd = $mphpd;
    $this->id = $id;
  }


  /**
   * Disable the given output
   * @return bool `true` on success or `false` on failure.
   */
  public function disable() : bool
  {
    return $this->mphpd->cmd("disableoutput", [ $this->id ], MPD_CMD_READ_BOOL);
  }


  /**
   * Enable the given output
   * @return bool `true` on success or `false` on failure.
   */
  public function enable(): bool
  {
    return $this->mphpd->cmd("enableoutput", [ $this->id ], MPD_CMD_READ_BOOL);
  }


  /**
   * Enable/Disable the given output depending on the current state.
   * @return bool `true` on success or `false` on failure.
   */
  public function toggle(): bool
  {
    return $this->mphpd->cmd("toggleoutput", [ $this->id ], MPD_CMD_READ_BOOL);
  }


  /**
   * Set a runtime attribute. Supported values can be retrieved from the `MphpD::outputs()` method.
   * @param string $name
   * @param string $value
   * @return bool `true` on success or `false` on failure.
   */
  public function set(string $name, string $value): bool
  {
    return $this->mphpd->cmd("outputset", [ $this->id, $name, $value ], MPD_CMD_READ_BOOL);
  }


}