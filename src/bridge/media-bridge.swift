
import Foundation
import MediaPlayer

class MediaController: NSObject {
    static let shared = MediaController()
    
    override init() {
        super.init()
        setupRemoteCommands()
        setupStdinHandler()
    }
    
    func setupRemoteCommands() {
        let center = MPRemoteCommandCenter.shared()
        
        // Remove existing targets to be safe
        center.playCommand.removeTarget(nil)
        center.pauseCommand.removeTarget(nil)
        center.togglePlayPauseCommand.removeTarget(nil)
        center.nextTrackCommand.removeTarget(nil)
        
        // Add targets
        center.playCommand.addTarget { _ in
            self.sendEvent("play")
            return .success
        }
        
        center.pauseCommand.addTarget { _ in
            self.sendEvent("pause")
            return .success
        }
        
        center.togglePlayPauseCommand.addTarget { _ in
            self.sendEvent("toggle")
            return .success
        }
        
        center.nextTrackCommand.addTarget { _ in
            self.sendEvent("next")
            return .success
        }
        
        // Very important: For the media keys to work, we must say we are "playing" something
        // even if silence, or at least set the Now Playing info.
    }
    
    func updateNowPlaying(title: String, artist: String, duration: Double, elapsed: Double, isPlaying: Bool) {
        var info: [String: Any] = [
            MPMediaItemPropertyTitle: title,
            MPMediaItemPropertyArtist: artist,
            MPMediaItemPropertyPlaybackDuration: duration,
            MPNowPlayingInfoPropertyElapsedPlaybackTime: elapsed,
            MPNowPlayingInfoPropertyPlaybackRate: isPlaying ? 1.0 : 0.0,
            MPNowPlayingInfoPropertyMediaType: MPNowPlayingInfoMediaType.audio.rawValue
        ]
        
        MPNowPlayingInfoCenter.default().nowPlayingInfo = info
    }
    
    func sendEvent(_ name: String) {
        let json = "{\"event\":\"\(name)\"}"
        if let data = json.data(using: .utf8) {
            FileHandle.standardOutput.write(data)
            print("") // Newline
            fflush(stdout)
        }
    }
    
    func setupStdinHandler() {
        // Read from stdin in a background queue to not block the main runloop
        DispatchQueue.global(qos: .background).async {
            while true {
                if let line = readLine() {
                    self.handleInput(line)
                }
            }
        }
    }
    
    func handleInput(_ jsonString: String) {
        guard let data = jsonString.data(using: .utf8),
              let json = try? JSONSerialization.jsonObject(with: data, options: []) as? [String: Any] else {
            return
        }
        
        let title = json["title"] as? String ?? "Focus Music"
        let artist = json["artist"] as? String ?? "Generative"
        let duration = json["duration"] as? Double ?? 0
        let elapsed = json["elapsed"] as? Double ?? 0
        let isPlaying = json["isPlaying"] as? Bool ?? true
        
        DispatchQueue.main.async {
            self.updateNowPlaying(title: title, artist: artist, duration: duration, elapsed: elapsed, isPlaying: isPlaying)
        }
    }
}

// Start the controller
let controller = MediaController.shared

// Keep the main thread alive
RunLoop.main.run()
