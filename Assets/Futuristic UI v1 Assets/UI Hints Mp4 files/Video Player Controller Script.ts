/**
 * ============================================================================
 * Futuristic UI v1 | Spatial Interface & Carousel Framework
 * Designed for Snapdragon-powered Spectacles (2024) & Lens Studio 5.15+
 * 
 * Open-Source Release under the MIT License.
 * Copyright (c) 2026 Futuristic UI v1 Contributors
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files to deal in the Software
 * without restriction, including commercial use, modification, and distribution.
 * ============================================================================
 */
/**
 * VideoPlayerController
 *
 * Controls a video texture asset via VideoTextureProvider.
 * Exposes play, pause, resume, and stop as public methods
 * so external scripts can trigger them directly.
 *
 * Setup:
 *   1. Drag your Video Texture asset into the `videoTexture` field.
 *   2. Optionally configure `loopCount`, `playbackRate`, and `playOnStart`.
 *   3. Call play() / pause() / resume() / stop() from any external script.
 */
@component
export class VideoPlayerController extends BaseScriptComponent {

    @ui.label('<span style="color: #60A5FA; font-weight: bold; font-size: 14px;">VideoPlayerController</span><br/><span style="color: #94A3B8; font-size: 11px;">Controls a video texture via VideoTextureProvider.</span>')
    @ui.separator

    @input("Asset.Texture")
    @allowUndefined
    @hint("Drag your Video Texture asset (must be a VideoTextureProvider) here")
    videoTexture?: Texture;

    @ui.separator
    @ui.label('<span style="color: #F59E0B; font-weight: bold;">Playback Settings</span>')

    @input("float", "1.0")
    @hint("Playback speed multiplier. 1.0 = normal, 2.0 = double speed, 0.5 = half speed.")
    playbackRate: number = 1.0;

    @input("int", "-1")
    @hint("Number of times to loop the video. -1 = loop forever, 1 = play once.")
    loopCount: number = -1;

    @input("boolean", "false")
    @hint("If true, video automatically plays on Lens start.")
    playOnStart: boolean = false;

    // ─── Internal State ───────────────────────────────────────────────────────

    private _provider: VideoTextureProvider | null = null;
    private _started: boolean = false;
    private _isPaused: boolean = false;
    private _currentLoopsRemaining: number = -1;
    private _lastTime: number = 0;

    // ─── Lifecycle ────────────────────────────────────────────────────────────

    onAwake() {
        this.createEvent("OnStartEvent").bind(this.onStart.bind(this));
        this.createEvent("UpdateEvent").bind(this.onUpdate.bind(this));
    }

    private onStart() {
        if (!this.videoTexture) {
            print("[VideoPlayerController] ERROR: No videoTexture assigned.");
            return;
        }

        this._provider = this.videoTexture.control as VideoTextureProvider;

        if (!this._provider) {
            print("[VideoPlayerController] ERROR: videoTexture.control is not a VideoTextureProvider.");
            return;
        }

        this._provider.playbackRate = this.playbackRate;

        if (this.playOnStart) {
            this.play();
        }
    }

    private onUpdate() {
        if (!this._provider || !this._started || this._isPaused) return;

        const duration = this._provider.duration;
        const curTime = this._provider.currentTime;

        if (duration <= 0) return;

        // Threshold buffer based on frame delta and playback speed
        const threshold = Math.max(0.06 * Math.abs(this.playbackRate), 0.04);

        // Check if video reached the end
        if (curTime >= duration - threshold || (curTime >= this._lastTime && curTime >= duration - 0.1)) {
            if (this._currentLoopsRemaining === -1) {
                // Infinite looping
                try {
                    this._provider.seek(0);
                    this._provider.playbackRate = this.playbackRate;
                    this._provider.play(1);
                } catch (e) {}
                this._lastTime = 0;
            } else if (this._currentLoopsRemaining > 1) {
                this._currentLoopsRemaining--;
                try {
                    this._provider.seek(0);
                    this._provider.playbackRate = this.playbackRate;
                    this._provider.play(1);
                } catch (e) {}
                this._lastTime = 0;
            } else if (this._currentLoopsRemaining === 1) {
                // Last loop finished
                this._currentLoopsRemaining = 0;
                this._started = false;
            }
        } else {
            this._lastTime = curTime;
        }
    }

    // ─── Helper Methods ──────────────────────────────────────────────────────

    private getProviderStatus(): VideoStatus {
        if (!this._provider) return VideoStatus.Stopped;
        const p = this._provider as any;
        if (p.status !== undefined) {
            return p.status;
        }
        if (typeof p.getStatus === "function") {
            return p.getStatus();
        }
        return VideoStatus.Stopped;
    }

    // ─── Public API ───────────────────────────────────────────────────────────

    /**
     * Starts video playback from the beginning.
     * @param loops Overrides Inspector loopCount for this call. -1 = loop forever.
     */
    public play(loops?: number): void {
        if (!this._provider) {
            print("[VideoPlayerController] play() called before initialization.");
            return;
        }
        this._currentLoopsRemaining = (loops !== undefined) ? loops : this.loopCount;
        this._provider.playbackRate = this.playbackRate;
        try {
            this._provider.seek(0);
        } catch (e) {}
        try {
            // Play single iteration; our onUpdate manages custom-speed seamless looping
            this._provider.play(1);
        } catch (e) {
            print("[VideoPlayerController] play() warning: " + e);
        }
        this._started = true;
        this._isPaused = false;
        this._lastTime = 0;
    }

    /**
     * Pauses the video at the current timestamp.
     */
    public pause(): void {
        if (!this._provider) return;
        try {
            const status = this.getProviderStatus();
            if (status === VideoStatus.Playing) {
                this._provider.pause();
            }
        } catch (e) {}
        this._isPaused = true;
    }

    /**
     * Resumes playback from the current timestamp.
     * Calls play() if the video was never started.
     */
    public resume(): void {
        if (!this._provider) return;
        if (!this._started) {
            this.play();
            return;
        }
        try {
            this._provider.playbackRate = this.playbackRate;
            const status = this.getProviderStatus();
            if (status === VideoStatus.Paused) {
                this._provider.resume();
            } else if (status !== VideoStatus.Playing) {
                this._provider.play(1);
            }
        } catch (e) {
            try {
                this._provider.play(1);
            } catch (err) {}
        }
        this._isPaused = false;
    }

    /**
     * Stops the video and resets playback to the beginning.
     */
    public stop(): void {
        if (!this._provider) return;
        try {
            const status = this.getProviderStatus();
            if (status === VideoStatus.Playing || status === VideoStatus.Paused) {
                this._provider.stop();
            }
        } catch (e) {
            // Ignore native invalid state exception if video was already stopped
        }
        this._started = false;
        this._isPaused = false;
        this._lastTime = 0;
    }

    /**
     * Seeks to a specific timestamp.
     * @param seconds Time in seconds.
     */
    public seek(seconds: number): void {
        if (!this._provider) return;
        try {
            this._provider.seek(seconds);
        } catch (e) {}
        this._lastTime = seconds;
    }

    /**
     * Sets the playback speed at runtime.
     * @param rate 1.0 = normal, 2.0 = double, 0.5 = half.
     */
    public setSpeed(rate: number): void {
        this.playbackRate = rate;
        if (this._provider) {
            this._provider.playbackRate = rate;
        }
    }

    /**
     * Returns the current playback status: "Playing", "Paused", "Stopped", "Unknown".
     */
    public getStatus(): string {
        if (!this._provider) return "Not Initialized";
        if (this._isPaused) return "Paused";
        if (!this._started) return "Stopped";
        const s = this.getProviderStatus();
        if (s === VideoStatus.Playing) return "Playing";
        if (s === VideoStatus.Paused)  return "Paused";
        if (s === VideoStatus.Stopped) return "Stopped";
        return "Unknown";
    }

    /**
     * Returns the current playback position in seconds.
     */
    public getCurrentTime(): number {
        return this._provider ? this._provider.currentTime : 0;
    }

    /**
     * Returns the total duration of the video in seconds.
     */
    public getDuration(): number {
        return this._provider ? this._provider.duration : 0;
    }

    /**
     * Returns true when the video is loaded and ready to play.
     */
    public isReady(): boolean {
        return this._provider ? this._provider.isPlaybackReady : false;
    }
}
