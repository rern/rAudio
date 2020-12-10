rAudio 1
---
Audio player for all Raspberry Pis: Zero, 1, 2, 3 and 4
- Based on Arch Linux Arm
- Metadata Tag Editor - `*.cue` support
- Album mode with coverarts
- File mode with thumbnail icons
- Coverarts and bookmarks - add, replace and remove
- WebRadio coverarts - online fetched
- `*.jpg`, `*.png` and animated `*.gif` applicable
- `*.wav` - album artists and sort tracks
- `*.cue` - virtually as individual tracks in all modes and user playlists
- Support 
	- Bluetooth audio, sender and receiver
	- Character LCD: 16x2, 20x4 and 40x4
	- TFT 3.5" 320x420 LCD
	- USB DAC plug ang play
- Renderers / Clients and Streamers (with metadata and coverarts)
	- AirPlay
	- simple HTTP
	- Snapcast
	- Spotify Connect
	- UPnP
	
### Discussions
[rAudio Discussions](https://github.com/rern/rAudio-1/discussions) - Comments, bug reports

![guide](https://github.com/rern/_assets/raw/master/guide/guide.gif)

### Image files:
Europe server:
- RPi 4: [rAudio-1-RPi4.img.xz]()
- RPi 3 and 2: [rAudio-1-RPi2-3.img.xz]()
- RPi 1 and Zero: [rAudio-1-RPi0-1.img.xz]()

Asia server
- RPi 4: [rAudio-1-RPi4.img.xz](https://rern.org/rAudio-1/rAudio-1-RPi4.img.xz)
- RPi 3 and 2: [rAudio-1-RPi2-3.img.xz](https://rern.org/rAudio-1/rAudio-1-RPi2-3.img.xz)
- RPi 1 and Zero: [rAudio-1-RPi0-1.img.xz](https://rern.org/rAudio-1/rAudio-1-RPi0-1.img.xz)
	
### DIY Image file
- [rOS](https://github.com/rern/rOS)

### How-to
- Default root password: `ros`
- Windows:
	- Download and decompress to *.img with 7-zip, WinRAR or WinZip
	- Write the file to a micro SD card, 4GB or more, with [Win32 Disk Imager](https://sourceforge.net/projects/win32diskimager/)
- Linux or Windows:
	- Write from URL to a micro SD card with [Etcher](https://www.balena.io/etcher/)

- Existing users:
	- Keep current setup SD card.
	- Try with a spare one before moving forward.
	- Always use backup.gz created by latest update to restore system.
- Before power on:
	- Wi-Fi pre-configure - 3 alternatives: (Only if no wired LAN available.)
		- From existing
			- Copy an existing profile file from `/etc/netctl`
			- Rename it to `wifi` then copy it to `BOOT` before power on.
		- Edit template file - name and password.
			- Rename `wifi0` in `BOOT` to `wifi`
			- Edit SSID and Key.
		- Generate a complex profile - static IP, hidden SSID
			- With [Pre-configure Wi-Fi connection](https://rern.github.io/WiFi_profile/index.html)
			- Save it in `BOOT`
	- Pre-configure GPIO 3.5" LCD display
		- Rename `lcd0` in `BOOT` to `lcd`

- If connected to a screen, IP address and QR code for connecting from remote devices displayed.
- Before setup anything, Settings > Addons > RuneAudio+R e6 > Update (if available)
- Restore settings and database: Settings > System > Backup/Restore Settings (if there is one)
- Music Library database - USB drive automatically run if already plugged in otherwise Settings > update Library (icon next to MPD)
- Coverarts in browse by Album and directory thumbnails - Library > Album > coverart icon (next to ALBUM heading)

### Not working?
- Power off and wait a few seconds then power on
- If not connected, temporarily connect wired LAN then remove after Wi-Fi setup successfully.
- Still no - Download the image file and start over again


### Tips
- Best sound quality:
	- Settings > MPD > Bit-perfect - Enable
	- Use only amplifier volume (Unless quality of DAC hardware volume is better.)
- Disable features if not use to lower CPU usage:
	Settings > System > Features
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
	- Settings > MPD > question mark icon -scroll- FFmpeg Decoder
	- Enable if filetypes list contains ones of the missing files.
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
- Connect to RuneAudio with IP address instead of runeaudio.local
	- Get IP address: Menu > Network > Network Interfaces list
	- Setup static IP address
- App icon (Full screen UI) - Add to Home Screen
	- Android Chrome / iOS Safari

### Static IP address
Always setup at the router unless there is a good reason not to.
- Set at each device:
	- IP addresses have to be in the same range of the router.
	- IP addresses must not be duplicate of existing ones.
	- IP address must be reconfigured on every OS reinstallation.
	- A log is needed to manually update all assigned IP address-device data.
- Set at the router:
	- The router only allows reserved IP addresses in the same range.
	- Reserved IP addresses are verified not to duplicate.
	- The device always get the same IP address on every OS reinstallation without reconfigure.
	- The router always keep the update log of all IP address-device data.
