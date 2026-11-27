<?php
/*
 * MphpD
 * http://mphpd.org
 *
 * Copyright (c) 2023 Florian Faber
 * http://www.flofaber.com
 */

const MPD_STATE_OFF     = 0b00; // 0
const MPD_STATE_ON      = 0b01; // 1
const MPD_STATE_ONESHOT = 0b10; // 2

const MPD_MODE_CREATE  = 0b001;
const MPD_MODE_APPEND  = 0b010;
const MPD_MODE_REPLACE = 0b100;

const MPD_CMD_READ_RAW         = 0b0000001; // 1
const MPD_CMD_READ_NORMAL      = 0b0000010;
const MPD_CMD_READ_LIST        = 0b0000100;
const MPD_CMD_READ_LIST_SINGLE = 0b0001000;
const MPD_CMD_READ_NONE        = 0b0010000;
const MPD_CMD_READ_BOOL        = 0b0100000; // 32
const MPD_CMD_READ_GROUP       = 0b1000000;

const MPD_ESCAPE_DOUBLE_QUOTES = 0b0010;
const MPD_ESCAPE_PREFIX_SPACE  = 0b0100;
const MPD_ESCAPE_SUFFIX_SPACE  = 0b1000;
