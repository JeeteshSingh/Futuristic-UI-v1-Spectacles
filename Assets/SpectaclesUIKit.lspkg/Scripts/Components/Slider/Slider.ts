import {DragInteractorEvent, InteractorEvent} from "SpectaclesInteractionKit.lspkg/Core/Interactor/InteractorEvent"
import {CancelSet} from "SpectaclesInteractionKit.lspkg/Utils/animate"
import Event, {PublicApi, unsubscribe} from "SpectaclesInteractionKit.lspkg/Utils/Event"
import {clamp} from "SpectaclesInteractionKit.lspkg/Utils/mathUtils"
import NativeLogger from "SpectaclesInteractionKit.lspkg/Utils/NativeLogger"
import {SpringAnimate} from "SpectaclesInteractionKit.lspkg/Utils/springAnimate"
import {
  DarkerLessGray,
  DarkestGray,
  DarkestYellow,
  DarkWarmGray,
  MediumDarkGray,
  MediumWarmGray,
  SwitchBorderYellowLight,
  SwitchKnobBorderGray,
  SwitchKnobBorderTransparent,
  SwitchKnobBorderYellow,
  SwitchKnobBorderYellowBright,
  SwitchKnobBorderYellowMedium,
  SwitchTrackBorderGray,
  SwitchTrackBorderTransparent,
  SwitchTrackGray,
  SwitchYellowBright,
  SwitchYellowDark,
  TriggeredBorderClearGray,
  TriggeredBorderYellow
} from "../../Themes/SnapOS-2.0/Colors"
import {SnapOS2Styles} from "../../Themes/SnapOS-2.0/SnapOS2"
import {Callback, createCallbacks} from "../../Utility/SceneUtilities"
import {HSVtoRGB, isEqual} from "../../Utility/UIKitUtilities"
import {
  RoundedRectangleVisual,
  RoundedRectangleVisualParameters
} from "../../Visuals/RoundedRectangle/RoundedRectangleVisual"
import {Visual} from "../../Visuals/Visual"
import {StateName} from "../Element"
import {VisualElement} from "../VisualElement"

const log = new NativeLogger("Slider")

const SPRING_EPSILON: number = 0.001
const KNOB_Z_OFFSET: number = 0.015
const TRACKFILL_Z_OFFSET: number = 0.01

const SliderVisualParameters: Partial<RoundedRectangleVisualParameters> = {
  default: {
    baseType: "Gradient",
    baseGradient: {
      type: "Linear",
      start: new vec2(0, 1),
      end: new vec2(0, -1),
      stop0: {
        percent: 0,
        color: SwitchTrackGray
      },
      stop1: {
        percent: 1,
        color: DarkerLessGray
      }
    },
    hasBorder: true,
    borderSize: 0.1,
    borderType: "Gradient",
    borderGradient: {
      start: new vec2(-0.8, 1),
      end: new vec2(0.8, -1),
      stop0: {
        percent: 0,
        color: SwitchTrackBorderGray
      },
      stop1: {
        percent: 0.5,
        color: SwitchTrackBorderTransparent
      },
      stop2: {
        percent: 1,
        color: SwitchTrackBorderGray
      }
    }
  },
  hovered: {},
  triggered: {
    baseGradient: {
      start: new vec2(0, 1),
      end: new vec2(0, -1),
      stop0: {
        percent: 0,
        color: DarkestYellow
      },
      stop1: {
        percent: 1,
        color: DarkestYellow
      }
    },
    borderGradient: {
      start: new vec2(-0.8, 1),
      end: new vec2(0.8, -1),
      stop0: {
        percent: 0,
        color: SwitchKnobBorderYellow
      },
      stop1: {
        percent: 0.5,
        color: SwitchKnobBorderYellowMedium
      },
      stop2: {
        percent: 1,
        color: SwitchKnobBorderYellow
      }
    }
  }
}

const KnobVisualParameters: Partial<RoundedRectangleVisualParameters> = {
  default: {
    baseType: "Gradient",
    borderSize: 0.07,
    baseGradient: {
      enabled: true,
      type: "Linear",
      start: new vec2(-1, 1),
      end: new vec2(1, -1),
      stop0: {percent: 0, color: DarkestGray},
      stop1: {percent: 1, color: DarkWarmGray}
    },
    hasBorder: true,
    borderType: "Gradient",
    borderGradient: {
      start: new vec2(-0.8, 1),
      end: new vec2(0.8, -1),
      stop0: {
        percent: 0,
        color: SwitchKnobBorderGray
      },
      stop1: {
        percent: 1,
        color: SwitchKnobBorderTransparent
      }
    }
  },
  hovered: {
    baseGradient: {
      start: new vec2(-0.8, 1),
      end: new vec2(0.8, -1),
      stop0: {
        percent: 0,
        color: DarkWarmGray
      },
      stop1: {
        percent: 1,
        color: SwitchKnobBorderGray
      }
    },
    borderGradient: {
      start: new vec2(-0.8, 1),
      end: new vec2(0.8, -1),
      stop0: {
        percent: 0,
        color: MediumWarmGray
      },
      stop1: {
        percent: 1,
        color: TriggeredBorderClearGray
      }
    }
  },
  triggered: {
    baseGradient: {
      start: new vec2(-0.8, 1),
      end: new vec2(0.8, -1),
      stop0: {
        percent: 0,
        color: SwitchYellowDark
      },
      stop1: {
        percent: 1,
        color: SwitchYellowBright
      }
    },
    borderGradient: {
      start: new vec2(-0.8, 1),
      end: new vec2(0.8, -1),
      stop0: {
        percent: 0,
        color: TriggeredBorderYellow
      },
      stop1: {
        percent: 0.5,
        color: HSVtoRGB(48, 0.64, 0.35, 0.5)
      },
      stop2: {
        percent: 1,
        color: SwitchKnobBorderYellowBright
      }
    }
  }
}

const TrackVisualParameters: Partial<RoundedRectangleVisualParameters> = {
  default: {
    baseType: "Color",
    baseColor: MediumDarkGray,
    hasBorder: false
  },
  hovered: {
    baseColor: MediumWarmGray
  },
  triggered: {
    baseColor: SwitchBorderYellowLight
  }
}

/**
 * Configuration object for spring animation parameters.
 */
type SpringConfig = {
  /**
   * Spring constant (stiffness). Higher values create a stiffer spring.
   * @defaultValue 150
   * @remarks Typical range: 50-500. Higher values make the animation reach the target faster but may cause more oscillation.
   */
  k?: number
  /**
   * Damping constant. Higher values reduce oscillation and settling time.
   * @defaultValue 21
   * @remarks Typical range: 10-50. Higher values create less bouncy, more controlled motion.
   */
  damp?: number
  /**
   * Mass of the animated object. Higher values make the animation slower and more sluggish.
   * @defaultValue 1
   * @remarks Typical range: 0.5-3. Lower values create lighter, more responsive motion.
   */
  mass?: number
}

const DEFAULT_SPRING_CONFIG: SpringConfig = {
  k: 150, // Spring constant
  damp: 21, // Damping constant
  mass: 1 // Mass of the object
}

/**
 * Represents a slider component that allows users to select a value within a specified range.
 * The slider includes a draggable knob and emits events when the value changes or interaction finishes.
 *
 * @remarks
 * - The slider's value is constrained between 0 and 1.
 * - The knob's position is updated based on the current value.
 * - The component supports animations for knob position updates.
 *
 * @extends VisualElement
 */
@component
export class Slider extends VisualElement {
  @input
  @hint("The default value of the slider, should be between 0 and 1")
  @widget(new SliderWidget(0, 1, 0.01))
  protected _defaultValue: number = 0

  @input
  @hint("Enable triggering anywhere on the slider track to snap the knob to that position")
  protected snapToTriggerPosition: boolean = false

  @input
  @hint("Enable this to make the slider segmented, with a fixed number of segments")
  protected segmented: boolean = false

  @input
  @hint("The number of segments for the segmented slider, must be at least 2")
  @showIf("segmented")
  protected numberOfSegments: number = 5

  @input
  @hint("Enable this to show a fill on the track up to the knob position")
  public hasTrackVisual: boolean = true

  @input
  @hint("Enable this to customize the knob size")
  public customKnobSize: boolean = false

  @input
  @showIf("customKnobSize")
  protected _knobSize: vec2 = new vec2(3, 3)

  @input
  @hint("Enable this to add functions from another script to this component's callbacks")
  protected addCallbacks: boolean = false
  @input
  @showIf("addCallbacks")
  @label("On Value Changed Callbacks")
  private onValueChangeCallbacks: Callback[] = []
  @input
  @showIf("addCallbacks")
  @label("On Interaction Finished Callbacks")
  private onFinishedCallbacks: Callback[] = []

  protected _style: SnapOS2Styles = SnapOS2Styles.Custom

  protected _knobVisual: Visual
  protected _trackFillVisual: Visual

  protected _currentValue: number = this.segmented
    ? Math.round(this._defaultValue / (1 / (this.numberOfSegments - 1))) * (1 / (this.numberOfSegments - 1))
    : this._defaultValue
  private _knobValue: number = this._currentValue
  private _knobPosition: number = 0
  private _initialDragPosition: vec3 | null = null

  private _updateKnobPositionCancelSet: CancelSet = new CancelSet()

  private onKnobMovedEvent: Event<number> = new Event()
  public readonly onKnobMoved: PublicApi<number> = this.onKnobMovedEvent.publicApi()
  private onValueChangeEvent: Event<number> = new Event()
  public readonly onValueChange: PublicApi<number> = this.onValueChangeEvent.publicApi()
  private onFinishedEvent: Event<boolean> = new Event()
  public readonly onFinished: PublicApi<boolean> = this.onFinishedEvent.publicApi()

  private _knobSpringAnimate = new SpringAnimate(
    DEFAULT_SPRING_CONFIG.k,
    DEFAULT_SPRING_CONFIG.damp,
    DEFAULT_SPRING_CONFIG.mass
  )

  private _initialKnobPosition: number = 0
  private _knobValueAtDragStart: number = 0

  private knobVisualEventHandlerUnsubscribes: unsubscribe[] = []
  private trackVisualEventHandlerUnsubscribes: unsubscribe[] = []

  /**
   * Gets the render order of the Slider.
   *
   * @returns {number} The render order of the Slider.
   */
  public get renderOrder(): number {
    return this._renderOrder
  }

  /**
   * Sets the render order of the Slider.
   *
   * @param order - The render order of the Slider.
   */
  public set renderOrder(order: number) {
    if (order === undefined) {
      return
    }
    super.renderOrder = order
    if (this._initialized) {
      if (this._trackFillVisual) {
        this._trackFillVisual.renderMeshVisual.renderOrder = order + 1
      }
      if (this._knobVisual) {
        this._knobVisual.renderMeshVisual.renderOrder = order + 2
      }
    }
  }

  /**
   * Gets the visual representation of the slider's track fill.
   *
   * @returns {Visual} The visual object representing the track fill.
   */
  public get trackFillVisual(): Visual {
    return this._trackFillVisual
  }

  /**
   * Sets the visual representation of the slider's track fill.
   * If a previous visual exists, it will be destroyed before assigning the new one.
   *
   * @param value - The new visual to be assigned to the track fill.
   */
  public set trackFillVisual(value: Visual) {
    if (value === undefined) {
      return
    }
    if (isEqual<Visual>(this._trackFillVisual, value)) {
      return
    }
    this.destroyTrackFillVisual()
    this._trackFillVisual = value
    if (this.initialized) {
      this.configureTrackFillVisual()
      this.updateFillSize()
    }
  }

  /**
   * Gets the visual representation of the slider's knob.
   *
   * @returns {Visual} The visual object representing the knob.
   */
  public get knobVisual(): Visual {
    return this._knobVisual
  }

  /**
   * Sets the visual representation of the slider's knob.
   * If a previous visual exists, it will be destroyed before assigning the new one.
   *
   * @param value - The new visual to be assigned to the knob.
   */
  public set knobVisual(value: Visual) {
    if (value === undefined) {
      return
    }
    if (isEqual<Visual>(this._knobVisual, value)) {
      return
    }
    this.destroyKnobVisual()
    this._knobVisual = value
    if (this.initialized) {
      this.configureKnobVisual()
      this.updateKnobSize()
      this.updateKnobPositionFromValue()
    }
  }

  /**
   * Gets the size of the knob.
   *
   * @returns {vec2} The size of the knob.
   */
  public get knobSize(): vec2 {
    return this._knobSize
  }

  /**
   * Sets the size of the knob.
   * If the new size is different from the current size, it updates the knob size.
   *
   * @param value - The new size of the knob.
   */
  public set knobSize(size: vec2) {
    if (size === undefined) {
      return
    }
    if (isEqual<vec2>(this._knobSize, size)) {
      return
    }
    this._knobSize = size
    if (this._initialized) {
      this.updateKnobSize()
      this.updateKnobPositionFromValue()
    }
  }

  /**
   * Gets a value indicating whether the slider component is draggable.
   *
   * @returns {boolean} always return true, as it is always draggable.
   */
  public get isDraggable(): boolean {
    return true
  }

  /**
   * Gets the current value of the slider.
   * This is the actual value of the element, and is updated immediately after user input
   *
   * @returns {number} The current value.
   */
  public get currentValue(): number {
    return this._currentValue
  }

  /**
   * Sets the current value of the slider.
   *
   * @param value - The new value to set, which should be between 0 and 1.
   *
   * If the value is outside the range [0, 1], a warning is logged and the value is not set.
   * If the value is the same as the current value, a debug message is logged and the value is not set.
   * Otherwise, the current value is updated, a debug message is logged, the knob position is updated,
   * and the onValueChangeEvent is invoked.
   */
  public set currentValue(value: number) {
    if (value === undefined) {
      return
    }
    this.updateCurrentValue(value)
  }

  /**
   * The current position of the knob as a normalized value from 0-1.
   * This differs from the `currentValue`, as the `currentValue` may be set, while the `knobValue` is animating to that position. If you want the actual value of the element, please use `currentValue`
   *
   * @returns {number} The current value.
   */
  public get knobValue(): number {
    return this._knobValue
  }

  /**
   * Gets the current spring animation configuration for the knob.
   *
   * @returns The current spring configuration including stiffness (k), damping, and mass values.
   *
   */
  public get knobSpringConfig(): SpringConfig {
    return {
      k: this._knobSpringAnimate.k,
      damp: this._knobSpringAnimate.damp,
      mass: this._knobSpringAnimate.mass
    }
  }

  /**
   * Updates the spring animation configuration for the knob.
   *
   * @param springConfig - The new spring configuration. Only provided properties will be updated.
   *
   */
  public set knobSpringConfig(springConfig: SpringConfig) {
    if (springConfig === undefined) {
      return
    }
    this._knobSpringAnimate.k = springConfig.k ? springConfig.k : this._knobSpringAnimate.k
    this._knobSpringAnimate.damp = springConfig.damp ? springConfig.damp : this._knobSpringAnimate.damp
    this._knobSpringAnimate.mass = springConfig.mass ? springConfig.mass : this._knobSpringAnimate.mass

    this._knobSpringAnimate.reset()
  }

  /**
   * Updates the current value of the slider with optional animation control.
   *
   * @param value - The new value to set. Must be between 0 and 1 (inclusive).
   * @param shouldAnimate - Whether to animate the transition to the new value using spring physics.
   *                        When `true`, the knob will spring animate from current to target value.
   *                        When `false` (default), the knob jumps immediately to the new value.
   *
   */
  public updateCurrentValue(value: number, shouldAnimate: boolean = false) {
    if (value < 0 || value > 1) {
      log.w(`Value ${value} should be between 0 and 1`)
      return
    }
    if (value === this._currentValue) {
      log.d(`slider ${this.sceneObject.name} value is already set to ${this._currentValue}`)
      return
    }
    if (this.initialized) {
      this._knobSpringAnimate.reset()
      this._currentValue = value
      if (!shouldAnimate) {
        this._knobValue = value
        log.d(`slider ${this.sceneObject.name} value changed to ${this._knobValue}`)
        this.updateKnobPositionFromValue()
        this.onValueChangeEvent.invoke(this._knobValue)
      }
      this.onFinishedEvent.invoke(this.isExplicit)
    } else {
      this._currentValue = value
      this._knobValue = value
    }
  }

  /**
   * Initializes the slider component. This method sets up the visual and knob visual elements
   * if they are not already defined, and ensures the default value is within the valid range.
   */
  public initialize() {
    if (this._defaultValue < 0 || this._defaultValue > 1) {
      throw new Error(`Default value ${this._defaultValue} should be between 0 and 1`)
    }

    if (this.segmented && this.numberOfSegments < 2) {
      throw new Error(`Number of segments ${this.numberOfSegments} should be at least 2`)
    }

    super.initialize()

    if (this._trackFillVisual) {
      this._trackFillVisual.renderMeshVisual.renderOrder = this._renderOrder + 1
    }
    if (this._knobVisual) {
      this._knobVisual.renderMeshVisual.renderOrder = this._renderOrder + 2
    }

    this.interactable.enableInstantDrag = !this.snapToTriggerPosition
    this.interactable.keepHoverOnTrigger = true

    this.configureKnobVisual()
    this.configureTrackFillVisual()

    this.updateKnobSize()
    this.updateKnobPositionFromValue()
  }

  protected createDefaultVisual(): void {
    if (!this._visual) {
      const defaultVisual: RoundedRectangleVisual = new RoundedRectangleVisual({
        sceneObject: this.sceneObject,
        style: SliderVisualParameters
      })
      defaultVisual.cornerRadius = this.size.y * 0.5
      this._visual = defaultVisual
    }

    if (!this._knobVisual) {
      const knobObject = global.scene.createSceneObject("SliderKnob")
      this.managedSceneObjects.add(knobObject)
      const defaultKnobVisual: RoundedRectangleVisual = new RoundedRectangleVisual({
        sceneObject: knobObject,
        style: KnobVisualParameters
      })

      defaultKnobVisual.cornerRadius = (this.size.y - defaultKnobVisual.borderSize * 2) * 0.5
      this._knobVisual = defaultKnobVisual
      if (!this.customKnobSize) {
        this._knobSize = new vec2(this.size.y, this.size.y)
      }
      knobObject.setParent(this.sceneObject)
    }

    if (!this._trackFillVisual && this.hasTrackVisual) {
      const trackFillObject = global.scene.createSceneObject("SliderTrackFill")
      this.managedSceneObjects.add(trackFillObject)
      const defaultTrackFillVisual: RoundedRectangleVisual = new RoundedRectangleVisual({
        sceneObject: trackFillObject,
        style: TrackVisualParameters
      })

      this._trackFillVisual = defaultTrackFillVisual
      trackFillObject.setParent(this.sceneObject)
    }
  }

  protected configureVisual(): void {
    super.configureVisual()
    if (this._visual) {
      this.visualEventHandlerUnsubscribes.push(
        this._visual.onDestroyed.add(() => {
          // knobs and trackFill are children of the visual
          this._trackFillVisual = null
          this._knobVisual = null
        })
      )
    }
  }

  private configureKnobVisual(): void {
    if (this._knobVisual) {
      this.knobVisualEventHandlerUnsubscribes.push(
        this._knobVisual.onDestroyed.add(() => {
          this._knobVisual = null
        })
      )
    }
  }

  private destroyKnobVisual(): void {
    this.knobVisualEventHandlerUnsubscribes.forEach((unsubscribe) => unsubscribe())
    this.knobVisualEventHandlerUnsubscribes = []
    if (this._knobVisual) {
      this._knobVisual.destroy()
      this._knobVisual = null
    }
  }

  private configureTrackFillVisual(): void {
    if (this._trackFillVisual) {
      this.trackVisualEventHandlerUnsubscribes.push(
        this._trackFillVisual.onDestroyed.add(() => {
          this._trackFillVisual = null
        })
      )
    }
  }

  private destroyTrackFillVisual(): void {
    this.trackVisualEventHandlerUnsubscribes.forEach((unsubscribe) => unsubscribe())
    this.trackVisualEventHandlerUnsubscribes = []
    if (this._trackFillVisual) {
      this._trackFillVisual.destroy()
      this._trackFillVisual = null
    }
  }

  protected setUpEventCallbacks(): void {
    if (this.addCallbacks) {
      this.onValueChange.add(createCallbacks(this.onValueChangeCallbacks))
      this.onFinished.add(createCallbacks(this.onFinishedCallbacks))
    }
    super.setUpEventCallbacks()
  }

  protected onTriggerUpHandler(stateEvent: InteractorEvent) {
    super.onTriggerUpHandler(stateEvent)
    this.onTriggerRespond(stateEvent)
  }

  protected onTriggerRespond(event: InteractorEvent) {
    if (!this._isDragged) {
      if (this.snapToTriggerPosition) {
        const triggerValue = MathUtils.clamp(
          (this.transform.getInvertedWorldTransform().multiplyPoint(event.interactor.planecastPoint).x +
            this._size.x / 2) /
            this._size.x,
          0,
          1
        )
        if (this.segmented) {
          const segmentStep = 1 / (this.numberOfSegments - 1)
          const closestSegmentIndex = Math.round(triggerValue / segmentStep)
          const newValue = MathUtils.clamp(closestSegmentIndex * segmentStep, 0, 1)
          this.updateCurrentValue(newValue, true)
        } else {
          this.updateCurrentValue(triggerValue, true)
        }
      }
    }
  }

  protected onInteractableDragStart(dragEvent: DragInteractorEvent): void {
    super.onInteractableDragStart(dragEvent)
    this._initialDragPosition = this.getInteractionPosition(dragEvent.interactor)

    this._initialKnobPosition = this.getKnobPositionFromValue(this._currentValue)

    this._knobValueAtDragStart = this._currentValue
  }

  protected onInteractableDragUpdate(dragEvent: DragInteractorEvent): void {
    if (this._isDragged) {
      if (dragEvent.interactor) {
        const currentDragPosition = this.getInteractionPosition(dragEvent.interactor)
        const dragDelta = currentDragPosition.sub(this._initialDragPosition).x
        const unclampedValue =
          this._knobValueAtDragStart +
          (this.segmented ? Math.round(dragDelta / this.stateInterval) * this.stateInterval : dragDelta) /
            this.trackLength
        const newValue = clamp(unclampedValue, 0, 1)
        const valueChanged = this._knobValue !== newValue
        if (valueChanged) {
          this._knobValue = newValue
          log.d(`slider ${this.sceneObject.name} updating to ${this._knobValue}`)
          this.updateKnobPositionFromValue()
          this.onValueChangeEvent.invoke(this._knobValue)
        }
      }
    }
    super.onInteractableDragUpdate(dragEvent)
  }

  protected onInteractableDragEnd(dragEvent: DragInteractorEvent): void {
    if (this._isDragged) {
      this._currentValue = this._knobValue
      this.updateKnobPositionFromValue()
      this.onFinishedEvent.invoke(this.isExplicit)
      this._knobSpringAnimate.reset()
    }
    super.onInteractableDragEnd(dragEvent)
  }

  protected update(): void {
    if (!this._knobVisual) {
      return
    }
    if (this._isDragged) {
      return
    }
    if (Math.abs(this._knobValue - this._currentValue) <= SPRING_EPSILON) {
      return
    }
    const min = Math.min(this._currentValue, this._knobValue)
    const max = Math.max(this._currentValue, this._knobValue)
    const springResult = new vec3(this._knobValue, 0, KNOB_Z_OFFSET)
    this._knobSpringAnimate.evaluate(
      new vec3(this._knobValue, 0, KNOB_Z_OFFSET),
      new vec3(this._currentValue, 0, KNOB_Z_OFFSET),
      springResult
    )
    this._knobValue = clamp(springResult.x, min, max)
    if (Math.abs(this._knobValue - this._currentValue) <= SPRING_EPSILON) {
      this._knobValue = this._currentValue
    }
    this.updateKnobPositionFromValue()
    this.onValueChangeEvent.invoke(this._currentValue)
  }

  protected updateKnobPositionFromValue() {
    if (!this._knobVisual) {
      return
    }
    this._knobPosition = this.getKnobPositionFromValue(this._knobValue)
    this.updateKnobPosition(this._knobPosition)
  }

  private updateKnobPosition(value: number) {
    if (!this._knobVisual) {
      return
    }

    this._knobVisual.transform.setLocalPosition(new vec3(value, 0, KNOB_Z_OFFSET))
    const knobValue = (value + this.size.x * 0.5) / this.size.x
    this.updateFillSize()
    this.onKnobMovedEvent.invoke(knobValue)
  }

  protected setState(stateName: StateName) {
    super.setState(stateName)
    this._knobVisual?.setState(stateName)
    this._trackFillVisual?.setState(stateName)
  }

  private updateKnobSize() {
    if (!this._knobVisual) {
      return
    }
    this._knobVisual.size = this._visual.hasBorder
      ? new vec3(
          this._knobSize.x - this._visual.borderSize * 2,
          this._knobSize.y - this._visual.borderSize * 2,
          this.size.z
        )
      : new vec3(this._knobSize.x, this._knobSize.y, this.size.z)
    ;(this._knobVisual as RoundedRectangleVisual).cornerRadius = this._knobVisual.size.y * 0.5
  }

  private updateFillSize() {
    if (!this._trackFillVisual) {
      return
    }
    const borderSize = (this._visual as RoundedRectangleVisual).borderSize
    const fillSize = this.trackFillVisual.size.uniformScale(1)
    fillSize.y = this.size.y - borderSize * 2
    fillSize.x = MathUtils.lerp(fillSize.y, this.size.x - borderSize * 2, this.knobValue)
    const xPos = MathUtils.lerp((this.size.x - borderSize * 2) * -0.5 + fillSize.y * 0.5, 0, this.knobValue)
    this.trackFillVisual.transform.setLocalPosition(new vec3(xPos, 0, TRACKFILL_Z_OFFSET))
    ;(this.trackFillVisual as RoundedRectangleVisual).cornerRadius = fillSize.y * 0.5
    this.trackFillVisual.size = fillSize
  }

  protected get isExplicit(): boolean {
    return true
  }

  private getKnobPositionFromValue(value: number): number {
    return (value - 0.5) * (this.size.x - this.knobSize.x)
  }

  private get trackLength(): number {
    return this.size.x - this._knobSize.x
  }

  private get stateInterval(): number {
    return (1.0 / (this.numberOfSegments - 1)) * this.trackLength
  }

  protected enableVisuals() {
    super.enableVisuals()
    if (this._initialized) {
      if (!isNull(this.knobVisual) && this.knobVisual) {
        this.knobVisual.enable()
      }
      if (!isNull(this.trackFillVisual) && this.trackFillVisual) {
        this.trackFillVisual.enable()
      }
    }
  }

  protected disableVisuals() {
    super.disableVisuals()
    if (this._initialized) {
      if (!isNull(this.knobVisual) && this.knobVisual) {
        this.knobVisual.disable()
      }
      if (!isNull(this.trackFillVisual) && this.trackFillVisual) {
        this.trackFillVisual.disable()
      }
    }
  }

  protected release(): void {
    this._updateKnobPositionCancelSet.cancel()
    if (!isNull(this.knobVisual) && this.knobVisual) {
      this._knobVisual?.destroy()
    }
    this._knobVisual = null
    if (!isNull(this.trackFillVisual) && this.trackFillVisual) {
      this._trackFillVisual.destroy()
    }
    this._trackFillVisual = null
    super.release()
  }
}
