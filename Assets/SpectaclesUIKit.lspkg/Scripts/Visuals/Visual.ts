import animate, {CancelSet} from "SpectaclesInteractionKit.lspkg/Utils/animate"
import {HSLToRGB, withAlpha} from "SpectaclesInteractionKit.lspkg/Utils/color"
import Event from "SpectaclesInteractionKit.lspkg/Utils/Event"
import {StateName} from "../Components/Element"
import {SnapOS2} from "../Themes/SnapOS-2.0/SnapOS2"
import {colorDistance, colorLerp, isEqual} from "../Utility/UIKitUtilities"

export const COLORS: {[key: string]: vec4} = {
  gray: withAlpha(HSLToRGB(new vec3(0, 0, 0.4)), 1),
  darkGray: withAlpha(HSLToRGB(new vec3(0, 0, 0.24)), 1),
  lightGray: withAlpha(HSLToRGB(new vec3(0, 0, 0.56)), 1),
  brightYellow: withAlpha(HSLToRGB(new vec3(47.7, 0.8, 0.55)), 1),
  brighterYellow: withAlpha(HSLToRGB(new vec3(41.7, 0.847, 0.9253)), 1)
}

// mesh
export const ERROR_COLOR = new vec4(0.8, 0.2, 0.2, 1)
export const INACTIVE_COLOR = new vec4(0.2, 0.2, 0.2, 0.2)

const DEFAULT_FADE_DURATION: number = 0.2

export type VisualState = {
  baseColor?: vec4
  shouldPosition?: boolean
  shouldScale?: boolean
  localScale?: vec3
  localPosition?: vec3
}

export type VisualParameters = {
  default: VisualState
  hovered: VisualState
  triggered: VisualState
  toggledDefault: VisualState
  toggledHovered: VisualState
  inactive: VisualState
}

export type VisualStyleKey = {
  visualElementType: string
  style: string
}

export type VisualArgs = {
  sceneObject: SceneObject
  style?: VisualStyleKey | Partial<VisualParameters>
}

type ScaleChangeArgs = {
  from: vec3
  current: vec3
}

/**
 * The `Visual` abstract class serves as a base class for creating visual components
 * with customizable states, animations, and interactions. It provides a framework
 * for managing visual properties such as color, scale, and position states.
 *
 * @abstract
 */
export abstract class Visual {
  protected _sceneObject: SceneObject
  protected _transform: Transform
  protected _visualComponent: ScriptComponent

  private _size: vec3 = new vec3(1, 1, 1)

  private _currentPosition: vec3 = vec3.zero()
  private _currentScale: vec3 = vec3.one()

  private _defaultShouldPosition: boolean = false
  private _hoveredShouldPosition: boolean = false
  private _triggeredShouldPosition: boolean = false
  private _inactiveShouldPosition: boolean = false
  private _toggledDefaultShouldPosition: boolean = false
  private _toggledHoveredShouldPosition: boolean = false
  private _toggledTriggeredShouldPosition: boolean = false

  private _defaultShouldScale: boolean = false
  private _hoveredShouldScale: boolean = false
  private _triggeredShouldScale: boolean = false
  private _inactiveShouldScale: boolean = false
  private _toggledDefaultShouldScale: boolean = false
  private _toggledHoveredShouldScale: boolean = false
  private _toggledTriggeredShouldScale: boolean = false

  private _defaultPosition: vec3 = vec3.zero()
  private _hoveredPosition: vec3 = vec3.zero()
  private _triggeredPosition: vec3 = new vec3(0, 0, 0.5)
  private _toggledPosition: vec3 = vec3.forward()
  private _toggledHoveredPosition: vec3 = vec3.forward()
  private _toggledTriggeredPosition: vec3 = new vec3(0, 0, 0.5)
  private _inactivePosition: vec3 = vec3.zero()
  private _errorPosition: vec3 = vec3.zero()

  private _defaultScale: vec3 = vec3.one()
  private _hoveredScale: vec3 = vec3.one()
  private _triggeredScale: vec3 = new vec3(0.9, 0.9, 0.9)
  private _toggledScale: vec3 = new vec3(1.05, 1.05, 1.05)
  private _toggledHoveredScale: vec3 = new vec3(1.05, 1.05, 1.05)
  private _toggledTriggeredScale: vec3 = new vec3(1, 1, 1)
  private _inactiveScale: vec3 = vec3.one()
  private _errorScale: vec3 = vec3.one()

  protected _defaultColor: vec4 = COLORS.darkGray
  protected _hoveredColor: vec4 = COLORS.brightYellow
  protected _triggeredColor: vec4 = COLORS.brightYellow.uniformScale(0.3)
  protected _toggledDefaultColor: vec4 = COLORS.brightYellow.uniformScale(0.3)
  protected _toggledHoveredColor: vec4 = COLORS.brightYellow.uniformScale(0.3)
  protected _toggledTriggeredColor: vec4 = COLORS.brightYellow.uniformScale(0.3)
  protected _inactiveColor: vec4 = INACTIVE_COLOR
  protected _errorColor: vec4 = ERROR_COLOR

  private _shouldColorChange: boolean = true
  private _shouldScale: boolean = false
  private _shouldTranslate: boolean = false

  protected prevState: VisualState = undefined
  protected _state: VisualState = undefined
  private stateName: StateName = StateName.default

  protected visualArgs: VisualArgs

  protected initialized = false

  // Amount of time it takes to animate 1 unit of distance
  private _animateDuration: number = DEFAULT_FADE_DURATION

  private _colorChangeCancelSet: CancelSet = new CancelSet()
  private _updateScaleCancelSet: CancelSet = new CancelSet()
  private _updatePositionCancelSet: CancelSet = new CancelSet()

  private onInitializedEvent: Event<void> = new Event<void>()
  public readonly onInitialized = this.onInitializedEvent.publicApi()
  private onDestroyedEvent: Event<void> = new Event<void>()
  public readonly onDestroyed = this.onDestroyedEvent.publicApi()

  private onScaleChangedEvent: Event<ScaleChangeArgs> = new Event<ScaleChangeArgs>()
  public readonly onScaleChanged = this.onScaleChangedEvent.publicApi()
  private onPositionChangedEvent: Event<ScaleChangeArgs> = new Event<ScaleChangeArgs>()
  public readonly onPositionChanged = this.onPositionChangedEvent.publicApi()

  public abstract get renderMeshVisual(): RenderMeshVisual
  public abstract get hasBorder(): boolean
  public abstract get borderSize(): number
  public abstract get baseColor(): vec4
  protected abstract set baseColor(value: vec4)
  protected abstract get visualStates(): Map<StateName, VisualState>
  protected needsVisualStateUpdate: boolean = true

  protected managedComponents: Component[] = []

  /**
   * Gets the associated `SceneObject` instance.
   *
   * @returns {SceneObject} The `SceneObject` associated with this visual.
   */
  public get sceneObject(): SceneObject {
    return this._sceneObject
  }

  /**
   * Gets the transform associated with this visual.
   *
   * @returns {Transform} The current transform of the visual.
   */
  public get transform(): Transform {
    return this._transform
  }

  /**
   * Gets the size of the visual element.
   *
   * @returns A `vec3` representing the dimensions of the visual element.
   */
  public get size(): vec3 {
    return this._size
  }

  /**
   * Sets the size of the visual element.
   * Updates both the internal `_size` property.
   *
   * @param size - A `vec3` object representing the dimensions of the visual element.
   */
  public set size(size: vec3) {
    if (size === undefined) {
      return
    }
    this._size = size
  }

  /**
   * Determines whether the color should change when transition to a new state.
   *
   * @returns {boolean} A boolean value indicating if the color change is enabled.
   */
  public get shouldColorChange(): boolean {
    return this._shouldColorChange
  }

  /**
   * Sets whether to enable the color changing behavior for the visual.
   *
   * @param shouldColorChange - A boolean indicating whether the color change is enabled (`true`) or disabled (`false`).
   */
  public set shouldColorChange(shouldColorChange: boolean) {
    if (shouldColorChange === undefined) {
      return
    }
    if (isEqual<boolean>(this._shouldColorChange, shouldColorChange)) {
      return
    }
    const wasColorChanging = this._shouldColorChange
    this._shouldColorChange = shouldColorChange
    if (wasColorChanging && !this._shouldColorChange) {
      this._colorChangeCancelSet.cancel()
    }
  }

  /**
   * Gets the default base color for the visual element.
   *
   * @returns A `vec4` representing the current base default color.
   */
  public get baseDefaultColor(): vec4 {
    return this._defaultColor
  }

  /**
   * Sets the default base color for the visual element.
   *
   * @param baseDefaultColor - A `vec4` representing the RGBA color to be used as the default.
   */
  public set baseDefaultColor(baseDefaultColor: vec4) {
    if (baseDefaultColor === undefined) {
      return
    }
    if (isEqual<vec4>(this._defaultColor, baseDefaultColor)) {
      return
    }
    this._defaultColor = baseDefaultColor
    if (!this._shouldColorChange) {
      this.baseColor = baseDefaultColor
    }
    if (this.initialized) {
      this.needsVisualStateUpdate = true
    }
  }

  /**
   * Gets the hovered color for the visual element.
   *
   * @returns A `vec4` representing the current hovered color.
   */
  public get baseHoveredColor(): vec4 {
    return this._hoveredColor
  }

  /**
   *  Sets the hovered color for the visual element.
   *
   * @returns A `vec4` representing the current base hovered color.
   */
  public set baseHoveredColor(baseHoveredColor: vec4) {
    if (baseHoveredColor === undefined) {
      return
    }
    if (isEqual<vec4>(this._hoveredColor, baseHoveredColor)) {
      return
    }
    this._hoveredColor = baseHoveredColor
    if (this.initialized) {
      this.needsVisualStateUpdate = true
    }
  }

  /**
   * Gets the triggered color for the visual element.
   *
   * @returns A `vec4` representing the current triggered color.
   */
  public get baseTriggeredColor(): vec4 {
    return this._triggeredColor
  }

  /**
   * Gets the triggered color for the visual element.
   *
   * @returns A `vec4` representing the current triggered color.
   */
  public set baseTriggeredColor(baseTriggeredColor: vec4) {
    if (baseTriggeredColor === undefined) {
      return
    }
    if (isEqual<vec4>(this._triggeredColor, baseTriggeredColor)) {
      return
    }
    this._triggeredColor = baseTriggeredColor
    if (this.initialized) {
      this.needsVisualStateUpdate = true
    }
  }

  /**
   * Gets the toggled default color for the visual element.
   *
   * @returns A `vec4` representing the current toggled default color.
   */
  public get baseToggledDefaultColor(): vec4 {
    return this._toggledDefaultColor
  }

  /**
   * Sets the toggled default color for the visual element.
   *
   * @param baseToggledDefaultColor - A `vec4` representing the RGBA color to be used as the toggled default color.
   */
  public set baseToggledDefaultColor(baseToggledDefaultColor: vec4) {
    if (baseToggledDefaultColor === undefined) {
      return
    }
    if (isEqual<vec4>(this._toggledDefaultColor, baseToggledDefaultColor)) {
      return
    }
    this._toggledDefaultColor = baseToggledDefaultColor
    if (this.initialized) {
      this.needsVisualStateUpdate = true
    }
  }

  /**
   * Gets the toggled hovered color for the visual element.
   *
   * @returns A `vec4` representing the current toggled hovered color.
   */
  public get baseToggledHoveredColor(): vec4 {
    return this._toggledHoveredColor
  }

  /**
   * Sets the toggled hovered color for the visual element.
   *
   * @param baseToggledHoveredColor - A `vec4` representing the RGBA color to be used as the toggled hovered color.
   */
  public set baseToggledHoveredColor(baseToggledHoveredColor: vec4) {
    if (baseToggledHoveredColor === undefined) {
      return
    }
    if (isEqual<vec4>(this._toggledHoveredColor, baseToggledHoveredColor)) {
      return
    }
    this._toggledHoveredColor = baseToggledHoveredColor
    if (this.initialized) {
      this.needsVisualStateUpdate = true
    }
  }

  /**
   * Gets the toggled triggered color for the visual element.
   *
   * @returns A `vec4` representing the current toggled triggered color.
   */
  public get baseToggledTriggeredColor(): vec4 {
    return this._toggledTriggeredColor
  }

  /**
   * Sets the toggled triggered color for the visual element.
   *
   * @param baseToggledTriggeredColor - A `vec4` representing the RGBA color to be used as the toggled triggered color.
   */
  public set baseToggledTriggeredColor(baseToggledTriggeredColor: vec4) {
    if (baseToggledTriggeredColor === undefined) {
      return
    }
    if (isEqual<vec4>(this._toggledTriggeredColor, baseToggledTriggeredColor)) {
      return
    }
    this._toggledTriggeredColor = baseToggledTriggeredColor
    if (this.initialized) {
      this.needsVisualStateUpdate = true
    }
  }

  /**
   * Gets the inactive color for the visual element.
   *
   * @returns A `vec4` representing the current inactive color.
   */
  public get baseInactiveColor(): vec4 {
    return this._inactiveColor
  }

  /**
   * Sets the inactive color for the visual element.
   *
   * @param baseInactiveColor - A `vec4` representing the RGBA color to be used as the inactive color.
   */
  public set baseInactiveColor(baseInactiveColor: vec4) {
    if (baseInactiveColor === undefined) {
      return
    }
    if (isEqual<vec4>(this._inactiveColor, baseInactiveColor)) {
      return
    }
    this._inactiveColor = baseInactiveColor
    if (this.initialized) {
      this.needsVisualStateUpdate = true
    }
  }

  /**
   * Gets the error color for the visual element.
   *
   * @returns A `vec4` representing the current error color.
   */
  public get baseErrorColor(): vec4 {
    return this._errorColor
  }

  /**
   * Sets the error color for the visual element.
   *
   * @param baseErrorColor - A `vec4` representing the RGBA color to be used as the error color.
   */
  public set baseErrorColor(baseErrorColor: vec4) {
    if (baseErrorColor === undefined) {
      return
    }
    if (isEqual<vec4>(this._errorColor, baseErrorColor)) {
      return
    }
    this._errorColor = baseErrorColor
    if (this.initialized) {
      this.needsVisualStateUpdate = true
    }
  }

  /**
   * Determines whether the visual element should scale when transitioning to a new state
   *
   * @returns {boolean} `true` if the visual element should scale, otherwise `false`.
   */
  public get shouldScale(): boolean {
    return this._shouldScale
  }

  /**
   * Gets the default scale of the visual element.
   *
   * @returns A `vec3` representing the current default scale.
   */
  public get defaultScale(): vec3 {
    return this._defaultScale
  }

  /**
   * Sets the default scale of the visual and initializes its visual states.
   *
   * @param scale - A `vec3` object representing the default scale to be applied.
   */
  public set defaultScale(scale: vec3) {
    if (scale === undefined) {
      return
    }
    if (isEqual<vec3>(this._defaultScale, scale)) {
      return
    }
    this._defaultScale = scale
    if (this.initialized) {
      this.needsVisualStateUpdate = true
    }
  }

  /**
   * Gets the hovered scale of the visual element.
   *
   * @returns A `vec3` representing the current hovered scale.
   */
  public get hoveredScale(): vec3 {
    return this._hoveredScale
  }

  /**
   * Sets the hovered scale for the visual element and initializes its visual states.
   *
   * @param hoveredScale - A `vec3` object representing the hovered scale to be applied.
   */
  public set hoveredScale(hoveredScale: vec3) {
    if (hoveredScale === undefined) {
      return
    }
    if (isEqual<vec3>(this._hoveredScale, hoveredScale)) {
      return
    }
    this._hoveredScale = hoveredScale
    if (this.initialized) {
      this.needsVisualStateUpdate = true
    }
  }

  /**
   * Gets the triggered scale of the visual element.
   *
   * @returns A `vec3` representing the current triggered scale.
   */
  public get triggeredScale(): vec3 {
    return this._triggeredScale
  }

  /**
   * Sets the triggered scale of the visual and initializes its visual states.
   *
   * @param scale - A `vec3` representing the scale to be applied to the visual.
   */
  public set triggeredScale(scale: vec3) {
    if (scale === undefined) {
      return
    }
    if (isEqual<vec3>(this._triggeredScale, scale)) {
      return
    }
    this._triggeredScale = scale
    if (this.initialized) {
      this.needsVisualStateUpdate = true
    }
  }

  /**
   * Gets the toggled scale of the visual element.
   *
   * @returns A `vec3` representing the current toggled scale.
   */
  public get toggledScale(): vec3 {
    return this._toggledScale
  }

  /**
   * Sets the scale to be applied when the visual is toggled and initializes its visual states.
   *
   * @param scale - A `vec3` representing the new scale to apply when toggled.
   */
  public set toggledScale(scale: vec3) {
    if (scale === undefined) {
      return
    }
    if (isEqual<vec3>(this._toggledScale, scale)) {
      return
    }
    this._toggledScale = scale
    if (this.initialized) {
      this.needsVisualStateUpdate = true
    }
  }

  /**
   * Gets the toggled hovered scale of the visual element.
   *
   * @returns A `vec3` representing the current toggled hovered scale.
   */
  public get toggledHoveredScale(): vec3 {
    return this._toggledHoveredScale
  }

  /**
   * Sets the scale to be applied when the visual is toggled and hovered.
   *
   * @param toggledHoveredScale - A `vec3` representing the new scale to apply when toggled and hovered.
   */
  public set toggledHoveredScale(toggledHoveredScale: vec3) {
    if (toggledHoveredScale === undefined) {
      return
    }
    if (isEqual<vec3>(this._toggledHoveredScale, toggledHoveredScale)) {
      return
    }
    this._toggledHoveredScale = toggledHoveredScale
    if (this.initialized) {
      this.needsVisualStateUpdate = true
    }
  }

  /**
   * Gets the toggled triggered scale of the visual element.
   *
   * @returns A `vec3` representing the current toggled triggered scale.
   */
  public get toggledTriggeredScale(): vec3 {
    return this._toggledTriggeredScale
  }

  /**
   * Sets the toggled triggered scale of the visual element.
   *
   * @param scale - A `vec3` object representing the new toggled triggered scale.
   */
  public set toggledTriggeredScale(scale: vec3) {
    if (scale === undefined) {
      return
    }
    if (isEqual<vec3>(this._toggledTriggeredScale, scale)) {
      return
    }
    this._toggledTriggeredScale = scale
    if (this.initialized) {
      this.needsVisualStateUpdate = true
    }
  }

  /**
   * Gets the scale applied when the visual is in a inactive state.
   *
   * @returns A `vec3` representing the current inactive scale.
   */
  public get inactiveScale(): vec3 {
    return this._inactiveScale
  }

  /**
   * Sets the scale to be applied when the visual is in a inactive state and initializes its visual states.
   *
   * @param scale - A `vec3` object representing the scale to apply in the inactive state.
   */
  public set inactiveScale(scale: vec3) {
    if (scale === undefined) {
      return
    }
    if (isEqual<vec3>(this._inactiveScale, scale)) {
      return
    }
    this._inactiveScale = scale
    if (this.initialized) {
      this.needsVisualStateUpdate = true
    }
  }

  /**
   * Gets the scale applied when the visual is in an error state.
   *
   * @returns A `vec3` representing the current error scale.
   */
  public get errorScale(): vec3 {
    return this._errorScale
  }

  /**
   * Sets the scale for the error visualization and initializes its visual states.
   *
   * @param scale - A `vec3` object representing the scale to be applied to the error visualization.
   */
  public set errorScale(scale: vec3) {
    if (scale === undefined) {
      return
    }
    if (isEqual<vec3>(this._errorScale, scale)) {
      return
    }
    this._errorScale = scale
    if (this.initialized) {
      this.needsVisualStateUpdate = true
    }
  }

  /**
   * Indicates whether the visual element should be translated when transitioning to a new state.
   *
   * @returns {boolean} `true` if the visual element should be translated; otherwise, `false`.
   */
  public get shouldTranslate(): boolean {
    return this._shouldTranslate
  }

  /**
   * Gets the default position of the visual element.
   *
   * @returns A `vec3` representing the current default position.
   */
  public get defaultPosition(): vec3 {
    return this._defaultPosition
  }

  /**
   * Sets the default position of the visual element.
   *
   * @param position - A `vec3` object representing the new default position.
   */
  public set defaultPosition(position: vec3) {
    if (position === undefined) {
      return
    }
    if (isEqual<vec3>(this._defaultPosition, position)) {
      return
    }
    this._defaultPosition = position
    if (this.initialized) {
      this.needsVisualStateUpdate = true
      if (!this._shouldTranslate) {
        this._transform.setLocalPosition(position)
      }
    }
  }

  /**
   * Gets the hovered position of the visual element.
   *
   * @returns A `vec3` representing the current hovered position.
   */
  public get hoveredPosition(): vec3 {
    return this._hoveredPosition
  }

  /**
   * Gets the hovered position of the visual element.
   *
   * @returns A `vec3` representing the new hovered position.
   */
  public set hoveredPosition(hoveredPosition: vec3) {
    if (hoveredPosition === undefined) {
      return
    }
    if (isEqual<vec3>(this._hoveredPosition, hoveredPosition)) {
      return
    }
    this._hoveredPosition = hoveredPosition
    if (this.initialized) {
      this.needsVisualStateUpdate = true
    }
  }

  /**
   * Gets the triggered position of the visual element.
   *
   * @returns A `vec3` representing the current triggered position.
   */
  public get triggeredPosition(): vec3 {
    return this._triggeredPosition
  }

  /**
   * Sets the triggered position of the visual element.
   *
   * @param position - A `vec3` object representing the new triggered position.
   */
  public set triggeredPosition(position: vec3) {
    if (position === undefined) {
      return
    }
    if (isEqual<vec3>(this._triggeredPosition, position)) {
      return
    }
    this._triggeredPosition = position
    if (this.initialized) {
      this.needsVisualStateUpdate = true
    }
  }

  /**
   * Gets the toggled position of the visual element.
   *
   * @returns A `vec3` representing the current toggled position.
   */
  public get toggledPosition(): vec3 {
    return this._toggledPosition
  }

  /**
   * Sets the toggled position of the visual element.
   *
   * @param position - A `vec3` object representing the new toggled position.
   */
  public set toggledPosition(position: vec3) {
    if (position === undefined) {
      return
    }
    if (isEqual<vec3>(this._toggledPosition, position)) {
      return
    }
    this._toggledPosition = position
    if (this.initialized) {
      this.needsVisualStateUpdate = true
    }
  }

  /**
   * Gets the toggled hovered position for the visual element.
   *
   * @returns A `vec3` representing the current toggled hovered position.
   */
  public get toggledHoveredPosition(): vec3 {
    return this._toggledHoveredPosition
  }

  /**
   * Sets the toggled hovered position for the visual element.
   *
   * @param toggledHoveredPosition - A `vec3` object representing the new toggled hovered position.
   */
  public set toggledHoveredPosition(toggledHoveredPosition: vec3) {
    if (toggledHoveredPosition === undefined) {
      return
    }
    if (isEqual<vec3>(this._toggledHoveredPosition, toggledHoveredPosition)) {
      return
    }
    this._toggledHoveredPosition = toggledHoveredPosition
    if (this.initialized) {
      this.needsVisualStateUpdate = true
    }
  }

  /**
   * Gets the toggled triggered position of the visual element.
   *
   * @returns A `vec3` representing the current toggled triggered position.
   */
  public get toggledTriggeredPosition(): vec3 {
    return this._toggledTriggeredPosition
  }

  /**
   * Sets the toggled triggered position of the visual element.
   *
   * @param position - A `vec3` object representing the new toggled triggered position.
   */
  public set toggledTriggeredPosition(position: vec3) {
    if (position === undefined) {
      return
    }
    if (isEqual<vec3>(this._toggledTriggeredPosition, position)) {
      return
    }
    this._toggledTriggeredPosition = position
    if (this.initialized) {
      this.needsVisualStateUpdate = true
    }
  }

  /**
   * Gets the position of the visual element when it is in a inactive state.
   *
   * @returns A `vec3` representing the current inactive position.
   */
  public get inactivePosition(): vec3 {
    return this._inactivePosition
  }

  /**
   * Sets the position of the visual element when it is in a inactive state.
   *
   * @param position - A `vec3` object representing the new position for the inactive state.
   */
  public set inactivePosition(position: vec3) {
    if (position === undefined) {
      return
    }
    if (isEqual<vec3>(this._inactivePosition, position)) {
      return
    }
    this._inactivePosition = position
    if (this.initialized) {
      this.needsVisualStateUpdate = true
    }
  }

  /**
   * Gets the position of the visual element when it is in an error state.
   *
   * @returns A `vec3` representing the current error position.
   */
  public get errorPosition(): vec3 {
    return this._errorPosition
  }

  /**
   * Sets the position of the visual element when it is in an error state.
   *
   * @param position - A `vec3` object representing the new position for the error state.
   */
  public set errorPosition(position: vec3) {
    if (position === undefined) {
      return
    }
    if (isEqual<vec3>(this._errorPosition, position)) {
      return
    }
    this._errorPosition = position
    if (this.initialized) {
      this.needsVisualStateUpdate = true
    }
  }

  /**
   * Gets whether the default state should apply position changes.
   *
   * @returns `true` if the default state should apply position changes; otherwise, `false`.
   */
  public get defaultShouldPosition(): boolean {
    return this._defaultShouldPosition
  }

  /**
   * Sets whether the default state should apply position changes and initializes the visual states.
   *
   * @param shouldPosition - A boolean indicating whether the default state should apply position changes.
   */
  public set defaultShouldPosition(shouldPosition: boolean) {
    if (shouldPosition === undefined) {
      return
    }
    if (isEqual<boolean>(this._defaultShouldPosition, shouldPosition)) {
      return
    }
    this._defaultShouldPosition = shouldPosition
    if (this.initialized) {
      this.needsVisualStateUpdate = true
    }
  }

  /**
   * Gets whether the hover state should apply position changes.
   *
   * @returns `true` if the hovered state should apply position changes; otherwise, `false`.
   */
  public get hoveredShouldPosition(): boolean {
    return this._hoveredShouldPosition
  }

  /**
   * Sets whether the hovered state should apply position changes and initializes the visual states.
   *
   * @param hoveredShouldPosition - A boolean indicating whether the hovered state should apply position changes.
   */
  public set hoveredShouldPosition(hoveredShouldPosition: boolean) {
    if (hoveredShouldPosition === undefined) {
      return
    }
    if (isEqual<boolean>(this._hoveredShouldPosition, hoveredShouldPosition)) {
      return
    }
    this._hoveredShouldPosition = hoveredShouldPosition
    if (this.initialized) {
      this.needsVisualStateUpdate = true
    }
  }

  /**
   * Gets whether the triggered state should apply position changes.
   *
   * @returns `true` if the triggered state should apply position changes; otherwise, `false`.
   */
  public get triggeredShouldPosition(): boolean {
    return this._triggeredShouldPosition
  }

  /**
   * Sets whether the triggered state should apply position changes and initializes the visual states.
   *
   * @param shouldPosition - A boolean indicating whether the triggered state should apply position changes.
   */
  public set triggeredShouldPosition(shouldPosition: boolean) {
    if (shouldPosition === undefined) {
      return
    }
    if (isEqual<boolean>(this._triggeredShouldPosition, shouldPosition)) {
      return
    }
    this._triggeredShouldPosition = shouldPosition
    if (this.initialized) {
      this.needsVisualStateUpdate = true
    }
  }

  /**
   * Gets whether the inactive state should apply position changes.
   *
   * @returns `true` if the inactive state should apply position changes; otherwise, `false`.
   */
  public get inactiveShouldPosition(): boolean {
    return this._inactiveShouldPosition
  }

  /**
   * Sets whether the inactive state should apply position changes and initializes the visual states.
   *
   * @param shouldPosition - A boolean indicating whether the inactive state should apply position changes.
   */
  public set inactiveShouldPosition(shouldPosition: boolean) {
    if (shouldPosition === undefined) {
      return
    }
    if (isEqual<boolean>(this._inactiveShouldPosition, shouldPosition)) {
      return
    }
    this._inactiveShouldPosition = shouldPosition
    if (this.initialized) {
      this.needsVisualStateUpdate = true
    }
  }

  /**
   * Gets whether the toggled default state should apply position changes.
   *
   * @returns `true` if the toggled default state should apply position changes; otherwise, `false`.
   */
  public get toggledDefaultShouldPosition(): boolean {
    return this._toggledDefaultShouldPosition
  }

  /**
   * Sets whether the toggled default state should apply position changes and initializes the visual states.
   *
   * @param shouldPosition - A boolean indicating whether the toggled default state should apply position changes.
   */
  public set toggledDefaultShouldPosition(shouldPosition: boolean) {
    if (shouldPosition === undefined) {
      return
    }
    if (isEqual<boolean>(this._toggledDefaultShouldPosition, shouldPosition)) {
      return
    }
    this._toggledDefaultShouldPosition = shouldPosition
    if (this.initialized) {
      this.needsVisualStateUpdate = true
    }
  }

  /**
   * Gets whether the toggled hovered state should apply position changes.
   *
   * @returns `true` if the toggled hovered state should apply position changes; otherwise, `false`.
   */
  public get toggledHoveredShouldPosition(): boolean {
    return this._toggledHoveredShouldPosition
  }

  /**
   * Sets whether the toggled hovered state should apply position changes and initializes the visual states.
   *
   * @param toggledHoveredShouldPosition - A boolean indicating whether the toggled hovered state should apply position changes.
   */
  public set toggledHoveredShouldPosition(toggledHoveredShouldPosition: boolean) {
    if (toggledHoveredShouldPosition === undefined) {
      return
    }
    if (isEqual<boolean>(this._toggledHoveredShouldPosition, toggledHoveredShouldPosition)) {
      return
    }
    this._toggledHoveredShouldPosition = toggledHoveredShouldPosition
    if (this.initialized) {
      this.needsVisualStateUpdate = true
    }
  }

  /**
   * Gets whether the toggled triggered state should apply position changes.
   *
   * @returns `true` if the toggled triggered state should apply position changes; otherwise, `false`.
   */
  public get toggledTriggeredShouldPosition(): boolean {
    return this._toggledTriggeredShouldPosition
  }

  /**
   * Sets whether the toggled triggered state should apply position changes and initializes the visual states.
   *
   * @param shouldPosition - A boolean indicating whether the toggled triggered state should apply position changes.
   */
  public set toggledTriggeredShouldPosition(shouldPosition: boolean) {
    if (shouldPosition === undefined) {
      return
    }
    if (isEqual<boolean>(this._toggledTriggeredShouldPosition, shouldPosition)) {
      return
    }
    this._toggledTriggeredShouldPosition = shouldPosition
    if (this.initialized) {
      this.needsVisualStateUpdate = true
    }
  }

  /**
   * Gets whether the default state should apply scale changes.
   *
   * @returns `true` if the default state should apply scale changes; otherwise, `false`.
   */
  public get defaultShouldScale(): boolean {
    return this._defaultShouldScale
  }

  /**
   * Sets whether the default state should apply scale changes and initializes the visual states.
   *
   * @param shouldScale - A boolean indicating whether the default state should apply scale changes.
   */
  public set defaultShouldScale(shouldScale: boolean) {
    if (shouldScale === undefined) {
      return
    }
    if (isEqual<boolean>(this._defaultShouldScale, shouldScale)) {
      return
    }
    this._defaultShouldScale = shouldScale
    if (this.initialized) {
      this.needsVisualStateUpdate = true
    }
  }

  /**
   * Gets whether the hovered state should apply scale changes.
   *
   * @returns `true` if the hovered state should apply scale changes; otherwise, `false`.
   */
  public get hoveredShouldScale(): boolean {
    return this._hoveredShouldScale
  }

  /**
   * Sets whether the hovered state should apply scale changes and initializes the visual states.
   *
   * @param hoveredShouldScale - A boolean indicating whether the hovered state should apply scale changes.
   */
  public set hoveredShouldScale(hoveredShouldScale: boolean) {
    if (hoveredShouldScale === undefined) {
      return
    }
    if (isEqual<boolean>(this._hoveredShouldScale, hoveredShouldScale)) {
      return
    }
    this._hoveredShouldScale = hoveredShouldScale
    if (this.initialized) {
      this.needsVisualStateUpdate = true
    }
  }

  /**
   * Gets whether the triggered state should apply scale changes.
   *
   * @returns `true` if the triggered state should apply scale changes; otherwise, `false`.
   */
  public get triggeredShouldScale(): boolean {
    return this._triggeredShouldScale
  }

  /**
   * Sets whether the triggered state should apply scale changes and initializes the visual states.
   *
   * @param shouldScale - A boolean indicating whether the triggered state should apply scale changes.
   */
  public set triggeredShouldScale(shouldScale: boolean) {
    if (shouldScale === undefined) {
      return
    }
    if (isEqual<boolean>(this._triggeredShouldScale, shouldScale)) {
      return
    }
    this._triggeredShouldScale = shouldScale
    if (this.initialized) {
      this.needsVisualStateUpdate = true
    }
  }

  /**
   * Gets whether the inactive state should apply scale changes.
   *
   * @returns `true` if the inactive state should apply scale changes; otherwise, `false`.
   */
  public get inactiveShouldScale(): boolean {
    return this._inactiveShouldScale
  }

  /**
   * Sets whether the inactive state should apply scale changes and initializes the visual states.
   *
   * @param shouldScale - A boolean indicating whether the inactive state should apply scale changes.
   */
  public set inactiveShouldScale(shouldScale: boolean) {
    if (shouldScale === undefined) {
      return
    }
    if (isEqual<boolean>(this._inactiveShouldScale, shouldScale)) {
      return
    }
    this._inactiveShouldScale = shouldScale
    if (this.initialized) {
      this.needsVisualStateUpdate = true
    }
  }

  /**
   * Gets whether the toggled default state should apply scale changes.
   *
   * @returns `true` if the toggled default state should apply scale changes; otherwise, `false`.
   */
  public get toggledDefaultShouldScale(): boolean {
    return this._toggledDefaultShouldScale
  }

  /**
   * Sets whether the toggled default state should apply scale changes and initializes the visual states.
   *
   * @param shouldScale - A boolean indicating whether the toggled default state should apply scale changes.
   */
  public set toggledDefaultShouldScale(shouldScale: boolean) {
    if (shouldScale === undefined) {
      return
    }
    if (isEqual<boolean>(this._toggledDefaultShouldScale, shouldScale)) {
      return
    }
    this._toggledDefaultShouldScale = shouldScale
    if (this.initialized) {
      this.needsVisualStateUpdate = true
    }
  }

  /**
   * Gets whether the toggled hovered state should apply scale changes.
   *
   * @returns `true` if the toggled hovered state should apply scale changes; otherwise, `false`.
   */
  public get toggledHoveredShouldScale(): boolean {
    return this._toggledHoveredShouldScale
  }

  /**
   * Sets whether the toggled hovered state should apply scale changes and initializes the visual states.
   *
   * @param toggledHoveredShouldScale - A boolean indicating whether the toggled hovered state should apply scale changes.
   */
  public set toggledHoveredShouldScale(toggledHoveredShouldScale: boolean) {
    if (toggledHoveredShouldScale === undefined) {
      return
    }
    if (isEqual<boolean>(this._toggledHoveredShouldScale, toggledHoveredShouldScale)) {
      return
    }
    this._toggledHoveredShouldScale = toggledHoveredShouldScale
    if (this.initialized) {
      this.needsVisualStateUpdate = true
    }
  }

  /**
   * Gets whether the toggled triggered state should apply scale changes.
   *
   * @returns `true` if the toggled triggered state should apply scale changes; otherwise, `false`.
   */
  public get toggledTriggeredShouldScale(): boolean {
    return this._toggledTriggeredShouldScale
  }

  /**
   * Sets whether the toggled triggered state should apply scale changes and initializes the visual states.
   *
   * @param shouldScale - A boolean indicating whether the toggled triggered state should apply scale changes.
   */
  public set toggledTriggeredShouldScale(shouldScale: boolean) {
    if (shouldScale === undefined) {
      return
    }
    if (isEqual<boolean>(this._toggledTriggeredShouldScale, shouldScale)) {
      return
    }
    this._toggledTriggeredShouldScale = shouldScale
    if (this.initialized) {
      this.needsVisualStateUpdate = true
    }
  }

  /**
   * Gets the duration of the animation.
   *
   * @returns The duration of the animation in milliseconds.
   */
  public get animateDuration(): number {
    return this._animateDuration
  }

  /**
   * Sets the duration of the animation.
   *
   * @param animateDuration - The duration of the animation in milliseconds.
   */
  public set animateDuration(animateDuration: number) {
    if (animateDuration === undefined) {
      return
    }
    this._animateDuration = animateDuration
  }

  /**
   * Initializes the visual component by setting up its initial scale and position,
   * and preparing its visual states. This method is typically called during the
   * setup phase to ensure the visual component is ready for use.
   */
  public initialize() {
    if (this.initialized) return
    if (this.visualArgs.style) {
      if (this.isVisualStyleKey(this.visualArgs.style)) {
        this.applyStyleParameters(SnapOS2.styles[this.visualArgs.style.visualElementType][this.visualArgs.style.style])
      } else {
        this.applyStyleParameters(this.visualArgs.style)
      }
    }
    this.updateVisualStates()

    this._currentPosition = this.defaultPosition
    this._currentScale = this.defaultScale

    this.initialized = true
    this.onInitializedEvent.invoke()

    this.setState(this.stateName)

    this._visualComponent?.createEvent("LateUpdateEvent").bind(() => {
      if (this.needsVisualStateUpdate) {
        this.updateVisualStates()
        this.needsVisualStateUpdate = false
      }
    })
  }

  /**
   * Updates the visual state of the object based on the provided state type.
   *
   * @param stateName - The type of state to set, which determines the visual properties
   * such as color, scale, and position.
   */
  public setState(stateName: StateName) {
    const newState = this.visualStates.get(stateName)
    if (this._state === newState) {
      // skip redundant calls
      return
    }
    this.stateName = stateName
    this.prevState = this._state
    this._state = newState
    if (this.initialized) {
      this.updateColors(this._state.baseColor)
      this.updateScale(this._state.localScale)
      this.updatePosition(this._state.localPosition)
      this.updateShouldPosition(this._state.shouldPosition)
      this.updateShouldScale(this._state.shouldScale)
    }
  }

  /**
   * Creates an instance of the Visual class.
   *
   * @param sceneObject - The parent SceneObject associated with this visual.
   */
  public constructor(args: VisualArgs) {
    this.visualArgs = args
  }

  public enable() {
    this.managedComponents.forEach((component) => {
      if (!isNull(component) && component) {
        component.enabled = true
      }
    })
  }

  public disable() {
    this.managedComponents.forEach((component) => {
      if (!isNull(component) && component) {
        component.enabled = false
      }
    })
  }

  /**
   * Destroys the current instance.
   *
   */
  public destroy() {
    this._colorChangeCancelSet.cancel()
    this._updateScaleCancelSet.cancel()
    this._updatePositionCancelSet.cancel()
    this.managedComponents.forEach((component) => {
      if (!isNull(component) && component) {
        component.destroy()
      }
    })
    this.managedComponents = []
    this.onDestroyedEvent.invoke()
  }

  protected updateColors(targetColor: vec4) {
    if (!this._shouldColorChange) {
      return
    }
    const initialColor = this.baseColor
    const remaining = colorDistance(targetColor, initialColor)
    const full = this.prevState?.baseColor ? colorDistance(targetColor, this.prevState.baseColor) : remaining
    const ratio = full > 1e-6 ? Math.min(Math.max(remaining / full, 0), 1) : 0
    this._colorChangeCancelSet.cancel()
    animate({
      duration: ratio * this._animateDuration,
      cancelSet: this._colorChangeCancelSet,
      update: (t) => {
        this.baseColor = colorLerp(initialColor, targetColor, t)
      }
    })
  }

  private updateScale(scale: vec3) {
    if (!this._shouldScale) {
      return
    }
    const from = this._currentScale
    const to = scale
    const difference = to.distance(from)
    const duration = difference * this._animateDuration
    this._updateScaleCancelSet.cancel()
    animate({
      duration: duration,
      cancelSet: this._updateScaleCancelSet,
      update: (t) => {
        const newScale = vec3.lerp(from, to, t)
        const delta = newScale.div(this._currentScale)
        this.transform.setLocalScale(this.transform.getLocalScale().mult(delta))
        this._currentScale = newScale
        this.onScaleChangedEvent.invoke({from: from, current: this._currentScale})
      }
    })
  }

  private updatePosition(pos: vec3) {
    if (!this._shouldTranslate) {
      return
    }
    const from = this._currentPosition
    const to = pos
    // if both zero, return early
    if (to.equal(from) && to.equal(vec3.zero())) return
    const difference = to.distance(from)
    const duration = difference * this._animateDuration
    this._updatePositionCancelSet.cancel()
    animate({
      duration: duration,
      cancelSet: this._updatePositionCancelSet,
      update: (t) => {
        const previousPosition = this._currentPosition
        this._currentPosition = vec3.lerp(from, to, t)
        const delta = this._currentPosition.sub(previousPosition)
        this.transform.setLocalPosition(this.transform.getLocalPosition().add(delta))
        this.onPositionChangedEvent.invoke({from: from, current: this._currentPosition})
      }
    })
  }

  private updateShouldPosition(shouldPosition: boolean) {
    // This would be used by the parent Visual class to determine
    // whether to apply position changes for the current state
    // The actual position updates are handled by the base Visual class
    const wasTranslating = this._shouldTranslate
    this._shouldTranslate = shouldPosition
    if (wasTranslating && !this._shouldTranslate) {
      this._updatePositionCancelSet.cancel()
    }
  }

  private updateShouldScale(shouldScale: boolean) {
    // This would be used by the parent Visual class to determine
    // whether to apply scale changes for the current state
    // The actual scale updates are handled by the base Visual class
    const wasScaling = this._shouldScale
    this._shouldScale = shouldScale
    if (wasScaling && !this._shouldScale) {
      this._updateScaleCancelSet.cancel()
    }
  }

  protected applyStyleProperty<TParams extends Partial<VisualParameters>, TState extends VisualState, T>(
    parameters: TParams,
    parameterName: keyof TState,
    setters: {[key: string]: (value: T) => void}
  ): void {
    const defaultParams = parameters.default
    const defaultValue = defaultParams?.[parameterName as keyof VisualState] as T
    const hasDefault = defaultValue !== undefined

    for (const stateName in setters) {
      const stateParams = parameters[stateName as keyof TParams] as TState
      const stateValue = stateParams?.[parameterName] as T

      const valueToSet = stateValue !== undefined ? stateValue : hasDefault ? defaultValue : undefined

      if (valueToSet !== undefined) {
        setters[stateName](valueToSet)
      }
    }
  }

  protected applyStyleParameters(parameters: Partial<VisualParameters>) {
    this.applyStyleProperty<Partial<VisualParameters>, VisualState, vec4>(parameters, "baseColor", {
      default: (value) => (this.baseDefaultColor = value),
      hovered: (value) => (this.baseHoveredColor = value),
      triggered: (value) => (this.baseTriggeredColor = value),
      inactive: (value) => (this.baseInactiveColor = value),
      toggledDefault: (value) => (this.baseToggledDefaultColor = value),
      toggledHovered: (value) => (this.baseToggledHoveredColor = value),
      toggledTriggered: (value) => (this.baseToggledTriggeredColor = value)
    })

    // shouldPosition
    this.applyStyleProperty<Partial<VisualParameters>, VisualState, boolean>(parameters, "shouldPosition", {
      default: (value) => (this.defaultShouldPosition = value),
      hovered: (value) => (this.hoveredShouldPosition = value),
      triggered: (value) => (this.triggeredShouldPosition = value),
      inactive: (value) => (this.inactiveShouldPosition = value),
      toggledDefault: (value) => (this.toggledDefaultShouldPosition = value),
      toggledHovered: (value) => (this.toggledHoveredShouldPosition = value),
      toggledTriggered: (value) => (this.toggledTriggeredShouldPosition = value)
    })

    // shouldScale
    this.applyStyleProperty<Partial<VisualParameters>, VisualState, boolean>(parameters, "shouldScale", {
      default: (value) => (this.defaultShouldScale = value),
      hovered: (value) => (this.hoveredShouldScale = value),
      triggered: (value) => (this.triggeredShouldScale = value),
      inactive: (value) => (this.inactiveShouldScale = value),
      toggledDefault: (value) => (this.toggledDefaultShouldScale = value),
      toggledHovered: (value) => (this.toggledHoveredShouldScale = value),
      toggledTriggered: (value) => (this.toggledTriggeredShouldScale = value)
    })

    // localPosition
    this.applyStyleProperty<Partial<VisualParameters>, VisualState, vec3>(parameters, "localPosition", {
      default: (value) => (this.defaultPosition = value),
      hovered: (value) => (this.hoveredPosition = value),
      triggered: (value) => (this.triggeredPosition = value),
      inactive: (value) => (this.inactivePosition = value),
      toggledDefault: (value) => (this.toggledPosition = value),
      toggledHovered: (value) => (this.toggledHoveredPosition = value),
      toggledTriggered: (value) => (this.toggledTriggeredPosition = value)
    })

    // localScale
    this.applyStyleProperty<Partial<VisualParameters>, VisualState, vec3>(parameters, "localScale", {
      default: (value) => (this.defaultScale = value),
      hovered: (value) => (this.hoveredScale = value),
      triggered: (value) => (this.triggeredScale = value),
      inactive: (value) => (this.inactiveScale = value),
      toggledDefault: (value) => (this.toggledScale = value),
      toggledHovered: (value) => (this.toggledHoveredScale = value),
      toggledTriggered: (value) => (this.toggledTriggeredScale = value)
    })
  }

  protected updateVisualStates(): void {
    this.verifyStates()
    this.setState(this.stateName)
  }

  private verifyStates(): void {
    for (const stateName of Object.values(StateName)) {
      if (!this.visualStates.has(stateName)) {
        print(`WARNING, missing state: ${stateName}, replaced with default state`)
        const isToggleState = stateName === StateName.toggledDefault || stateName === StateName.toggledHovered
        this.visualStates.set(
          stateName,
          isToggleState ? this.visualStates.get(StateName.hovered) : this.visualStates.get(StateName.default)
        )
      }
    }
  }

  /**
   * This function checks if the input is an object with both `visualElementType` and `style` properties,
   * and that both properties are strings. Returns `true` if the input matches the `VisualStyleKey`,
   * otherwise returns `false`.
   *
   * @param style - The value to check, which may be a `VisualStyleKey`, a partial `VisualParameters`, or `undefined`.
   * @returns `true` if `style` is a `VisualStyleKey`, otherwise `false`.
   */
  private isVisualStyleKey(style: VisualStyleKey | Partial<VisualParameters> | undefined): style is VisualStyleKey {
    return (
      style !== undefined &&
      typeof style === "object" &&
      "visualElementType" in style &&
      "style" in style &&
      typeof style.visualElementType === "string" &&
      typeof style.style === "string"
    )
  }
}
