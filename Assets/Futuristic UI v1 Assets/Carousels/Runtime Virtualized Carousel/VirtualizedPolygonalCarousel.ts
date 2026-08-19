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
  isOn?: boolean
  onTap?: (isSelected?: boolean) => void
}

/**
 * PolygonalCircularCarousel Component
 * 
 * Arranges instantiated PolygonalButton prefabs in a circular layout on the XY plane facing Z.
 * Supports poke/pinch drag interaction, kinetic momentum, snap-to-slot dynamics, dynamic slot counting,
 * and updates child Text components automatically.
 */
@component
export class VirtualizedPolygonalCarousel extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA; font-weight: bold; font-size: 13px;">VirtualizedPolygonalCarousel (SIK)</span><br/><span style="color: #94A3B8; font-size: 11px;">A highly optimized, dynamically populated UI carousel.</span>')
  
  @ui.separator
  @ui.label('<span style="color: #60A5FA; font-weight: bold;">Core Setup & Data</span>')

  @input
  @hint("Prefab containing PolygonalButton component and Text child object")
  buttonPrefab!: ObjectPrefab

  @input
  @hint("Uniform scale multiplier applied to the instantiated buttons")
  buttonScale: number = 1.0

  @input
  @hint("Root SceneObject for the carousel. If null, uses this SceneObject.")
  carouselRoot?: SceneObject

  @input("int", "20")
  dataItemCount: number = 20

  @ui.separator
  @ui.label('<span style="color: #38BDF8; font-weight: bold;">Layout & Customization</span>')

  @input
  @hint("Number of visible buttons in the carousel arc")
  slotCount: number = 5

  @input
  @hint("Extra hidden slots used as a buffer for smooth off-screen scrolling")
  bufferSlots: number = 2

  @input
  @hint("The angle span of the visible arc in degrees (e.g. 180, 270, 360)")
  arcAngleDegrees: number = 360

  @input
  @hint("Offset the starting angle of the arc in degrees")
  arcOffsetDegrees: number = 0

  @input
  @hint("Offset the starting slot index (e.g. shift where Item 1 starts around the circle)")
  slotOffset: number = 0

  @input("float", "30.0")
  @hint("Radius of the circle in cm")
  radius: number = 30.0

  @input("boolean", "true")
  @hint("Rotate buttons to face outward from the circle center")
  alignRotationToCircle: boolean = false

  @input
  @hint("Which plane to align the circle to")
  @widget(new ComboBoxWidget([
    new ComboBoxItem("XY Plane (Flat Circle)", "XY"), 
    new ComboBoxItem("XZ Plane (Horizontal Cylinder)", "XZ"), 
    new ComboBoxItem("YZ Plane (Vertical Cylinder)", "YZ")
  ]))
  layoutAxis: string = "XY"

  @input
  @hint("If true, buttons face the center. If false, they face outward (for XZ/YZ) or flip (XY).")
  faceInward: boolean = false

  @input
  @hint("If true, buttons will always rotate to face the camera (billboarding). Overrides other rotation settings.")
  faceCamera: boolean = false

  @input
  @hint("Required if Face Camera is checked. Drag your main camera here.")
  camera?: Camera

  @input("vec3", "{0, 0, 90}")
  @hint("Apply an additional rotation offset to all cards. Useful for orienting the Button mesh correctly.")
  rotationOffset: vec3 = new vec3(0, 0, 90)

  @input("boolean", "false")
  @hint("Smoothly fade out cards at the edges of the arc instead of abruptly popping")
  fadeAtEdges: boolean = true

  @input("float", "1.0")
  @showIf("fadeAtEdges")
  @widget(new SliderWidget(0.1, 5.0, 0.1))
  @hint("How many slot widths the fade transition should take. 1.0 means it fades out over the space of one card.")
  fadeRange: number = 1.0

  @ui.separator
  @ui.label('<span style="color: #34D399; font-weight: bold;">Features & External Interaction</span>')

  @input("boolean", "true")
  @hint("If true, enables direct SIK hand touch/ray dragging on card buttons.")
  enableDirectDrag: boolean = true

  @input("float", "0.8")
  @showIf("enableDirectDrag")
  @widget(new SliderWidget(0.1, 5.0, 0.1))
  @hint("Total drag distance (cm) that must be exceeded before a drag is recognized as a scroll. Below this threshold, the interaction is treated as a tap/click.")
  tapDragThreshold: number = 0.8

  @input("boolean", "false")
  @hint("If true, enables external drag gestures (like SwordSwipeScroller).")
  enableExternalDrag: boolean = false

  @input("boolean", "true")
  @hint("Invert the drag direction (feels like pulling a ribbon)")
  invertDrag: boolean = true

  @input("float", "0.05")
  @widget(new SliderWidget(0.01, 0.5, 0.01))
  @hint("Drag sensitivity for rotating the carousel")
  dragSensitivity: number = 0.05

  @input("float", "4.5")
  @widget(new SliderWidget(0.5, 20.0, 0.5))
  @hint("Inertia damping (higher = stops faster)")
  inertiaDamping: number = 4.5

  @input("float", "10.0")
  @widget(new SliderWidget(1.0, 30.0, 0.5))
  @hint("Snap sharpness to nearest slot")
  snapSharpness: number = 10.0

  @input("float", "0.015")
  @hint("Minimum speed required to trigger a snap")
  minVelocityToSnap: number = 0.015

  @input("float", "1.5")
  @hint("Maximum speed (slots per frame) the carousel can be flung")
  maxDragVelocity: number = 1.5

  @input
  @hint("If true, the carousel acts as a ToggleGroup (radio buttons). Make sure your Button Prefab has 'Is Toggle' checked!")
  enableToggleBehavior: boolean = false

  @input
  @showIf("enableToggleBehavior")
  @hint("Is it allowed that no toggle is switched on?")
  allowAllTogglesOff: boolean = false

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
  
  private get staggerDirectionString(): "LeftToRight" | "RightToLeft" | "CenterOutward" {
      if (this.staggerDirection === 1) return "RightToLeft"
      if (this.staggerDirection === 2) return "CenterOutward"
      return "LeftToRight"
  }

  private animationStartTime: number = -1
  private animationExitTime: number = -1

  private cards: SceneObject[] = []
  private buttonAPIs: any[] = []
  private items: CarouselItemData[] = []
  
  private displayedScroll: number = 0
  private targetScroll: number = 0
  
  private selectedDataIndex: number = -1
  private velocity: number = 0
  private dragStartScroll: number = 0
  private dragLastTarget: number = 0
  
  // Velocity tracking for smoother drag release
  private velocityHistory: number[] = []
  private readonly maxVelocityHistory: number = 5

  private isDragging: boolean = false


  onAwake(): void {
    // Generate default item labels if none provided
    this.initDefaultItems()

    // Register update event for kinetic motion, drag inertia, and snapping
    this.createEvent("UpdateEvent").bind(() => this.updateMotion())

    // Rebuild carousel on start
    this.createEvent("OnStartEvent").bind(() => {
        this.rebuild()
        if (this.enableEntryAnimation && this.animateOnStart) {
            this.playEntryAnimation()
        }
    })
  }

  /**
   * Triggers the pop-in entry animation for the carousel.
   * Useful when called from external scripts via gestures.
   */
  public playEntryAnimation(): void {
      if (!this.enableEntryAnimation) return;
      this.animationStartTime = getTime();
      this.animationExitTime = -1;
  }

  /**
   * Triggers the pop-out exit animation.
   */
  public playExitAnimation(): void {
      if (!this.enableEntryAnimation) return;
      this.animationExitTime = getTime();
      this.animationStartTime = -1;
  }

  /**
   * Initializes fallback labels for the buttons if custom items aren't set yet.
   */
  private initDefaultItems(): void {
    if (this.items.length > 0) return
    const count = Math.max(1, Math.floor(this.dataItemCount))
    for (let i = 0; i < count; i++) {
      this.items.push({
        title: "Item " + (i + 1),
        subtitle: "Sub " + (i + 1)
      })
    }
  }


  /**
   * Rebuilds the circular carousel cards hierarchy.
   */
  public rebuild(): void {
    if (!this.buttonPrefab) {
      print("[PolygonalCircularCarousel] Error: buttonPrefab is not assigned in Inspector.")
      return
    }

    // Clean up existing cards
    this.clearCards()

    const parent = this.carouselRoot || this.getSceneObject()
    const visibleSlots = Math.max(1, Math.floor(this.slotCount))
    const totalSlots = visibleSlots + Math.max(0, Math.floor(this.bufferSlots))
    
    for (let index = 0; index < totalSlots; index++) {
      const wrapper = global.scene.createSceneObject("CarouselCard_" + index)
      wrapper.setParent(parent)

      const card = this.buttonPrefab.instantiate(wrapper)
      card.name = "Button"

      const initScale = new vec3(this.buttonScale, this.buttonScale, this.buttonScale)
      wrapper.getTransform().setLocalScale(initScale)
      ;(wrapper as any)._defaultScale = initScale
      this.cards.push(wrapper)
      
      const buttonScript = card.getComponent("Component.ScriptComponent") || (card as any).button
      this.buttonAPIs.push(buttonScript as any)

      // Bind drag and click handlers
      this.bindCardInteractions(card, index)
    }

    this.updateCardsLayout()
    print("[VirtualizedCarousel] Created " + totalSlots + " physical cards for " + this.items.length + " items.")
  }

  /**
   * Destroys existing card instances.
   */
  private clearCards(): void {
    for (let i = 0; i < this.cards.length; i++) {
      if (this.cards[i]) {
        this.cards[i].destroy()
      }
    }
    this.cards = []
    this.buttonAPIs = []
  }

  /**
   * Attaches drag & poke handlers to the button's Interactable component.
   */
  private bindCardInteractions(card: SceneObject, slotIndex: number): void {
    // Find the button script component (it inherits from BaseButton)
    let baseButton: any = null;
    const scripts = card.getComponents("Component.ScriptComponent");
    for (let i = 0; i < scripts.length; i++) {
        if ((scripts[i] as any).interactable !== undefined || (scripts[i] as any).onInitialized) {
            baseButton = scripts[i];
            break;
        }
    }

    if (!baseButton) {
        print("[PolygonalCircularCarousel] Could not find Button script on card.");
        return;
    }

    const setupInteractable = () => {
      const interactable = baseButton.interactable;
      if (!interactable || (card as any).__carouselDragAttached) return
      (card as any).__carouselDragAttached = true

      // Per-card state for tap-vs-drag discrimination
      let accumulatedDragDist = 0;
      let didScroll = false;

      if (this.enableDirectDrag) {
        interactable.onDragStart.add(() => {
          this.isDragging = true
          this.dragStartScroll = this.targetScroll
          this.dragLastTarget = this.targetScroll
          this.velocity = 0
          accumulatedDragDist = 0;
          didScroll = false;
        })

        interactable.onDragUpdate.add((args: any) => {
          const dragVector = args && (args.planecastDragVector || args.dragVector || (args.interactor ? args.interactor.planecastDragVector || args.interactor.currentDragVector : null))
          if (!dragVector) return

          // Accumulate total world-space displacement to detect tap vs. intentional drag
          accumulatedDragDist += Math.sqrt(dragVector.x * dragVector.x + dragVector.y * dragVector.y + dragVector.z * dragVector.z);

          // Only scroll if movement exceeds tap threshold
          if (accumulatedDragDist < this.tapDragThreshold) return;
          didScroll = true;

          let dragDelta = 0
          if (this.layoutAxis === "XZ") {
              dragDelta = (dragVector.x + dragVector.z) * this.dragSensitivity
          } else if (this.layoutAxis === "YZ") {
              dragDelta = (dragVector.y + dragVector.z) * this.dragSensitivity
          } else {
              dragDelta = (dragVector.x + dragVector.y) * this.dragSensitivity
          }

          if (this.invertDrag) {
              dragDelta *= -1;
          }

          const nextTarget = this.dragStartScroll - dragDelta
          this.velocity = nextTarget - this.dragLastTarget
          this.dragLastTarget = nextTarget
          this.targetScroll = nextTarget
        })

        interactable.onDragEnd.add(() => {
          this.isDragging = false
          accumulatedDragDist = 0;
        })
      }

      if (interactable.onTriggerEnd) {
          interactable.onTriggerEnd.add(() => {
              if (this.isEntryAnimationPlaying() || this.isWaitingForEntryAnimation()) return;

              // If the interaction traveled beyond the tap threshold, it was a scroll — not a click.
              if (didScroll) {
                  didScroll = false;
                  return;
              }

              const totalSlots = this.cards.length
              const p_i = slotIndex - this.displayedScroll
              
              const shift = totalSlots / 2.0;
              const p_i_shifted = p_i + shift;

              const cycle = Math.floor(p_i_shifted / totalSlots)
              const centerOffset = Math.floor((Math.max(1, this.slotCount) - 1) / 2.0);
              const itemIndex = (slotIndex - cycle * totalSlots) + centerOffset;
              
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
                  
                  let isSelected = true;
                  if (this.enableToggleBehavior) {
                      if (this.selectedDataIndex === dataIndex) {
                          if (this.allowAllTogglesOff) {
                              this.selectedDataIndex = -1;
                          }
                      } else {
                          this.selectedDataIndex = dataIndex;
                      }
                      
                      isSelected = (this.selectedDataIndex === dataIndex);
                      this.syncAllCardToggleStates();
                  }

                  if (item && item.onTap) {
                      (item.onTap as any)(isSelected);
                  }
              }
          })
      }
    }

    if (baseButton.isInitialized) {
        setupInteractable();
    } else if (baseButton.onInitialized && baseButton.onInitialized.add) {
        baseButton.onInitialized.add(setupInteractable);
    }
  }

  /**
   * Motion loop: handles drag momentum, friction damping, and magnetic slot snapping.
   */
  private updateMotion(): void {
    if (this.cards.length === 0) return

    const dt = Math.max(0.001, getDeltaTime())

    // Force layout updates every frame while the entry animation is playing
    if (this.isEntryAnimationPlaying() || this.isWaitingForEntryAnimation()) {
        this.updateCardsLayout()
        return
    }

    // Disable dragging during entry animation
    if (!this.isDragging) {
      if (Math.abs(this.velocity) > this.minVelocityToSnap) {
        this.targetScroll += this.velocity
        this.velocity *= Math.exp(-this.inertiaDamping * dt)
      } else {
        this.velocity = 0
        const snapTarget = Math.round(this.targetScroll)
        const snapAlpha = 1 - Math.exp(-this.snapSharpness * dt)
        this.targetScroll = MathUtils.lerp(this.targetScroll, snapTarget, snapAlpha)
        if (Math.abs(this.targetScroll - snapTarget) < 0.001) {
          this.targetScroll = snapTarget
        }
      }
    }

    const followAlpha = 1 - Math.exp(-18 * dt)
    this.displayedScroll = MathUtils.lerp(this.displayedScroll, this.targetScroll, followAlpha)

    this.updateCardsLayout()
  }

  /**
   * Updates positions, rotations, and labels for all cards in the XY plane facing Z.
   */
  private updateCardsLayout(): void {
    const totalSlots = this.cards.length
    if (totalSlots === 0) return

    const visibleSlots = Math.max(1, Math.floor(this.slotCount))
    const angleStep = (this.arcAngleDegrees * Math.PI / 180) / (this.arcAngleDegrees >= 359.9 ? visibleSlots : Math.max(1, visibleSlots - 1))

    for (let i = 0; i < totalSlots; i++) {
      const card = this.cards[i]
      if (!card) continue

      const p_i = (i + this.slotOffset) - this.displayedScroll

      // Perfectly symmetrical gap center (exactly opposite the center of view)
      const shift = totalSlots / 2.0;
      const p_i_shifted = p_i + shift;

      // Calculate which data cycle this physical card is currently in
      const cycle = Math.floor(p_i_shifted / totalSlots)
      
      // Shift data index so Item 1 starts at the left edge of the visible arc instead of the center
      const centerOffset = Math.floor((Math.max(1, this.slotCount) - 1) / 2.0);
      const itemIndex = (i - cycle * totalSlots) + centerOffset;

      let dataIndex = i;
      if (this.items.length > 0) {
          dataIndex = (itemIndex % this.items.length + this.items.length) % this.items.length
          if ((card as any)._lastDataIndex !== dataIndex) {
              (card as any)._lastDataIndex = dataIndex;
              this.applyCardData(card, this.items[dataIndex], dataIndex, i);
          }
      }

      // Map the local position to [-shift, shift] to center it around 0
      let local_p = (p_i % totalSlots + totalSlots) % totalSlots;
      if (local_p > shift) {
          local_p -= totalSlots; // Wrap to negative so it sits before slot 0
      }

      // centered_p is exactly the distance from the visual center (0)
      const centered_p = local_p;

      // The boundary where cards should be fully visible
      const edge = (Math.max(1, Math.floor(this.slotCount)) - 1) / 2.0;
      const distanceFromCenter = Math.abs(centered_p);
      
      // Scale vanishing (always happens so cards shrink as they leave the slotCount arc)
      const scaleDist = Math.max(0.01, this.bufferSlots / 2.0); 
      let scaleMult = 1.0;
      if (distanceFromCenter > edge + scaleDist) {
          scaleMult = 0.0;
      } else if (distanceFromCenter > edge) {
          scaleMult = 1.0 - ((distanceFromCenter - edge) / scaleDist);
      }
      
      // --------------------------------------------------------
      // ENTRY & EXIT ANIMATION LOGIC
      // --------------------------------------------------------
      let entryAlphaMult = 1.0;
      let entryScaleMult = 1.0;

      const isExiting = this.animationExitTime !== -1;
      const isEntering = this.animationStartTime !== -1;

      if (this.isWaitingForEntryAnimation() && !isExiting) {
          // Hide everything until triggered
          entryAlphaMult = 0.0;
          entryScaleMult = 0.0;
      } else if (this.enableEntryAnimation && (isEntering || isExiting)) {
          const baseTime = isExiting ? this.animationExitTime : this.animationStartTime;
          const timeSinceStart = getTime() - baseTime;
          
          // Determine delay based on stagger direction
          let staggerIndex = 0;
          if (this.staggerDirectionString === "LeftToRight") {
              staggerIndex = centered_p + edge; // Leftmost is 0
          } else if (this.staggerDirectionString === "RightToLeft") {
              staggerIndex = edge - centered_p; // Rightmost is 0
          } else if (this.staggerDirectionString === "CenterOutward") {
              staggerIndex = Math.abs(centered_p); // Center is 0
          }

          // Cards outside the visible bounds pop in later
          staggerIndex = Math.max(0, staggerIndex);

          const cardDelay = staggerIndex * this.entryStaggerTime;
          const cardTime = timeSinceStart - cardDelay;

          if (isExiting) {
              // Exiting
              if (cardTime <= 0) {
                  entryAlphaMult = 1.0;
                  entryScaleMult = 1.0;
              } else if (cardTime < this.entryDuration) {
                  const t = 1.0 - (cardTime / this.entryDuration);
                  // Smooth fade out
                  entryAlphaMult = t;
                  // Pop out
                  entryScaleMult = t * t; 
              } else {
                  entryAlphaMult = 0.0;
                  entryScaleMult = 0.0;
              }
          } else {
              // Entering
              if (cardTime <= 0) {
                  entryAlphaMult = 0.0;
                  entryScaleMult = 0.0;
              } else if (cardTime < this.entryDuration) {
                  const t = cardTime / this.entryDuration;
                  // Smooth fade in
                  entryAlphaMult = t;
                  // Bouncy pop-in easing (overshoot)
                  const popScale = 1.0 + 0.3 * Math.sin(t * Math.PI) * (1.0 - t);
                  entryScaleMult = t < 0.2 ? (t / 0.2) * popScale : popScale; 
              } else {
                  entryAlphaMult = 1.0;
                  entryScaleMult = 1.0;
              }
          }
      }
      
      // Combine Edge Fading with Entry Animation Multipliers
      const finalAlpha = (this.fadeAtEdges ? (1.0 - Math.max(0, (distanceFromCenter - edge) / Math.max(0.01, this.fadeRange))) : 1.0) * entryAlphaMult;
      const finalScale = scaleMult * entryScaleMult;
      
      const defaultScale = (card as any)._defaultScale || vec3.one()
      const smoothScale = MathUtils.lerp(0.5, 1.0, finalScale); 
      card.getTransform().setLocalScale(defaultScale.uniformScale(finalScale > 0.01 ? smoothScale : 0.0))

      const api = this.buttonAPIs[i];
      if (api) {
          if (api.buttonOpacity !== undefined && Math.abs(api.buttonOpacity - finalAlpha) > 0.005) {
              api.buttonOpacity = finalAlpha;
          } else if (api.opacity !== undefined && Math.abs(api.opacity - finalAlpha) > 0.005) {
              api.opacity = finalAlpha;
          }
      }

      const angle = local_p * angleStep + (this.arcOffsetDegrees * Math.PI / 180)
      let x = 0, y = 0, z = 0;

      if (this.layoutAxis === "XZ") {
        x = Math.sin(angle) * this.radius
        y = 0
        z = Math.cos(angle) * this.radius
      } else if (this.layoutAxis === "YZ") {
        x = 0
        y = Math.sin(angle) * this.radius
        z = Math.cos(angle) * this.radius
      } else { // Default XY
        x = Math.sin(angle) * this.radius
        y = Math.cos(angle) * this.radius
        z = 0
      }

      const transform = card.getTransform()
      transform.setLocalPosition(new vec3(x, y, z))

      if (this.alignRotationToCircle) {
        const flipOffset = this.faceInward ? 0 : Math.PI;
        let baseRot = quat.quatIdentity();

        if (this.layoutAxis === "XZ") {
          const rotY = Math.atan2(x, z) + flipOffset
          baseRot = quat.fromEulerAngles(0, rotY, 0)
        } else if (this.layoutAxis === "YZ") {
          const rotX = Math.atan2(y, z) + flipOffset
          baseRot = quat.fromEulerAngles(-rotX, 0, 0)
        } else {
          const rotZ = Math.atan2(y, x) - Math.PI / 2 + flipOffset
          baseRot = quat.fromEulerAngles(0, 0, rotZ)
        }
        
        const customOffset = quat.fromEulerAngles(
          this.rotationOffset.x * Math.PI / 180,
          this.rotationOffset.y * Math.PI / 180,
          this.rotationOffset.z * Math.PI / 180
        );
        transform.setLocalRotation(baseRot.multiply(customOffset));

      } else {
        const customOffset = quat.fromEulerAngles(
          this.rotationOffset.x * Math.PI / 180,
          this.rotationOffset.y * Math.PI / 180,
          this.rotationOffset.z * Math.PI / 180
        );
        transform.setLocalRotation(customOffset)
      }

      if (this.faceCamera && this.camera) {
        const camTrans = this.camera.getSceneObject().getTransform();
        const cardWorldPos = transform.getWorldPosition();
        const camWorldPos = camTrans.getWorldPosition();
        
        let forward = camWorldPos.sub(cardWorldPos).normalize();
        if (!this.faceInward) {
            forward = forward.uniformScale(-1);
        }
        
        // Extract the Up vector from the already-calculated local rotation
        // This preserves alignToCircle tilts and any custom rotationOffsets!
        const currentRot = transform.getWorldRotation();
        const currentUp = currentRot.multiplyVec3(vec3.up());
        
        const targetRot = quat.lookAt(forward, currentUp);
        transform.setWorldRotation(targetRot);
      }
    }
  }

  /**
   * Finds any child Text or Text3D component on the card and updates its text content.
   */
  private applyCardData(card: SceneObject, item: CarouselItemData, dataIndex?: number, slotIndex?: number): void {
      if (!item) return
      const textComp = card.getComponent("Component.Text") as any || card.getComponent("Component.Text3D") as any
        || this.findChildTextComponent(card)
  
      if (textComp) {
        textComp.text = item.title
      }

      if (item.texture || item.icon) {
          const imageComp = card.getComponent("Component.Image") as Image || this.findChildImageComponent(card);
          if (imageComp) {
              imageComp.mainPass.baseTexture = item.texture || item.icon;
          }
      }

      // Sync toggle state once when dataIndex changes for this recycled card
      if (this.enableToggleBehavior && dataIndex !== undefined) {
          let baseButton = (typeof slotIndex === 'number' && this.buttonAPIs[slotIndex]) ? this.buttonAPIs[slotIndex] : null;
          if (!baseButton) {
              const findButton = (obj: SceneObject): any => {
                  const s = obj.getComponents("Component.ScriptComponent");
                  for (let j = 0; j < s.length; j++) {
                      if (typeof (s[j] as any).isOn !== 'undefined') return s[j];
                  }
                  for (let k = 0; k < obj.getChildrenCount(); k++) {
                      const found = findButton(obj.getChild(k));
                      if (found) return found;
                  }
                  return null;
              };
              baseButton = findButton(card);
          }

          if (baseButton && typeof baseButton.isOn !== 'undefined') {
              if (baseButton.setIsToggleable) {
                  baseButton.setIsToggleable(true);
              } else if (!baseButton._toggleable) {
                  baseButton._toggleable = true;
              }
              const shouldBeOn = (this.selectedDataIndex !== -1 && dataIndex === this.selectedDataIndex);
              if (typeof baseButton.setOn === 'function') {
                  baseButton.setOn(shouldBeOn);
              } else {
                  baseButton.isOn = shouldBeOn;
              }
          }
      }
  }

  /**
   * Recursive helper to find a Text component in children objects.
   */
  private findChildTextComponent(obj: SceneObject): any {
    for (let i = 0; i < obj.getChildrenCount(); i++) {
      const child = obj.getChild(i)
      const comp = child.getComponent("Component.Text") as any || child.getComponent("Component.Text3D") as any
      if (comp) return comp
      const nested = this.findChildTextComponent(child)
      if (nested) return nested
    }
    return null
  }

  /**
   * Recursive helper to find an Image component in children objects.
   */
  private findChildImageComponent(obj: SceneObject): Image | null {
    for (let i = 0; i < obj.getChildrenCount(); i++) {
      const child = obj.getChild(i)
      const comp = child.getComponent("Component.Image") as Image
      if (comp) return comp
      const nested = this.findChildImageComponent(child)
      if (nested) return nested
    }
    return null
  }

  // --- PUBLIC API METHODS ---

  /**
   * Dynamically sets the item count and rebuilds the carousel.
   */
  public setSlotCount(newCount: number): void {
    this.slotCount = Math.max(1, Math.floor(newCount))
    this.rebuild()
  }

  /**
   * Dynamically updates the custom corner points for all polygonal buttons in the carousel.
   */
  public setCustomCornerPoints(points: vec2[]): void {
    for (let i = 0; i < this.buttonAPIs.length; i++) {
      const api = this.buttonAPIs[i]
      if (api && api.setCustomPoints) {
        api.setCustomPoints(points)
      }
    }
  }

  /**
   * Assigns a custom array of items to display on the carousel buttons.
   */
  public setItems(newItems: CarouselItemData[]): void {
    this.items = newItems
    for (let i = 0; i < this.cards.length; i++) {
      if (this.cards[i]) {
        delete (this.cards[i] as any)._lastDataIndex
      }
    }
    this.updateCardsLayout()
  }

  /**
   * Synchronizes toggle visual state for all cards based on current selectedDataIndex.
   */
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
   * Programmatically selects an item index in the virtualized dataset.
   */
  public selectItem(dataIndex: number): void {
    this.selectedDataIndex = dataIndex
    this.syncAllCardToggleStates()
  }

  /**
   * Helper to determine if the entry animation is still resolving.
   */
  private isEntryAnimationPlaying(): boolean {
      if (!this.enableEntryAnimation || this.animationStartTime < 0) return false;
      const totalAnimationTime = (this.cards.length * this.entryStaggerTime) + this.entryDuration;
      return (getTime() - this.animationStartTime) < totalAnimationTime;
  }

  /**
   * Helper to determine if we are waiting for the entry animation to be triggered.
   */
  private isWaitingForEntryAnimation(): boolean {
      return this.enableEntryAnimation && this.animationStartTime === -1;
  }

  /**
   * External APIs for custom controllers (e.g. Sword Swipe) to drive the carousel scroll.
   */
  public externalDragStart(): void {
      if (!this.enableExternalDrag) return;
      this.isDragging = true;
      this.dragStartScroll = this.targetScroll;
      this.dragLastTarget = this.targetScroll;
      this.velocity = 0;
      this.velocityHistory = [];
  }

  public externalDragUpdate(dragDelta: number): void {
      if (!this.enableExternalDrag) return;
      if (this.invertDrag) {
          dragDelta *= -1;
      }
      const nextTarget = this.dragStartScroll - (dragDelta * this.dragSensitivity);
      this.updateVelocityTracker(nextTarget - this.dragLastTarget);
      this.dragLastTarget = nextTarget;
      this.targetScroll = nextTarget;
  }

  public externalScrollBy(scrollDelta: number): void {
      if (!this.enableExternalDrag) return;
      const nextTarget = this.targetScroll + scrollDelta;
      this.updateVelocityTracker(nextTarget - this.dragLastTarget);
      this.dragLastTarget = nextTarget;
      this.targetScroll = nextTarget;
  }

  public externalDragEnd(): void {
      if (!this.enableExternalDrag) return;
      this.isDragging = false;
  }

  private updateVelocityTracker(instantVelocity: number): void {
      this.velocityHistory.push(instantVelocity);
      if (this.velocityHistory.length > this.maxVelocityHistory) {
          this.velocityHistory.shift();
      }
      let sum = 0;
      for (let i = 0; i < this.velocityHistory.length; i++) {
          sum += this.velocityHistory[i];
      }
      this.velocity = sum / this.velocityHistory.length;
      this.velocity = Math.max(Math.min(this.velocity, this.maxDragVelocity), -this.maxDragVelocity);
  }
}
