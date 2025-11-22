{
  "targets": [
    {
      "target_name": "fft_bridge",
      "sources": [
        "src/addon.cc",
        "src/fft_bands.cpp",
        "src/ringbuffers.h",
        "third_party/kissfft/kiss_fft.c",
        "third_party/kissfft/kiss_fftr.c"
      ],
      "include_dirs": [
        "<!@(node -p \"require('node-addon-api').include\")",
        "third_party/kissfft"
      ],
      "defines": [
        "NAPI_CPP_EXCEPTIONS"
      ],
      "conditions": [
        ["OS=='win'", {
          "sources": [
            "src/wasapi_engine.cpp"
          ],
          "libraries": [
            "ole32.lib",
            "uuid.lib",
            "Mmdevapi.lib",
            "Avrt.lib"
          ],
          "msvs_settings": {
            "VCCLCompilerTool": {
              "ExceptionHandling": 1,
              "AdditionalOptions": ["/Zc:__cplusplus"]
            }
          }
        }],
        ["OS=='linux'", {
          "sources": [
            "src/pipewire_engine.cpp"
          ],
          "libraries": [
            "<!@(pkg-config --libs libpipewire-0.3)"
          ],
          "cflags": [
            "-std=c++14",
            "<!@(pkg-config --cflags libpipewire-0.3)"
          ],
          "cflags_cc": [
            "-std=c++14",
            "<!@(pkg-config --cflags libpipewire-0.3)"
          ]
        }],
        ["OS=='mac'", {
          "sources": [],
          "xcode_settings": {
            "GCC_ENABLE_CPP_EXCEPTIONS": "YES",
            "CLANG_CXX_LIBRARY": "libc++",
            "MACOSX_DEPLOYMENT_TARGET": "10.13",
            "OTHER_CPLUSPLUSFLAGS": ["-std=c++14"],
            "OTHER_LDFLAGS": []
          }
        }]
      ],
      "cflags!": ["-fno-exceptions"],
      "cflags_cc!": ["-fno-exceptions"]
    }
  ]
}
