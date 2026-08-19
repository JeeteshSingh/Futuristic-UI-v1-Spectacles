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

export type CarouselItemData = {
  title: string
  subtitle?: string
  texture?: Texture
  icon?: Texture
  onTap?: (isSelected?: boolean) => void
}

/**
 * UnifiedPolygonalCarousel
 *
 * A unified circular/arc 3D spatial carousel supporting both:
 * 1. MANUAL MODE: Arranges pre-placed child buttons (any N count) under a scene object.
 * 2. VIRTUALIZED MODE: Dynamically pool-instantiates button prefabs and recycles data items.
 *
 * Fully integrated with SIK direct touch/poke drag, kinetic inertia, magnetic slot snapping,
 * and 6DoF external gesture controllers (Fist Anchor & SwordSwipeScroller).
 */
@component
export class UnifiedPolygonalCarousel extends BaseScriptComponent {

  @ui.label('<span style="color: #60A5FA; font-weight: bold; font-size: 14px;">UnifiedPolygonalCarousel</span><br/><span style="color: #94A3B8; font-size: 11px;">Unified Manual (Scene Children) &amp; Virtualized (Dynamic Pool) Carousel.</span>')

  // ==========================================================================
  // 1. CAROUSEL MODE & CORE SETUP
  // ==========================================================================
  @ui.separator
  @ui.label('<span style="color: #60A5FA; font-weight: bold;">Mode &amp; Core Setup</span>')

  @input
  @hint("Choose between Manual (existing scene child buttons) or Virtualized (runtime prefab card pool).")
  @widget(new ComboBoxWidget([
    new ComboBoxItem("Manual (Pre-placed Scene Buttons)", "Manual"),
    new ComboBoxItem("Virtualized (Dynamic Prefab Data)", "Virtualized")
  ]))
  mode: string = "Manual"

  @input
  @hint("Root SceneObject for the carousel. In Manual mode, its children become the cards. If unset, uses this SceneObject.")
  carouselRoot?: SceneObject

  @input
  @showIf("mode", "Virtualized")
  @hint("Prefab containing PolygonalButton component and optional child Text/Image objects (Virtualized mode only).")
  buttonPrefab?: ObjectPrefab

  @input("float", "1.0")
  @hint("Uniform scale multiplier applied to the carousel buttons.")
  buttonScale: number = 1.0

  @input("int", "20")
  @showIf("mode", "Virtualized")
  @hint("Number of default placeholder items generated if setItems() is not called via script.")
  dataItemCount: number = 20

  // ==========================================================================
  // 2. ARC & CIRCULAR LAYOUT
  // ==========================================================================
  @ui.separator
  @ui.label('<span style="color: #38BDF8; font-weight: bold;">Arc &amp; Circular Layout</span>')

  @input("int", "5")
  @hint("Number of concurrently visible buttons in the carousel arc.")
  slotCount: number = 5

  @input("int", "2")
  @hint("Extra hidden slots used as a buffer for smooth off-screen scaling/recycling.")
  bufferSlots: number = 2

  @input("float", "360.0")
  @hint("The angular span of the visible arc in degrees (e.g. 180°, 270°, 360°).")
  arcAngleDegrees: number = 360.0

  @input("float", "0.0")
  @hint("Offset the starting angle of the arc in degrees (0° = Top, 90° = Right, 180° = Bottom, 270° = Left).")
  arcOffsetDegrees: number = 0.0

  @input("int", "0")
  @hint("Offset the starting slot index (shifts which card starts at the primary angle; accepts -2, -1, 0, 1, 2...).")
  slotOffset: number = 0

  @input("float", "30.0")
  @hint("Radius of the circle/arc in cm.")
  radius: number = 30.0

  @input
  @hint("Which 3D plane to align the circular wheel to.")
  @widget(new ComboBoxWidget([
    new ComboBoxItem("XY Plane (Flat Face-On Circle)", "XY"),
    new ComboBoxItem("XZ Plane (Horizontal Cylinder)", "XZ"),
    new ComboBoxItem("YZ Plane (Vertical Cylinder)", "YZ")
  ]))
  layoutAxis: string = "XY"

  @input("boolean", "false")
  @hint("Rotate buttons to align tangentially along the circle perimeter.")
  alignRotationToCircle: boolean = false

  @input("boolean", "false")
  @hint("If true, buttons face inward toward the center. If false, they face outward.")
  faceInward: boolean = false

  @input("boolean", "false")
  @hint("If true, buttons always rotate to face the camera (billboarding). Overrides tangent rotation.")
  faceCamera: boolean = false

  @input
  @showIf("faceCamera")
  @hint("Required if Face Camera is enabled. Drag your World/Main Camera here.")
  camera?: Camera

  @input("vec3", "{0, 0, 90}")
  @hint("Additional Euler rotation offset applied to all cards for correct mesh orientation.")
  rotationOffset: vec3 = new vec3(0, 0, 90)

  @input("boolean", "true")
  @hint("Smoothly fade out cards at the outer boundaries of the visible arc.")
  fadeAtEdges: boolean = true

  @input("float", "1.0")
  @showIf("fadeAtEdges")
  @widget(new SliderWidget(0.1, 5.0, 0.1))
  @hint("Width of the edge fade transition zone (in card slot units).")
  fadeRange: number = 1.0

  // ==========================================================================
  // 3. TOUCH DRAG, INERTIA & SNAP PHYSICS
  // ==========================================================================
  @ui.separator
  @ui.label('<span style="color: #34D399; font-weight: bold;">Touch Drag &amp; Physics</span>')

  @input("boolean", "true")
  @hint("Enable direct SIK hand touch/ray dragging on card buttons to scroll the carousel.")
  enableDirectDrag: boolean = true

  @input("float", "0.8")
  @showIf("enableDirectDrag")
  @widget(new SliderWidget(0.1, 5.0, 0.1))
  @hint("Minimum drag distance (cm) before a drag is recognized as a scroll vs. a tap.")
  tapDragThreshold: number = 0.8

  @input("boolean", "false")
  @hint("Enable external programmatic drag input (e.g. SwordSwipeScroller).")
  enableExternalDrag: boolean = false

  @input("boolean", "true")
  @hint("Invert the drag direction (feels like pulling a physical ribbon).")
  invertDrag: boolean = true

  @input("float", "0.05")
  @widget(new SliderWidget(0.01, 0.5, 0.01))
  @hint("Drag sensitivity multiplier for hand motion.")
  dragSensitivity: number = 0.05

  @input("float", "4.5")
  @widget(new SliderWidget(0.5, 20.0, 0.5))
  @hint("Inertia damping (higher value brings the wheel to rest faster).")
  inertiaDamping: number = 4.5

  @input("float", "10.0")
  @widget(new SliderWidget(1.0, 30.0, 0.5))
  @hint("Magnetic snap responsiveness when centering on the nearest slot.")
  snapSharpness: number = 10.0

  @input("float", "0.015")
  @hint("Minimum velocity (slots/frame) required to trigger inertia coasting instead of immediate snapping.")
  minVelocityToSnap: number = 0.015

  @input("float", "1.5")
  @hint("Maximum speed cap (slots/frame) the carousel can be flung.")
  maxDragVelocity: number = 1.5

  @input("boolean", "false")
  @hint("Enable exclusive single-selection (radio button) behavior across cards.")
  enableToggleBehavior: boolean = false

  @input("boolean", "false")
  @showIf("enableToggleBehavior")
  @hint("Allow deselecting the active card so no toggles are on.")
  allowAllTogglesOff: boolean = false

  // ==========================================================================
  // 4. ENTRY & EXIT STAGGER ANIMATIONS
  // ==========================================================================
  @ui.separator
  @ui.label('<span style="color: #F472B6; font-weight: bold;">Stagger Animations</span>')

  @input("boolean", "true")
  @hint("Enable animated pop-in / fade-out transitions.")
  enableEntryAnimation: boolean = true

  @input("boolean", "true")
  @showIf("enableEntryAnimation")
  @hint("Automatically play entry animation when the Lens starts.")
  animateOnStart: boolean = true

  @input("float", "0.5")
  @showIf("enableEntryAnimation")
  @hint("Duration of the pop animation for each card (seconds).")
  entryDuration: number = 0.5

  @input("float", "0.05")
  @showIf("enableEntryAnimation")
  @hint("Stagger delay between successive cards (seconds).")
  entryStaggerTime: number = 0.05

  @input
  @showIf("enableEntryAnimation")
  @widget(new ComboBoxWidget([
    new ComboBoxItem("Left to Right", 0),
    new ComboBoxItem("Right to Left", 1),
    new ComboBoxItem("Center Outward", 2)
  ]))
  staggerDirection: number = 0

  // ==========================================================================
  // PUBLIC CALLBACKS & EVENT HOOKS
  // ==========================================================================
  /** Optional callback fired when an item is selected */
  public onItemSelected: ((index: number, item?: CarouselItemData) => void) | null = null

  // ==========================================================================
  // PRIVATE STATE
  // ==========================================================================
  private cards: SceneObject[] = []
  private buttonAPIs: any[] = []
  private items: CarouselItemData[] = []

  private displayedScroll: number = 0
  private targetScroll: number = 0
  private velocity: number = 0
  private dragStartScroll: number = 0
  private dragLastTarget: number = 0

  private selectedDataIndex: number = -1
  private isDragging: boolean = false

  private animationStartTime: number = -1
  private animationExitTime: number = -1

  private get staggerDirectionString(): "LeftToRight" | "RightToLeft" | "CenterOutward" {
    if (this.staggerDirection === 1) return "RightToLeft"
    if (this.staggerDirection === 2) return "CenterOutward"
    return "LeftToRight"
  }

  // ==========================================================================
  // LIFECYCLE
  // ==========================================================================
  onAwake(): void {
    if (this.mode === "Virtualized") {
      this.initDefaultItems()
    }

    this.createEvent("UpdateEvent").bind(() => this.updateMotion())

    this.createEvent("OnStartEvent").bind(() => {
      this.rebuild()
      if (this.enableEntryAnimation && this.animateOnStart) {
        this.playEntryAnimation()
      }
    })
  }

  // ==========================================================================
  // REBUILD & CARD REGISTRATION
  // ==========================================================================
  /**
   * Rebuilds the carousel cards based on current mode.
   */
  public rebuild(): void {
    if (this.mode === "Virtualized") {
      this.rebuildVirtualized()
    } else {
      this.rebuildManual()
    }
    this.updateCardsLayout()
  }

  /**
   * Helper to robustly find the PolygonalButton / BaseButton script on an object or its children.
   */
  private findButtonScript(obj: SceneObject): any {
    if (!obj) return null
    const s = obj.getComponents("Component.ScriptComponent")
    for (let j = 0; j < s.length; j++) {
      const script = s[j] as any
      if (script && (
        typeof script.isOn !== 'undefined' ||
        typeof script.buttonOpacity !== 'undefined' ||
        typeof script.setIsToggleable === 'function' ||
        typeof script.interactable !== 'undefined' ||
        script.isPolygonalButton === true
      )) {
        return script
      }
    }
    for (let k = 0; k < obj.getChildrenCount(); k++) {
      const found = this.findButtonScript(obj.getChild(k))
      if (found) return found
    }
    return null
  }

  /**
   * Manual Mode Rebuild:
   * Scans carouselRoot children and registers existing buttons as cards.
   * Filters by ScriptComponent to skip runtime SIK helper objects ("Collider", "InteractableStateMachine").
   */
  private rebuildManual(): void {
    this.cards = []
    this.buttonAPIs = []

    const root = this.carouselRoot || this.getSceneObject()
    const childCount = root.getChildrenCount()

    for (let i = 0; i < childCount; i++) {
      const child = root.getChild(i)
      if (!child) continue

      let baseButton = child.getComponent("Component.ScriptComponent") as any || (child as any).button
      if (!baseButton) {
        baseButton = this.findButtonScript(child)
      }
      if (!baseButton) continue

      const slotIndex = this.cards.length
      this.cards.push(child)
      ;(child as any)._defaultScale = child.getTransform().getLocalScale()
      this.buttonAPIs.push(baseButton)

      this.bindCardInteractions(child, baseButton, slotIndex)
    }
  }

  /**
   * Virtualized Mode Rebuild:
   * Instantiates a fixed pool of wrapper slots and instantiates buttonPrefab inside each.
   */
  private rebuildVirtualized(): void {
    this.clearCards()

    if (!this.buttonPrefab) return

    const root = this.carouselRoot || this.getSceneObject()
    const totalSlots = Math.max(1, Math.floor(this.slotCount) + Math.max(0, Math.floor(this.bufferSlots)))

    for (let index = 0; index < totalSlots; index++) {
      const wrapper = global.scene.createSceneObject("CarouselCard_" + index)
      wrapper.setParent(root)

      const card = this.buttonPrefab.instantiate(wrapper)
      card.name = "Button"
      this.cards.push(wrapper)

      let buttonScript = card.getComponent("Component.ScriptComponent") as any || (card as any).button
      if (!buttonScript) {
        buttonScript = this.findButtonScript(card)
      }
      this.buttonAPIs.push(buttonScript)

      if (buttonScript) {
        this.bindCardInteractions(wrapper, buttonScript, index)
      }
    }
  }

  private clearCards(): void {
    for (let i = 0; i < this.cards.length; i++) {
      if (this.cards[i]) {
        this.cards[i].destroy()
      }
    }
    this.cards = []
    this.buttonAPIs = []
  }

  // ==========================================================================
  // SIK INTERACTION & TOGGLE BINDING
  // ==========================================================================
  private bindCardInteractions(card: SceneObject, baseButton: any, slotIndex: number): void {
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

      if (interactable.onTriggerEnd) {
        interactable.onTriggerEnd.add(() => {
          if (this.isEntryAnimationPlaying() || this.isWaitingForEntryAnimation()) return

          // If the interaction traveled beyond the tap threshold, it was a scroll — not a click.
          if (didScroll) {
            didScroll = false
            return
          }

          if (this.mode === "Virtualized") {
            const totalSlots = this.cards.length
            const p_i = (slotIndex + this.slotOffset) - this.displayedScroll
            const shift = totalSlots / 2.0
            const p_i_shifted = p_i + shift

            const cycle = Math.floor(p_i_shifted / totalSlots)
            const centerOffset = Math.floor((Math.max(1, this.slotCount) - 1) / 2.0)
            const itemIndex = (slotIndex - cycle * totalSlots) + centerOffset

            if (this.enableToggleBehavior) {
              if (baseButton.setIsToggleable) {
                baseButton.setIsToggleable(true)
              } else {
                baseButton._toggleable = true
              }
            }

            if (this.items.length > 0) {
              const dataIndex = (itemIndex % this.items.length + this.items.length) % this.items.length
              const item = this.items[dataIndex]

              let isSelected = true
              if (this.enableToggleBehavior) {
                if (this.selectedDataIndex === dataIndex) {
                  if (this.allowAllTogglesOff) {
                    this.selectedDataIndex = -1
                  }
                } else {
                  this.selectedDataIndex = dataIndex
                }

                isSelected = (this.selectedDataIndex === dataIndex)
                this.syncAllCardToggleStates()
              }

              if (item && item.onTap) {
                (item.onTap as any)(isSelected)
              }
              if (this.onItemSelected) {
                this.onItemSelected(dataIndex, item)
              }
            }
          } else {
            // Manual Mode: select clicked card slot
            if (this.enableToggleBehavior) {
              if (baseButton.setIsToggleable) {
                baseButton.setIsToggleable(true)
              } else {
                baseButton._toggleable = true
              }

              if (this.selectedDataIndex === slotIndex) {
                if (this.allowAllTogglesOff) {
                  this.selectedDataIndex = -1
                }
              } else {
                this.selectedDataIndex = slotIndex
              }
              this.selectCard(this.selectedDataIndex)
            } else {
              if (this.onItemSelected) {
                this.onItemSelected(slotIndex)
              }
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

  // ==========================================================================
  // MOTION, INERTIA & SNAP LOOP
  // ==========================================================================
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

  // ==========================================================================
  // LAYOUT ENGINE & ARC MATH
  // ==========================================================================
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

      // Virtualized Mode Data Cycling & Cache
      if (this.mode === "Virtualized") {
        const p_i_shifted = p_i + shift
        const cycle = Math.floor(p_i_shifted / totalSlots)
        const centerOffset = Math.floor((Math.max(1, this.slotCount) - 1) / 2.0)
        const itemIndex = (i - cycle * totalSlots) + centerOffset

        let dataIndex = i
        if (this.items.length > 0) {
          dataIndex = (itemIndex % this.items.length + this.items.length) % this.items.length
          if ((card as any)._lastDataIndex !== dataIndex) {
            ;(card as any)._lastDataIndex = dataIndex
            this.applyCardData(card, this.items[dataIndex], dataIndex, i)
          }
        }
      }

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

      // Stagger animation calculation
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
      const smoothScale = MathUtils.lerp(0.5, 1.0, finalScale) * this.buttonScale
      const defaultScale = (card as any)._defaultScale as vec3 || vec3.one()
      card.getTransform().setLocalScale(
        defaultScale.uniformScale(finalScale > 0.01 ? smoothScale : 0.0)
      )

      // Sync opacity to button script (works for both Manual cards and Virtualized wrapper prefabs)
      const api = this.buttonAPIs[i]
      if (api) {
        if (api.buttonOpacity !== undefined && Math.abs(api.buttonOpacity - finalAlpha) > 0.005) {
          api.buttonOpacity = finalAlpha
        } else if (api.opacity !== undefined && Math.abs(api.opacity - finalAlpha) > 0.005) {
          api.opacity = finalAlpha
        }
      } else {
        const cScripts = card.getComponents("Component.ScriptComponent")
        for (let j = 0; j < cScripts.length; j++) {
          const sApi = cScripts[j] as any
          if (sApi && sApi.buttonOpacity !== undefined && Math.abs(sApi.buttonOpacity - finalAlpha) > 0.005) {
            sApi.buttonOpacity = finalAlpha
          } else if (sApi && sApi.opacity !== undefined && Math.abs(sApi.opacity - finalAlpha) > 0.005) {
            sApi.opacity = finalAlpha
          }
        }
      }

      // Calculate 3D position along the circle
      const angle = local_p * angleStep + this.arcOffsetDegrees * Math.PI / 180
      let x = 0, y = 0, z = 0
      if (this.layoutAxis === "XZ") {
        x = Math.sin(angle) * this.radius
        z = Math.cos(angle) * this.radius
      } else if (this.layoutAxis === "YZ") {
        y = Math.sin(angle) * this.radius
        z = Math.cos(angle) * this.radius
      } else {
        x = Math.sin(angle) * this.radius
        y = Math.cos(angle) * this.radius
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
        const targetRot = quat.lookAt(forward, currentUp)
        transform.setWorldRotation(targetRot)
      }
    }
  }

  // ==========================================================================
  // VIRTUALIZED DATA POPULATION & RECYCLING
  // ==========================================================================
  private initDefaultItems(): void {
    this.items = []
    const count = Math.max(1, this.dataItemCount)
    for (let i = 0; i < count; i++) {
      this.items.push({
        title: "Item " + (i + 1),
        subtitle: "Description " + (i + 1)
      })
    }
  }

  public setItems(items: CarouselItemData[]): void {
    this.items = items
    for (let i = 0; i < this.cards.length; i++) {
      if (this.cards[i]) {
        delete (this.cards[i] as any)._lastDataIndex
      }
    }
    this.updateCardsLayout()
  }

  private applyCardData(card: SceneObject, item: CarouselItemData, dataIndex?: number, slotIndex?: number): void {
    if (!item) return

    const textComp = card.getComponent("Component.Text") as any || card.getComponent("Component.Text3D") as any || this.findChildTextComponent(card)
    if (textComp) {
      textComp.text = item.title
    }

    if (item.texture || item.icon) {
      const imageComp = card.getComponent("Component.Image") as Image || this.findChildImageComponent(card)
      if (imageComp) {
        imageComp.mainPass.baseTexture = item.texture || item.icon
      }
    }

    // Sync toggle state once when dataIndex changes for this recycled card
    if (this.enableToggleBehavior && dataIndex !== undefined) {
      let baseButton = (typeof slotIndex === 'number' && this.buttonAPIs[slotIndex]) ? this.buttonAPIs[slotIndex] : null
      if (!baseButton) {
        baseButton = this.findButtonScript(card)
        if (typeof slotIndex === 'number' && baseButton) {
          this.buttonAPIs[slotIndex] = baseButton
        }
      }

      if (baseButton && typeof baseButton.isOn !== 'undefined') {
        if (baseButton.setIsToggleable) {
          baseButton.setIsToggleable(true)
        } else if (!baseButton._toggleable) {
          baseButton._toggleable = true
        }
        const shouldBeOn = (this.selectedDataIndex !== -1 && dataIndex === this.selectedDataIndex)
        if (typeof baseButton.setOn === 'function') {
          baseButton.setOn(shouldBeOn)
        } else {
          baseButton.isOn = shouldBeOn
        }
      }
    }
  }

  private findChildTextComponent(obj: SceneObject): any {
    for (let i = 0; i < obj.getChildrenCount(); i++) {
      const child = obj.getChild(i)
      const text = child.getComponent("Component.Text") || child.getComponent("Component.Text3D")
      if (text) return text
      const deeper = this.findChildTextComponent(child)
      if (deeper) return deeper
    }
    return null
  }

  private findChildImageComponent(obj: SceneObject): Image | null {
    for (let i = 0; i < obj.getChildrenCount(); i++) {
      const child = obj.getChild(i)
      const img = child.getComponent("Component.Image") as Image
      if (img) return img
      const deeper = this.findChildImageComponent(child)
      if (deeper) return deeper
    }
    return null
  }

  // ==========================================================================
  // SELECTION & TOGGLE API
  // ==========================================================================
  /**
   * Manual Mode: Selects a specific child button slot.
   */
  public selectCard(slotIndex: number): void {
    this.selectedDataIndex = slotIndex
    for (let i = 0; i < this.buttonAPIs.length; i++) {
      const btn = this.buttonAPIs[i]
      if (btn && typeof btn.isOn !== "undefined") {
        const shouldBeOn = (i === slotIndex)
        if (typeof btn.setOn === 'function') {
          btn.setOn(shouldBeOn)
        } else if (btn.isOn !== shouldBeOn) {
          btn.isOn = shouldBeOn
        }
      }
    }
    if (this.onItemSelected) {
      this.onItemSelected(slotIndex)
    }
  }

  /**
   * Virtualized Mode: Selects a specific data index in the virtualized dataset.
   */
  public selectItem(dataIndex: number): void {
    this.selectedDataIndex = dataIndex
    this.syncAllCardToggleStates()
    if (this.onItemSelected) {
      this.onItemSelected(dataIndex, this.items[dataIndex])
    }
  }

  public syncAllCardToggleStates(): void {
    for (let i = 0; i < this.cards.length; i++) {
      const card = this.cards[i]
      if (!card) continue
      const btn = this.buttonAPIs[i]
      const dataIdx = (card as any)._lastDataIndex
      if (btn && typeof btn.isOn !== 'undefined' && dataIdx !== undefined) {
        const shouldBeOn = (this.selectedDataIndex !== -1 && dataIdx === this.selectedDataIndex)
        if (typeof btn.setOn === 'function') {
          btn.setOn(shouldBeOn)
        } else if (btn.isOn !== shouldBeOn) {
          btn.isOn = shouldBeOn
        }
      }
    }
  }

  /**
   * Dynamically updates the visible slot count and rebuilds.
   */
  public setSlotCount(newCount: number): void {
    this.slotCount = Math.max(1, Math.floor(newCount))
    this.rebuild()
  }

  /**
   * Dynamically updates custom corner points for all polygonal buttons in the carousel.
   */
  public setCustomCornerPoints(points: vec2[]): void {
    for (let i = 0; i < this.buttonAPIs.length; i++) {
      const api = this.buttonAPIs[i]
      if (api && api.setCustomPoints) {
        api.setCustomPoints(points)
      }
    }
  }

  // ==========================================================================
  // EXTERNAL GESTURE CONTROLLER API (SwordSwipeScroller & Fist Anchor)
  // ==========================================================================
  public externalDragStart(): void {
    if (!this.enableExternalDrag) return
    this.isDragging = true
    this.dragStartScroll = this.targetScroll
    this.dragLastTarget = this.targetScroll
    this.velocity = 0
  }

  public externalDragUpdate(deltaScroll: number): void {
    if (!this.enableExternalDrag || !this.isDragging) return
    const nextTarget = this.dragStartScroll + deltaScroll
    this.velocity = nextTarget - this.dragLastTarget
    this.dragLastTarget = nextTarget
    this.targetScroll = nextTarget
  }

  public externalDragEnd(releaseVelocity?: number): void {
    if (!this.enableExternalDrag) return
    this.isDragging = false
    if (releaseVelocity !== undefined && !isNaN(releaseVelocity)) {
      this.velocity = releaseVelocity
    }
  }

  public externalScrollBy(delta: number): void {
    if (!this.enableExternalDrag) return
    this.targetScroll += delta
  }

  // ==========================================================================
  // ANIMATION CONTROL API
  // ==========================================================================
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

  public isEntryAnimationPlaying(): boolean {
    if (!this.enableEntryAnimation) return false
    const baseTime = this.animationExitTime !== -1 ? this.animationExitTime : this.animationStartTime
    if (baseTime === -1) return false
    const totalSlots = Math.max(1, this.cards.length)
    const maxStagger = totalSlots * this.entryStaggerTime
    return (getTime() - baseTime) < (this.entryDuration + maxStagger)
  }

  public isWaitingForEntryAnimation(): boolean {
    return this.enableEntryAnimation && this.animationStartTime === -1 && this.animationExitTime === -1
  }
}
