import {StateName} from "../../../Components/Element"
import {isEqual} from "../../../Utility/UIKitUtilities"
import {Visual, VisualArgs, VisualState} from "../../../Visuals/Visual"
import {Sphere} from "./Sphere"

type SphereVisualState = {
  icon?: Texture
  secondColor?: vec4
} & VisualState

const Colors = {
  darkGray: new vec4(0.1, 0.1, 0.1, 1),
  lightGray: new vec4(0.4, 0.4, 0.4, 1),
  lighterGray: new vec4(0.8, 0.8, 0.8, 1),
  brightYellow: new vec4(1, 0.8, 0, 1),
  yellow: new vec4(0.7, 0.6, 0.1, 1)
}

const SphereColors = {
  default: {
    base: Colors.darkGray
  },
  hovered: {
    base: Colors.darkGray,
    second: Colors.lightGray
  },
  triggered: {
    base: Colors.yellow
  },
  toggledHovered: {
    base: Colors.yellow,
    second: Colors.lighterGray
  }
}

/**
 * The `SphereVisual` class represents a visual component in the form of a sphere.
 * It extends the `Visual` class and provides functionality for managing the sphere's
 * appearance, size, and state transitions.
 *
 * @extends Visual
 */
export class SphereVisual extends Visual {
  protected _defaultColor: vec4 = SphereColors.default.base
  protected _hoveredColor: vec4 = SphereColors.hovered.base
  protected _triggeredColor: vec4 = SphereColors.triggered.base
  protected _toggledDefaultColor: vec4 = SphereColors.triggered.base
  protected _toggledHoveredColor: vec4 = SphereColors.toggledHovered.base

  private _defaultSecondColor: vec4 = SphereColors.default.base
  private _hoveredSecondColor: vec4 = SphereColors.hovered.second
  private _triggeredSecondColor: vec4 = SphereColors.triggered.base
  private _toggledDefaultSecondColor: vec4 = SphereColors.triggered.base
  private _toggledHoveredSecondColor: vec4 = SphereColors.toggledHovered.second

  private _defaultIcon: Texture | undefined
  private _hoveredIcon: Texture | undefined
  private _triggeredIcon: Texture | undefined
  private _inactiveIcon: Texture | undefined
  private _errorIcon: Texture | undefined

  protected _state: SphereVisualState
  private _sphereVisualStates: Map<StateName, SphereVisualState>
  protected get visualStates(): Map<StateName, SphereVisualState> {
    return this._sphereVisualStates
  }

  /**
   * Gets the size of the SphereVisual.
   *
   * @returns A `vec3` representing the dimensions of the SphereVisual.
   */
  public get size(): vec3 {
    return super.size
  }

  /**
   * Sets the size of the SphereVisual.
   * Updates both the internal `_size` property.
   *
   * @param size - A `vec3` object representing the dimensions of the SphereVisual.
   */
  public set size(size: vec3) {
    if (size === undefined) {
      return
    }
    super.size = size
    if (this.initialized) {
      this.sphere.radius = this.size.x / 2
    }
  }

  /**
   * Gets the `RenderMeshVisual` associated with the sphere.
   *
   * @returns {RenderMeshVisual} The visual representation of the sphere's mesh.
   */
  public get renderMeshVisual(): RenderMeshVisual {
    return this.sphere.renderMeshVisual
  }

  /**
   * Gets the base color of the sphere visual.
   *
   * @returns {vec4} The background color of the sphere as a 4-component vector.
   */
  public get baseColor(): vec4 {
    return this.sphere.backgroundColor
  }

  /**
   * Indicates whether the sphere visual has a border.
   *
   * @returns {boolean} The border property always returns false for the `SphereVisual` class,
   */
  public get hasBorder(): boolean {
    return false
  }

  /**
   * Gets the size of the border for the sphere visual in world space units.
   *
   * @returns The border size as a number. Currently, this always returns 0.
   */
  public get borderSize(): number {
    return 0
  }

  /**
   * @returns vec4 default second color
   */
  public get defaultSecondColor(): vec4 {
    return this._defaultSecondColor
  }

  /**
   * @returns vec4 hovered second color
   */
  public get hoveredSecondColor(): vec4 {
    return this._hoveredSecondColor
  }

  /**
   * @returns vec4 triggered second color
   */
  public get triggeredSecondColor(): vec4 {
    return this._triggeredSecondColor
  }

  public get toggledDefaultSecondColor(): vec4 {
    return this._toggledDefaultSecondColor
  }

  /**
   * @returns vec4 toggled hovered second color
   */
  public get toggledHoveredSecondColor(): vec4 {
    return this._toggledHoveredSecondColor
  }

  /**
   * @params vec4 default second color
   */
  public set defaultSecondColor(defaultSecondColor: vec4) {
    if (defaultSecondColor === undefined) {
      return
    }
    if (isEqual<vec4>(this._defaultSecondColor, defaultSecondColor)) {
      return
    }
    this._defaultSecondColor = defaultSecondColor
    if (this.initialized) {
      this.needsVisualStateUpdate = true
    }
  }

  /**
   * @params vec4 hovered second color
   */
  public set hoveredSecondColor(hoveredSecondColor: vec4) {
    if (hoveredSecondColor === undefined) {
      return
    }
    if (isEqual<vec4>(this._hoveredSecondColor, hoveredSecondColor)) {
      return
    }
    this._hoveredSecondColor = hoveredSecondColor
    if (this.initialized) {
      this.needsVisualStateUpdate = true
    }
  }

  /**
   * @params vec4 triggered second color
   */
  public set triggeredSecondColor(triggeredSecondColor: vec4) {
    if (triggeredSecondColor === undefined) {
      return
    }
    if (isEqual<vec4>(this._triggeredSecondColor, triggeredSecondColor)) {
      return
    }
    this._triggeredSecondColor = triggeredSecondColor
    if (this.initialized) {
      this.needsVisualStateUpdate = true
    }
  }

  /**
   * @params vec4 toggled second color
   */
  public set toggledDefaultSecondColor(toggledDefaultSecondColor: vec4) {
    if (toggledDefaultSecondColor === undefined) {
      return
    }
    if (isEqual<vec4>(this._toggledDefaultSecondColor, toggledDefaultSecondColor)) {
      return
    }
    this._toggledDefaultSecondColor = toggledDefaultSecondColor
    if (this.initialized) {
      this.needsVisualStateUpdate = true
    }
  }

  /**
   * @params vec4 toggled second color
   */
  public set toggledHoveredSecondColor(toggledHoveredSecondColor: vec4) {
    if (toggledHoveredSecondColor === undefined) {
      return
    }
    if (isEqual<vec4>(this._toggledHoveredSecondColor, toggledHoveredSecondColor)) {
      return
    }
    this._toggledHoveredSecondColor = toggledHoveredSecondColor
    if (this.initialized) {
      this.needsVisualStateUpdate = true
    }
  }

  /**
   * Updates the state of the SphereVisual component and refreshes the associated icon.
   *
   * @param stateName - The name of the state to set for the component.
   */
  public setState(stateName: StateName) {
    super.setState(stateName)
    if (this.initialized) {
      this.updateIcon(this._state.icon)
      this.updateSecondColor(this._state.secondColor)
    }
  }

  public constructor(args: VisualArgs) {
    super(args)
    this._sceneObject = args.sceneObject
    this.sphere = this._sceneObject.createComponent(Sphere.getTypeName())
    this.managedComponents.push(this.sphere)
    this.sphere.radius = this.size.x / 2
    this.sphere.initialize()
    this._transform = this._sceneObject.getTransform()
    this.initialize()
  }

  protected set baseColor(value: vec4) {
    this.sphere.backgroundColor = value
  }

  /********** Sphere Specific **************/

  /**
   * Gets the scale factor for the back of the sphere along the z-axis.
   *
   * @returns {number} The scale factor for the back of the sphere.
   */
  public get zBackScale(): number {
    return this.sphere?.zBackScale ?? 0
  }

  /**
   * Sets the scale factor for the back of the sphere along the z-axis.
   * This property adjusts the depth scaling of the sphere's back side.
   *
   * @param zBackScale - The new scale factor for the z-axis back scaling.
   */
  public set zBackScale(zBackScale: number) {
    if (zBackScale === undefined) {
      return
    }
    this.sphere.zBackScale = zBackScale
  }

  /**
   * Gets the default icon for the sphere visual.
   *
   * @returns {Texture} The default icon for the sphere visual.
   */
  public get defaultIcon(): Texture {
    return this._defaultIcon ?? undefined
  }

  /**
   * Sets the default icon for the sphere visual and updates its visual states.
   *
   * @param icon - The texture to be used as the default icon.
   */
  public set defaultIcon(icon: Texture) {
    if (icon === undefined) {
      return
    }
    if (isEqual<Texture>(this._defaultIcon, icon)) {
      return
    }
    this._defaultIcon = icon
    if (this.initialized) {
      this.needsVisualStateUpdate = true
    }
  }

  /**
   * Gets the hovered icon for the sphere visual.
   *
   * @returns {Texture} The hovered icon for the sphere visual.
   */
  public get hoveredIcon(): Texture {
    return this._hoveredIcon ?? undefined
  }

  /**
   * Sets the hovered icon for the sphere visual and updates its visual states.
   *
   * @param hoveredIcon - The texture to be used as the hovered icon.
   */
  public set hoveredIcon(hoveredIcon: Texture) {
    if (hoveredIcon === undefined) {
      return
    }
    if (isEqual<Texture>(this._hoveredIcon, hoveredIcon)) {
      return
    }
    this._hoveredIcon = hoveredIcon
    if (this.initialized) {
      this.needsVisualStateUpdate = true
    }
  }

  /**
   * Gets the triggered icon for the sphere visual.
   *
   * @returns {Texture} The triggered icon for the sphere visual.
   */
  public get triggeredIcon(): Texture {
    return this._triggeredIcon ?? undefined
  }

  /**
   * Sets the triggered icon for the sphere visual and updates its visual states.
   *
   * @param icon - The texture to be used as the triggered icon.
   */
  public set triggeredIcon(icon: Texture) {
    if (icon === undefined) {
      return
    }
    if (isEqual<Texture>(this._triggeredIcon, icon)) {
      return
    }
    this._triggeredIcon = icon
    if (this.initialized) {
      this.needsVisualStateUpdate = true
    }
  }

  /**
   * Gets the inactive icon for the sphere visual.
   *
   * @returns {Texture} The inactive icon for the sphere visual.
   */
  public get inactiveIcon(): Texture {
    return this._inactiveIcon ?? undefined
  }

  /**
   * Sets the inactive icon for the sphere visual and updates its visual states.
   *
   * @param icon - The texture to be used as the inactive icon.
   */
  public set inactiveIcon(icon: Texture) {
    if (icon === undefined) {
      return
    }
    if (isEqual<Texture>(this._inactiveIcon, icon)) {
      return
    }
    this._inactiveIcon = icon
    if (this.initialized) {
      this.needsVisualStateUpdate = true
    }
  }

  /**
   * Gets the error icon for the sphere visual.
   *
   * @returns {Texture} The error icon for the sphere visual.
   */
  public get errorIcon(): Texture {
    return this._errorIcon ?? undefined
  }

  /**
   * Sets the error icon for the sphere visual and updates its visual states.
   *
   * @param icon - The texture to be used as the error icon.
   */
  public set errorIcon(icon: Texture) {
    if (icon === undefined) {
      return
    }
    if (isEqual<Texture>(this._errorIcon, icon)) {
      return
    }
    this._errorIcon = icon
    if (this.initialized) {
      this.needsVisualStateUpdate = true
    }
  }

  /**
   * Updates the icon of the sphere visual.
   *
   * @param icon - The texture to be used as the new icon.
   */
  private updateIcon(icon: Texture) {
    this.sphere.icon = icon
  }

  private updateSecondColor(color: vec4) {
    if (color) {
      this.renderMeshVisual.mainPass.secondColor = color
      this.renderMeshVisual.mainPass.hasSecondColor = 1
    } else {
      this.renderMeshVisual.mainPass.hasSecondColor = 0
    }
  }

  protected updateVisualStates(): void {
    this._sphereVisualStates = new Map([
      [
        StateName.default,
        {
          baseColor: this.baseDefaultColor,
          secondColor: this.defaultSecondColor,
          localScale: this.defaultScale,
          localPosition: this.defaultPosition,
          icon: this._defaultIcon
        }
      ],
      [
        StateName.hovered,
        {
          baseColor: this.baseHoveredColor,
          secondColor: this.hoveredSecondColor,
          localScale: this.hoveredScale,
          localPosition: this.hoveredPosition,
          icon: this._hoveredIcon
        }
      ],
      [
        StateName.triggered,
        {
          baseColor: this.baseTriggeredColor,
          secondColor: this.triggeredSecondColor,
          localScale: this.triggeredScale,
          localPosition: this.triggeredPosition,
          icon: this._triggeredIcon
        }
      ],
      [
        StateName.toggledHovered,
        {
          baseColor: this.baseToggledHoveredColor,
          secondColor: this.toggledHoveredSecondColor,
          localScale: this.toggledHoveredScale,
          localPosition: this.toggledPosition,
          icon: this._triggeredIcon
        }
      ],
      [
        StateName.toggledDefault,
        {
          baseColor: this.baseToggledDefaultColor,
          secondColor: this.toggledDefaultSecondColor,
          localScale: this.toggledScale,
          localPosition: this.toggledPosition,
          icon: this._triggeredIcon
        }
      ],
      [
        StateName.error,
        {
          baseColor: this.baseErrorColor,
          secondColor: this.baseErrorColor,
          localScale: this.errorScale,
          localPosition: this.errorPosition,
          icon: this._errorIcon
        }
      ],
      [
        StateName.errorHovered,
        {
          baseColor: this.baseErrorColor,
          secondColor: this.baseErrorColor,
          localScale: this.hoveredScale,
          localPosition: this.hoveredPosition,
          icon: this._errorIcon
        }
      ],
      [
        StateName.inactive,
        {
          baseColor: this.baseErrorColor,
          secondColor: this.baseErrorColor,
          localScale: this.inactiveScale,
          localPosition: this.inactivePosition,
          icon: this._inactiveIcon
        }
      ]
    ])
    super.updateVisualStates()
  }

  private get sphere(): Sphere {
    return this._visualComponent as Sphere
  }

  private set sphere(value: Sphere) {
    this._visualComponent = value
  }
}
