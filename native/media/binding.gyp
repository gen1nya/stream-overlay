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
                    "sources": [
                        "src/macos_media_bridge.mm"
                    ],
                    "xcode_settings": {
                        "GCC_ENABLE_CPP_EXCEPTIONS": "YES",
                        "CLANG_CXX_LIBRARY": "libc++",
                        "MACOSX_DEPLOYMENT_TARGET": "10.13",
                        "OTHER_CPLUSPLUSFLAGS": ["-std=c++14", "-stdlib=libc++"],
                        "OTHER_LDFLAGS": [
                            "-framework Foundation",
                            "-framework AppKit"
                        ]
                    }
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
