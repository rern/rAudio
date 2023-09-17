r A u d i o
---
Audio player for 
- **Raspberry Pi**s:
	- 64bit: `4` `3` `2` `Zero 2`
	- 32bit: `2 (BCM2836)`
	- Legacy: `1` `Zero`
- BeagleBone Black
- CubieBoard2

![guide](https://github.com/rern/_assets/raw/master/guide/guide.gif)

- Based on [Arch Linux Arm](https://archlinuxarm.org)
- Control via GUI
	- Remote with any browsers
	- Android - [rAudio app](https://play.google.com/store/apps/details?id=com.raudio)
	- Local screen
- Share data and files between multiple rAudios
	- Server rAudio : clients (Easy setup with server IP address only)
	- File server : clients
	- Live data update - refresh across all rAudios
- Live display update - refresh across multiple GUI clients
- Metadata Tag Editor - `kid3-cli`
- Album mode with coverarts
- File mode with thumbnail icons
- Coverarts and bookmarks - add, replace and remove
- WebRadio coverarts - online fetched
- `*.jpg`, `*.png` and animated `*.gif` applicable
- `*.wav` - album artists and sort tracks
- `*.cue` - virtually as individual tracks in all modes and user playlists
- VU meter as coverart (for remote screen)
- Wi-Fi connection can be pre-configured for headless mode.
- Access point - `hostapd`
- File sharing - `samba`
- Easy update and extra features with Addons
- Support boot from USB drive without SD card ([DIY](https://github.com/rern/rOS))
-
- Local files
	- USB HDD
	- USB Audio CD
	- NAS
	- SD card
- Renderers / Clients - with metadata and coverarts
	- AirPlay - `shairport-sync`
	- Bluetooth audio receiver
	- SnapClient - `snapcast` Multiroom audio client
	- Spotify Connect - `spotifyd`
	- UPnP - `upmpdcli`
- Streamers
	- Bluetooth audio sender
	- HTTP (no metadata)
	- SnapSever - `MPD snapcast`
	- Web Radio
	- DAB Radio (Addon)
- Digital Signal Processors
	- DSP - `camilladsp`
	- Equalizer - `alsaequal`

### Supported devices
- Bluetooth:
	- Audio - Receiver / Sender
	- Keyboard and mouse
- USB:
	- Bluetooth
	- DAC
	- RTL-SDR (for DAB radio)
	- Wi-Fi
- GPIO:
	- [I²S audio module](https://github.com/rern/rAudio/blob/main/I2S_modules.md)
	- [Character LCD](https://github.com/rern/rAudio/raw/main/srv/http/assets/img/lcdchar.jpg) (16x2, 20x4)
	- Power on/off button
	- [Relay module](https://github.com/rern/rAudio/raw/main/srv/http/assets/img/relays.jpg)
	- [Rotary encoder](https://github.com/rern/rAudio/raw/main/srv/http/assets/img/rotaryencoder.jpg)
	- [Spectrum OLED](https://github.com/rern/rAudio/raw/main/srv/http/assets/img/mpdoled.jpg) (128x64)
	- [TFT 3.5" LCD](https://github.com/rern/rAudio/raw/main/srv/http/assets/img/lcd.jpg) (320x420)
	- VU LED (7 LEDs+Rs)
- Not applicable on Raspberry Pi `1` or `Zero`:
	- RTL-SDR (for DAB radio)
	- TFT 3.5" LCD (for GUI on local screen)
	
### Default root password
- `ros`
- If enable SnapClient, Multiple rAudios or Shared Data, do not change password from default.

### Q&A
- [**rAudio Discussions**](https://github.com/rern/rAudio/discussions) - Questions, comments and bug reports

### Image files
- Raspberry Pi - [**Release i20230828**](https://github.com/rern/rAudio/releases/tag/i20230828)
- BeagleBone Black - [DIY](https://github.com/rern/rAudio/discussions/299)
- CubieBoard2 - [DIY](https://github.com/jazzi/rOS)

### DIY Image file
- [**rOS**](https://github.com/rern/rOS) - Build image files with interactive process

### How-to
- Write an image file to a micro SD card (8GB or more):
	- Install **Raspberry Pi Imager**
		- Windows, MacOS, Ubuntu: [Raspberry Pi Imager](https://www.raspberrypi.org/software/)
		- Manjaro: `pacman -Sy rpi-imager`
		- Others: [Build and install](https://github.com/raspberrypi/rpi-imager)
	- Download an image file.
	- `CHOOSE OS` > Use custom (OR right click the image file > Open with > Raspberry Pi Imager)
	- `CHOOSE STORAGE`:
		- Select SD card - normal boot
		- Select USB drive - boot from USB drive without SD card
			- For Raspberry Pi 2B v1.2, 3A+, 3B, 3B+, 4B
			- [USB mass storage boot](https://www.raspberrypi.org/documentation/hardware/raspberrypi/bootmodes/msd.md) must be set.
			- Should be used only when USB drive is faster than SD card.
	- Do not set anything in `Advance options`
	- `WRITE`
	- Verify is optional.
- Existing users:
	- Keep current setup SD card.
	- Try with a spare one before moving forward.
	- Always use backup.gz created by latest update to restore system.
- Before power on:
	- Wi-Fi pre-configure - 4 alternatives: (Only if no wired LAN available.)
		- From `backup.gz`
		- From existing
			- Copy an existing profile file from `/etc/netctl`
			- Rename it to `wifi` then copy it to `BOOT` before power on.
		- Edit template file - name and password.
			- Rename `wifi0` in `BOOT` to `wifi`
			- Edit SSID and Key.
		- Generate a complex profile - static IP, hidden SSID
			- With [Pre-configure Wi-Fi connection](https://rern.github.io/WiFi_profile/index.html)
			- Save it in `BOOT`
	- Wi-Fi access point mode
		- If no wired network and no pre-configured Wi-Fi connections, Wi-Fi access point will be enabled on boot.
		- On client devices, select `rAudio` from Wi-Fi network list to connect.
		- On browser, open web user interface with URL `raudio.local`
		- Settings > Networks > Wi-Fi - search
		- Select access point to connect
		- Reboot
		- Browser refreshes when ready. (Manually refresh if it's too long.)
	- System pre-configure: (Run once)
		- Restore database and settings (Wi-Fi connection included.)
			- Copy `backup.gz` to `BOOT`
			- Use only backup made from rAudio with the latest update
		- Expand `root` partition:
			- By default, `root` partition will be expaned on initial boot.
			- SD card backup with shrunken `root` partition - Create a blank file `expand` in `BOOT` before backup

- Boot duration
	- RPi4: 20+ seconds
	- RPi3: 50+ seconds
	- RPi1, Zero: 80+ seconds
- After initial boot:
	- If there's a connected screen, IP address for connecting from remote devices will be displayed.
	- Before setup anything: Settings > Addons > rAudio > Update (if available)
	- Restore settings and database:
		- If not pre-configured, Settings > System > Backup/Restore Settings
	- Build Library database:
		- Automatically run on boot if database is empty with connected USB and NAS
		- Force build / update - Settings > update Library (icon next to Sources)
		- Tracks on existing database can be played during updating.
		- Before database is available, default WebRadio stations are available for playing.
	- Parse coverarts for Album and directory thumbnails :
		- Only if never run before or to force update
		- Library > Album > coverart icon (next to ALBUM heading)
	- User guide
		- Settings > last icon next to Addons

### Not working?
- Power off and wait a few seconds then power on
- If not connected, temporarily connect wired LAN then remove after Wi-Fi setup successfully.
- Still no - Download the image file and start over again


### Tips
- Best sound quality:
	- Settings > Player > Bit-perfect - Enable
	- Use only amplifier volume (Unless quality of DAC hardware volume is better.)
- Disable features if not use to lower CPU usage:
	- Settings > Features
	- Disable `Browser on RPi` might cause audio glitches on refresh / switch page
		- After system upgrade `pacman -Syu` which kernel `linux-raspberrypi` also upgraded.
		- On 64bit version - Very likely, kernel upgraded or not.
- Full screen UI
	- Android - [rAudio app](https://play.google.com/store/apps/details?id=com.raudio)
	- Add to Home Screen (Safari on iOS, Chrome on Android)
- Coverart as large playback control buttons
	- Tap top of coverart to see controls guide.
- Hide top and bottom bars
	- No needs for top and bottom bars
	- Use coverart controls instead of top bar buttons
	- Swipe to switch between pages
		<- Library <-> Playback <-> Playlist ->
- Drag to arrange order
	- Library home blocks
	- Playlist tracks
	- Saved playlist tracks
- Some coverarts missing from album directories
	- Subdirectories listed after partial Library database update from context menu.
	- Subdirectories - context menu > Exclude directory
- Some music files missing from library
	- Make sure embedded metadata in each file is in UTF-8 encoding.
	- Settings > MPD > question mark icon -scroll- FFmpeg Decoder
	- Enable if filetypes list contains ones of the missing files.
- No albums found after update very large Library
	- Settings > MPD > Output Buffer - Increase by 8192 at a time
	- Update Library
- CUE sheet
	- `*.cue` filenames must be identical to each coresponding music file.
	- Can be directly edited by Tag Editor.
- Minimum permission for music files (on Linux ext filesystem)
	- Directories: `rwxr-xr-x` (755)
	- Files: `rw-r--r--` (644)
- RPi to router connection:
	- With wired LAN if possible - Disable Wi-Fi
	- With WiFi if necessary
	- With RPi accesspoint only if there's no router
- Connect to rAudio with IP address instead of raudio.local
	- Get IP address: Menu > Network > Network Interfaces list
- Backup SD card which already setup
	- On Linux: `bash <( curl -sL https://github.com/rern/rOS/raw/main/imagecreate.sh )`
		- Shrink ROOT partition to minimum
		- Create and compress image file
- Custom startup / shutdown script
	- Copy custom script named `startup.sh` / `shutdown.sh` to `BOOT`
