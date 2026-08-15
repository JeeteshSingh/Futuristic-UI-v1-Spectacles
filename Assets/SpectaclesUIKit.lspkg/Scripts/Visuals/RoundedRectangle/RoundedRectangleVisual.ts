import animate, {CancelSet} from "SpectaclesInteractionKit.lspkg/Utils/animate"
import {withAlpha} from "SpectaclesInteractionKit.lspkg/Utils/color"
import {StateName} from "../../Components/Element"
import {colorDistance, colorLerp, isEqual} from "../../Utility/UIKitUtilities"
import {COLORS, INACTIVE_COLOR, Visual, VisualArgs, VisualParameters, VisualState} from "../Visual"
import {BorderType, GradientParameters, RoundedRectangle} from "./RoundedRectangle"

const BACKGROUND_GRADIENT_PARAMETERS: {[key: string]: GradientParameters} = {
  default: {
    enabled: true,
    type: "Rectangle",
    stop0: {enabled: true, percent: 0, color: COLORS.darkGray},
    stop1: {enabled: true, percent: 0.5, color: COLORS.darkGray},
    stop2: {enabled: true, percent: 0.95, color: COLORS.darkGray},
    stop3: {enabled: true, percent: 0.99, color: COLORS.darkGray}
  },
  hovered: {
    enabled: true,
    type: "Rectangle",
    stop0: {enabled: true, percent: 0, color: COLORS.darkGray},
    stop1: {enabled: true, percent: 0.5, color: COLORS.darkGray},
    stop2: {enabled: true, percent: 0.95, color: COLORS.darkGray},
    stop3: {enabled: true, percent: 0.99, color: COLORS.darkGray}
  },
  toggled: {
    enabled: true,
    type: "Rectangle",
    stop0: {enabled: true, percent: -1, color: withAlpha(COLORS.brightYellow.uniformScale(0.3), 1)},
    stop1: {enabled: true, percent: -1, color: withAlpha(COLORS.brightYellow.uniformScale(0.3), 1)},
    stop2: {enabled: true, percent: -1, color: withAlpha(COLORS.brightYellow.uniformScale(0.3), 1)},
    stop3: {enabled: true, percent: 3, color: withAlpha(COLORS.brightYellow.uniformScale(0.9), 1)}
  }
}

const BORDER_GRADIENT_PARAMETERS: {[key: string]: GradientParameters} = {
  default: {
    enabled: true,
    start: new vec2(-1, 0),
    end: new vec2(1, 0),
    stop0: {enabled: true, percent: 0, color: COLORS.lightGray},
    stop1: {enabled: true, percent: 0.5, color: withAlpha(COLORS.lightGray.uniformScale(0.66), 1)},
    stop2: {enabled: true, percent: 1, color: COLORS.lightGray}
  },
  hovered: {
    enabled: true,
    start: new vec2(-1, 0),
    end: new vec2(1, 0),
    stop0: {enabled: true, percent: 0, color: withAlpha(COLORS.brightYellow.uniformScale(0.9), 1)},
    stop1: {enabled: true, percent: 0.5, color: withAlpha(COLORS.brightYellow.uniformScale(0.66), 1)},
    stop2: {enabled: true, percent: 1, color: withAlpha(COLORS.brightYellow.uniformScale(0.9), 1)}
  },
  toggled: {
    enabled: true,
    start: new vec2(-1, 0),
    end: new vec2(1, 0),
    stop0: {enabled: true, percent: 0, color: COLORS.brightYellow},
    stop1: {enabled: true, percent: 0.5, color: COLORS.brightYellow},
    stop2: {enabled: true, percent: 1, color: COLORS.brightYellow}
  },
  toggledHovered: {
    enabled: true,
    start: new vec2(-1, 0),
    end: new vec2(1, 0),
    stop0: {enabled: true, percent: 0, color: withAlpha(COLORS.brightYellow.uniformScale(0.9), 1)},
    stop1: {enabled: true, percent: 0.5, color: withAlpha(COLORS.brightYellow.uniformScale(0.66), 1)},
    stop2: {enabled: true, percent: 1, color: withAlpha(COLORS.brightYellow.uniformScale(0.9), 1)}
  }
}

/**
 * Base Types for background
 */
export type BaseType = "Color" | "Gradient" | "Texture"

export type RoundedRectangleVisualState = {
  baseType?: BaseType
  baseGradient?: GradientParameters
  baseTexture?: Texture
  borderColor?: vec4
  borderGradient?: GradientParameters
  borderSize?: number
  hasBorder?: boolean
  borderType?: BorderType
} & VisualState

export type RoundedRectangleVisualParameters = {
  default: RoundedRectangleVisualState
  hovered: RoundedRectangleVisualState
  triggered: RoundedRectangleVisualState
  toggledDefault: RoundedRectangleVisualState
  toggledHovered: RoundedRectangleVisualState
  toggledTriggered: RoundedRectangleVisualState
  inactive: RoundedRectangleVisualState
} & VisualParameters

export type RoundedRectangleVisualArgs = {
  transparent?: boolean
} & VisualArgs

/**
 * The `RoundedRectangleVisual` class represents a visual component that renders a rounded rectangle
 * with customizable properties such as border, gradients, and colors. It extends the base `Visual` class
 * and provides additional functionality specific to rounded rectangles.
 *
 * @extends Visual
 */
export class RoundedRectangleVisual extends Visual {
  private _defaultBaseType: BaseType = "Color"
  private _hoveredBaseType: BaseType = "Color"
  private _triggeredBaseType: BaseType = "Color"
  private _inactiveBaseType: BaseType = "Color"
  private _toggledDefaultBaseType: BaseType = "Color"
  private _toggledHoveredBaseType: BaseType = "Color"
  private _toggledTriggeredBaseType: BaseType = "Color"

  private _defaultGradient: GradientParameters = BACKGROUND_GRADIENT_PARAMETERS.default
  private _hoveredGradient: GradientParameters = BACKGROUND_GRADIENT_PARAMETERS.default
  private _triggeredGradient: GradientParameters = BACKGROUND_GRADIENT_PARAMETERS.toggled
  private _inactiveGradient: GradientParameters = BACKGROUND_GRADIENT_PARAMETERS.default
  private _toggledDefaultGradient: GradientParameters = BACKGROUND_GRADIENT_PARAMETERS.default
  private _toggledHoveredGradient: GradientParameters = BACKGROUND_GRADIENT_PARAMETERS.default
  private _toggledTriggeredGradient: GradientParameters = BACKGROUND_GRADIENT_PARAMETERS.toggled

  private _defaultTexture: Texture = null
  private _hoveredTexture: Texture = null
  private _triggeredTexture: Texture = null
  private _inactiveTexture: Texture = null
  private _toggledDefaultTexture: Texture = null
  private _toggledHoveredTexture: Texture = null
  private _toggledTriggeredTexture: Texture = null

  private _defaultHasBorder: boolean = false
  private _hoveredHasBorder: boolean = false
  private _triggeredHasBorder: boolean = false
  private _inactiveHasBorder: boolean = false
  private _toggledDefaultHasBorder: boolean = false
  private _toggledHoveredHasBorder: boolean = false
  private _toggledTriggeredHasBorder: boolean = false

  private _defaultBorderType: BorderType = "Gradient"
  private _hoveredBorderType: BorderType = "Gradient"
  private _triggeredBorderType: BorderType = "Gradient"
  private _inactiveBorderType: BorderType = "Gradient"
  private _toggledDefaultBorderType: BorderType = "Gradient"
  private _toggledHoveredBorderType: BorderType = "Gradient"
  private _toggledTriggeredBorderType: BorderType = "Gradient"

  private _defaultBorderSize: number = 0.1
  private _hoveredBorderSize: number = 0.1
  private _triggeredBorderSize: number = 0.1
  private _inactiveBorderSize: number = 0.1
  private _toggledDefaultBorderSize: number = 0.1
  private _toggledHoveredBorderSize: number = 0.1
  private _toggledTriggeredBorderSize: number = 0.1

  private _borderDefaultColor: vec4 = COLORS.lightGray
  private _borderHoveredColor: vec4 = COLORS.brightYellow
  private _borderTriggeredColor: vec4 = COLORS.brightYellow
  private _borderInactiveColor: vec4 = INACTIVE_COLOR
  private _borderToggledDefaultColor: vec4 = COLORS.brightYellow
  private _borderToggledHoveredColor: vec4 = COLORS.brightYellow
  private _borderToggledTriggeredColor: vec4 = COLORS.brightYellow

  private _borderDefaultGradient: GradientParameters = BORDER_GRADIENT_PARAMETERS.default
  private _borderHoveredGradient: GradientParameters = BORDER_GRADIENT_PARAMETERS.hover
  private _borderTriggeredGradient: GradientParameters = BORDER_GRADIENT_PARAMETERS.toggled
  private _borderInactiveGradient: GradientParameters = BORDER_GRADIENT_PARAMETERS.default
  private _borderToggledDefaultGradient: GradientParameters = BORDER_GRADIENT_PARAMETERS.toggled
  private _borderToggledHoveredGradient: GradientParameters = BORDER_GRADIENT_PARAMETERS.toggledHovered
  private _borderToggledTriggeredGradient: GradientParameters = BORDER_GRADIENT_PARAMETERS.toggled

  private _gradientChangeCancelSet: CancelSet = new CancelSet()
  private currentGradient: GradientParameters = this.defaultGradient

  private _hasBorder: boolean = false
  private _borderColorChangeCancelSet: CancelSet = new CancelSet()
  private _borderGradientChangeCancelSet: CancelSet = new CancelSet()
  private currentBorderGradient: GradientParameters = this.borderDefaultGradient

  private _roundedRectangleVisualStates: Map<StateName, RoundedRectangleVisualState>
  protected _state: RoundedRectangleVisualState = undefined
  protected prevState: RoundedRectangleVisualState = undefined

  protected get visualStates(): Map<StateName, RoundedRectangleVisualState> {
    return this._roundedRectangleVisualStates
  }

  /**
   * Gets the size of the RoundedRectangleVisual.
   *
   * @returns A `vec3` representing the dimensions of the RoundedRectangleVisual.
   */
  public get size(): vec3 {
    return super.size
  }

  /**
   * Sets the size of the RoundedRectangleVisual.
   * Updates both the internal `_size` property.
   *
   * @param size - A `vec3` object representing the dimensions of the RoundedRectangleVisual.
   */
  public set size(size: vec3) {
    if (size === undefined) {
      return
    }
    super.size = size
    if (this.initialized) {
      this.roundedRectangle.size = new vec2(size.x, size.y)
    }
  }

  /**
   * Gets the `RenderMeshVisual` associated with the rounded rectangle.
   *
   * @returns {RenderMeshVisual} The visual representation of the rounded rectangle's mesh.
   */
  public get renderMeshVisual(): RenderMeshVisual {
    return this.roundedRectangle.renderMeshVisual
  }

  /**
   * Retrieves the base color of the rounded rectangle visual.
   *
   * @returns {vec4} The background color of the rounded rectangle as a `vec4` value.
   */
  public get baseColor(): vec4 {
    return this.roundedRectangle.backgroundColor
  }

  /**
   * Indicates whether the rounded rectangle visual has a border.
   *
   * @returns `true` if the visual has a border; otherwise, `false`.
   */
  public get hasBorder(): boolean {
    return this._hasBorder
  }

  /**
   * Gets the size of the border for the rounded rectangle.
   *
   * @returns The border size as a number.
   */
  public get borderSize(): number {
    return this.roundedRectangle.borderSize
  }

  /**
   * Updates the visual state of the RoundedRectangleVisual component.
   *
   * This method overrides the base `setState` method to apply visual updates
   * specific to the RoundedRectangleVisual, such as gradients and border colors.
   *
   * @param stateName - The new state to apply, represented as a `stateName` object.
   */
  public setState(stateName: StateName) {
    super.setState(stateName)
    if (this.initialized) {
      this.updateBaseType(this._state.baseType)
      this.updateGradient(this._state.baseGradient)
      this.updateBaseTexture(this._state.baseTexture)
      this.updateHasBorder(this._state.hasBorder)
      this.updateBorderType(this._state.borderType)
      this.updateBorderColors(this._state.borderColor)
      this.updateBorderGradient(this._state.borderGradient)
      this.updateBorderSize(this._state.borderSize)
    }
  }

  /**
   * Constructs a new instance of the `RoundedRectangleVisual` class.
   *
   * @param sceneObject - The parent `SceneObject` to which this visual will be attached.
   */
  public constructor(args: RoundedRectangleVisualArgs) {
    super(args)
    this._sceneObject = args.sceneObject
    this.roundedRectangle = this._sceneObject.createComponent(RoundedRectangle.getTypeName())
    this.managedComponents.push(this.roundedRectangle)
    this.roundedRectangle.initialize()
    this.roundedRectangle.size = new vec2(this.size.x, this.size.y)
    this._transform = this._sceneObject.getTransform()
    if (args.transparent) {
      this.renderMeshVisual.mainPass.colorMask = new vec4b(true, true, true, true)
      this.renderMeshVisual.mainPass.blendMode = BlendMode.PremultipliedAlphaAuto
    }
    this.initialize()
  }

  public destroy(): void {
    this._gradientChangeCancelSet.cancel()
    this._borderColorChangeCancelSet.cancel()
    this._borderGradientChangeCancelSet.cancel()
    super.destroy()
  }

  protected set baseColor(value: vec4) {
    this.roundedRectangle.backgroundColor = value
  }

  protected updateColors(meshColor: vec4) {
    if (this.baseType !== "Color") {
      return
    }
    super.updateColors(meshColor)
  }

  /****  Rounded Rectangle explicit  ******************/

  /**
   * Gets the corner radius of the rounded rectangle.
   *
   * @returns The current corner radius of the rounded rectangle in pixels.
   */
  public get cornerRadius(): number {
    return this.roundedRectangle.cornerRadius
  }

  /**
   * Sets the corner radius of the rounded rectangle.
   *
   * @param cornerRadius - The radius of the corners in pixels.
   */
  public set cornerRadius(cornerRadius: number) {
    if (cornerRadius === undefined) {
      return
    }
    this.roundedRectangle.cornerRadius = cornerRadius
  }

  /**
   * Whether the rounded rectangle uses a gradient for its base(background).
   */
  public get baseType(): BaseType {
    if (this.roundedRectangle.useTexture) {
      return "Texture"
    } else if (this.roundedRectangle.gradient) {
      return "Gradient"
    } else {
      return "Color"
    }
  }

  /**
   * Whether the rounded rectangle uses a gradient for its base(background).
   *
   * @param gradient - A boolean indicating whether to use a gradient (`true`) or a solid color (`false`).
   */
  public set baseType(gradient: BaseType) {
    if (gradient === undefined) {
      return
    }
    switch (gradient) {
      case "Color":
        this.roundedRectangle.gradient = false
        this.roundedRectangle.useTexture = false
        break
      case "Gradient":
        this.roundedRectangle.gradient = true
        this.roundedRectangle.useTexture = false
        break
      case "Texture":
        this.roundedRectangle.gradient = false
        this.roundedRectangle.useTexture = true
        break
    }
  }

  /**
   * Gets the default gradient parameters for the visual.
   *
   * @returns The default gradient parameters.
   */
  public get defaultGradient(): GradientParameters {
    return this._defaultGradient
  }

  /**
   * Sets the default gradient parameters for the visual and initializes the visual states.
   *
   * @param gradient - The gradient parameters to be set as the default.
   */
  public set defaultGradient(gradient: GradientParameters) {
    if (gradient === undefined) {
      return
    }
    if (isEqual<GradientParameters>(this._defaultGradient, gradient)) {
      return
    }
    this._defaultGradient = gradient
    if (!this.shouldColorChange && this.baseType === "Gradient") {
      this.roundedRectangle.setBackgroundGradient(gradient)
    } else if (this.shouldColorChange) {
      if (this.initialized) {
        this.needsVisualStateUpdate = true
      }
    }
  }

  /**
   * Gets the hovered gradient parameters for the visual.
   *
   * @returns The hovered gradient parameters.
   */
  public get hoveredGradient(): GradientParameters {
    return this._hoveredGradient
  }

  /**
   * Sets the hovered gradient parameters for the visual and initializes the visual states.
   *
   * @param hoveredGradient - The gradient parameters to be set for the hovered state.
   */
  public set hoveredGradient(hoveredGradient: GradientParameters) {
    if (hoveredGradient === undefined) {
      return
    }
    if (isEqual<GradientParameters>(this._hoveredGradient, hoveredGradient)) {
      return
    }
    this._hoveredGradient = hoveredGradient
    if (this.initialized) {
      this.needsVisualStateUpdate = true
    }
  }

  /**
   * Gets the triggered gradient parameters for the visual.
   *
   * @returns The triggered gradient parameters.
   */
  public get triggeredGradient(): GradientParameters {
    return this._triggeredGradient
  }

  /**
   * Sets the triggered gradient parameters for the visual and initializes the visual states.
   *
   * @param gradient - The gradient parameters to be set for the triggered state.
   */
  public set triggeredGradient(gradient: GradientParameters) {
    if (gradient === undefined) {
      return
    }
    if (isEqual<GradientParameters>(this._triggeredGradient, gradient)) {
      return
    }
    this._triggeredGradient = gradient
    if (this.initialized) {
      this.needsVisualStateUpdate = true
    }
  }

  /**
   * Gets the toggled default gradient parameters for the visual.
   *
   * @returns The toggled default gradient parameters.
   */
  public get toggledDefaultGradient(): GradientParameters {
    return this._toggledDefaultGradient
  }

  /**
   * Sets the toggled default gradient parameters for the visual and initializes the visual states.
   *
   * @param gradient - The gradient parameters to be set for the toggled default state.
   */
  public set toggledDefaultGradient(gradient: GradientParameters) {
    if (gradient === undefined) {
      return
    }
    if (isEqual<GradientParameters>(this._toggledDefaultGradient, gradient)) {
      return
    }
    this._toggledDefaultGradient = gradient
    if (this.initialized) {
      this.needsVisualStateUpdate = true
    }
  }

  /**
   * Gets the toggled hovered gradient parameters for the visual.
   *
   * @returns The toggled hovered gradient parameters.
   */
  public get toggledHoveredGradient(): GradientParameters {
    return this._toggledHoveredGradient
  }

  /**
   * Sets the toggled hovered gradient parameters for the visual and initializes the visual states.
   *
   * @param toggledHoveredGradient - The gradient parameters to be set for the toggled hovered state.
   */
  public set toggledHoveredGradient(toggledHoveredGradient: GradientParameters) {
    if (toggledHoveredGradient === undefined) {
      return
    }
    if (isEqual<GradientParameters>(this._toggledHoveredGradient, toggledHoveredGradient)) {
      return
    }
    this._toggledHoveredGradient = toggledHoveredGradient
    if (this.initialized) {
      this.needsVisualStateUpdate = true
    }
  }

  /**
   * Gets the toggled triggered gradient parameters for the visual.
   *
   * @returns The toggled triggered gradient parameters.
   */
  public get toggledTriggeredGradient(): GradientParameters {
    return this._toggledTriggeredGradient
  }

  /**
   * Sets the toggled triggered gradient parameters for the visual and initializes the visual states.
   *
   * @param gradient - The gradient parameters to be set for the toggled triggered state.
   */
  public set toggledTriggeredGradient(gradient: GradientParameters) {
    if (gradient === undefined) {
      return
    }
    if (isEqual<GradientParameters>(this._toggledTriggeredGradient, gradient)) {
      return
    }
    this._toggledTriggeredGradient = gradient
    if (this.initialized) {
      this.needsVisualStateUpdate = true
    }
  }

  /**
   * Gets the inactive gradient parameters for the visual.
   *
   * @returns The inactive gradient parameters.
   */
  public get inactiveGradient(): GradientParameters {
    return this._inactiveGradient
  }

  /**
   * Sets the inactive gradient parameters for the visual and initializes the visual states.
   *
   * @param gradient - The gradient parameters to be set for the inactive state.
   */
  public set inactiveGradient(gradient: GradientParameters) {
    if (gradient === undefined) {
      return
    }
    if (isEqual<GradientParameters>(this._inactiveGradient, gradient)) {
      return
    }
    this._inactiveGradient = gradient
    if (this.initialized) {
      this.needsVisualStateUpdate = true
    }
  }

  /**
   * Sets the gradient start and end positions for the base of the rounded rectangle.
   *
   * @param gradientStartPosition - A 2D vector representing the starting position of the gradient.
   * @param gradientEndPosition - A 2D vector representing the ending position of the gradient.
   */
  public setBaseGradientPositions(gradientStartPosition: vec2, gradientEndPosition: vec2) {
    this.roundedRectangle.gradientStartPosition = gradientStartPosition
    this.roundedRectangle.gradientEndPosition = gradientEndPosition
  }

  /**
   * Gets the default texture for the rounded rectangle.
   *
   * @returns The default texture as a `Texture` value.
   */
  public get defaultTexture(): Texture {
    return this._defaultTexture
  }

  /**
   * Sets the default texture for the rounded rectangle.
   *
   * @param texture - The texture to be set for the default state.
   */
  public set defaultTexture(texture: Texture) {
    if (texture === undefined) {
      return
    }
    if (isEqual<Texture>(this._defaultTexture, texture)) {
      return
    }
    this._defaultTexture = texture
  }

  /**
   * Gets the hovered texture for the rounded rectangle.
   *
   * @returns The hovered texture as a `Texture` value.
   */
  public get hoveredTexture(): Texture {
    return this._hoveredTexture
  }

  /**
   * Sets the hovered texture for the rounded rectangle.
   *
   * @param hoveredTexture - The texture to be set for the hovered state.
   */
  public set hoveredTexture(hoveredTexture: Texture) {
    if (hoveredTexture === undefined) {
      return
    }
    if (isEqual<Texture>(this._hoveredTexture, hoveredTexture)) {
      return
    }
    this._hoveredTexture = hoveredTexture
  }

  /**
   * Gets the triggered texture for the rounded rectangle.
   *
   * @returns The triggered texture as a `Texture` value.
   */
  public get triggeredTexture(): Texture {
    return this._triggeredTexture
  }

  /**
   * Sets the triggered texture for the rounded rectangle.
   *
   * @param texture - The texture to be set for the triggered state.
   */
  public set triggeredTexture(texture: Texture) {
    if (texture === undefined) {
      return
    }
    if (isEqual<Texture>(this._triggeredTexture, texture)) {
      return
    }
    this._triggeredTexture = texture
  }

  /**
   * Gets the inactive texture for the rounded rectangle.
   *
   * @returns The inactive texture as a `Texture` value.
   */
  public get inactiveTexture(): Texture {
    return this._inactiveTexture
  }

  /**
   * Sets the inactive texture for the rounded rectangle.
   *
   * @param texture - The texture to be set for the inactive state.
   */
  public set inactiveTexture(texture: Texture) {
    if (texture === undefined) {
      return
    }
    if (isEqual<Texture>(this._inactiveTexture, texture)) {
      return
    }
    this._inactiveTexture = texture
  }

  /**
   * Gets the toggled default texture for the rounded rectangle.
   *
   * @returns The toggled default texture as a `Texture` value.
   */
  public get toggledDefaultTexture(): Texture {
    return this._toggledDefaultTexture
  }

  /**
   * Sets the toggled default texture for the rounded rectangle.
   *
   * @param texture - The texture to be set for the toggled default state.
   */
  public set toggledDefaultTexture(texture: Texture) {
    if (texture === undefined) {
      return
    }
    if (isEqual<Texture>(this._toggledDefaultTexture, texture)) {
      return
    }
    this._toggledDefaultTexture = texture
  }

  /**
   * Gets the toggled hovered texture for the rounded rectangle.
   *
   * @returns The toggled hovered texture as a `Texture` value.
   */
  public get toggledHoveredTexture(): Texture {
    return this._toggledHoveredTexture
  }

  /**
   * Sets the toggled hovered texture for the rounded rectangle.
   *
   * @param toggledHoveredTexture - The texture to be set for the toggled hovered state.
   */
  public set toggledHoveredTexture(toggledHoveredTexture: Texture) {
    if (toggledHoveredTexture === undefined) {
      return
    }
    if (isEqual<Texture>(this._toggledHoveredTexture, toggledHoveredTexture)) {
      return
    }
    this._toggledHoveredTexture = toggledHoveredTexture
  }

  /**
   * Gets the toggled triggered texture for the rounded rectangle.
   *
   * @returns The toggled triggered texture as a `Texture` value.
   */
  public get toggledTriggeredTexture(): Texture {
    return this._toggledTriggeredTexture
  }

  /**
   * Sets the toggled triggered texture for the rounded rectangle.
   *
   * @param texture - The texture to be set for the toggled triggered state.
   */
  public set toggledTriggeredTexture(texture: Texture) {
    if (texture === undefined) {
      return
    }
    if (isEqual<Texture>(this._toggledTriggeredTexture, texture)) {
      return
    }
    this._toggledTriggeredTexture = texture
  }

  /**
   * Gets the type of border for the rounded rectangle.
   *
   * @returns The type of border, which can be either "Color" or "Gradient".
   */
  public get isBorderGradient(): boolean {
    return this.roundedRectangle.borderType === "Gradient"
  }

  /**
   * Sets whether the rounded rectangle uses a gradient for its border.
   *
   * @param gradient - A boolean indicating whether to use a gradient (`true`) or a solid color (`false`) for the border.
   */
  public set isBorderGradient(gradient: boolean) {
    if (gradient === undefined) {
      return
    }
    this.roundedRectangle.borderType = gradient ? "Gradient" : "Color"
  }

  /**
   * Gets the default color for the border of the rounded rectangle.
   *
   * @returns The default border color as a `vec4` value.
   */
  public get borderDefaultColor(): vec4 {
    return this._borderDefaultColor
  }

  /**
   * Sets the default color for the border of the rounded rectangle and initializes the visual states.
   *
   * @param color - The default color to be set for the border.
   */
  public set borderDefaultColor(color: vec4) {
    if (color === undefined) {
      return
    }
    if (isEqual<vec4>(this._borderDefaultColor, color)) {
      return
    }
    this._borderDefaultColor = color
    if (this.initialized) {
      this.needsVisualStateUpdate = true
    }
  }

  /**
   * Gets the hovered color for the border of the rounded rectangle.
   *
   * @returns The hovered border color as a `vec4` value.
   */
  public get borderHoveredColor(): vec4 {
    return this._borderHoveredColor
  }

  /**
   * Sets the hovered color for the border of the rounded rectangle and initializes the visual states.
   *
   * @param borderHoveredColor - The hovered color to be set for the border.
   */
  public set borderHoveredColor(borderHoveredColor: vec4) {
    if (borderHoveredColor === undefined) {
      return
    }
    if (isEqual<vec4>(this._borderHoveredColor, borderHoveredColor)) {
      return
    }
    this._borderHoveredColor = borderHoveredColor
    if (this.initialized) {
      this.needsVisualStateUpdate = true
    }
  }

  /**
   * Gets the triggered color for the border of the rounded rectangle.
   *
   * @returns The triggered border color as a `vec4` value.
   */
  public get borderTriggeredColor(): vec4 {
    return this._borderTriggeredColor
  }

  /**
   * Sets the triggered color for the border of the rounded rectangle and initializes the visual states.
   *
   * @param color - The triggered color to be set for the border.
   */
  public set borderTriggeredColor(color: vec4) {
    if (color === undefined) {
      return
    }
    if (isEqual<vec4>(this._borderTriggeredColor, color)) {
      return
    }
    this._borderTriggeredColor = color
    if (this.initialized) {
      this.needsVisualStateUpdate = true
    }
  }

  /**
   * Gets the gradient parameters for the toggled default state of the border.
   */
  public get borderToggledDefaultGradient(): GradientParameters {
    return this._borderToggledDefaultGradient
  }

  /**
   * Sets the gradient parameters for the toggled default state of the border
   */
  public set borderToggledDefaultGradient(gradient: GradientParameters) {
    if (gradient === undefined) {
      return
    }
    if (isEqual<GradientParameters>(this._borderToggledDefaultGradient, gradient)) {
      return
    }
    this._borderToggledDefaultGradient = gradient
    if (this.initialized) {
      this.needsVisualStateUpdate = true
    }
  }

  /**
   * Gets the gradient parameters for the toggled hovered state of the border.
   */
  public get borderToggledHoveredGradient(): GradientParameters {
    return this._borderToggledHoveredGradient
  }

  /**
   * Sets the gradient parameters for the toggled hovered state of the border and initializes the visual states.
   */
  public set borderToggledHoveredGradient(borderToggledHoveredGradient: GradientParameters) {
    if (borderToggledHoveredGradient === undefined) {
      return
    }
    if (isEqual<GradientParameters>(this._borderToggledHoveredGradient, borderToggledHoveredGradient)) {
      return
    }
    this._borderToggledHoveredGradient = borderToggledHoveredGradient
    if (this.initialized) {
      this.needsVisualStateUpdate = true
    }
  }

  /**
   * Gets the gradient parameters for the toggled triggered state of the border.
   */
  public get borderToggledTriggeredGradient(): GradientParameters {
    return this._borderToggledTriggeredGradient
  }

  /**
   * Sets the gradient parameters for the toggled triggered state of the border and initializes the visual states.
   */
  public set borderToggledTriggeredGradient(gradient: GradientParameters) {
    if (gradient === undefined) {
      return
    }
    if (isEqual<GradientParameters>(this._borderToggledTriggeredGradient, gradient)) {
      return
    }
    this._borderToggledTriggeredGradient = gradient
    if (this.initialized) {
      this.needsVisualStateUpdate = true
    }
  }

  /**
   * Gets the inactive color for the border of the rounded rectangle.
   *
   * @returns The inactive border color as a `vec4` value.
   */
  public get borderInactiveColor(): vec4 {
    return this._borderInactiveColor
  }

  /**
   * Sets the inactive color for the border of the rounded rectangle and initializes the visual states.
   *
   * @param color - The inactive color to be set for the border.
   */
  public set borderInactiveColor(color: vec4) {
    if (color === undefined) {
      return
    }
    if (isEqual<vec4>(this._borderInactiveColor, color)) {
      return
    }
    this._borderInactiveColor = color
    if (this.initialized) {
      this.needsVisualStateUpdate = true
    }
  }

  /**
   * Gets the toggled default color for the border of the rounded rectangle.
   *
   * @returns The toggled default border color as a `vec4` value.
   */
  public get borderToggledDefaultColor(): vec4 {
    return this._borderToggledDefaultColor
  }

  /**
   * Sets the toggled default color for the border of the rounded rectangle and initializes the visual states.
   *
   * @param color - The toggled default color to be set for the border.
   */
  public set borderToggledDefaultColor(color: vec4) {
    if (color === undefined) {
      return
    }
    if (isEqual<vec4>(this._borderToggledDefaultColor, color)) {
      return
    }
    this._borderToggledDefaultColor = color
    if (this.initialized) {
      this.needsVisualStateUpdate = true
    }
  }

  /**
   * Gets the toggled hovered color for the border of the rounded rectangle.
   *
   * @returns The toggled hovered border color as a `vec4` value.
   */
  public get borderToggledHoveredColor(): vec4 {
    return this._borderToggledHoveredColor
  }

  /**
   * Sets the toggled hovered color for the border of the rounded rectangle and initializes the visual states.
   *
   * @param borderToggledHoveredColor - The toggled hovered color to be set for the border.
   */
  public set borderToggledHoveredColor(borderToggledHoveredColor: vec4) {
    if (borderToggledHoveredColor === undefined) {
      return
    }
    if (isEqual<vec4>(this._borderToggledHoveredColor, borderToggledHoveredColor)) {
      return
    }
    this._borderToggledHoveredColor = borderToggledHoveredColor
    if (this.initialized) {
      this.needsVisualStateUpdate = true
    }
  }

  /**
   * Gets the toggled triggered color for the border of the rounded rectangle.
   *
   * @returns The toggled triggered border color as a `vec4` value.
   */
  public get borderToggledTriggeredColor(): vec4 {
    return this._borderToggledTriggeredColor
  }

  /**
   * Sets the toggled triggered color for the border of the rounded rectangle and initializes the visual states.
   *
   * @param color - The toggled triggered color to be set for the border.
   */
  public set borderToggledTriggeredColor(color: vec4) {
    if (color === undefined) {
      return
    }
    if (isEqual<vec4>(this._borderToggledTriggeredColor, color)) {
      return
    }
    this._borderToggledTriggeredColor = color
    if (this.initialized) {
      this.needsVisualStateUpdate = true
    }
  }

  /**
   * Gets the default gradient parameters for the border of the rounded rectangle.
   *
   * @returns The default border gradient parameters.
   */
  public get borderDefaultGradient(): GradientParameters {
    return this._borderDefaultGradient
  }

  /**
   * Sets the gradient parameters for the default state of the border and initializes the visual states.
   *
   * @param gradient - The gradient parameters to be set for the default state of the border.
   */
  public set borderDefaultGradient(gradient: GradientParameters) {
    if (gradient === undefined) {
      return
    }
    if (isEqual<GradientParameters>(this._borderDefaultGradient, gradient)) {
      return
    }
    this._borderDefaultGradient = gradient
    if (this.initialized) {
      this.needsVisualStateUpdate = true
    }
  }

  /**
   * Gets the gradient parameters for the hovered state of the border.
   *
   * @returns The hovered border gradient parameters.
   */
  public get borderHoveredGradient(): GradientParameters {
    return this._borderHoveredGradient
  }

  /**
   * Sets the gradient parameters for the hovered state of the border and initializes the visual states.
   *
   * @param borderHoveredGradient - The gradient parameters to be set for the hovered state of the border.
   */
  public set borderHoveredGradient(borderHoveredGradient: GradientParameters) {
    if (borderHoveredGradient === undefined) {
      return
    }
    if (isEqual<GradientParameters>(this._borderHoveredGradient, borderHoveredGradient)) {
      return
    }
    this._borderHoveredGradient = borderHoveredGradient
    if (this.initialized) {
      this.needsVisualStateUpdate = true
    }
  }

  /**
   * Gets the gradient parameters for the triggered state of the border.
   *
   * @returns The triggered border gradient parameters.
   */
  public get borderTriggeredGradient(): GradientParameters {
    return this._borderTriggeredGradient
  }

  /**
   * Sets the gradient parameters for the triggered state of the border and initializes the visual states.
   *
   * @param gradient - The gradient parameters to be set for the triggered state of the border.
   */
  public set borderTriggeredGradient(gradient: GradientParameters) {
    if (gradient === undefined) {
      return
    }
    if (isEqual<GradientParameters>(this._borderTriggeredGradient, gradient)) {
      return
    }
    this._borderTriggeredGradient = gradient
    if (this.initialized) {
      this.needsVisualStateUpdate = true
    }
  }

  /**
   * Gets the gradient parameters for the inactive state of the border.
   *
   * @returns The inactive border gradient parameters.
   */
  public get borderInactiveGradient(): GradientParameters {
    return this._borderInactiveGradient
  }

  /**
   * Sets the gradient parameters for the inactive state of the border and initializes the visual states.
   *
   * @param gradient - The gradient parameters to be set for the inactive state of the border.
   */
  public set borderInactiveGradient(gradient: GradientParameters) {
    if (gradient === undefined) {
      return
    }
    if (isEqual<GradientParameters>(this._borderInactiveGradient, gradient)) {
      return
    }
    this._borderInactiveGradient = gradient
    if (this.initialized) {
      this.needsVisualStateUpdate = true
    }
  }

  /**
   * Sets the start and end positions for the border gradient of the rounded rectangle.
   *
   * @param gradientStartPosition - A 2D vector representing the starting position of the border gradient.
   * @param gradientEndPosition - A 2D vector representing the ending position of the border gradient.
   */
  public setBorderGradientPositions(gradientStartPosition: vec2, gradientEndPosition: vec2): void {
    this.roundedRectangle.borderGradientStartPosition = gradientStartPosition
    this.roundedRectangle.borderGradientEndPosition = gradientEndPosition
  }

  /**
   * Gets the base type for the default state.
   *
   * @returns The base type for the default state.
   */
  public get defaultBaseType(): BaseType {
    return this._defaultBaseType
  }

  /**
   * Sets the base type for the default state and initializes the visual states.
   *
   * @param baseType - The base type to be set for the default state.
   */
  public set defaultBaseType(baseType: BaseType) {
    if (baseType === undefined) {
      return
    }
    if (isEqual<BaseType>(this._defaultBaseType, baseType)) {
      return
    }
    this._defaultBaseType = baseType
    if (this.initialized) {
      this.needsVisualStateUpdate = true
    }
  }

  /**
   * Gets the base type for the hovered state.
   *
   * @returns The base type for the hovered state.
   */
  public get hoveredBaseType(): BaseType {
    return this._hoveredBaseType
  }

  /**
   * Sets the base type for the hovered state and initializes the visual states.
   *
   * @param hoveredBaseType - The base type to be set for the hovered state.
   */
  public set hoveredBaseType(hoveredBaseType: BaseType) {
    if (hoveredBaseType === undefined) {
      return
    }
    if (isEqual<BaseType>(this._hoveredBaseType, hoveredBaseType)) {
      return
    }
    this._hoveredBaseType = hoveredBaseType
    if (this.initialized) {
      this.needsVisualStateUpdate = true
    }
  }

  /**
   * Gets the base type for the triggered state.
   *
   * @returns The base type for the triggered state.
   */
  public get triggeredBaseType(): BaseType {
    return this._triggeredBaseType
  }

  /**
   * Sets the base type for the triggered state and initializes the visual states.
   *
   * @param baseType - The base type to be set for the triggered state.
   */
  public set triggeredBaseType(baseType: BaseType) {
    if (baseType === undefined) {
      return
    }
    if (isEqual<BaseType>(this._triggeredBaseType, baseType)) {
      return
    }
    this._triggeredBaseType = baseType
    if (this.initialized) {
      this.needsVisualStateUpdate = true
    }
  }

  /**
   * Gets the base type for the inactive state.
   *
   * @returns The base type for the inactive state.
   */
  public get inactiveBaseType(): BaseType {
    return this._inactiveBaseType
  }

  /**
   * Sets the base type for the inactive state and initializes the visual states.
   *
   * @param baseType - The base type to be set for the inactive state.
   */
  public set inactiveBaseType(baseType: BaseType) {
    if (baseType === undefined) {
      return
    }
    if (isEqual<BaseType>(this._inactiveBaseType, baseType)) {
      return
    }
    this._inactiveBaseType = baseType
    if (this.initialized) {
      this.needsVisualStateUpdate = true
    }
  }

  /**
   * Gets the base type for the toggled default state.
   *
   * @returns The base type for the toggled default state.
   */
  public get toggledDefaultBaseType(): BaseType {
    return this._toggledDefaultBaseType
  }

  /**
   * Sets the base type for the toggled default state and initializes the visual states.
   *
   * @param baseType - The base type to be set for the toggled default state.
   */
  public set toggledDefaultBaseType(baseType: BaseType) {
    if (baseType === undefined) {
      return
    }
    if (isEqual<BaseType>(this._toggledDefaultBaseType, baseType)) {
      return
    }
    this._toggledDefaultBaseType = baseType
    if (this.initialized) {
      this.needsVisualStateUpdate = true
    }
  }

  /**
   * Gets the base type for the toggled hovered state.
   *
   * @returns The base type for the toggled hovered state.
   */
  public get toggledHoveredBaseType(): BaseType {
    return this._toggledHoveredBaseType
  }

  /**
   * Sets the base type for the toggled hovered state and initializes the visual states.
   *
   * @param toggledHoveredBaseType - The base type to be set for the toggled hovered state.
   */
  public set toggledHoveredBaseType(toggledHoveredBaseType: BaseType) {
    if (toggledHoveredBaseType === undefined) {
      return
    }
    if (isEqual<BaseType>(this._toggledHoveredBaseType, toggledHoveredBaseType)) {
      return
    }
    this._toggledHoveredBaseType = toggledHoveredBaseType
    if (this.initialized) {
      this.needsVisualStateUpdate = true
    }
  }

  /**
   * Gets the base type for the toggled triggered state.
   *
   * @returns The base type for the toggled triggered state.
   */
  public get toggledTriggeredBaseType(): BaseType {
    return this._toggledTriggeredBaseType
  }

  /**
   * Sets the base type for the toggled triggered state and initializes the visual states.
   *
   * @param baseType - The base type to be set for the toggled triggered state.
   */
  public set toggledTriggeredBaseType(baseType: BaseType) {
    if (baseType === undefined) {
      return
    }
    if (isEqual<BaseType>(this._toggledTriggeredBaseType, baseType)) {
      return
    }
    this._toggledTriggeredBaseType = baseType
    if (this.initialized) {
      this.needsVisualStateUpdate = true
    }
  }

  /**
   * Gets whether the default state has a border.
   *
   * @returns `true` if the default state has a border; otherwise, `false`.
   */
  public get defaultHasBorder(): boolean {
    return this._defaultHasBorder
  }

  /**
   * Sets whether the default state has a border and initializes the visual states.
   *
   * @param hasBorder - A boolean indicating whether the default state should have a border.
   */
  public set defaultHasBorder(hasBorder: boolean) {
    if (hasBorder === undefined) {
      return
    }
    if (isEqual<boolean>(this._defaultHasBorder, hasBorder)) {
      return
    }
    this._defaultHasBorder = hasBorder
    if (this.initialized) {
      this.needsVisualStateUpdate = true
    }
  }

  /**
   * Gets whether the hovered state has a border.
   *
   * @returns `true` if the hovered state has a border; otherwise, `false`.
   */
  public get hoveredHasBorder(): boolean {
    return this._hoveredHasBorder
  }

  /**
   * Sets whether the hovered state has a border and initializes the visual states.
   *
   * @param hoveredHasBorder - A boolean indicating whether the hovered state should have a border.
   */
  public set hoveredHasBorder(hoveredHasBorder: boolean) {
    if (hoveredHasBorder === undefined) {
      return
    }
    if (isEqual<boolean>(this._hoveredHasBorder, hoveredHasBorder)) {
      return
    }
    this._hoveredHasBorder = hoveredHasBorder
    if (this.initialized) {
      this.needsVisualStateUpdate = true
    }
  }

  /**
   * Gets whether the triggered state has a border.
   *
   * @returns `true` if the triggered state has a border; otherwise, `false`.
   */
  public get triggeredHasBorder(): boolean {
    return this._triggeredHasBorder
  }

  /**
   * Sets whether the triggered state has a border and initializes the visual states.
   *
   * @param hasBorder - A boolean indicating whether the triggered state should have a border.
   */
  public set triggeredHasBorder(hasBorder: boolean) {
    if (hasBorder === undefined) {
      return
    }
    if (isEqual<boolean>(this._triggeredHasBorder, hasBorder)) {
      return
    }
    this._triggeredHasBorder = hasBorder
    if (this.initialized) {
      this.needsVisualStateUpdate = true
    }
  }

  /**
   * Gets whether the inactive state has a border.
   *
   * @returns `true` if the inactive state has a border; otherwise, `false`.
   */
  public get inactiveHasBorder(): boolean {
    return this._inactiveHasBorder
  }

  /**
   * Sets whether the inactive state has a border and initializes the visual states.
   *
   * @param hasBorder - A boolean indicating whether the inactive state should have a border.
   */
  public set inactiveHasBorder(hasBorder: boolean) {
    if (hasBorder === undefined) {
      return
    }
    if (isEqual<boolean>(this._inactiveHasBorder, hasBorder)) {
      return
    }
    this._inactiveHasBorder = hasBorder
    if (this.initialized) {
      this.needsVisualStateUpdate = true
    }
  }

  /**
   * Gets whether the toggled default state has a border.
   *
   * @returns `true` if the toggled default state has a border; otherwise, `false`.
   */
  public get toggledDefaultHasBorder(): boolean {
    return this._toggledDefaultHasBorder
  }

  /**
   * Sets whether the toggled default state has a border and initializes the visual states.
   *
   * @param hasBorder - A boolean indicating whether the toggled default state should have a border.
   */
  public set toggledDefaultHasBorder(hasBorder: boolean) {
    if (hasBorder === undefined) {
      return
    }
    if (isEqual<boolean>(this._toggledDefaultHasBorder, hasBorder)) {
      return
    }
    this._toggledDefaultHasBorder = hasBorder
    if (this.initialized) {
      this.needsVisualStateUpdate = true
    }
  }

  /**
   * Gets whether the toggled hovered state has a border.
   *
   * @returns `true` if the toggled hovered state has a border; otherwise, `false`.
   */
  public get toggledHoveredHasBorder(): boolean {
    return this._toggledHoveredHasBorder
  }

  /**
   * Sets whether the toggled hovered state has a border and initializes the visual states.
   *
   * @param toggledHoveredHasBorder - A boolean indicating whether the toggled hovered state should have a border.
   */
  public set toggledHoveredHasBorder(toggledHoveredHasBorder: boolean) {
    if (toggledHoveredHasBorder === undefined) {
      return
    }
    if (isEqual<boolean>(this._toggledHoveredHasBorder, toggledHoveredHasBorder)) {
      return
    }
    this._toggledHoveredHasBorder = toggledHoveredHasBorder
    if (this.initialized) {
      this.needsVisualStateUpdate = true
    }
  }

  /**
   * Gets whether the toggled triggered state has a border.
   *
   * @returns `true` if the toggled triggered state has a border; otherwise, `false`.
   */
  public get toggledTriggeredHasBorder(): boolean {
    return this._toggledTriggeredHasBorder
  }

  /**
   * Sets whether the toggled triggered state has a border and initializes the visual states.
   *
   * @param hasBorder - A boolean indicating whether the toggled triggered state should have a border.
   */
  public set toggledTriggeredHasBorder(hasBorder: boolean) {
    if (hasBorder === undefined) {
      return
    }
    if (isEqual<boolean>(this._toggledTriggeredHasBorder, hasBorder)) {
      return
    }
    this._toggledTriggeredHasBorder = hasBorder
    if (this.initialized) {
      this.needsVisualStateUpdate = true
    }
  }

  /**
   * Gets the border type for the default state.
   *
   * @returns The border type for the default state.
   */
  public get defaultBorderType(): BorderType {
    return this._defaultBorderType
  }

  /**
   * Sets the border type for the default state and initializes the visual states.
   *
   * @param borderType - The border type to be set for the default state.
   */
  public set defaultBorderType(borderType: BorderType) {
    if (borderType === undefined) {
      return
    }
    if (isEqual<BorderType>(this._defaultBorderType, borderType)) {
      return
    }
    this._defaultBorderType = borderType
    if (this.initialized) {
      this.needsVisualStateUpdate = true
    }
  }

  /**
   * Gets the border type for the hovered state.
   *
   * @returns The border type for the hovered state.
   */
  public get hoveredBorderType(): BorderType {
    return this._hoveredBorderType
  }

  /**
   * Sets the border type for the hovered state and initializes the visual states.
   *
   * @param hoveredBorderType - The border type to be set for the hovered state.
   */
  public set hoveredBorderType(hoveredBorderType: BorderType) {
    if (hoveredBorderType === undefined) {
      return
    }
    if (isEqual<BorderType>(this._hoveredBorderType, hoveredBorderType)) {
      return
    }
    this._hoveredBorderType = hoveredBorderType
    if (this.initialized) {
      this.needsVisualStateUpdate = true
    }
  }

  /**
   * Gets the border type for the triggered state.
   *
   * @returns The border type for the triggered state.
   */
  public get triggeredBorderType(): BorderType {
    return this._triggeredBorderType
  }

  /**
   * Sets the border type for the triggered state and initializes the visual states.
   *
   * @param borderType - The border type to be set for the triggered state.
   */
  public set triggeredBorderType(borderType: BorderType) {
    if (borderType === undefined) {
      return
    }
    if (isEqual<BorderType>(this._triggeredBorderType, borderType)) {
      return
    }
    this._triggeredBorderType = borderType
    if (this.initialized) {
      this.needsVisualStateUpdate = true
    }
  }

  /**
   * Gets the border type for the inactive state.
   *
   * @returns The border type for the inactive state.
   */
  public get inactiveBorderType(): BorderType {
    return this._inactiveBorderType
  }

  /**
   * Sets the border type for the inactive state and initializes the visual states.
   *
   * @param borderType - The border type to be set for the inactive state.
   */
  public set inactiveBorderType(borderType: BorderType) {
    if (borderType === undefined) {
      return
    }
    if (isEqual<BorderType>(this._inactiveBorderType, borderType)) {
      return
    }
    this._inactiveBorderType = borderType
    if (this.initialized) {
      this.needsVisualStateUpdate = true
    }
  }

  /**
   * Gets the border type for the toggled default state.
   *
   * @returns The border type for the toggled default state.
   */
  public get toggledDefaultBorderType(): BorderType {
    return this._toggledDefaultBorderType
  }

  /**
   * Sets the border type for the toggled default state and initializes the visual states.
   *
   * @param borderType - The border type to be set for the toggled default state.
   */
  public set toggledDefaultBorderType(borderType: BorderType) {
    if (borderType === undefined) {
      return
    }
    if (isEqual<BorderType>(this._toggledDefaultBorderType, borderType)) {
      return
    }
    this._toggledDefaultBorderType = borderType
    if (this.initialized) {
      this.needsVisualStateUpdate = true
    }
  }

  /**
   * Gets the border type for the toggled hovered state.
   *
   * @returns The border type for the toggled hovered state.
   */
  public get toggledHoveredBorderType(): BorderType {
    return this._toggledHoveredBorderType
  }

  /**
   * Sets the border type for the toggled hovered state and initializes the visual states.
   *
   * @param toggledHoveredBorderType - The border type to be set for the toggled hovered state.
   */
  public set toggledHoveredBorderType(toggledHoveredBorderType: BorderType) {
    if (toggledHoveredBorderType === undefined) {
      return
    }
    if (isEqual<BorderType>(this._toggledHoveredBorderType, toggledHoveredBorderType)) {
      return
    }
    this._toggledHoveredBorderType = toggledHoveredBorderType
    if (this.initialized) {
      this.needsVisualStateUpdate = true
    }
  }

  /**
   * Gets the border type for the toggled triggered state.
   *
   * @returns The border type for the toggled triggered state.
   */
  public get toggledTriggeredBorderType(): BorderType {
    return this._toggledTriggeredBorderType
  }

  /**
   * Sets the border type for the toggled triggered state and initializes the visual states.
   *
   * @param borderType - The border type to be set for the toggled triggered state.
   */
  public set toggledTriggeredBorderType(borderType: BorderType) {
    if (borderType === undefined) {
      return
    }
    if (isEqual<BorderType>(this._toggledTriggeredBorderType, borderType)) {
      return
    }
    this._toggledTriggeredBorderType = borderType
    if (this.initialized) {
      this.needsVisualStateUpdate = true
    }
  }

  /**
   * Gets the border size for the default state.
   *
   * @returns The border size for the default state.
   */
  public get defaultBorderSize(): number {
    return this._defaultBorderSize
  }

  /**
   * Sets the border size for the default state and initializes the visual states.
   *
   * @param borderSize - The border size to be set for the default state.
   */
  public set defaultBorderSize(borderSize: number) {
    if (borderSize === undefined) {
      return
    }
    if (isEqual<number>(this._defaultBorderSize, borderSize)) {
      return
    }
    this._defaultBorderSize = borderSize
    if (this.initialized) {
      this.needsVisualStateUpdate = true
    }
  }

  /**
   * Gets the border size for the hovered state.
   *
   * @returns The border size for the hovered state.
   */
  public get hoveredBorderSize(): number {
    return this._hoveredBorderSize
  }

  /**
   * Sets the border size for the hovered state and initializes the visual states.
   *
   * @param hoveredBorderSize - The border size to be set for the hovered state.
   */
  public set hoveredBorderSize(hoveredBorderSize: number) {
    if (hoveredBorderSize === undefined) {
      return
    }
    if (isEqual<number>(this._hoveredBorderSize, hoveredBorderSize)) {
      return
    }
    this._hoveredBorderSize = hoveredBorderSize
    if (this.initialized) {
      this.needsVisualStateUpdate = true
    }
  }

  /**
   * Gets the border size for the triggered state.
   *
   * @returns The border size for the triggered state.
   */
  public get triggeredBorderSize(): number {
    return this._triggeredBorderSize
  }

  /**
   * Sets the border size for the triggered state and initializes the visual states.
   *
   * @param borderSize - The border size to be set for the triggered state.
   */
  public set triggeredBorderSize(borderSize: number) {
    if (borderSize === undefined) {
      return
    }
    if (isEqual<number>(this._triggeredBorderSize, borderSize)) {
      return
    }
    this._triggeredBorderSize = borderSize
    if (this.initialized) {
      this.needsVisualStateUpdate = true
    }
  }

  /**
   * Gets the border size for the inactive state.
   *
   * @returns The border size for the inactive state.
   */
  public get inactiveBorderSize(): number {
    return this._inactiveBorderSize
  }

  /**
   * Sets the border size for the inactive state and initializes the visual states.
   *
   * @param borderSize - The border size to be set for the inactive state.
   */
  public set inactiveBorderSize(borderSize: number) {
    if (borderSize === undefined) {
      return
    }
    if (isEqual<number>(this._inactiveBorderSize, borderSize)) {
      return
    }
    this._inactiveBorderSize = borderSize
    if (this.initialized) {
      this.needsVisualStateUpdate = true
    }
  }

  /**
   * Gets the border size for the toggled default state.
   *
   * @returns The border size for the toggled default state.
   */
  public get toggledDefaultBorderSize(): number {
    return this._toggledDefaultBorderSize
  }

  /**
   * Sets the border size for the toggled default state and initializes the visual states.
   *
   * @param borderSize - The border size to be set for the toggled default state.
   */
  public set toggledDefaultBorderSize(borderSize: number) {
    if (borderSize === undefined) {
      return
    }
    if (isEqual<number>(this._toggledDefaultBorderSize, borderSize)) {
      return
    }
    this._toggledDefaultBorderSize = borderSize
    if (this.initialized) {
      this.needsVisualStateUpdate = true
    }
  }

  /**
   * Gets the border size for the toggled hovered state.
   *
   * @returns The border size for the toggled hovered state.
   */
  public get toggledHoveredBorderSize(): number {
    return this._toggledHoveredBorderSize
  }

  /**
   * Sets the border size for the toggled hovered state and initializes the visual states.
   *
   * @param toggledHoveredBorderSize - The border size to be set for the toggled hovered state.
   */
  public set toggledHoveredBorderSize(toggledHoveredBorderSize: number) {
    if (toggledHoveredBorderSize === undefined) {
      return
    }
    if (isEqual<number>(this._toggledHoveredBorderSize, toggledHoveredBorderSize)) {
      return
    }
    this._toggledHoveredBorderSize = toggledHoveredBorderSize
    if (this.initialized) {
      this.needsVisualStateUpdate = true
    }
  }

  /**
   * Gets the border size for the toggled triggered state.
   *
   * @returns The border size for the toggled triggered state.
   */
  public get toggledTriggeredBorderSize(): number {
    return this._toggledTriggeredBorderSize
  }

  /**
   * Sets the border size for the toggled triggered state and initializes the visual states.
   *
   * @param borderSize - The border size to be set for the toggled triggered state.
   */
  public set toggledTriggeredBorderSize(borderSize: number) {
    if (borderSize === undefined) {
      return
    }
    if (isEqual<number>(this._toggledTriggeredBorderSize, borderSize)) {
      return
    }
    this._toggledTriggeredBorderSize = borderSize
    if (this.initialized) {
      this.needsVisualStateUpdate = true
    }
  }

  protected updateGradient(gradient: GradientParameters) {
    if (!this.shouldColorChange || this.baseType !== "Gradient") {
      return
    }
    const initalGradient = this.currentGradient
    const remaining = GradientParameters.distance(gradient, initalGradient)
    const full = this.prevState?.baseGradient
      ? GradientParameters.distance(gradient, this.prevState.baseGradient)
      : remaining

    const ratio = full > 1e-6 ? Math.min(Math.max(remaining / full, 0), 1) : 0
    this._gradientChangeCancelSet.cancel()
    animate({
      duration: ratio * this.animateDuration,
      cancelSet: this._gradientChangeCancelSet,
      update: (t) => {
        this.currentGradient = GradientParameters.lerp(initalGradient, gradient, t)
        this.roundedRectangle.setBackgroundGradient(this.currentGradient)
      },
      ended: () => {
        this.currentGradient = gradient
        this.roundedRectangle.setBackgroundGradient(this.currentGradient)
      }
    })
  }

  protected updateBaseTexture(texture: Texture) {
    if (this.baseType !== "Texture") {
      return
    }
    this.roundedRectangle.texture = texture
  }

  protected updateBorderColors(borderColor: vec4) {
    if (!this.shouldColorChange || !this.hasBorder || this.isBorderGradient) {
      return
    }
    const initialBorderColor = this.roundedRectangle.borderColor
    const remaining = colorDistance(borderColor, initialBorderColor)
    const full = this.prevState?.borderColor ? colorDistance(borderColor, this.prevState.borderColor) : remaining
    const ratio = full > 1e-6 ? Math.min(Math.max(remaining / full, 0), 1) : 0
    this._borderColorChangeCancelSet.cancel()
    animate({
      duration: ratio * this.animateDuration,
      cancelSet: this._borderColorChangeCancelSet,
      update: (t) => {
        this.roundedRectangle.borderColor = colorLerp(initialBorderColor, borderColor, t)
      }
    })
  }

  protected updateBorderGradient(gradient: GradientParameters) {
    if (!this.hasBorder || !this.isBorderGradient) {
      return
    }
    const initalGradient = this.currentBorderGradient
    const remaining = GradientParameters.distance(gradient, initalGradient)
    const full = this.prevState?.borderGradient
      ? GradientParameters.distance(gradient, this.prevState.borderGradient)
      : remaining

    const ratio = full > 1e-6 ? Math.min(Math.max(remaining / full, 0), 1) : 0
    this._borderGradientChangeCancelSet.cancel()
    animate({
      duration: ratio * this.animateDuration,
      cancelSet: this._borderGradientChangeCancelSet,
      update: (t) => {
        this.currentBorderGradient = GradientParameters.lerp(initalGradient, gradient, t)
        this.roundedRectangle.setBorderGradient(this.currentBorderGradient)
      },
      ended: () => {
        this.currentBorderGradient = gradient
        this.roundedRectangle.setBorderGradient(this.currentBorderGradient)
      }
    })
  }

  protected updateBorderSize(borderSize: number) {
    if (!this.hasBorder) {
      return
    }
    this.roundedRectangle.borderSize = borderSize
  }

  protected updateHasBorder(hasBorder: boolean) {
    if (hasBorder === undefined) {
      return
    }
    this._hasBorder = hasBorder
    if (this.initialized) {
      this.roundedRectangle.border = hasBorder
    }
  }

  protected updateBaseType(isBaseGradient: BaseType) {
    if (isBaseGradient !== undefined) {
      this.baseType = isBaseGradient
    }
  }

  protected updateBorderType(borderType: BorderType) {
    if (borderType !== undefined) {
      this.isBorderGradient = borderType === "Gradient"
    }
  }

  /**
   * Prints the configuration of the rounded rectangle visual to the console.
   */
  public printConfig(): void {
    this.roundedRectangle.printConfig()
  }

  protected applyStyleParameters(parameters: Partial<RoundedRectangleVisualParameters>) {
    // First call the parent method to handle base VisualState properties
    super.applyStyleParameters(parameters)

    // Then handle RoundedRectangle-specific properties
    // BaseType flags
    this.applyStyleProperty<Partial<RoundedRectangleVisualParameters>, RoundedRectangleVisualState, BaseType>(
      parameters,
      "baseType",
      {
        default: (value) => (this.defaultBaseType = value),
        hovered: (value) => (this.hoveredBaseType = value),
        triggered: (value) => (this.triggeredBaseType = value),
        inactive: (value) => (this.inactiveBaseType = value),
        toggledDefault: (value) => (this.toggledDefaultBaseType = value),
        toggledHovered: (value) => (this.toggledHoveredBaseType = value),
        toggledTriggered: (value) => (this.toggledTriggeredBaseType = value)
      }
    )

    // Base gradient parameters
    this.applyStyleProperty<Partial<RoundedRectangleVisualParameters>, RoundedRectangleVisualState, GradientParameters>(
      parameters,
      "baseGradient",
      {
        default: (value) => (this.defaultGradient = value),
        hovered: (value) => (this.hoveredGradient = value),
        triggered: (value) => (this.triggeredGradient = value),
        inactive: (value) => (this.inactiveGradient = value),
        toggledDefault: (value) => (this.toggledDefaultGradient = value),
        toggledHovered: (value) => (this.toggledHoveredGradient = value),
        toggledTriggered: (value) => (this.toggledTriggeredGradient = value)
      }
    )

    // Base texture parameters
    this.applyStyleProperty<Partial<RoundedRectangleVisualParameters>, RoundedRectangleVisualState, Texture>(
      parameters,
      "baseTexture",
      {
        default: (value) => (this.defaultTexture = value),
        hovered: (value) => (this.hoveredTexture = value),
        triggered: (value) => (this.triggeredTexture = value),
        inactive: (value) => (this.inactiveTexture = value),
        toggledDefault: (value) => (this.toggledDefaultTexture = value),
        toggledHovered: (value) => (this.toggledHoveredTexture = value),
        toggledTriggered: (value) => (this.toggledTriggeredTexture = value)
      }
    )

    // HasBorder flags
    this.applyStyleProperty<Partial<RoundedRectangleVisualParameters>, RoundedRectangleVisualState, boolean>(
      parameters,
      "hasBorder",
      {
        default: (value) => (this.defaultHasBorder = value),
        hovered: (value) => (this.hoveredHasBorder = value),
        triggered: (value) => (this.triggeredHasBorder = value),
        inactive: (value) => (this.inactiveHasBorder = value),
        toggledDefault: (value) => (this.toggledDefaultHasBorder = value),
        toggledHovered: (value) => (this.toggledHoveredHasBorder = value),
        toggledTriggered: (value) => (this.toggledTriggeredHasBorder = value)
      }
    )

    // Border types
    this.applyStyleProperty<Partial<RoundedRectangleVisualParameters>, RoundedRectangleVisualState, BorderType>(
      parameters,
      "borderType",
      {
        default: (value) => (this.defaultBorderType = value),
        hovered: (value) => (this.hoveredBorderType = value),
        triggered: (value) => (this.triggeredBorderType = value),
        inactive: (value) => (this.inactiveBorderType = value),
        toggledDefault: (value) => (this.toggledDefaultBorderType = value),
        toggledHovered: (value) => (this.toggledHoveredBorderType = value),
        toggledTriggered: (value) => (this.toggledTriggeredBorderType = value)
      }
    )

    // Border sizes
    this.applyStyleProperty<Partial<RoundedRectangleVisualParameters>, RoundedRectangleVisualState, number>(
      parameters,
      "borderSize",
      {
        default: (value) => (this.defaultBorderSize = value),
        hovered: (value) => (this.hoveredBorderSize = value),
        triggered: (value) => (this.triggeredBorderSize = value),
        inactive: (value) => (this.inactiveBorderSize = value),
        toggledDefault: (value) => (this.toggledDefaultBorderSize = value),
        toggledHovered: (value) => (this.toggledHoveredBorderSize = value),
        toggledTriggered: (value) => (this.toggledTriggeredBorderSize = value)
      }
    )

    // Border colors
    this.applyStyleProperty<Partial<RoundedRectangleVisualParameters>, RoundedRectangleVisualState, vec4>(
      parameters,
      "borderColor",
      {
        default: (value) => (this.borderDefaultColor = value),
        hovered: (value) => (this.borderHoveredColor = value),
        triggered: (value) => (this.borderTriggeredColor = value),
        inactive: (value) => (this.borderInactiveColor = value),
        toggledDefault: (value) => (this.borderToggledDefaultColor = value),
        toggledHovered: (value) => (this.borderToggledHoveredColor = value),
        toggledTriggered: (value) => (this.borderToggledTriggeredColor = value)
      }
    )

    // Border gradients
    this.applyStyleProperty<Partial<RoundedRectangleVisualParameters>, RoundedRectangleVisualState, GradientParameters>(
      parameters,
      "borderGradient",
      {
        default: (value) => (this.borderDefaultGradient = value),
        hovered: (value) => (this.borderHoveredGradient = value),
        triggered: (value) => (this.borderTriggeredGradient = value),
        inactive: (value) => (this.borderInactiveGradient = value),
        toggledDefault: (value) => (this.borderToggledDefaultGradient = value),
        toggledHovered: (value) => (this.borderToggledHoveredGradient = value),
        toggledTriggered: (value) => (this.borderToggledTriggeredGradient = value)
      }
    )
  }

  protected updateVisualStates(): void {
    this._roundedRectangleVisualStates = new Map([
      [
        StateName.default,
        {
          baseColor: this.baseDefaultColor,
          baseType: this.defaultBaseType,
          hasBorder: this.defaultHasBorder,
          borderSize: this.defaultBorderSize,
          borderType: this.defaultBorderType,
          baseGradient: this.defaultGradient,
          baseTexture: this.defaultTexture,
          borderColor: this.borderDefaultColor,
          borderGradient: this.borderDefaultGradient,
          shouldPosition: this.defaultShouldPosition,
          shouldScale: this.defaultShouldScale,
          localScale: this.defaultScale,
          localPosition: this.defaultPosition
        }
      ],
      [
        StateName.hovered,
        {
          baseColor: this.baseHoveredColor,
          baseGradient: this.hoveredGradient,
          baseTexture: this.hoveredTexture,
          hasBorder: this.hoveredHasBorder,
          borderSize: this.hoveredBorderSize,
          borderColor: this.borderHoveredColor,
          borderGradient: this.borderHoveredGradient,
          shouldPosition: this.hoveredShouldPosition,
          shouldScale: this.hoveredShouldScale,
          localScale: this.hoveredScale,
          localPosition: this.hoveredPosition
        }
      ],
      [
        StateName.triggered,
        {
          baseColor: this.baseTriggeredColor,
          baseGradient: this.triggeredGradient,
          baseTexture: this.triggeredTexture,
          hasBorder: this.triggeredHasBorder,
          borderSize: this.triggeredBorderSize,
          borderColor: this.borderTriggeredColor,
          borderGradient: this.borderTriggeredGradient,
          shouldPosition: this.triggeredShouldPosition,
          shouldScale: this.triggeredShouldScale,
          localScale: this.triggeredScale,
          localPosition: this.triggeredPosition
        }
      ],
      [
        StateName.toggledHovered,
        {
          baseColor: this.baseToggledHoveredColor,
          baseGradient: this.toggledHoveredGradient,
          baseTexture: this.toggledHoveredTexture,
          hasBorder: this.toggledHoveredHasBorder,
          borderSize: this.toggledHoveredBorderSize,
          borderColor: this.borderToggledHoveredColor,
          borderGradient: this.borderToggledHoveredGradient,
          shouldPosition: this.toggledHoveredShouldPosition,
          shouldScale: this.toggledHoveredShouldScale,
          localScale: this.toggledHoveredScale,
          localPosition: this.toggledHoveredPosition
        }
      ],
      [
        StateName.toggledDefault,
        {
          baseColor: this.baseTriggeredColor,
          baseGradient: this.toggledDefaultGradient,
          baseTexture: this.toggledDefaultTexture,
          hasBorder: this.toggledDefaultHasBorder,
          borderSize: this.toggledDefaultBorderSize,
          borderColor: this.borderToggledDefaultColor,
          borderGradient: this.borderToggledDefaultGradient,
          shouldPosition: this.toggledDefaultShouldPosition,
          shouldScale: this.toggledDefaultShouldScale,
          localScale: this.toggledScale,
          localPosition: this.toggledPosition
        }
      ],
      [
        StateName.toggledTriggered,
        {
          baseColor: this.baseTriggeredColor,
          baseGradient: this.toggledTriggeredGradient,
          baseTexture: this.toggledTriggeredTexture,
          hasBorder: this.toggledTriggeredHasBorder,
          borderSize: this.toggledTriggeredBorderSize,
          borderColor: this.borderToggledTriggeredColor,
          borderGradient: this.borderToggledTriggeredGradient,
          shouldPosition: this.toggledTriggeredShouldPosition,
          shouldScale: this.toggledTriggeredShouldScale,
          localScale: this.toggledTriggeredScale,
          localPosition: this.toggledTriggeredPosition
        }
      ],
      [
        StateName.error,
        {
          baseColor: this.baseErrorColor,
          baseGradient: this.defaultGradient,
          baseTexture: this.defaultTexture,
          hasBorder: this.defaultHasBorder,
          borderSize: this.defaultBorderSize,
          borderColor: this.baseErrorColor,
          borderGradient: this.borderDefaultGradient,
          shouldPosition: this.defaultShouldPosition,
          shouldScale: this.defaultShouldScale,
          localScale: this.errorScale,
          localPosition: this.errorPosition
        }
      ],
      [
        StateName.errorHovered,
        {
          baseColor: this.baseErrorColor,
          baseGradient: this.hoveredGradient,
          baseTexture: this.hoveredTexture,
          hasBorder: this.hoveredHasBorder,
          borderSize: this.hoveredBorderSize,
          borderColor: this.baseErrorColor,
          borderGradient: this.borderHoveredGradient,
          shouldPosition: this.hoveredShouldPosition,
          shouldScale: this.hoveredShouldScale,
          localScale: this.hoveredScale,
          localPosition: this.errorPosition
        }
      ],
      [
        StateName.inactive,
        {
          baseColor: this.baseInactiveColor,
          baseGradient: this.inactiveGradient,
          baseTexture: this.inactiveTexture,
          hasBorder: this.inactiveHasBorder,
          borderSize: this.inactiveBorderSize,
          borderColor: this.borderInactiveColor,
          borderGradient: this.borderInactiveGradient,
          shouldPosition: this.inactiveShouldPosition,
          shouldScale: this.inactiveShouldScale,
          localScale: this.inactiveScale,
          localPosition: this.inactivePosition
        }
      ]
    ])
    super.updateVisualStates()
  }

  private get roundedRectangle(): RoundedRectangle {
    return this._visualComponent as RoundedRectangle
  }

  private set roundedRectangle(value: RoundedRectangle) {
    this._visualComponent = value
  }
}
