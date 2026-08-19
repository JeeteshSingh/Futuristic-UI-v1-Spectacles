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
import { BaseButton } from "SpectaclesUIKit.lspkg/Scripts/Components/Button/BaseButton"

/**
 * ManualPolygonalCarousel
 *
 * Arranges existing child SceneObjects (PolygonalButtons placed by hand in the scene)
 * in a circular/arc layout. Supports poke/pinch-drag scrolling with kinetic momentum
 * and magnetic snap-to-slot dynamics.
 *
 * Architecture note: logic ported from VirtualizedPolygonalCarousel.
 * Key fix: rebuild() filters by ScriptComponent to skip SIK helper children
 * ("Collider", "InteractableStateMachine") that Element.ts creates on every button.
 * Those children must never have their transforms touched by the carousel layout.
 */
@component
export class ManualPolygonalCarousel extends BaseScriptComponent {

  @ui.label('<span style="color: #60A5FA; font-weight: bold; font-size: 13px;">ManualPolygonalCarousel</span><br/><span style="color: #94A3B8; font-size: 11px;">Arranges pre-placed child buttons in a circular arc layout.</span>')

  // --- CORE SETUP ----------------------------------------------
  @ui.separator
  @ui.label('<span style="color: #60A5FA; font-weight: bold;">Core Setup</span>')

  @input
  @hint("Root SceneObject whose children are the carousel cards. If unset, uses this SceneObject.")
  carouselRoot?: SceneObject

  // --- LAYOUT --------------------------------------------------
  @ui.separator
  @ui.label('<span style="color: #38BDF8; font-weight: bold;">Layout &amp; Customization</span>')

  @input
  @hint("Number of visible buttons in the carousel arc.")
  slotCount: number = 5

  @input
  @hint("Extra hidden slots used as a buffer for smooth off-screen scrolling.")
  bufferSlots: number = 2

  @input
  @hint("The angle span of the visible arc in degrees (e.g. 180, 270, 360).")
  arcAngleDegrees: number = 360

  @input
  @hint("Offset the starting angle of the arc in degrees.")
  arcOffsetDegrees: number = 0

  @input
  @hint("Offset the starting slot index (e.g. shift where Button 1 starts around the circle).")
  slotOffset: number = 0

  @input("float", "30.0")
  @hint("Radius of the circle in cm.")
  radius: number = 30.0

  @input("boolean", "false")
  @hint("Rotate buttons to align tangentially to the circle.")
  alignRotationToCircle: boolean = false

  @input
  @hint("Which plane to align the circle to.")
  @widget(new ComboBoxWidget([
    new ComboBoxItem("XY Plane (Flat Circle)", "XY"),
    new ComboBoxItem("XZ Plane (Horizontal Cylinder)", "XZ"),
    new ComboBoxItem("YZ Plane (Vertical Cylinder)", "YZ")
  ]))
  layoutAxis: string = "XY"

  @input
  @hint("If true, buttons face the center. If false, they face outward.")
  faceInward: boolean = false

  @input
  @hint("If true, buttons always rotate to face the camera. Overrides other rotation settings.")
  faceCamera: boolean = false

  @input
  @hint("Required if Face Camera is checked. Drag your main camera here.")
  camera?: Camera

  @input("vec3", "{0, 0, 90}")
  @hint("Additional rotation offset applied to all cards.")
  rotationOffset: vec3 = new vec3(0, 0, 90)

  @input("boolean", "true")
  @hint("Smoothly fade out cards at the edges of the arc.")
  fadeAtEdges: boolean = true

  @input("float", "1.0")
  @showIf("fadeAtEdges")
  @widget(new SliderWidget(0.1, 5.0, 0.1))
  @hint("How many slot widths the fade transition takes.")
  fadeRange: number = 1.0

  // --- FEATURES & INTERACTION -----------------------------------
  @ui.separator
  @ui.label('<span style="color: #34D399; font-weight: bold;">Features &amp; Interaction</span>')

  @input("boolean", "true")
  @hint("Enable direct SIK hand touch/ray dragging on card buttons to scroll the carousel.")
  enableDirectDrag: boolean = true

  @input("float", "0.8")
  @showIf("enableDirectDrag")
  @widget(new SliderWidget(0.1, 5.0, 0.1))
  @hint("Minimum total drag distance (cm) before a drag is recognized as a scroll. Below this it is treated as a tap/click.")
  tapDragThreshold: number = 0.8

  @input("boolean", "false")
  @hint("Enable external programmatic drag (e.g. SwordSwipeScroller).")
  enableExternalDrag: boolean = false

  @input("boolean", "true")
  @hint("Invert the drag direction (feels like pulling a ribbon).")
  invertDrag: boolean = true

  @input("float", "0.05")
  @widget(new SliderWidget(0.01, 0.5, 0.01))
  @hint("Drag sensitivity for scrolling the carousel.")
  dragSensitivity: number = 0.05

  @input("float", "4.5")
  @widget(new SliderWidget(0.5, 20.0, 0.5))
  @hint("Inertia damping � higher value stops the carousel faster.")
  inertiaDamping: number = 4.5

  @input("float", "10.0")
  @widget(new SliderWidget(1.0, 30.0, 0.5))
  @hint("Snap sharpness when snapping to the nearest slot.")
  snapSharpness: number = 10.0

  @input("float", "0.015")
  @hint("Minimum speed (slots/frame) required to trigger inertia instead of snap.")
  minVelocityToSnap: number = 0.015

  @input("float", "1.5")
  @hint("Maximum speed (slots/frame) the carousel can be flung to.")
  maxDragVelocity: number = 1.5

  @input
  @hint("If true, the carousel acts as a radio-button group.")
  enableToggleBehavior: boolean = false

  @input
  @showIf("enableToggleBehavior")
  @hint("If true, all toggles can be off simultaneously.")
  allowAllTogglesOff: boolean = false

  @input
  @hint("If true, all children buttons will be independent toggles (inexclusive multi-select).")
  makeButtonsToggleable: boolean = false

  // Public callback
  public onItemSelected: ((index: number, item?: SceneObject | any) => void) | null = null

  // --- ENTRY ANIMATIONS ----------------------------------------
  @ui.separator
  @ui.label('<span style="color: #F472B6; font-weight: bold;">Entry Animations</span>')

  @input
  enableEntryAnimation: boolean = true

  @input
  @showIf("enableEntryAnimation")
  animateOnStart: boolean = true

  @input
  @showIf("enableEntryAnimation")
  entryDuration: number = 0.5

  @input
  @showIf("enableEntryAnimation")
  entryStaggerTime: number = 0.05

  @input
  @showIf("enableEntryAnimation")
  @widget(new ComboBoxWidget([
    new ComboBoxItem("Left to Right", 0),
    new ComboBoxItem("Right to Left", 1),
    new ComboBoxItem("Center Outward", 2)
  ]))
  staggerDirection: number = 0

  // --- PRIVATE STATE --------------------------------------------
  private get staggerDirectionString(): "LeftToRight" | "RightToLeft" | "CenterOutward" {
    if (this.staggerDirection === 1) return "RightToLeft"
    if (this.staggerDirection === 2) return "CenterOutward"
    return "LeftToRight"
  }

  private animationStartTime: number = -1
  private animationExitTime: number = -1
  private selectedDataIndex: number = -1

  private cards: SceneObject[] = []
  private buttonAPIs: any[] = []

  private displayedScroll: number = 0
  private targetScroll: number = 0
  private velocity: number = 0
  private dragStartScroll: number = 0
  private dragLastTarget: number = 0

  private velocityHistory: number[] = []
  private readonly maxVelocityHistory: number = 5
  private isDragging: boolean = false

  // --- LIFECYCLE ------------------------------------------------
  onAwake(): void {
    this.createEvent("UpdateEvent").bind(() => this.updateMotion())
    this.createEvent("OnStartEvent").bind(() => {
      this.rebuild()
      if (this.enableEntryAnimation && this.animateOnStart) {
        this.playEntryAnimation()
      }
    })
  }

  // --- PUBLIC ANIMATION API -------------------------------------
  public playEntryAnimation(): void {
    if (!this.enableEntryAnimation) return
    this.animationStartTime = getTime()
    this.animationExitTime = -1
  }

  public playExitAnimation(): void {
    if (!this.enableEntryAnimation) return
    this.animationExitTime = getTime()
    this.animationStartTime = -1
  }

  // --- REBUILD -------------------------------------------------
  /**
   * Scans carouselRoot children and registers them as carousel cards.
   * Only children WITH a ScriptComponent are treated as cards.
   * SIK's Element.ts creates "Collider" and "InteractableStateMachine" as child
   * SceneObjects on every button � they have NO ScriptComponent. If those were
   * included, the layout loop would move/scale their BoxShape colliders, breaking
   * all SIK interaction on every button.
   */
  public rebuild(): void {
    this.cards = []
    this.buttonAPIs = []

    const parent = this.carouselRoot || this.getSceneObject()
    const childCount = parent.getChildrenCount()

    for (let i = 0; i < childCount; i++) {
      const card = parent.getChild(i)

      // Filter: skip SIK-managed helper SceneObjects (no ScriptComponent).
      const script = card.getComponent("Component.ScriptComponent") as any
      if (!script) continue

      // Capture authored scale so the layout can scale relative to it.
      ;(card as any)._defaultScale = card.getTransform().getLocalScale()

      this.cards.push(card)
      this.buttonAPIs.push(script)

      this.bindCardInteractions(card, this.cards.length - 1)
    }

    this.updateCardsLayout()
    print("[ManualPolygonalCarousel] Registered " + this.cards.length + " cards from " + childCount + " children.")
  }

  // --- INTERACTION WIRING ---------------------------------------
  /**
   * Wires drag and tap events to a card's SIK Interactable.
   * Pattern ported 1:1 from VirtualizedPolygonalCarousel.
   *
   * - Defers to onInitialized if button not yet ready, or fires immediately.
   * - enableInstantDrag=true prevents SIK hit-loss on moving cards.
   * - tapDragThreshold discriminates scroll gestures from button taps.
   */
  private bindCardInteractions(card: SceneObject, slotIndex: number): void {
    let baseButton: any = null
    const scripts = card.getComponents("Component.ScriptComponent")
    for (let i = 0; i < scripts.length; i++) {
      const s = scripts[i] as any
      if (s.interactable !== undefined || s.onInitialized) {
        baseButton = s
        break
      }
    }
    if (!baseButton) return

    // Per-card state in closure � not shared across cards.
    let accumulatedDragDist = 0
    let didScroll = false

    const setupInteractable = () => {
      const interactable = baseButton.interactable
      if (!interactable || (card as any).__carouselDragAttached) return
      ;(card as any).__carouselDragAttached = true

      if (this.enableDirectDrag) {
        interactable.onDragStart.add(() => {
          this.isDragging = true
          this.dragStartScroll = this.targetScroll
          this.dragLastTarget = this.targetScroll
          this.velocity = 0
          accumulatedDragDist = 0
          didScroll = false
        })

        interactable.onDragUpdate.add((args: any) => {
          const dragVector = args && (
            args.planecastDragVector ||
            args.dragVector ||
            (args.interactor
              ? args.interactor.planecastDragVector || args.interactor.currentDragVector
              : null)
          )
          if (!dragVector) return

          accumulatedDragDist += Math.sqrt(
            dragVector.x * dragVector.x +
            dragVector.y * dragVector.y +
            dragVector.z * dragVector.z
          )
          if (accumulatedDragDist < this.tapDragThreshold) return
          didScroll = true

          let dragDelta = 0
          if (this.layoutAxis === "XZ") {
            dragDelta = (dragVector.x + dragVector.z) * this.dragSensitivity
          } else if (this.layoutAxis === "YZ") {
            dragDelta = (dragVector.y + dragVector.z) * this.dragSensitivity
          } else {
            dragDelta = (dragVector.x + dragVector.y) * this.dragSensitivity
          }

          if (this.invertDrag) dragDelta *= -1
          const nextTarget = this.dragStartScroll - dragDelta
          this.velocity = nextTarget - this.dragLastTarget
          this.dragLastTarget = nextTarget
          this.targetScroll = nextTarget
        })

        interactable.onDragEnd.add(() => {
          this.isDragging = false
          accumulatedDragDist = 0
        })
      }

      const shouldBeToggleable = this.enableToggleBehavior || this.makeButtonsToggleable
      if (baseButton.setIsToggleable) {
        baseButton.setIsToggleable(shouldBeToggleable)
      } else {
        baseButton._toggleable = shouldBeToggleable
        baseButton.isToggle = shouldBeToggleable
      }
      baseButton.isOn = false
      ;(baseButton as any)._isOn = false
      if (typeof baseButton.setState === 'function') {
        baseButton.setState("default")
      }

      if (interactable.onTriggerStart) {
        interactable.onTriggerStart.add((e: any) => {
          didScroll = false
        })
      }

      if (interactable.onTriggerEnd) {
        interactable.onTriggerEnd.add((e: any) => {
          if (this.isEntryAnimationPlaying() || this.isWaitingForEntryAnimation()) return

          if (didScroll || (accumulatedDragDist >= this.tapDragThreshold)) {
            didScroll = false
            if (this.enableToggleBehavior) {
              this.selectCard(this.selectedDataIndex)
            }
            return
          }

          if (this.enableToggleBehavior) {
            if (this.selectedDataIndex === slotIndex) {
              if (this.allowAllTogglesOff) {
                this.selectCard(-1)
              } else {
                this.selectCard(slotIndex)
              }
            } else {
              this.selectCard(slotIndex)
            }
          } else if (this.makeButtonsToggleable) {
            const currentOn = Boolean(baseButton.isOn)
            if (typeof baseButton.setState === 'function') {
              baseButton.setState(currentOn ? "toggledDefault" : "default")
            }
            if (this.onItemSelected) {
              this.onItemSelected(slotIndex, this.cards[slotIndex])
            }
          } else {
            if (this.onItemSelected) {
              this.onItemSelected(slotIndex, this.cards[slotIndex])
            }
          }
        })
      }
    }

    if (baseButton.isInitialized) {
      setupInteractable()
    } else if (baseButton.onInitialized && baseButton.onInitialized.add) {
      baseButton.onInitialized.add(setupInteractable)
    }
  }

  /**
   * Programmatically selects a single card slot as the active radio button toggle.
   */
  public selectCard(slotIndex: number): void {
    this.selectedDataIndex = slotIndex
    for (let i = 0; i < this.buttonAPIs.length; i++) {
      const btn = this.buttonAPIs[i]
      if (btn) {
        const shouldBeOn = (i === slotIndex)
        if (typeof btn.setOn === 'function') {
          try {
            (btn as any).setOn(shouldBeOn, false)
          } catch (e) {}
        }
        btn.isOn = shouldBeOn
        ;(btn as any)._isOn = shouldBeOn
        if (typeof btn.setState === 'function') {
          btn.setState(shouldBeOn ? "toggledDefault" : "default")
        }
      }
    }
    if (this.onItemSelected) {
      this.onItemSelected(slotIndex, slotIndex >= 0 ? this.cards[slotIndex] : null)
    }
  }

  // --- MOTION LOOP ---------------------------------------------
  private updateMotion(): void {
    if (this.cards.length === 0) return

    const dt = Math.max(0.001, getDeltaTime())

    if (this.isEntryAnimationPlaying() || this.isWaitingForEntryAnimation()) {
      this.updateCardsLayout()
      return
    }

    if (!this.isDragging) {
      if (Math.abs(this.velocity) > this.minVelocityToSnap) {
        this.velocity = Math.max(Math.min(this.velocity, this.maxDragVelocity), -this.maxDragVelocity)
        this.targetScroll += this.velocity
        this.velocity *= Math.exp(-this.inertiaDamping * dt)
      } else {
        this.velocity = 0
        const snapTarget = Math.round(this.targetScroll)
        const snapAlpha = 1 - Math.exp(-this.snapSharpness * dt)
        this.targetScroll = MathUtils.lerp(this.targetScroll, snapTarget, snapAlpha)
        if (Math.abs(this.targetScroll - snapTarget) < 0.001) this.targetScroll = snapTarget
      }
    }

    const followAlpha = 1 - Math.exp(-18 * dt)
    this.displayedScroll = MathUtils.lerp(this.displayedScroll, this.targetScroll, followAlpha)
    this.updateCardsLayout()
  }

  // --- LAYOUT --------------------------------------------------
  private updateCardsLayout(): void {
    const totalSlots = this.cards.length
    if (totalSlots === 0) return

    const visibleSlots = Math.max(1, Math.floor(this.slotCount))
    const angleStep =
      (this.arcAngleDegrees * Math.PI / 180) /
      (this.arcAngleDegrees >= 359.9 ? visibleSlots : Math.max(1, visibleSlots - 1))

    const edge = (visibleSlots - 1) / 2.0
    const scaleDist = Math.max(0.01, this.bufferSlots / 2.0)

    const isExiting = this.animationExitTime !== -1
    const isEntering = this.animationStartTime !== -1

    for (let i = 0; i < totalSlots; i++) {
      const card = this.cards[i]
      if (!card) continue

      const p_i = (i + this.slotOffset) - this.displayedScroll
      const shift = totalSlots / 2.0
      let local_p = (p_i % totalSlots + totalSlots) % totalSlots
      if (local_p > shift) local_p -= totalSlots
      const centered_p = local_p

      const distanceFromCenter = Math.abs(centered_p)
      let scaleMult = 1.0
      if (distanceFromCenter > edge + scaleDist) {
        scaleMult = 0.0
      } else if (distanceFromCenter > edge) {
        scaleMult = 1.0 - (distanceFromCenter - edge) / scaleDist
      }

      let entryAlphaMult = 1.0
      let entryScaleMult = 1.0

      if (this.isWaitingForEntryAnimation() && !isExiting) {
        entryAlphaMult = 0.0
        entryScaleMult = 0.0
      } else if (this.enableEntryAnimation && (isEntering || isExiting)) {
        const baseTime = isExiting ? this.animationExitTime : this.animationStartTime
        const timeSinceStart = getTime() - baseTime

        let staggerIndex = 0
        if (this.staggerDirectionString === "LeftToRight") {
          staggerIndex = centered_p + edge
        } else if (this.staggerDirectionString === "RightToLeft") {
          staggerIndex = edge - centered_p
        } else {
          staggerIndex = Math.abs(centered_p)
        }
        staggerIndex = Math.max(0, staggerIndex)

        const cardTime = timeSinceStart - staggerIndex * this.entryStaggerTime

        if (isExiting) {
          if (cardTime <= 0) {
            entryAlphaMult = 1.0; entryScaleMult = 1.0
          } else if (cardTime < this.entryDuration) {
            const t = 1.0 - cardTime / this.entryDuration
            entryAlphaMult = t; entryScaleMult = t * t
          } else {
            entryAlphaMult = 0.0; entryScaleMult = 0.0
          }
        } else {
          if (cardTime <= 0) {
            entryAlphaMult = 0.0; entryScaleMult = 0.0
          } else if (cardTime < this.entryDuration) {
            const t = cardTime / this.entryDuration
            entryAlphaMult = t
            const popScale = 1.0 + 0.3 * Math.sin(t * Math.PI) * (1.0 - t)
            entryScaleMult = t < 0.2 ? (t / 0.2) * popScale : popScale
          } else {
            entryAlphaMult = 1.0; entryScaleMult = 1.0
          }
        }
      }

      const finalAlpha = (this.fadeAtEdges
        ? 1.0 - Math.max(0, (distanceFromCenter - edge) / Math.max(0.01, this.fadeRange))
        : 1.0) * entryAlphaMult

      const finalScale = scaleMult * entryScaleMult
      const smoothScale = MathUtils.lerp(0.5, 1.0, finalScale)
      const defaultScale = (card as any)._defaultScale as vec3 || vec3.one()
      card.getTransform().setLocalScale(
        defaultScale.uniformScale(finalScale > 0.01 ? smoothScale : 0.0)
      )

      const cScripts = card.getComponents("Component.ScriptComponent")
      for (let j = 0; j < cScripts.length; j++) {
        const api = cScripts[j] as any
        if (api.buttonOpacity !== undefined && Math.abs(api.buttonOpacity - finalAlpha) > 0.005) {
          api.buttonOpacity = finalAlpha
        } else if (api.opacity !== undefined && Math.abs(api.opacity - finalAlpha) > 0.005) {
          api.opacity = finalAlpha
        }
      }

      const angle = local_p * angleStep + this.arcOffsetDegrees * Math.PI / 180
      let x = 0, y = 0, z = 0
      if (this.layoutAxis === "XZ") {
        x = Math.sin(angle) * this.radius; z = Math.cos(angle) * this.radius
      } else if (this.layoutAxis === "YZ") {
        y = Math.sin(angle) * this.radius; z = Math.cos(angle) * this.radius
      } else {
        x = Math.sin(angle) * this.radius; y = Math.cos(angle) * this.radius
      }

      const transform = card.getTransform()
      transform.setLocalPosition(new vec3(x, y, z))

      const customOffset = quat.fromEulerAngles(
        this.rotationOffset.x * Math.PI / 180,
        this.rotationOffset.y * Math.PI / 180,
        this.rotationOffset.z * Math.PI / 180
      )

      if (this.alignRotationToCircle) {
        const flipOffset = this.faceInward ? 0 : Math.PI
        let baseRot = quat.quatIdentity()
        if (this.layoutAxis === "XZ") {
          baseRot = quat.fromEulerAngles(0, Math.atan2(x, z) + flipOffset, 0)
        } else if (this.layoutAxis === "YZ") {
          baseRot = quat.fromEulerAngles(-(Math.atan2(y, z) + flipOffset), 0, 0)
        } else {
          baseRot = quat.fromEulerAngles(0, 0, Math.atan2(y, x) - Math.PI / 2 + flipOffset)
        }
        transform.setLocalRotation(baseRot.multiply(customOffset))
      } else {
        transform.setLocalRotation(customOffset)
      }

      if (this.faceCamera && this.camera) {
        const camTrans = this.camera.getSceneObject().getTransform()
        const cardWorldPos = transform.getWorldPosition()
        const camWorldPos = camTrans.getWorldPosition()
        let forward = camWorldPos.sub(cardWorldPos).normalize()
        if (!this.faceInward) forward = forward.uniformScale(-1)
        const currentUp = transform.getWorldRotation().multiplyVec3(vec3.up())
        transform.setWorldRotation(quat.lookAt(forward, currentUp))
      }
    }
  }

  // --- ANIMATION HELPERS ----------------------------------------
  private isEntryAnimationPlaying(): boolean {
    if (!this.enableEntryAnimation || this.animationStartTime < 0) return false
    const totalTime = this.cards.length * this.entryStaggerTime + this.entryDuration
    return getTime() - this.animationStartTime < totalTime
  }

  private isWaitingForEntryAnimation(): boolean {
    return this.enableEntryAnimation && this.animationStartTime === -1
  }

  // --- PUBLIC API -----------------------------------------------
  public setSlotCount(newCount: number): void {
    this.slotCount = Math.max(1, Math.floor(newCount))
    this.rebuild()
  }

  public externalDragStart(): void {
    if (!this.enableExternalDrag) return
    this.isDragging = true
    this.dragStartScroll = this.targetScroll
    this.dragLastTarget = this.targetScroll
    this.velocity = 0
    this.velocityHistory = []
  }

  public externalDragUpdate(dragDelta: number): void {
    if (!this.enableExternalDrag) return
    if (this.invertDrag) dragDelta *= -1
    const nextTarget = this.dragStartScroll - dragDelta * this.dragSensitivity
    this.updateVelocityTracker(nextTarget - this.dragLastTarget)
    this.dragLastTarget = nextTarget
    this.targetScroll = nextTarget
  }

  public externalScrollBy(scrollDelta: number): void {
    if (!this.enableExternalDrag) return
    const nextTarget = this.targetScroll + scrollDelta
    this.updateVelocityTracker(nextTarget - this.dragLastTarget)
    this.dragLastTarget = nextTarget
    this.targetScroll = nextTarget
  }

  public externalDragEnd(): void {
    if (!this.enableExternalDrag) return
    this.isDragging = false
  }

  private updateVelocityTracker(instantVelocity: number): void {
    this.velocityHistory.push(instantVelocity)
    if (this.velocityHistory.length > this.maxVelocityHistory) this.velocityHistory.shift()
    let sum = 0
    for (let i = 0; i < this.velocityHistory.length; i++) sum += this.velocityHistory[i]
    this.velocity = sum / this.velocityHistory.length
    this.velocity = Math.max(Math.min(this.velocity, this.maxDragVelocity), -this.maxDragVelocity)
  }
}
