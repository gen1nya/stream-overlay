#include <napi.h>
#include <Foundation/Foundation.h>
#include <AppKit/AppKit.h>
#include <thread>
#include <atomic>
#include <string>
#include <vector>
#include <mutex>
#include <dlfcn.h>
#include "MediaRemote.h"

struct MediaState {
    std::string title;
    std::string artist;
    std::string album;
    std::string appId;
    int64_t durationMs = 0;
    int64_t positionMs = 0;
    std::string playbackStatus; // "Playing", "Paused", "Stopped"
    std::vector<uint8_t> thumbnail;
};

class MacOSMediaBridge : public Napi::ObjectWrap<MacOSMediaBridge> {
public:
    static Napi::Object Init(Napi::Env env, Napi::Object exports) {
        Napi::HandleScope scope(env);

        Napi::Function ctor = DefineClass(env, "GSMTCBridge", {
            InstanceMethod("start", &MacOSMediaBridge::Start),
            InstanceMethod("stop", &MacOSMediaBridge::Stop)
        });

        Napi::FunctionReference* constructor = new Napi::FunctionReference();
        *constructor = Napi::Persistent(ctor);
        env.SetInstanceData(constructor);

        exports.Set("GSMTCBridge", ctor);
        return exports;
    }

    MacOSMediaBridge(const Napi::CallbackInfo& info) : Napi::ObjectWrap<MacOSMediaBridge>(info) {
        NSLog(@"[MacOSMediaBridge] Initialized");
    }

    ~MacOSMediaBridge() {
        Stop(Napi::CallbackInfo(Env(), nullptr));
    }

private:
    Napi::Value Start(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();

        if (info.Length() < 1 || !info[0].IsFunction()) {
            Napi::TypeError::New(env, "data callback required").ThrowAsJavaScriptException();
            return env.Undefined();
        }

        std::lock_guard<std::mutex> lock(mutex_);
        if (running_) {
            return env.Undefined();
        }

        dataCallback_ = Napi::Persistent(info[0].As<Napi::Function>());
        if (info.Length() > 1 && info[1].IsFunction()) {
            errorCallback_ = Napi::Persistent(info[1].As<Napi::Function>());
        }

        running_ = true;

        // Create thread-safe function for callbacks
        tsfn_ = Napi::ThreadSafeFunction::New(
            env,
            dataCallback_.Value(),
            "MediaCallback",
            0,
            1
        );

        // Start polling thread
        pollingThread_ = std::thread(&MacOSMediaBridge::PollingLoop, this);

        NSLog(@"[MacOSMediaBridge] Started");
        return env.Undefined();
    }

    Napi::Value Stop(const Napi::CallbackInfo& info) {
        std::lock_guard<std::mutex> lock(mutex_);
        if (!running_) {
            return info.Env().Undefined();
        }

        running_ = false;

        if (pollingThread_.joinable()) {
            pollingThread_.join();
        }

        if (tsfn_) {
            tsfn_.Release();
        }

        dataCallback_.Reset();
        errorCallback_.Reset();

        NSLog(@"[MacOSMediaBridge] Stopped");
        return info.Env().Undefined();
    }

    void PollingLoop() {
        NSLog(@"[MacOSMediaBridge] Polling loop started");

        while (running_) {
            @autoreleasepool {
                MediaState state = FetchMediaState();

                // Call JavaScript callback
                auto callback = [state](Napi::Env env, Napi::Function jsCallback) {
                    Napi::Object obj = Napi::Object::New(env);
                    obj.Set("title", Napi::String::New(env, state.title));
                    obj.Set("artist", Napi::String::New(env, state.artist));
                    obj.Set("album", Napi::String::New(env, state.album));
                    obj.Set("appId", Napi::String::New(env, state.appId));
                    obj.Set("durationMs", Napi::Number::New(env, state.durationMs));
                    obj.Set("positionMs", Napi::Number::New(env, state.positionMs));
                    obj.Set("playbackStatus", Napi::String::New(env, state.playbackStatus));

                    if (!state.thumbnail.empty()) {
                        Napi::Buffer<uint8_t> buf = Napi::Buffer<uint8_t>::Copy(
                            env,
                            state.thumbnail.data(),
                            state.thumbnail.size()
                        );
                        obj.Set("thumbnail", buf);
                    }

                    jsCallback.Call({obj});
                };

                if (tsfn_) {
                    tsfn_.BlockingCall(callback);
                }
            }

            // Poll every second
            std::this_thread::sleep_for(std::chrono::seconds(1));
        }

        NSLog(@"[MacOSMediaBridge] Polling loop stopped");
    }

    MediaState FetchMediaState() {
        MediaState state;

        // NOTE: MediaRemote framework requires special entitlements on macOS 15+
        // and returns null in sandboxed/unsigned apps. Disabled for now.
        // If we need artwork in the future, we can try:
        // 1. Adding proper entitlements to the app
        // 2. Using AppleScript to get artwork file path
        // 3. Using NSWorkspace + NSRunningApplication

        // Uncomment to try MediaRemote (won't work without entitlements):
        // if (TryFetchFromMediaRemote(state)) {
        //     return state;
        // }

        // Use AppleScript for specific apps
        const char* players[] = {"Spotify", "Music", "VLC"};

        for (const char* playerName : players) {
            if (TryFetchFromPlayer(playerName, state)) {
                state.appId = std::string("com.") + std::string(playerName);
                return state;
            }
        }

        // Try browsers (Chrome, Safari)
        const char* browsers[] = {"Google Chrome", "Safari"};
        for (const char* browserName : browsers) {
            if (TryFetchFromBrowser(browserName, state)) {
                state.appId = std::string("browser.") + std::string(browserName);
                return state;
            }
        }

        // No player is active
        state.title = "";
        state.artist = "";
        state.album = "";
        state.appId = "";
        state.playbackStatus = "Stopped";

        return state;
    }

    bool TryFetchFromPlayer(const char* playerName, MediaState& state) {
        @autoreleasepool {
            // Check if app is running
            NSString* checkScript = [NSString stringWithFormat:
                @"tell application \"System Events\" to (name of processes) contains \"%s\"",
                playerName
            ];

            NSAppleScript* checkAS = [[NSAppleScript alloc] initWithSource:checkScript];
            NSDictionary* checkError = nil;
            NSAppleEventDescriptor* checkResult = [checkAS executeAndReturnError:&checkError];

            if (checkError || !checkResult || [checkResult booleanValue] == NO) {
                return false; // App not running
            }

            // Fetch track info
            NSString* script = [NSString stringWithFormat:
                @"tell application \"%s\"\n"
                @"  try\n"
                @"    set trackName to name of current track\n"
                @"    set trackArtist to artist of current track\n"
                @"    set trackAlbum to album of current track\n"
                @"    set trackDuration to duration of current track\n"
                @"    set trackPosition to player position\n"
                @"    set trackState to player state as string\n"
                @"    return {trackName, trackArtist, trackAlbum, trackDuration, trackPosition, trackState}\n"
                @"  on error\n"
                @"    return {}\n"
                @"  end try\n"
                @"end tell",
                playerName
            ];

            NSAppleScript* appleScript = [[NSAppleScript alloc] initWithSource:script];
            NSDictionary* error = nil;
            NSAppleEventDescriptor* result = [appleScript executeAndReturnError:&error];

            if (error || !result || [result numberOfItems] < 6) {
                return false;
            }

            // Parse result
            state.title = [[result descriptorAtIndex:1] stringValue].UTF8String ?: "";
            state.artist = [[result descriptorAtIndex:2] stringValue].UTF8String ?: "";
            state.album = [[result descriptorAtIndex:3] stringValue].UTF8String ?: "";
            state.durationMs = [[result descriptorAtIndex:4] int32Value] * 1000;
            state.positionMs = [[result descriptorAtIndex:5] doubleValue] * 1000;

            NSString* playerState = [[result descriptorAtIndex:6] stringValue];
            if ([playerState isEqualToString:@"playing"]) {
                state.playbackStatus = "Playing";
            } else if ([playerState isEqualToString:@"paused"]) {
                state.playbackStatus = "Paused";
            } else {
                state.playbackStatus = "Stopped";
            }

            return true;
        }
    }

    bool TryFetchFromMediaRemote(MediaState& state) {
        @autoreleasepool {
            // Try to load MediaRemote framework dynamically
            static void* mediaRemoteHandle = nullptr;
            static dispatch_once_t onceToken;
            static bool mediaRemoteAvailable = false;

            dispatch_once(&onceToken, ^{
                mediaRemoteHandle = dlopen("/System/Library/PrivateFrameworks/MediaRemote.framework/MediaRemote", RTLD_LAZY);
                mediaRemoteAvailable = (mediaRemoteHandle != nullptr);

                if (mediaRemoteAvailable) {
                    NSLog(@"[MacOSMediaBridge] MediaRemote framework loaded successfully");
                } else {
                    NSLog(@"[MacOSMediaBridge] MediaRemote framework not available, using AppleScript fallback");
                }
            });

            if (!mediaRemoteAvailable) {
                return false;
            }

            // Get function pointer for MRMediaRemoteGetNowPlayingInfo
            typedef void(*MRMediaRemoteGetNowPlayingInfoFunc)(dispatch_queue_t, void(^)(NSDictionary*));
            MRMediaRemoteGetNowPlayingInfoFunc getNowPlayingInfo =
                (MRMediaRemoteGetNowPlayingInfoFunc)dlsym(mediaRemoteHandle, "MRMediaRemoteGetNowPlayingInfo");

            if (!getNowPlayingInfo) {
                return false;
            }

            // Synchronous fetch using semaphore
            __block NSDictionary* nowPlayingInfo = nil;
            __block bool completed = false;

            dispatch_semaphore_t semaphore = dispatch_semaphore_create(0);

            getNowPlayingInfo(dispatch_get_main_queue(), ^(NSDictionary* info) {
                nowPlayingInfo = [info copy];
                completed = true;
                dispatch_semaphore_signal(semaphore);
            });

            // Wait max 500ms for response
            dispatch_time_t timeout = dispatch_time(DISPATCH_TIME_NOW, 500 * NSEC_PER_MSEC);
            long result = dispatch_semaphore_wait(semaphore, timeout);

            if (result != 0 || !completed || !nowPlayingInfo) {
                NSLog(@"[MacOSMediaBridge] MediaRemote timeout or no data (result=%ld, completed=%d, info=%@)",
                      result, completed, nowPlayingInfo);
                return false; // Timeout or no data
            }

            // Log all keys in the dictionary to debug
            NSLog(@"[MacOSMediaBridge] MediaRemote info keys: %@", [nowPlayingInfo allKeys]);

            // Extract title - try different possible keys
            NSString* title = nowPlayingInfo[@"kMRMediaRemoteNowPlayingInfoTitle"];
            if (!title) {
                // Try without the k prefix (some versions use this)
                title = nowPlayingInfo[@"MRMediaRemoteNowPlayingInfoTitle"];
            }
            if (!title) {
                // Try simple key
                title = nowPlayingInfo[@"Title"];
            }

            if (!title || [title length] == 0) {
                NSLog(@"[MacOSMediaBridge] MediaRemote: no title found");
                return false; // No media playing
            }

            state.title = [title UTF8String] ?: "";

            // Extract artist - try multiple key formats
            NSString* artist = nowPlayingInfo[@"kMRMediaRemoteNowPlayingInfoArtist"];
            if (!artist) artist = nowPlayingInfo[@"MRMediaRemoteNowPlayingInfoArtist"];
            if (!artist) artist = nowPlayingInfo[@"Artist"];
            state.artist = artist ? [artist UTF8String] : "";

            // Extract album
            NSString* album = nowPlayingInfo[@"kMRMediaRemoteNowPlayingInfoAlbum"];
            if (!album) album = nowPlayingInfo[@"MRMediaRemoteNowPlayingInfoAlbum"];
            if (!album) album = nowPlayingInfo[@"Album"];
            state.album = album ? [album UTF8String] : "";

            // Extract duration
            NSNumber* duration = nowPlayingInfo[@"kMRMediaRemoteNowPlayingInfoDuration"];
            if (!duration) duration = nowPlayingInfo[@"Duration"];
            state.durationMs = duration ? ([duration doubleValue] * 1000) : 0;

            // Extract elapsed time
            NSNumber* elapsed = nowPlayingInfo[@"kMRMediaRemoteNowPlayingInfoElapsedTime"];
            if (!elapsed) elapsed = nowPlayingInfo[@"ElapsedTime"];
            if (!elapsed) elapsed = nowPlayingInfo[@"kMRMediaRemoteNowPlayingInfoElapsed"];
            state.positionMs = elapsed ? ([elapsed doubleValue] * 1000) : 0;

            // Extract playback rate (0 = paused, 1 = playing)
            NSNumber* playbackRate = nowPlayingInfo[@"kMRMediaRemoteNowPlayingInfoPlaybackRate"];
            if (!playbackRate) playbackRate = nowPlayingInfo[@"PlaybackRate"];
            if (playbackRate && [playbackRate doubleValue] > 0) {
                state.playbackStatus = "Playing";
            } else {
                state.playbackStatus = "Paused";
            }

            // Extract artwork data
            NSData* artworkData = nowPlayingInfo[@"kMRMediaRemoteNowPlayingInfoArtworkData"];
            if (!artworkData) artworkData = nowPlayingInfo[@"ArtworkData"];
            if (artworkData && [artworkData length] > 0) {
                state.thumbnail.resize([artworkData length]);
                [artworkData getBytes:state.thumbnail.data() length:[artworkData length]];
            }

            // Try to get app bundle ID
            typedef void(*MRMediaRemoteGetNowPlayingApplicationDisplayNameFunc)(dispatch_queue_t, void(^)(NSString*));
            MRMediaRemoteGetNowPlayingApplicationDisplayNameFunc getAppName =
                (MRMediaRemoteGetNowPlayingApplicationDisplayNameFunc)dlsym(mediaRemoteHandle, "MRMediaRemoteGetNowPlayingApplicationDisplayName");

            if (getAppName) {
                __block NSString* appName = nil;
                dispatch_semaphore_t appSemaphore = dispatch_semaphore_create(0);

                getAppName(dispatch_get_main_queue(), ^(NSString* name) {
                    appName = [name copy];
                    dispatch_semaphore_signal(appSemaphore);
                });

                dispatch_time_t appTimeout = dispatch_time(DISPATCH_TIME_NOW, 100 * NSEC_PER_MSEC);
                if (dispatch_semaphore_wait(appSemaphore, appTimeout) == 0 && appName) {
                    state.appId = [appName UTF8String] ?: "Unknown";
                } else {
                    state.appId = "MediaRemote";
                }
            } else {
                state.appId = "MediaRemote";
            }

            NSLog(@"[MacOSMediaBridge] MediaRemote: %s - %s (artwork: %zu bytes)",
                  state.title.c_str(), state.artist.c_str(), state.thumbnail.size());

            return true;
        }
    }

    bool TryFetchFromBrowser(const char* browserName, MediaState& state) {
        @autoreleasepool {
            // Check if browser is running
            NSString* checkScript = [NSString stringWithFormat:
                @"tell application \"System Events\" to (name of processes) contains \"%s\"",
                browserName
            ];

            NSAppleScript* checkAS = [[NSAppleScript alloc] initWithSource:checkScript];
            NSDictionary* checkError = nil;
            NSAppleEventDescriptor* checkResult = [checkAS executeAndReturnError:&checkError];

            if (checkError || !checkResult || [checkResult booleanValue] == NO) {
                return false; // Browser not running
            }

            // Get active tab title and URL
            NSString* script = [NSString stringWithFormat:
                @"tell application \"%s\"\n"
                @"  try\n"
                @"    set tabTitle to title of active tab of front window\n"
                @"    set tabURL to URL of active tab of front window\n"
                @"    return {tabTitle, tabURL}\n"
                @"  on error\n"
                @"    return {}\n"
                @"  end try\n"
                @"end tell",
                browserName
            ];

            NSAppleScript* appleScript = [[NSAppleScript alloc] initWithSource:script];
            NSDictionary* error = nil;
            NSAppleEventDescriptor* result = [appleScript executeAndReturnError:&error];

            if (error || !result || [result numberOfItems] < 2) {
                return false;
            }

            NSString* tabTitle = [[result descriptorAtIndex:1] stringValue];
            NSString* tabURL = [[result descriptorAtIndex:2] stringValue];

            if (!tabTitle || [tabTitle length] == 0) {
                return false;
            }

            // Parse title based on URL
            if ([tabURL containsString:@"youtube.com/watch"]) {
                // YouTube format: "Artist - Title - YouTube" or just "Title - YouTube"
                NSString* cleanTitle = [tabTitle stringByReplacingOccurrencesOfString:@" - YouTube" withString:@""];

                NSArray* parts = [cleanTitle componentsSeparatedByString:@" - "];
                if ([parts count] >= 2) {
                    state.artist = [parts[0] UTF8String] ?: "";
                    state.title = [parts[1] UTF8String] ?: "";
                } else {
                    state.title = [cleanTitle UTF8String] ?: "";
                    state.artist = "YouTube";
                }

                state.album = "YouTube";
                state.playbackStatus = "Playing";
                state.durationMs = 0; // Unknown
                state.positionMs = 0; // Unknown

                return true;
            } else if ([tabURL containsString:@"spotify.com"]) {
                // Spotify Web Player
                NSArray* parts = [tabTitle componentsSeparatedByString:@" • "];
                if ([parts count] >= 2) {
                    state.title = [parts[0] UTF8String] ?: "";
                    state.artist = [parts[1] UTF8String] ?: "";
                } else {
                    state.title = [tabTitle UTF8String] ?: "";
                    state.artist = "Spotify";
                }

                state.album = "Spotify Web";
                state.playbackStatus = "Playing";
                state.durationMs = 0;
                state.positionMs = 0;

                return true;
            } else if ([tabURL containsString:@"music.apple.com"] ||
                       [tabURL containsString:@"music.youtube.com"] ||
                       [tabURL containsString:@"soundcloud.com"]) {
                // Other music services - use tab title as-is
                state.title = [tabTitle UTF8String] ?: "";
                state.artist = "Web Player";
                state.album = "";
                state.playbackStatus = "Playing";
                state.durationMs = 0;
                state.positionMs = 0;

                return true;
            }

            // Not a media tab
            return false;
        }
    }

    std::atomic<bool> running_{false};
    std::thread pollingThread_;
    std::mutex mutex_;

    Napi::FunctionReference dataCallback_;
    Napi::FunctionReference errorCallback_;
    Napi::ThreadSafeFunction tsfn_;
};

Napi::Object InitAll(Napi::Env env, Napi::Object exports) {
    return MacOSMediaBridge::Init(env, exports);
}

NODE_API_MODULE(gsmtc, InitAll)
