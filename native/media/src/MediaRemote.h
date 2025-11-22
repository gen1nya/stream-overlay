// MediaRemote.h - Private framework declarations for macOS media control
// This is a reverse-engineered header for MediaRemote.framework (private API)
// Used by many macOS apps for media control and now playing info

#ifndef MEDIAREMOTE_H
#define MEDIAREMOTE_H

#import <Foundation/Foundation.h>

#ifdef __cplusplus
extern "C" {
#endif

// Now Playing Info Dictionary Keys
extern NSString *const kMRMediaRemoteNowPlayingInfoTitle;
extern NSString *const kMRMediaRemoteNowPlayingInfoArtist;
extern NSString *const kMRMediaRemoteNowPlayingInfoAlbum;
extern NSString *const kMRMediaRemoteNowPlayingInfoArtworkData;
extern NSString *const kMRMediaRemoteNowPlayingInfoDuration;
extern NSString *const kMRMediaRemoteNowPlayingInfoElapsed;
extern NSString *const kMRMediaRemoteNowPlayingInfoPlaybackRate;

// Playback State
typedef NS_ENUM(NSUInteger, MRMediaRemotePlaybackState) {
    MRMediaRemotePlaybackStatePlaying = 1,
    MRMediaRemotePlaybackStatePaused = 2,
    MRMediaRemotePlaybackStateStopped = 3
};

// Get now playing info
typedef void(^MRMediaRemoteGetNowPlayingInfoCompletion)(NSDictionary *info);
void MRMediaRemoteGetNowPlayingInfo(dispatch_queue_t queue, MRMediaRemoteGetNowPlayingInfoCompletion completion);

// Get now playing application
typedef void(^MRMediaRemoteGetNowPlayingApplicationCompletion)(NSString *bundleID);
void MRMediaRemoteGetNowPlayingApplicationDisplayName(dispatch_queue_t queue, MRMediaRemoteGetNowPlayingApplicationCompletion completion);

// Register for now playing notifications
extern NSString *const kMRMediaRemoteNowPlayingInfoDidChangeNotification;
extern NSString *const kMRMediaRemoteNowPlayingApplicationDidChangeNotification;

#ifdef __cplusplus
}
#endif

#endif // MEDIAREMOTE_H
