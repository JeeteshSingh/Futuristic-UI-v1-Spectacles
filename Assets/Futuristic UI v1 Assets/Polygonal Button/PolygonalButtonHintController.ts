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
import { PolygonalButton } from "./PolygonalButton"

/**
 * PolygonalButtonHintController Component
 * 
 * An elegant hint controller script that animates a PolygonalButton's opacity (0 to 1 to 0)
 * to display tutorial hints, animated GIF popups, or gesture prompts.
 * Exposes triggerIn() and triggerOut() for external control, and supports automatic
 * on-start delay sequences.
 */
@component
export class PolygonalButtonHintController extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA; font-weight: bold; font-size: 14px;">PolygonalButtonHintController</span><br/><span style="color: #94A3B8; font-size: 11px;">Animates PolygonalButton opacity to display tutorial hints & gesture prompts.</span>')
  @ui.separator

  @ui.label('<span style="color: #F59E0B; font-weight: bold;">Target Button</span>')
  @input("Component.ScriptComponent")
  @hint("Drag the SceneObject containing your PolygonalButton script component here")
  polygonalButton!: ScriptComponent

  @input("Component.ScriptComponent")
  @allowUndefined
  @hint("Optional: Drag your VideoPlayerController script component here to sync video playback on hint fade in")
  videoPlayer?: ScriptComponent

  @ui.separator
  @ui.label('<span style="color: #38BDF8; font-weight: bold;">Animation Duration Settings</span>')

  @input("float", "0.5")
  @hint("Duration in seconds to fade in from opacity 0 to 1")
  inDuration: number = 0.5

  @input("float", "0.5")
  @hint("Duration in seconds to fade out from opacity 1 to 0")
  outDuration: number = 0.5

  @input("boolean", "true")
  @hint("If true, automatically disables the hint SceneObject when fade out completes to save rendering and CPU resources.")
  disableOnFadeOut: boolean = true

  @input("Component.SceneObject")
  @allowUndefined
  @showIf("disableOnFadeOut")
  @hint("Optional: Additional parent/root SceneObject to enable/disable alongside the PolygonalButton SceneObject.")
  targetObjectToDisable?: SceneObject

  @ui.separator
  @ui.label('<span style="color: #34D399; font-weight: bold;">Automatic On-Start Sequence</span>')

  @input("boolean", "true")
  @hint("If true, automatically plays the startDelay -> triggerIn -> afterInDelay -> triggerOut sequence on Lens start.")
  autoTriggerOnStart: boolean = true

  @input("float", "1.0")
  @showIf("autoTriggerOnStart")
  @hint("Delay in seconds on Lens start before triggering fade in")
  startDelay: number = 1.0

  @input("float", "3.0")
  @showIf("autoTriggerOnStart")
  @hint("Duration in seconds to keep hint visible (opacity = 1) before triggering fade out")
  afterInDelay: number = 3.0

  private buttonAPI: any = null
  private animState: "idle" | "fadingIn" | "holding" | "fadingOut" = "idle"
  private animStartTime: number = -1
  private startOpacity: number = 0.0

  private startDelayEvent: DelayedCallbackEvent | null = null
  private afterInDelayEvent: DelayedCallbackEvent | null = null
  private updateEvent = this.createEvent("UpdateEvent")

  private onInComplete: (() => void) | null = null
  private onOutComplete: (() => void) | null = null

  onAwake() {
    this.createEvent("OnStartEvent").bind(this.onStart.bind(this))
    this.updateEvent.bind(this.onUpdate.bind(this))
  }

  private onStart() {
    if (this.polygonalButton) {
      this.buttonAPI = this.polygonalButton as any
    }

    if (this.autoTriggerOnStart) {
      // Set initial opacity to 0 on start for smooth fade-in
      if (this.buttonAPI) {
        this.buttonAPI.buttonOpacity = 0.0
      }
      this.scheduleStartSequence()
    }
  }

  /**
   * Schedules the automatic on-start sequence (startDelay -> triggerIn -> afterInDelay -> triggerOut).
   */
  private scheduleStartSequence() {
    this.cancelScheduledEvents()

    this.startDelayEvent = this.createEvent("DelayedCallbackEvent")
    this.startDelayEvent.bind(() => {
      this.triggerIn(() => {
        // After fade-in completes, schedule afterInDelay -> triggerOut
        this.afterInDelayEvent = this.createEvent("DelayedCallbackEvent")
        this.afterInDelayEvent.bind(() => {
          this.triggerOut()
        })
        this.afterInDelayEvent.reset(Math.max(0.01, this.afterInDelay))
      })
    })
    this.startDelayEvent.reset(Math.max(0.01, this.startDelay))
  }

  private cancelScheduledEvents() {
    if (this.startDelayEvent) {
      this.startDelayEvent.enabled = false
      this.startDelayEvent = null
    }
    if (this.afterInDelayEvent) {
      this.afterInDelayEvent.enabled = false
      this.afterInDelayEvent = null
    }
  }

  /**
   * Public API: Triggers the fade-in animation (0 -> 1).
   * @param onComplete Optional callback function invoked when fade-in completes.
   */
  public triggerIn(onComplete?: () => void): void {
    if (this.disableOnFadeOut) {
      if (this.polygonalButton && this.polygonalButton.getSceneObject()) {
        this.polygonalButton.getSceneObject().enabled = true
      }
      if (this.targetObjectToDisable) {
        this.targetObjectToDisable.enabled = true
      }
    }

    if (!this.buttonAPI) {
      if (this.polygonalButton) this.buttonAPI = this.polygonalButton as any
      else return
    }

    // Safely trigger video playback if assigned
    if (this.videoPlayer) {
      const vp = this.videoPlayer as any
      if (typeof vp.play === "function") {
        vp.play()
      }
    }

    this.cancelScheduledEvents()
    this.animState = "fadingIn"
    this.animStartTime = getTime()
    const currentOp = this.buttonAPI.buttonOpacity !== undefined ? this.buttonAPI.buttonOpacity : (this.buttonAPI.opacity !== undefined ? this.buttonAPI.opacity : 0.0)
    this.startOpacity = currentOp
    this.onInComplete = onComplete || null
  }

  /**
   * Public API: Triggers the fade-out animation (1 -> 0).
   * @param onComplete Optional callback function invoked when fade-out completes.
   */
  public triggerOut(onComplete?: () => void): void {
    if (!this.buttonAPI) {
      if (this.polygonalButton) this.buttonAPI = this.polygonalButton as any
      else return
    }

    this.cancelScheduledEvents()
    this.animState = "fadingOut"
    this.animStartTime = getTime()
    const currentOp = this.buttonAPI.buttonOpacity !== undefined ? this.buttonAPI.buttonOpacity : (this.buttonAPI.opacity !== undefined ? this.buttonAPI.opacity : 1.0)
    this.startOpacity = currentOp
    this.onOutComplete = onComplete || null
  }

  private setOpacityOnButton(op: number) {
    if (!this.buttonAPI) return
    if (this.buttonAPI.opacity !== undefined) this.buttonAPI.opacity = op
    if (this.buttonAPI.buttonOpacity !== undefined) this.buttonAPI.buttonOpacity = op
  }

  private onUpdate() {
    if (!this.buttonAPI || this.animState === "idle" || this.animState === "holding") return

    const curTime = getTime()
    const elapsed = curTime - this.animStartTime

    if (this.animState === "fadingIn") {
      const dur = Math.max(0.001, this.inDuration)
      const progress = MathUtils.clamp(elapsed / dur, 0, 1)
      const currentOp = MathUtils.lerp(this.startOpacity, 1.0, progress)
      
      this.setOpacityOnButton(currentOp)

      if (progress >= 1.0) {
        this.animState = "holding"
        if (this.onInComplete) {
          const cb = this.onInComplete
          this.onInComplete = null
          cb()
        }
      }
    } else if (this.animState === "fadingOut") {
      const dur = Math.max(0.001, this.outDuration)
      const progress = MathUtils.clamp(elapsed / dur, 0, 1)
      const currentOp = MathUtils.lerp(this.startOpacity, 0.0, progress)

      this.setOpacityOnButton(currentOp)

      if (progress >= 1.0) {
        this.animState = "idle"

        // Stop video playback if assigned
        if (this.videoPlayer) {
          const vp = this.videoPlayer as any
          if (typeof vp.stop === "function") {
            vp.stop()
          }
        }

        if (this.onOutComplete) {
          const cb = this.onOutComplete
          this.onOutComplete = null
          cb()
        }

        // Automatically disable PolygonalButton SceneObject and targetObjectToDisable once hidden
        if (this.disableOnFadeOut) {
          if (this.polygonalButton && this.polygonalButton.getSceneObject()) {
            this.polygonalButton.getSceneObject().enabled = false
          }
          if (this.targetObjectToDisable) {
            this.targetObjectToDisable.enabled = false
          }
        }
      }
    }
  }
}
