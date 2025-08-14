{
  "targets": [
    {
      "target_name": "fft_bridge",
      "sources": [
        "src/addon.cc",
        "src/engine.cpp",
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
          "libraries": [
            "ole32.lib", "uuid.lib", "Mmdevapi.lib", "Avrt.lib"
          ]
        }]
      ],
      "cflags!": ["-fno-exceptions"],
      "cflags_cc!": ["-fno-exceptions"],
      "msvs_settings": {
        "VCCLCompilerTool": {
          "ExceptionHandling": 1,
          "AdditionalOptions": ["/Zc:__cplusplus"]
        }
      }
    }
  ]
}