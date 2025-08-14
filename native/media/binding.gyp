{
    "targets":  [
        {
            "target_name":  "gsmtc",
            "sources":  [
                "src/gsmtc_bridge.cpp"
            ],
            "msvs_settings":  {
                "VCCLCompilerTool":  {
                    "AdditionalOptions": [
                        "/std:c++20",
                        "/permissive-",
                        "/Zc:__cplusplus",
                        "/bigobj"
                    ],
                    "ExceptionHandling":  1
                   }
                },
            "dependencies": [
                "\u003c!(node -p \"require(\u0027node-addon-api\u0027).gyp\")"
            ],
            "libraries": [
                "WindowsApp.lib",
                "Ole32.lib"
            ],
            "include_dirs": [
                 "\u003c!(node -p \"require(\u0027node-addon-api\u0027).include\")",
                 "node_modules/node-addon-api"
             ],
            "defines": [
                "NAPI_CPP_EXCEPTIONS"
            ]
        }
    ]
}