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
}

/**
 * PolygonalCircularCarousel Component
 * 
 * Arranges instantiated PolygonalButton prefabs in a circular layout on the XY plane facing Z.
 * Supports poke/pinch drag interaction, kinetic momentum, snap-to-slot dynamics, dynamic slot counting,
 * and updates child Text components automatically.
 */
@component
export class PolygonalCircularCarousel extends BaseScriptComponent {
  @ui.group_start("Carousel Hierarchy")
  @input
  @hint("Prefab containing PolygonalButton component and Text child object")
  buttonPrefab!: ObjectPrefab

  @input
  @hint("Uniform scale multiplier applied to the instantiated buttons")
  buttonScale: number = 1.0

  @input
  @hint("Root SceneObject for the carousel. If null, uses this SceneObject.")
  carouselRoot?: SceneObject
  @ui.group_end

  @ui.group_start("Layout & Motion Settings")
  @input
  @hint("Number of buttons in the carousel circle")
  slotCount: number = 5

  @input
  @hint("Radius of the circle in cm")
  radius: number = 30.0

  @input
  @hint("Drag sensitivity for rotating the carousel")
  dragSensitivity: number = 0.05

  @input
  @hint("Inertia damping (higher = stops faster)")
  inertiaDamping: number = 4.5

  @input
  @hint("Snap sharpness to nearest slot")
  snapSharpness: number = 10.0

  @input
  @hint("Minimum velocity threshold before snapping")
  minVelocityToSnap: number = 0.015

  @input
  @hint("Orient buttons tangentially along the circle outline")
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
  @hint("Additional rotation offset (in degrees) to apply to each button (e.g., set Z to 90 to align Y-axis to curve)")
  rotationOffset: vec3 = new vec3(0, 0, 0)

  @input
  @hint("Invert the drag direction")
  invertDrag: boolean = false
  @ui.group_end

  private cards: SceneObject[] = []
  private buttonAPIs: any[] = []
  private items: CarouselItemData[] = []
  
  private displayedScroll: number = 0
  private targetScroll: number = 0
  private velocity: number = 0
  private dragStartScroll: number = 0
  private dragLastTarget: number = 0
  private isDragging: boolean = false

  onAwake(): void {
    // Generate default item labels if none provided
    this.initDefaultItems()

    // Register update event for kinetic motion, drag inertia, and snapping
    this.createEvent("UpdateEvent").bind(() => this.updateMotion())

    // Rebuild carousel on start
    this.createEvent("OnStartEvent").bind(() => this.rebuild())
  }

  /**
   * Initializes fallback labels for the buttons if custom items aren't set yet.
   */
  private initDefaultItems(): void {
    if (this.items.length > 0) return
    for (let i = 0; i < 20; i++) {
      this.items.push({
        title: `Item ${i + 1}`,
        subtitle: `Sub ${i + 1}`
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
    const count = Math.max(1, Math.floor(this.slotCount))

    for (let i = 0; i < count; i++) {
      const card = this.buttonPrefab.instantiate(parent)
      card.name = "CarouselCard_" + i
      const initScale = new vec3(this.buttonScale, this.buttonScale, this.buttonScale)
      card.getTransform().setLocalScale(initScale)
      ;(card as any)._defaultScale = initScale
      this.cards.push(card)

      // Get PolygonalButton script reference
      const buttonScript = card.getComponent("Component.ScriptComponent") || (card as any).button
      this.buttonAPIs.push(buttonScript as any)

      // Bind drag and click handlers
      this.bindCardInteractions(card, i)
    }

    this.updateCardsLayout()
    print(`[PolygonalCircularCarousel] Successfully instantiated ${this.cards.length} carousel slots.`)
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

      // NOTE: Do NOT modify interactable config properties (enableInstantDrag, targetingMode, etc.)
      // Those are owned by PolygonalButton.ts / OnStartEvent. Overwriting here breaks indirect targeting.

      interactable.onDragStart.add(() => {
        this.isDragging = true
        this.dragStartScroll = this.targetScroll
        this.dragLastTarget = this.targetScroll
        this.velocity = 0
      })

      interactable.onDragUpdate.add((args: any) => {
        const dragVector = args && (args.planecastDragVector || args.dragVector || (args.interactor ? args.interactor.planecastDragVector || args.interactor.currentDragVector : null))
        if (!dragVector) return

        // Drag applies differently based on the chosen axis
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
      })
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
    const count = this.cards.length
    if (count === 0) return

    const angleStep = (2 * Math.PI) / count
    const baseAngle = -this.displayedScroll * angleStep

    for (let i = 0; i < count; i++) {
      const card = this.cards[i]
      if (!card) continue

      const angle = baseAngle + i * angleStep
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
        
        // Apply user's custom rotation offset
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

      // Map item label data
      const itemIndex = ((Math.floor(i - Math.round(this.displayedScroll)) % this.items.length) + this.items.length) % this.items.length
      this.updateCardText(card, this.items[itemIndex])
    }
  }

  /**
   * Finds any child Text or Text3D component on the card and updates its text content.
   */
  private updateCardText(card: SceneObject, item: CarouselItemData): void {
    if (!item) return
    const textComp = card.getComponent("Component.Text") as any || card.getComponent("Component.Text3D") as any
      || this.findChildTextComponent(card)

    if (textComp) {
      textComp.text = item.title
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
    this.updateCardsLayout()
  }
}
