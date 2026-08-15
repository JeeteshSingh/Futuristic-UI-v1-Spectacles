import animate, {CancelSet} from "SpectaclesInteractionKit.lspkg/Utils/animate"
import {StateName} from "../Components/Element"
import {DropShadow} from "../DropShadow"
import {Visual, VisualArgs, VisualParameters, VisualState} from "./Visual"

/**
 * Style parameters for `DropShadowVisual` across all UI states.
 *
 * Extends `VisualParameters` and adds drop-shadow specific properties
 * that can be provided per-state.
 */
export type DropShadowVisualParameters = {
  default: DropShadowVisualState
  hovered: DropShadowVisualState
  triggered: DropShadowVisualState
  toggledDefault: DropShadowVisualState
  toggledHovered: DropShadowVisualState
  toggledTriggered: DropShadowVisualState
  inactive: DropShadowVisualState
} & VisualParameters

/**
 * Per-state visual values for a `DropShadowVisual`.
 *
 * - `spread` controls the softness/extent of the shadow.
 * - `sizeOffset` expands the size (xy) relative to the base size.
 */
export type DropShadowVisualState = {
  spread?: number
  sizeOffset?: vec2
} & VisualState

const DEFAULT_SIZE_OFFSET = new vec2(0.5, 0.5)
const DEFAULT_SPREAD = 0.5

/**
 * Visual implementation that renders a drop shadow quad using the
 * underlying `DropShadow` component. Adds support for stateful
 * `sizeOffset` and `spread` with animated transitions.
 */
export class DropShadowVisual extends Visual {
  private defaultSizeOffset: vec2 = DEFAULT_SIZE_OFFSET
  private hoveredSizeOffset: vec2 = DEFAULT_SIZE_OFFSET
  private triggeredSizeOffset: vec2 = DEFAULT_SIZE_OFFSET
  private inactiveSizeOffset: vec2 = DEFAULT_SIZE_OFFSET
  private toggledDefaultSizeOffset: vec2 = DEFAULT_SIZE_OFFSET
  private toggledHoveredSizeOffset: vec2 = DEFAULT_SIZE_OFFSET
  private toggledTriggeredSizeOffset: vec2 = DEFAULT_SIZE_OFFSET

  private defaultSpread: number = DEFAULT_SPREAD
  private hoveredSpread: number = DEFAULT_SPREAD
  private triggeredSpread: number = DEFAULT_SPREAD
  private inactiveSpread: number = DEFAULT_SPREAD
  private toggledDefaultSpread: number = DEFAULT_SPREAD
  private toggledHoveredSpread: number = DEFAULT_SPREAD
  private toggledTriggeredSpread: number = DEFAULT_SPREAD

  private sizeOffsetCancelSet: CancelSet = new CancelSet()
  private spreadCancelSet: CancelSet = new CancelSet()

  private currentSizeOffset: vec2 = this.defaultSizeOffset

  private _dropShadowVisualStates: Map<StateName, DropShadowVisualState>
  protected _state: DropShadowVisualState = undefined
  protected prevState: DropShadowVisualState = undefined

  /**
   * Gets the size of the drop shadow visual.
   *
   * @returns {vec3} The size of the drop shadow visual.
   */
  public get size(): vec3 {
    return super.size
  }

  /**
   * Sets the size of the drop shadow visual.
   * Updates both the internal `_size` and the `dropShadow.size` properties.
   *
   * @param size - A `vec3` representing the dimensions of the drop shadow visual.
   */
  public set size(size: vec3) {
    if (size === undefined) {
      return
    }
    super.size = size
    if (this.initialized) {
      this.dropShadow.size = size.add(new vec3(this.currentSizeOffset.x, this.currentSizeOffset.y, 0))
    }
  }

  /**
   * Gets the underlying render visual for the drop shadow visual.
   *
   * @returns {RenderMeshVisual} The render mesh visual used to render the shadow.
   */
  public get renderMeshVisual(): RenderMeshVisual {
    return this.dropShadow?.renderMeshVisual ?? null
  }

  /**
   * Gets whether the drop shadow visual supports a border.
   *
   * @returns {boolean} Whether the drop shadow visual supports a border.
   */
  public get hasBorder(): boolean {
    return false
  }

  /**
   * Gets the border size of the drop shadow visual.
   *
   * @returns {number} The border size of the drop shadow visual.
   */
  public get borderSize(): number {
    return 0
  }

  /**
   * Gets the corner radius of the drop shadow visual.
   *
   * @returns {number} The corner radius in world units.
   */
  public get cornerRadius(): number {
    return this.dropShadow?.cornerRadius ?? 0
  }

  /**
   * Sets the corner radius of the drop shadow visual.
   *
   * @param value - The corner radius in world units.
   */
  public set cornerRadius(value: number) {
    this.dropShadow.cornerRadius = value
  }

  /**
   * Gets the base color of the drop shadow visual.
   *
   * @returns {vec4} The RGBA color.
   */
  public get baseColor(): vec4 {
    return this.dropShadow?.color ?? undefined
  }

  /**
   * Sets the base color of the drop shadow visual.
   *
   * @param value - A `vec4` representing the RGBA color.
   */
  protected set baseColor(value: vec4) {
    this.dropShadow.color = value
  }

  /**
   * Creates a `DropShadow` component on the provided `sceneObject` and
   * initializes default state values.
   *
   * @param args - Visual construction arguments including `sceneObject`.
   */
  public constructor(args: VisualArgs) {
    super(args)
    this._sceneObject = args.sceneObject
    this.dropShadow = this._sceneObject.createComponent(DropShadow.getTypeName())
    this.managedComponents.push(this.dropShadow)
    this._transform = this._sceneObject.getTransform()
    this.initialize()
  }

  /** Cancels in-flight animations and destroys base resources. */
  public destroy(): void {
    this.sizeOffsetCancelSet.cancel()
    this.spreadCancelSet.cancel()
    super.destroy()
  }

  /**
   * Applies a new visual state and animates stateful properties.
   *
   * Updates the current `sizeOffset` and `spread` based on the target state
   * using this visual's `animateDuration` easing.
   *
   * @param stateName - The visual state to apply.
   */
  public setState(stateName: StateName) {
    if (this._state === this.visualStates.get(stateName)) {
      // skip redundant calls
      return
    }
    super.setState(stateName)
    this.updateSizeOffset(this._state.sizeOffset)
    this.updateSpread(this._state.spread)
  }

  protected updateSizeOffset(sizeOffset: vec2) {
    this.sizeOffsetCancelSet.cancel()
    const initialSizeOffset = this.currentSizeOffset
    if (initialSizeOffset.distance(sizeOffset) === 0) {
      return
    }
    animate({
      cancelSet: this.sizeOffsetCancelSet,
      easing: "ease-out-quad",
      update: (t) => {
        this.currentSizeOffset = vec2.lerp(initialSizeOffset, sizeOffset, t)
        this.dropShadow.size = this.size.add(new vec3(this.currentSizeOffset.x, this.currentSizeOffset.y, 0))
      },
      duration: this.prevState
        ? (this.animateDuration * initialSizeOffset.distance(sizeOffset)) /
          this.prevState.sizeOffset.distance(sizeOffset)
        : this.animateDuration
    })
  }

  protected updateSpread(spread: number) {
    this.spreadCancelSet.cancel()
    const initialSpread = this.dropShadow.spread
    if (Math.abs(initialSpread - spread) === 0) {
      return
    }
    animate({
      cancelSet: this.spreadCancelSet,
      easing: "ease-out-quad",
      update: (t) => {
        this.dropShadow.spread = MathUtils.lerp(initialSpread, spread, t)
      },
      duration: this.prevState
        ? (this.animateDuration * Math.abs(initialSpread - spread)) / Math.abs(this.prevState.spread - spread)
        : this.animateDuration
    })
  }

  protected applyStyleParameters(parameters: Partial<DropShadowVisualParameters>) {
    // First call the parent method to handle base VisualState properties
    super.applyStyleParameters(parameters)

    this.applyStyleProperty<Partial<DropShadowVisualParameters>, DropShadowVisualState, vec2>(
      parameters,
      "sizeOffset",
      {
        default: (value) => (this.defaultSizeOffset = value),
        hovered: (value) => (this.hoveredSizeOffset = value),
        triggered: (value) => (this.triggeredSizeOffset = value),
        inactive: (value) => (this.inactiveSizeOffset = value),
        toggledDefault: (value) => (this.toggledDefaultSizeOffset = value),
        toggledHovered: (value) => (this.toggledHoveredSizeOffset = value),
        toggledTriggered: (value) => (this.toggledTriggeredSizeOffset = value)
      }
    )

    this.applyStyleProperty<Partial<DropShadowVisualParameters>, DropShadowVisualState, number>(parameters, "spread", {
      default: (value) => (this.defaultSpread = value),
      hovered: (value) => (this.hoveredSpread = value),
      triggered: (value) => (this.triggeredSpread = value),
      inactive: (value) => (this.inactiveSpread = value),
      toggledDefault: (value) => (this.toggledDefaultSpread = value),
      toggledHovered: (value) => (this.toggledHoveredSpread = value),
      toggledTriggered: (value) => (this.toggledTriggeredSpread = value)
    })
  }

  /**
   * Gets the map of visual states for the drop shadow visual.
   *
   * @returns {Map<StateName, DropShadowVisualState>} The map of visual states.
   */
  protected get visualStates(): Map<StateName, DropShadowVisualState> {
    return this._dropShadowVisualStates
  }

  protected updateVisualStates(): void {
    this._dropShadowVisualStates = new Map([
      [
        StateName.default,
        {
          baseColor: this.baseDefaultColor,
          shouldPosition: this.defaultShouldPosition,
          shouldScale: this.defaultShouldScale,
          localScale: this.defaultScale,
          localPosition: this.defaultPosition,
          sizeOffset: this.defaultSizeOffset,
          spread: this.defaultSpread
        }
      ],
      [
        StateName.hovered,
        {
          baseColor: this.baseHoveredColor,
          shouldPosition: this.hoveredShouldPosition,
          shouldScale: this.hoveredShouldScale,
          sizeOffset: this.hoveredSizeOffset,
          spread: this.hoveredSpread
        }
      ],
      [
        StateName.triggered,
        {
          baseColor: this.baseTriggeredColor,
          shouldPosition: this.triggeredShouldPosition,
          shouldScale: this.triggeredShouldScale,
          sizeOffset: this.triggeredSizeOffset,
          spread: this.triggeredSpread
        }
      ],
      [
        StateName.toggledHovered,
        {
          baseColor: this.baseToggledHoveredColor,
          shouldPosition: this.toggledHoveredShouldPosition,
          shouldScale: this.toggledHoveredShouldScale,
          sizeOffset: this.toggledHoveredSizeOffset,
          spread: this.toggledHoveredSpread
        }
      ],
      [
        StateName.toggledDefault,
        {
          baseColor: this.baseToggledDefaultColor,
          shouldPosition: this.toggledDefaultShouldPosition,
          shouldScale: this.toggledDefaultShouldScale,
          sizeOffset: this.toggledDefaultSizeOffset,
          spread: this.toggledDefaultSpread
        }
      ],
      [
        StateName.toggledTriggered,
        {
          baseColor: this.baseToggledTriggeredColor,
          shouldPosition: this.toggledTriggeredShouldPosition,
          shouldScale: this.toggledTriggeredShouldScale,
          sizeOffset: this.toggledTriggeredSizeOffset,
          spread: this.toggledTriggeredSpread
        }
      ],
      [
        StateName.error,
        {
          baseColor: this.baseErrorColor,
          shouldPosition: this.defaultShouldPosition,
          shouldScale: this.defaultShouldScale,
          localScale: this.errorScale,
          localPosition: this.errorPosition,
          sizeOffset: this.defaultSizeOffset,
          spread: this.defaultSpread
        }
      ],
      [
        StateName.errorHovered,
        {
          baseColor: this.baseErrorColor,
          shouldPosition: this.hoveredShouldPosition,
          shouldScale: this.hoveredShouldScale,
          localScale: this.hoveredScale,
          localPosition: this.errorPosition,
          sizeOffset: this.hoveredSizeOffset,
          spread: this.hoveredSpread
        }
      ],
      [
        StateName.inactive,
        {
          baseColor: this.baseInactiveColor,
          shouldPosition: this.inactiveShouldPosition,
          shouldScale: this.inactiveShouldScale,
          localScale: this.inactiveScale,
          localPosition: this.inactivePosition,
          sizeOffset: this.inactiveSizeOffset,
          spread: this.inactiveSpread
        }
      ]
    ])
    super.updateVisualStates()
  }

  /**
   * Gets the underlying `DropShadow` component.
   *
   * @returns {DropShadow} The underlying drop shadow component.
   */
  private get dropShadow(): DropShadow {
    return this._visualComponent as DropShadow
  }

  /**
   * Sets the underlying `DropShadow` component.
   *
   * @param value - The drop shadow component.
   */
  private set dropShadow(value: DropShadow) {
    this._visualComponent = value
  }
}
