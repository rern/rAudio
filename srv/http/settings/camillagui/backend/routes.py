from .settings import BASEPATH
from .views import (
    get_param,
    get_list_param,
    set_param,
    eval_filter_values,
    eval_filterstep_values,
    get_config,
    set_config,
    get_active_config_file,
    set_active_config_name,
    config_to_yml,
    yml_to_json,
    validate_config,
    get_gui_index,
    get_stored_coeffs,
    get_stored_configs,
    store_configs,
    store_coeffs,
    delete_coeffs,
    delete_configs,
    download_coeffs_zip,
    download_configs_zip,
    get_gui_config,
    get_config_file,
    save_config_file,
    get_defaults_for_coeffs,
    get_status
)


def setup_routes(app):
    app.router.add_get("/api/status", get_status)
    app.router.add_get("/api/getparam/{name}", get_param)
    app.router.add_get("/api/getlistparam/{name}", get_list_param)
    app.router.add_post("/api/setparam/{name}", set_param)
    app.router.add_post("/api/evalfilter", eval_filter_values)
    app.router.add_post("/api/evalfilterstep", eval_filterstep_values)
    app.router.add_get("/api/getconfig", get_config)
    app.router.add_post("/api/setconfig", set_config)
    app.router.add_get("/api/getactiveconfigfile", get_active_config_file)
    app.router.add_post("/api/setactiveconfigfile", set_active_config_name)
    app.router.add_post("/api/configtoyml", config_to_yml)
    app.router.add_post("/api/ymltojson", yml_to_json)
    app.router.add_post("/api/validateconfig", validate_config)
    app.router.add_get("/api/storedconfigs", get_stored_configs)
    app.router.add_get("/api/storedcoeffs", get_stored_coeffs)
    app.router.add_get("/api/defaultsforcoeffs", get_defaults_for_coeffs)
    app.router.add_post("/api/uploadconfigs", store_configs)
    app.router.add_post("/api/uploadcoeffs", store_coeffs)
    app.router.add_post("/api/deleteconfigs", delete_configs)
    app.router.add_post("/api/deletecoeffs", delete_coeffs)
    app.router.add_post("/api/downloadconfigszip", download_configs_zip)
    app.router.add_post("/api/downloadcoeffszip", download_coeffs_zip)
    app.router.add_get("/api/guiconfig", get_gui_config)
    app.router.add_get("/api/getconfigfile", get_config_file)
    app.router.add_post("/api/saveconfigfile", save_config_file)

    app.router.add_get("/", get_gui_index)


def setup_static_routes(app):
    app.router.add_static("/gui/", path=BASEPATH / "build")
    app.router.add_static("/config/", path=app["config_dir"])
    app.router.add_static("/coeff/", path=app["coeff_dir"])
