{
    "targets":  [
        {
            "target_name":  "gsmtc",
            "conditions": [
                ["OS=='win'", {
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
                    "libraries": [
                        "WindowsApp.lib",
                        "Ole32.lib"
                    ]
                }],
                ["OS=='linux'", {
                    "sources": [],
                    "type": "none"
                }],
                ["OS=='mac'", {
                    "sources": [],
                    "type": "none"
                }]
            ],
            "dependencies": [
                "<!(node -p \"require('node-addon-api').gyp\")"
            ],
            "include_dirs": [
                 "<!(node -p \"require('node-addon-api').include\")",
                 "node_modules/node-addon-api"
             ],
            "defines": [
                "NAPI_CPP_EXCEPTIONS"
            ]
        }
    ]
}
