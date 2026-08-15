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
import {HandInputData} from "SpectaclesInteractionKit.lspkg/Providers/HandInputData/HandInputData"
import TrackedHand from "SpectaclesInteractionKit.lspkg/Providers/HandInputData/TrackedHand"
@component
export class CarouselGestureApp extends BaseScriptComponent {
  @input("Component.ScriptComponent")
  @hint("Drag either a VirtualizedPolygonalCarousel or ManualPolygonalCarousel here")
  carousel!: ScriptComponent

  @input
  camera!: Camera

  @input
  @widget(new ComboBoxWidget([new ComboBoxItem("Right", 0), new ComboBoxItem("Left", 1), new ComboBoxItem("Both", 2)]))
  handType: number = 2

  @input
  fistSidewardOffset: vec3 = new vec3(0, 0, 0)

  @input
  gestureHoldTime: number = 0.5 // seconds

  @input
  fistDistanceThreshold: number = 10.0 // cm, increase if fist isn't detected

  @input
  positionSmoothing: number = 10.0 // Higher is faster, lower is smoother

  @input
  @hint("Drag your Right or Left Hand Interactor script here to disable it when menu is open")
  handInteractor?: ScriptComponent

  @input
  @hint("Enable Snap OS GestureModule Grab detection alongside bone distance for fused tracking.")
  useNativeGrab: boolean = true

  @input
  @hint("Optional: Add a Text component to see real-time tracking data for tuning thresholds.")
  debugText?: Text

  private gestureModule: any = null
  private isRightGrabActive: boolean = false
  private isLeftGrabActive: boolean = false

  private hand!: TrackedHand
  private isCarouselVisible: boolean = false
  private isFirstFrame: boolean = false
  private gestureHoldTimer: number = 0
  private hideEvent: DelayedCallbackEvent | null = null

  private updateEvent = this.createEvent("UpdateEvent")

  onAwake() {
    this.initGestureModule()
    this.updateEvent.bind(this.onUpdate.bind(this))
  }

  private initGestureModule() {
    try {
      this.gestureModule = require("LensStudio:GestureModule")
      if (this.gestureModule && typeof GestureModule !== "undefined") {
        this.gestureModule.getGrabBeginEvent(GestureModule.HandType.Right).add(() => {
          this.isRightGrabActive = true
        })
        this.gestureModule.getGrabEndEvent(GestureModule.HandType.Right).add(() => {
          this.isRightGrabActive = false
        })
        this.gestureModule.getGrabBeginEvent(GestureModule.HandType.Left).add(() => {
          this.isLeftGrabActive = true
        })
        this.gestureModule.getGrabEndEvent(GestureModule.HandType.Left).add(() => {
          this.isLeftGrabActive = false
        })
      }
    } catch (e) {
      // GestureModule graceful fallback if running in environments without native Grab API
      this.gestureModule = null
    }
  }

  private onUpdate() {
    let checkHands: TrackedHand[] = []
    
    // If carousel is visible, ONLY check the hand that opened it to avoid flickering.
    if (this.isCarouselVisible && this.hand && this.hand.isTracked()) {
        checkHands.push(this.hand)
    } else {
        if (this.handType === 0) {
            checkHands.push(HandInputData.getInstance().getHand("right"))
        } else if (this.handType === 1) {
            checkHands.push(HandInputData.getInstance().getHand("left"))
        } else {
            checkHands.push(HandInputData.getInstance().getHand("right"))
            checkHands.push(HandInputData.getInstance().getHand("left"))
        }
    }

    let detectedFistHand: TrackedHand | null = null
    let fistDistance = 0
    let triggerSource = ""

    for (const h of checkHands) {
        if (!h || !h.isTracked()) continue
        const wrist = h.wrist
        const indexTip = h.indexTip
        if (!wrist || !indexTip) continue

        const dist = indexTip.position.distance(wrist.position)
        // Add hysteresis when menu is open
        const effectiveThreshold = this.isCarouselVisible ? this.fistDistanceThreshold + 4.0 : this.fistDistanceThreshold
        const isBoneFist = dist < effectiveThreshold

        const isNativeGrab = this.useNativeGrab && (
            (h.handType === "right" && this.isRightGrabActive) ||
            (h.handType === "left" && this.isLeftGrabActive)
        )

        if (isBoneFist || isNativeGrab) {
            detectedFistHand = h
            fistDistance = dist
            triggerSource = isBoneFist && isNativeGrab ? "Fused (Both)" : isNativeGrab ? "Native Grab" : "Bone Dist"
            break // Found a fist, stop checking
        }
    }

    if (!detectedFistHand) {
       this.setDebugText("Status: Open Hand or Not Tracked")
       if (this.isCarouselVisible) {
           this.resetGesture()
       } else if (this.hideEvent && this.hideEvent.enabled && this.hand && this.hand.isTracked()) {
           const middleKnuckle = this.hand.middleKnuckle
           if (middleKnuckle) {
               this.updateCarouselPosition(middleKnuckle.position)
           }
       }
       return
    }

    // We have a fist! Lock this hand as the active one.
    this.hand = detectedFistHand

    const wrist = this.hand.wrist
    const middleKnuckle = this.hand.middleKnuckle
    if (!wrist || !middleKnuckle) return

    let debugString = `Hand: ${this.hand.handType}\nMode: ${triggerSource}\nDist: ${fistDistance.toFixed(2)} cm\nTimer: ${this.gestureHoldTimer.toFixed(2)}s\nCarousel: ${this.isCarouselVisible ? "Visible" : "Hidden"}`
    this.setDebugText(debugString)

    this.gestureHoldTimer += getDeltaTime()
    
    if (this.gestureHoldTimer >= this.gestureHoldTime && !this.isCarouselVisible) {
      this.showCarousel(middleKnuckle.position)
    } else if (this.isCarouselVisible) {
      // Keep updating position while visible
      this.updateCarouselPosition(middleKnuckle.position)
    }
  }

  private resetGesture() {
    this.gestureHoldTimer = 0
    
    if (this.isCarouselVisible) {
       this.hideCarousel()
    }
  }

  private setDebugText(text: string) {
    if (this.debugText) {
       this.debugText.text = text
    }
  }

  private showCarousel(knucklePos: vec3) {
    this.isCarouselVisible = true
    this.isFirstFrame = true
    
    // Cancel any pending hide event
    if (this.hideEvent) {
       this.hideEvent.enabled = false
    }

    const root = (this.carousel as any).carouselRoot || this.carousel.getSceneObject()
    root.enabled = true

    if (this.handInteractor) {
      this.handInteractor.enabled = false
    }

    this.updateCarouselPosition(knucklePos)
    
    if ((this.carousel as any).playEntryAnimation) {
      (this.carousel as any).playEntryAnimation()
    }
  }

  private hideCarousel() {
    if (!this.isCarouselVisible) return
    this.isCarouselVisible = false
    const root = (this.carousel as any).carouselRoot || this.carousel.getSceneObject()
    
    if ((this.carousel as any).playExitAnimation) {
      (this.carousel as any).playExitAnimation()
    }

    if (!this.hideEvent) {
        this.hideEvent = this.createEvent("DelayedCallbackEvent")
        this.hideEvent.bind(() => {
           root.enabled = false
           if (this.handInteractor) {
             this.handInteractor.enabled = true
           }
        })
    }
    const exitDuration = (this.carousel as any).entryDuration || 0.35
    this.hideEvent.reset(exitDuration)
  }

  private updateCarouselPosition(knucklePos: vec3) {
    const root = (this.carousel as any).carouselRoot || this.carousel.getSceneObject()
    const transform = root.getTransform()
    const currentPos = transform.getWorldPosition()
    const camTransform = this.camera.getSceneObject().getTransform()

    // Position at knuckles
    const targetPos = knucklePos.add(this.fistSidewardOffset)

    // If it's the very first frame of being visible, snap to it. Otherwise lerp.
    if (this.isFirstFrame) {
       this.isFirstFrame = false
       transform.setWorldPosition(targetPos)
    } else {
       const smoothedPos = vec3.lerp(currentPos, targetPos, getDeltaTime() * this.positionSmoothing)
       transform.setWorldPosition(smoothedPos)
    }

    // Make the carousel face the camera
    const lookAtPos = camTransform.getWorldPosition()
    
    // Simple look-at math (billboarding)
    const forward = lookAtPos.sub(transform.getWorldPosition()).normalize()
    const up = camTransform.up
    const right = up.cross(forward).normalize()
    const orthUp = forward.cross(right).normalize()
    
    // Create quaternion from look vectors
    const rot = quat.lookAt(forward, orthUp)
    transform.setWorldRotation(rot)
  }
}
