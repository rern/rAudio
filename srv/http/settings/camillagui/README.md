# Backend server for CamillaGUI

This is the server part of CamillaGUI, a web-based GUI for CamillaDSP.

This version works with CamillaDSP 0.6.0 and up.

The complete GUI is made up of two parts:
- a frontend based on React: https://reactjs.org/
- a backend based on AIOHTTP: https://docs.aiohttp.org/en/stable/

## Setting up
### Python dependencies
Install the dependencies:
- python 3.6 or later
- websocket-client (required by pycamilladsp)
- jsonschema (required by pycamilladsp-plot)
- aiohttp

These are the names of the packages needed:
| Distribution    | python  | websocket-client         | aiohttp         | jsonschema         |
|-----------------|---------|--------------------------|-----------------|--------------------|
| Fedora          | python3 | python3-websocket-client | python3-aiohttp | python3-jsonschema |
| Debian/Raspbian | python3 | python3-websocket        | python3-aiohttp | python3-jsonschema |
| Arch            | python  | python-websocket-client  | python-aiohttp  | python-jsonschema  |
| pip             | -       | websocket_client         | aiohttp         | jsonschema         |
| Anaconda        | -       | websocket_client         | aiohttp         | jsonschema         |

#### Linux
Most linux distributions have Python 3.6 or newer installed by default. Use the normal package manager to install the packages.

#### Windows
Use Anaconda: https://www.anaconda.com/products/individual. Then use Anaconda Navigator to install the dependencies.

#### macOS
On macOS use either Anaconda or Homebrew. The Anaconda procedure is the same as for Windows.

For Homebrew, install Python with `brew install python`, after which you can install the needed packages with pip, `pip3 install websocket_client` etc.

### CamillaDSP Python libraries
You need both the CamillaDSP companion python libraries:
- `pycamilladsp` version 0.6.0 from https://github.com/HEnquist/pycamilladsp
- `pycamilladsp-plot` version 0.6.0 from https://github.com/HEnquist/pycamilladsp-plot

To install the libraries, use `pip` to install directly from github:
```sh
pip install git+https://github.com/HEnquist/pycamilladsp.git@v0.6.0
pip install git+https://github.com/HEnquist/pycamilladsp-plot.git@v0.6.0
```
Note that on some systems the command is `pip3` instead of `pip`.


### Install gui server
Go to "Releases": https://github.com/HEnquist/camillagui-backend/releases
Download the zip-file ("camillagui.zip") for the latest release. This includes both the backend and the frontend.

Unzip the file, and edit `config/camillagui.yml` if needed.

## Configuration

The backend configuration is stored in `config/camillagui.yml`

```yaml
---
camilla_host: "0.0.0.0"
camilla_port: 1234
port: 5000
config_dir: "~/camilladsp/configs"
coeff_dir: "~/camilladsp/coeffs"
default_config: "~/camilladsp/default_config.yml"
active_config: "~/camilladsp/active_config.yml"
update_symlink: true (*)
on_set_active_config: null (*)
on_get_active_config: null (*)
supported_capture_types: null (*)
supported_playback_types: null (*)
```
The options marked `(*)` are optional. If left out the default values listed above will be used. The included configuration has CamillaDSP running on the same machine as the backend, with the websocket server enabled at port 1234. The web interface will be served on port 5000. It is possible to run the gui and CamillaDSP on different machines, just point the `camilla_host` to the right address.

The settings for config_dir and coeff_dir point to two folders where the backend has permissions to write files. This is provided to enable uploading of coefficients and config files from the gui.

`active_config` is the location, where a symbolic link to the currently active config will be created, if `update_symlink` is `true`.
Note that symlinks cannot be created on Windows without configuring special privileges.
At times, the link might not exist, or point to a non-existent file.
If you run CamillaDSP on the same machine as CamillaGUI,
you probably want to use this path as the value for the config parameter of your CamillaDSP executable.

The `active_config` will be loaded into the web interface when it is opened.
If there is no active config, the `default_config` will be used.
If this does not exist, the internal default config is used.
Note: the `active_config` will NOT be automatically applied to CamillaDSP, when CamillaDSP or the GUI starts.
To have CamillaDSP use it on start, set CamillaDSP's config path to the same as `active_config`.

By default, the config validator allows all the device types that CamillaDSP can support. To limit this to the types that are supported on a particular system, give the list of supported types as: 
```yaml
supported_capture_types: ["Alsa", "File", "Stdin"]
supported_playback_types: ["Alsa", "File", "Stdout"]
```

### Integrating with other software
If you want to integrate CamillaGUI with other software,
there are some options to customize the UI for your particular needs.

#### Setting and getting the active config
_NOTE: This functionality is experimental, there may be significant changes in future versions._

Setting `update_symlink` to `false` means the backend will not keep any symlink updated. This can then instead be accomplished by the options `on_set_active_config` and `on_get_active_config`. These are shell commands that will be run to set and get the active config. Since the commands are run in the operating system shell, the syntax depends on which operating system is used. The examples given below are for Linux.

The `on_set_active_config` uses Python string formatting to insert the filename. This means it must contain an empty set of curly brackets, where the filename will get inserted surrounded by quotes. 
- Running a script: `on_set_active_config: my_updater_script.sh {}`
  
  The backend will run the command: `my_updater_script.sh "/full/path/to/new_active_config.yml"`
- Saving config filename to a text file: `on_set_active_config: echo {} > active_configname.txt` 

  The backend will run the command: `echo "/full/path/to/new_active_config.yml" > active_configname.txt`

The `on_get_active_config` command is expected to return a filename on stdout. As an example, read a filename from a text file: `on_get_active_config: "cat myconfig.txt"`.

#### Styling the GUI
The UI can be styled by editing `build/css-variables.css`.
Further instructions on how to do this, or switch back to the brighter black/white UI, can be found there.

#### Hiding GUI Options
Options can hidden from your users by editing `config/gui-config.yml`.
Setting any of the options to `true` hides the corresponding option or section.
```yaml
hide_capture_samplerate: false
hide_silence: false
hide_capture_device: false
hide_playback_device: false
hide_rate_monitoring: false
```

## Running
Start the server with:
```sh
python main.py
```

The gui should now be available at: http://localhost:5000/gui/index.html

If accessing the gui from a different machine, replace "localhost" by the IP or hostname of the machine running the gui server.