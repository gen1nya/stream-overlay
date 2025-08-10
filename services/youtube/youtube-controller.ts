import {YouTubeChatReader} from "./chat-reader";
import {Message, YouTubeConfig} from "./types";

export class SimpleYouTubeController {
    private chatReader: YouTubeChatReader;
    private isActive = false;

    constructor(
        private onMessage: (message: Message) => void,
        private ytCookie?: string
    ) {
        this.chatReader = new YouTubeChatReader(onMessage, ytCookie);
        console.log(`[DEBUG] SimpleYouTubeController initialized`);
    }

    // Method to handle consent
    handleConsent(consentCookies: string): void {
        console.log(`[DEBUG] Setting consent cookies`);
        this.chatReader.setConsentCookies(consentCookies);
    }

    // Start reading chat for specific video ID
    async startChatReader(videoId: string, config?: YouTubeConfig): Promise<void> {
        if (this.isActive) {
            throw new Error('Controller is already active');
        }

        console.log(`[DEBUG] Starting chat reader for video: ${videoId}`);
        this.isActive = true;

        try {
            await this.chatReader.start(videoId, config);
        } catch (error) {
            this.isActive = false;
            throw error;
        }
    }

    // Stop chat reader
    stopChatReader(): void {
        if (this.isActive) {
            console.log(`[DEBUG] Stopping chat reader`);
            this.chatReader.stop();
            this.isActive = false;
        }
    }

    // Check if active
    isReaderActive(): boolean {
        return this.isActive;
    }

    // Utility method to extract video ID from YouTube URL
    static extractVideoId(url: string): string {
        const patterns = [
            /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
            /^([a-zA-Z0-9_-]{11})$/ // Direct video ID
        ];

        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match) return match[1];
        }

        throw new Error('Invalid YouTube URL or video ID');
    }
}