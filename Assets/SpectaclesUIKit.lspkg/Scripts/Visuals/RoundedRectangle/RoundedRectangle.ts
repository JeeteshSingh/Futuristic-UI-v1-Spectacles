import {colorDistance, colorLerp, RGBtoHSV} from "../../Utility/UIKitUtilities"

/**
 * Size Modes For Texture Background
 */
export type TextureMode = "Stretch" | "Fill Height" | "Fill Width"
/**
 * Wrap Modes For Texture Background
 */
export type TextureWrap = "None" | "Repeat" | "Clamp"
/**
 * Gradient Types for background and border
 */
export type GradientType = "Linear" | "Radial" | "Rectangle"
/**
 * Whether border is solid color or gradient
 */
export type BorderType = "Color" | "Gradient"

/**
 * Helper Type For Gradient Stops
 */
export type GradientStop = {
  color?: vec4
  percent?: number
  enabled?: boolean
}

/**
 * Parameters for Border setting functions
 */
export type GradientParameters = {
  enabled?: boolean
  start?: vec2
  end?: vec2
  type?: GradientType
  stop0?: GradientStop
  stop1?: GradientStop
  stop2?: GradientStop
  stop3?: GradientStop
  stop4?: GradientStop
}

export const GradientParameters = {
  /**
   * Interpolates between two gradient parameter sets.
   * - t is clamped to [0, 1].
   * - Colors are interpolated in HSV space using the shortest hue path; alpha is linear.
   * - For non-stop fields (enabled, type, start, end), values prefer 'to' when defined, otherwise use 'from'.
   * - For stops: when both exist they are interpolated; if only 'to' exists it fades in with t as alpha; if only 'from' exists it fades out.
   */
  lerp(from: GradientParameters, to: GradientParameters, t: number): GradientParameters {
    const lerpStop = (fromStop?: GradientStop, toStop?: GradientStop): GradientStop | undefined => {
      const fromExists = !!fromStop
      const toExists = !!toStop
      const clampT = Math.max(0, Math.min(1, t))

      // Case matrix for existence of stops:
      // - toExists && fromExists: interpolate colors and prefer 'to' for percent/enabled when defined
      // - toExists && !fromExists: fade in 'to' color with alpha = clampT
      // - !toExists && fromExists: fade out 'from' color with alpha scaled by (1 - clampT); disappears at t=1
      // - !toExists && !fromExists: no stop
      if (toExists && fromExists) {
        const fromColor = fromStop.color ?? vec4.zero()
        const toColor = toStop.color ?? vec4.zero()
        return {
          color: colorLerp(fromColor, toColor, t),
          percent: toStop.percent !== undefined ? toStop.percent : fromStop.percent,
          enabled: toStop.enabled !== undefined ? toStop.enabled : fromStop.enabled
        }
      }

      if (toExists && !fromExists) {
        const base = toStop.color ?? vec4.zero()
        return {
          color: new vec4(base.x, base.y, base.z, clampT),
          percent: toStop.percent,
          enabled: toStop.enabled
        }
      }

      if (!toExists && fromExists) {
        if (clampT >= 1) {
          return undefined
        }
        const base = fromStop.color ?? vec4.zero()
        return {
          color: new vec4(base.r, base.g, base.b, (1 - clampT) * base.a),
          percent: fromStop.percent,
          enabled: fromStop.enabled
        }
      }

      // !toExists && !fromExists
      return undefined
    }

    const result: GradientParameters = {
      enabled: to.enabled !== undefined ? to.enabled : from.enabled,
      type: to.type !== undefined ? to.type : from.type,
      start: to.start !== undefined ? to.start : from.start,
      end: to.end !== undefined ? to.end : from.end
    }

    ;(result as any).stop0 = lerpStop(from.stop0, to.stop0)
    ;(result as any).stop1 = lerpStop(from.stop1, to.stop1)
    ;(result as any).stop2 = lerpStop(from.stop2, to.stop2)
    ;(result as any).stop3 = lerpStop(from.stop3, to.stop3)
    ;(result as any).stop4 = lerpStop(from.stop4, to.stop4)

    return result
  },

  /**
   * Computes a normalized difference [0, 1] between two gradient parameter sets.
   * Considers enabled, type, start/end, and all stops. For colors, compares HSV with circular hue distance and alpha.
   * Returns the maximum component-wise difference to reflect the most significant change.
   */
  distance(from: GradientParameters, to: GradientParameters): number {
    const clamp01 = (v: number) => Math.max(0, Math.min(1, v))

    const diffBool = (a?: boolean, b?: boolean): number => ((a ?? false) === (b ?? false) ? 0 : 1)

    const diffType = (a?: GradientType, b?: GradientType): number =>
      a === b || (a === undefined && b === undefined) ? 0 : 1

    const diffVec2 = (a?: vec2, b?: vec2): number => {
      if (a && b) {
        const dx = a.x - b.x
        const dy = a.y - b.y
        // Gradient coords are typically normalized. Normalize magnitude to [0,1].
        return clamp01(Math.sqrt(dx * dx + dy * dy))
      }
      return a || b ? 1 : 0
    }

    const stopDistance = (a?: GradientStop, b?: GradientStop): number => {
      const aExists = !!a
      const bExists = !!b
      if (!aExists && !bExists) return 0
      if (aExists && !bExists) return 1
      if (!aExists && bExists) return 1

      const aEnabled = a!.enabled
      const bEnabled = b!.enabled
      const dEnabled = diffBool(aEnabled, bEnabled)

      const aPercent = a!.percent
      const bPercent = b!.percent
      const dPercent =
        aPercent === undefined && bPercent === undefined
          ? 0
          : aPercent === undefined || bPercent === undefined
            ? 1
            : clamp01(Math.abs(aPercent - bPercent))

      const aColor = a!.color
      const bColor = b!.color
      const dColor = ((): number => {
        if (!aColor && !bColor) return 0
        if (aColor && !bColor) return 1
        if (!aColor && bColor) return 1
        const hsvA = RGBtoHSV(aColor!)
        const hsvB = RGBtoHSV(bColor!)
        const dH = colorDistance(aColor!, bColor!)
        const dS = Math.abs(hsvA.y - hsvB.y)
        const dV = Math.abs(hsvA.z - hsvB.z)
        const dA = Math.abs(aColor!.a - bColor!.a)
        return Math.max(dH, dS, dV, dA)
      })()

      return Math.max(dEnabled, dPercent, dColor)
    }

    const dEnabled = diffBool(from.enabled, to.enabled)
    const dType = diffType(from.type, to.type)
    const dStart = diffVec2(from.start, to.start)
    const dEnd = diffVec2(from.end, to.end)

    const dStops = Math.max(
      stopDistance(from.stop0, to.stop0),
      stopDistance(from.stop1, to.stop1),
      stopDistance(from.stop2, to.stop2),
      stopDistance(from.stop3, to.stop3),
      stopDistance(from.stop4, to.stop4)
    )

    return clamp01(Math.max(dEnabled, dType, dStart, dEnd, dStops))
  }
}

const BASE_MESH_SIZE = vec2.one().uniformScale(2)

/**
 * Rounded Rectangle Component
 * Gives a Rounded Rectangle at a given size
 * Provides Background Color, Gradient or Texture
 * And an Optional Inset Border, with Color or Gradient
 */
@component
export class RoundedRectangle extends BaseScriptComponent {
  @input("number", "0")
  private _renderOrder: number = 0

  @input("vec2", "{1,1}")
  @hint("Size of Rectangle In Local Space Centimeters")
  private _size: vec2

  @input("float", "1")
  @hint("Radius of rounding in Local Space Centimeters")
  private _cornerRadius: number

  @input
  @hint("Enable background gradient")
  private _gradient: boolean

  @input("vec4", "{.8,.8,.8,1.}")
  @hint("Solid color of background if not using gradient")
  @widget(new ColorWidget())
  @showIf("_gradient", false)
  private _backgroundColor: vec4

  @input
  @hint("Enable background texture")
  @showIf("_gradient", false)
  private _useTexture: boolean = false

  @input
  @hint("Background texture asset")
  @showIf("_useTexture", true)
  private _texture: Texture

  @input("string", "Stretch")
  @hint("Display mode for background texture.")
  @showIf("_useTexture", true)
  @widget(
    new ComboBoxWidget([new ComboBoxItem("Stretch"), new ComboBoxItem("Fill Height"), new ComboBoxItem("Fill Width")])
  )
  private _textureMode: TextureMode

  @input("string", "None")
  @hint("Wrap mode for background texture.")
  @showIf("_useTexture", true)
  @widget(new ComboBoxWidget([new ComboBoxItem("None"), new ComboBoxItem("Repeat"), new ComboBoxItem("Clamp")]))
  private _textureWrap: TextureWrap

  @input("string", "Linear")
  @hint("Gradient type: either Linear or Radial")
  @showIf("_gradient", true)
  @widget(new ComboBoxWidget([new ComboBoxItem("Linear"), new ComboBoxItem("Radial"), new ComboBoxItem("Rectangle")]))
  private _gradientType: GradientType = "Linear"

  @input("vec2", "{-1,-1}")
  @hint("Start Position for gradient. Use to define ratio of gradient stop percents.")
  @showIf("_gradient", true)
  private _gradientStartPosition: vec2

  @input("vec2", "{1,1}")
  @hint("End Position for gradient. Use to define ratio of gradient stop percents.")
  @showIf("_gradient", true)
  private _gradientEndPosition: vec2

  @input("vec4", "{.5,.5,.5,1}")
  @hint("Color for this stop.")
  @showIf("_gradient", true)
  @widget(new ColorWidget())
  private _gradientColor0: vec4

  @input("number", "0")
  @hint("Percent position within gradient that it fully reaches this stop color.")
  @showIf("_gradient", true)
  private _gradientPercent0: number

  @input("vec4", "{.75,.75,.7,1}")
  @hint("Color for this stop.")
  @showIf("_gradient", true)
  @widget(new ColorWidget())
  private _gradientColor1: vec4

  @input("number", "0")
  @hint("Percent position within gradient that it fully reaches this stop color.")
  @showIf("_gradient", true)
  private _gradientPercent1: number

  @input
  @hint("Enable or disable this stop.")
  @showIf("_gradient", true)
  private _gradientStop2: boolean = false

  @input("vec4", "{0,0,0,0}")
  @hint("Color for this stop.")
  @showIf("_gradientStop2", true)
  @widget(new ColorWidget())
  private _gradientColor2: vec4

  @input("number", "1")
  @hint("Percent position within gradient that it fully reaches this stop color.")
  @showIf("_gradientStop2", true)
  private _gradientPercent2: number

  @input
  @showIf("_gradientStop2", true)
  @hint("Enable or disable this stop.")
  private _gradientStop3: boolean = false

  @input("vec4", "{0,0,0,0}")
  @hint("Color for this stop.")
  @showIf("_gradientStop3", true)
  @widget(new ColorWidget())
  private _gradientColor3: vec4

  @input("number", "1")
  @hint("Percent position within gradient that it fully reaches this stop color.")
  @showIf("_gradientStop3", true)
  private _gradientPercent3: number

  @input
  @hint("Enable or disable this stop.")
  @showIf("_gradientStop3", true)
  private _gradientStop4: boolean = false

  @input("vec4", "{0,0,0,0}")
  @hint("Color for this stop.")
  @showIf("_gradientStop4", true)
  @widget(new ColorWidget())
  private _gradientColor4: vec4

  @input("number", "1")
  @hint("Percent position within gradient that it fully reaches this stop color.")
  @showIf("_gradientStop4", true)
  private _gradientPercent4: number

  @input
  @hint("Enable or disable this stop.")
  @showIf("_gradientStop4", true)
  private _gradientStop5: boolean = false

  @input("vec4", "{0,0,0,0}")
  @hint("Color for this stop.")
  @showIf("_gradientStop5", true)
  @widget(new ColorWidget())
  private _gradientColor5: vec4

  @input("number", "1")
  @hint("Percent position within gradient that it fully reaches this stop color.")
  @showIf("_gradientStop5", true)
  private _gradientPercent5: number

  @input
  @hint("Enable or disable inset border.")
  private _border: boolean

  @input("float", ".2")
  @hint("Border thickness in centimeters in Local Space.")
  @showIf("_border", true)
  private _borderSize: number

  @input("string", "Color")
  @hint("Type of border fill. Either solid Color or Gradient.")
  @showIf("_border", true)
  @widget(new ComboBoxWidget([new ComboBoxItem("Color"), new ComboBoxItem("Gradient")]))
  private _borderType: BorderType = "Color"

  @input("vec4", "{.8,.8,.8,1.}")
  @hint("Color of border when set to Color type.")
  @widget(new ColorWidget())
  @showIf("_border", true)
  private _borderColor: vec4

  @input("string", "Linear")
  @hint("Type of gradient. Either Linear or Radial.")
  @showIf("_borderType", "Gradient")
  @widget(new ComboBoxWidget([new ComboBoxItem("Linear"), new ComboBoxItem("Radial"), new ComboBoxItem("Rectangle")]))
  private _borderGradientType: GradientType = "Linear"

  @input("vec2", "{-1,-1}")
  @hint("Start Position for border gradient. Use to define ratio of gradient stop percents.")
  @showIf("_borderType", "Gradient")
  private _borderGradientStartPosition: vec2

  @input("vec2", "{1,1}")
  @hint("End Position for border gradient. Use to define ratio of gradient stop percents.")
  @showIf("_borderType", "Gradient")
  private _borderGradientEndPosition: vec2

  @input("vec4", "{.5,.5,.5,1}")
  @hint("Color for this stop.")
  @showIf("_borderType", "Gradient")
  @widget(new ColorWidget())
  private _borderGradientColor0: vec4

  @input("number", "0")
  @hint("Percent position within gradient that it fully reaches this stop color.")
  @showIf("_borderType", "Gradient")
  private _borderGradientPercent0: number

  @input("vec4", "{.75,.75,.7,1}")
  @hint("Color for this stop.")
  @showIf("_borderType", "Gradient")
  @widget(new ColorWidget())
  private _borderGradientColor1: vec4

  @input("number", "1")
  @hint("Percent position within gradient that it fully reaches this stop color.")
  @showIf("_borderType", "Gradient")
  private _borderGradientPercent1: number

  @input
  @hint("Enable or disable this stop.")
  @showIf("_borderType", "Gradient")
  private _borderGradientStop2: boolean = false

  @input("vec4", "{.9,.9,.8,1}")
  @hint("Color for this stop.")
  @showIf("_borderGradientStop2", true)
  @widget(new ColorWidget())
  private _borderGradientColor2: vec4

  @input("number", "1")
  @hint("Percent position within gradient that it fully reaches this stop color.")
  @showIf("_borderGradientStop2", true)
  private _borderGradientPercent2: number

  @input
  @hint("Enable or disable this stop.")
  @showIf("_borderGradientStop2", true)
  private _borderGradientStop3: boolean = false

  @input("vec4", "{0,0,0,0}")
  @hint("Color for this stop.")
  @showIf("_borderGradientStop3", true)
  @widget(new ColorWidget())
  private _borderGradientColor3: vec4

  @input("number", "1")
  @hint("Percent position within gradient that it fully reaches this stop color.")
  @showIf("_borderGradientStop3", true)
  private _borderGradientPercent3: number

  @input
  @hint("Enable or disable this stop.")
  @showIf("_borderGradientStop3", true)
  private _borderGradientStop4: boolean = false

  @input("vec4", "{0,0,0,0}")
  @hint("Color for this stop.")
  @showIf("_borderGradientStop4", true)
  @widget(new ColorWidget())
  private _borderGradientColor4: vec4

  @input("number", "1")
  @hint("Percent position within gradient that it fully reaches this stop color.")
  @showIf("_borderGradientStop4", true)
  private _borderGradientPercent4: number

  @input
  @hint("Enable or disable this stop.")
  @showIf("_borderGradientStop4", true)
  private _borderGradientStop5: boolean = false

  @input("vec4", "{0,0,0,0}")
  @hint("Color for this stop.")
  @showIf("_borderGradientStop5", true)
  @widget(new ColorWidget())
  private _borderGradientColor5: vec4

  @input("number", "1")
  @hint("Percent position within gradient that it fully reaches this stop color.")
  @showIf("_borderGradientStop5", true)
  private _borderGradientPercent5: number

  private _initialized: boolean = false

  private _transform: Transform = this.sceneObject.getTransform()

  private static _mesh: RenderMesh = requireAsset("../../../Meshes/StretchableCircle.mesh") as RenderMesh
  private static _materialAsset: Material = requireAsset("../../../Materials/RoundedRectangleStroke.mat") as Material
  private _material: Material
  private _rmv: RenderMeshVisual

  /**
   * The render order of the Rounded Rectangle.
   */
  public get renderOrder(): number {
    return this._renderOrder
  }

  /**
   * The render order of the Rounded Rectangle.
   */
  public set renderOrder(value: number) {
    if (value === undefined) {
      return
    }
    this._renderOrder = value
    if (this._initialized) {
      this._rmv.renderOrder = value
    }
  }

  public onAwake() {
    this.createEvent("OnStartEvent").bind(() => {
      this.initialize()
    })
    this.createEvent("OnEnableEvent").bind(() => {
      if (this._initialized) {
        if (!isNull(this._rmv) && this._rmv) {
          this._rmv.enabled = true
        }
      }
    })
    this.createEvent("OnDisableEvent").bind(() => {
      if (this._initialized) {
        if (!isNull(this._rmv) && this._rmv) {
          this._rmv.enabled = false
        }
      }
    })
    this.createEvent("OnDestroyEvent").bind(() => {
      if (!isNull(this._rmv) && this._rmv) {
        this._rmv.destroy()
      }
      this._rmv = null
    })
  }

  /**
   * initialize function
   * run once
   * if creating dynamically: set parameters, then run this function to create and initialize in one frame
   */
  public initialize() {
    if (this._initialized) return

    // setup mesh
    this._rmv = this.sceneObject.createComponent("RenderMeshVisual")
    this._rmv.mesh = RoundedRectangle._mesh
    this.applyMaterial()

    this._rmv.renderOrder = this._renderOrder

    // Initializing Size
    const frustumVec = new vec3(this._size.x, this._size.y, 0)
    this._rmv.mainPass.size = this._size.sub(BASE_MESH_SIZE) // subtract size of underlying circle mesh
    this._rmv.mainPass.frustumCullMin = frustumVec.uniformScale(-0.5)
    this._rmv.mainPass.frustumCullMax = frustumVec.uniformScale(0.5)

    // Initializing Corner Radius
    this._rmv.mainPass.cornerRadius = this._cornerRadius

    // Initializing Border
    this._rmv.mainPass.border = this._border ? 1 : 0
    // need border calculations if using gradient type rectangle
    if (!this._border) {
      this._borderSize = 0
      if (this._gradientType === "Rectangle") {
        this._rmv.mainPass.border = 1
      }
    }
    this._rmv.mainPass.borderSize = this._borderSize
    this._rmv.mainPass.borderColor = this._borderColor
    this.updateBorderGradient()

    // Initializing Background Color
    this._rmv.mainPass.backgroundColor = this._backgroundColor

    // Initializing Background Gradient
    this.updateBackgroundGradient()

    // Initializing Texture
    this._rmv.mainPass.useTexture = this._useTexture ? 1 : 0
    const textureAspect = this._texture ? (this._texture.control.getAspect() * this.size.y) / this.size.x : 1
    if (this._textureMode === "Stretch") {
      this._rmv.mainPass.textureMode = new vec2(1, 1)
    } else if (this._textureMode === "Fill Height") {
      this._rmv.mainPass.textureMode = new vec2(1 / textureAspect, 1)
    } else if (this._textureMode === "Fill Width") {
      this._rmv.mainPass.textureMode = new vec2(1, textureAspect)
    }
    if (this._textureWrap === "None") {
      this._rmv.mainPass.textureWrap = 0
    } else if (this._textureWrap === "Repeat") {
      this._rmv.mainPass.textureWrap = 1
    } else if (this._textureWrap === "Clamp") {
      this._rmv.mainPass.textureWrap = 2
    }
    if (this._texture) {
      this._rmv.mainPass.backgroundTexture = this._texture
    }

    this._initialized = true
  }

  private applyMaterial() {
    if (!this._material) {
      this._material = RoundedRectangle._materialAsset
    }
    this._material = this._material.clone()
    this._material.mainPass.frustumCullMode = FrustumCullMode.UserDefinedAABB
    this._rmv.mainMaterial = this._material

    this.size = this._size

    this.cornerRadius = this._cornerRadius
    this.backgroundColor = this._backgroundColor

    this.gradient = this._gradient
    this.gradientType = this._gradientType

    this.border = this._border

    if (this.border) {
      this.borderType = this._borderType
      this.borderSize = this._borderSize
      this.borderColor = this._borderColor
    }

    this.useTexture = this._useTexture
    if (this.useTexture) {
      this.texture = this._texture
      this.textureMode = this._textureMode
      this.textureWrap = this._textureWrap
    }

  }

  /**
   * The transform of the rounded rectangle.
   */
  public get transform(): Transform {
    return this._transform
  }

  /**
   * The render mesh visual of the rounded rectangle.
   */
  public get renderMeshVisual(): RenderMeshVisual {
    return this._rmv
  }

  /**
   * @returns vec2 size of the rectangle in centimeters in local space.
   */
  public get size(): vec2 {
    return this._size
  }

  /**
   * @param size set the rectangle to this size in centimeters in local space.
   */
  public set size(size: vec2) {
    if (size === undefined) {
      return
    }
    this._size = size
    if (this._initialized) {
      const frustumVec = new vec3(size.x, size.y, 0)
      if (this.renderMeshVisual.mainPass) {
        this.renderMeshVisual.mainPass.size = this._size.sub(BASE_MESH_SIZE) // subtract size of underlying circle mesh
        this.renderMeshVisual.mainPass.frustumCullMin = frustumVec.uniformScale(-0.5)
        this.renderMeshVisual.mainPass.frustumCullMax = frustumVec.uniformScale(0.5)
      }
    }
  }

  /**
   * @returns current corner radius in centimeters in local space.
   */
  public get cornerRadius(): number {
    return this._cornerRadius
  }

  /**
   * @param cornerRadius set corner radius in centimeters in local space.
   */
  public set cornerRadius(cornerRadius: number) {
    if (cornerRadius === undefined) {
      return
    }
    this._cornerRadius = cornerRadius
    if (this._initialized) {
      this.renderMeshVisual.mainPass.cornerRadius = cornerRadius
    }
  }

  /**
   * @returns vec4 of current background color. for solid color, not gradient.
   */
  public get backgroundColor(): vec4 {
    return this._backgroundColor
  }

  /**
   * @param color set current solid background color.
   */
  public set backgroundColor(color: vec4) {
    if (color === undefined) {
      return
    }
    this._backgroundColor = color
    if (this._initialized) {
      this.renderMeshVisual.mainPass.backgroundColor = color
    }
  }

  /**
   * @returns boolean of whether this uses a background texture.
   */
  public get useTexture(): boolean {
    return this._useTexture
  }

  /**
   * @param use boolean of whether to use a background texture.
   */
  public set useTexture(use: boolean) {
    if (use === undefined) {
      return
    }
    this._useTexture = use
    if (this._initialized) {
      this.renderMeshVisual.mainPass.useTexture = use ? 1 : 0
    }
  }

  /**
   * @returns current background texture asset.
   */
  public get texture(): Texture {
    return this._texture
  }

  /**
   * @param texture set asset for background texture.
   */
  public set texture(texture: Texture) {
    if (texture === undefined) {
      return
    }
    this._texture = texture
    if (this._initialized) {
      this.renderMeshVisual.mainPass.backgroundTexture = this._texture
    }
  }

  /**
   * @returns current texture mode of background texture: Stretch, Fill Height or Fill Width.
   */
  public get textureMode(): TextureMode {
    return this._textureMode
  }

  /**
   * @param mode set texture mode of background texture: Stretch: Fill Height or Fill Width.
   */
  public set textureMode(mode: TextureMode) {
    if (mode === undefined) {
      return
    }
    this._textureMode = mode
    if (this._initialized) {
      // const rectAspect = mode === "Fill Width" ? this.size.y / this.size.x : this.size.x / this.size.y
      const textureAspect = (this._texture.control.getAspect() * this.size.y) / this.size.x
      // const textureAspect = this._texture.control.getAspect()
      if (mode === "Stretch") {
        this.renderMeshVisual.mainPass.textureMode = new vec2(1, 1)
      } else if (mode === "Fill Height") {
        this.renderMeshVisual.mainPass.textureMode = new vec2(1 / textureAspect, 1)
      } else if (mode === "Fill Width") {
        this.renderMeshVisual.mainPass.textureMode = new vec2(1, textureAspect)
      }
    }
  }

  /**
   * @returns current texture wrap method: None, Repeat or Clamp.
   */
  public get textureWrap(): TextureWrap {
    return this._textureWrap
  }

  /**
   * @param wrap sets current texture wrap method: None, Repeat or Clamp.
   */
  public set textureWrap(wrap: TextureWrap) {
    if (wrap === undefined) {
      return
    }
    this._textureWrap = wrap
    if (this._initialized) {
      if (wrap === "None") {
        this.renderMeshVisual.mainPass.textureWrap = 0
      } else if (wrap === "Repeat") {
        this.renderMeshVisual.mainPass.textureWrap = 1
      } else if (wrap === "Clamp") {
        this.renderMeshVisual.mainPass.textureWrap = 2
      }
    }
  }

  /**
   * @returns boolean of whether or not the background uses a gradient.
   */
  public get gradient(): boolean {
    return this._gradient
  }

  /**
   * @param enabled boolean to enable or disable background gradient.
   */
  public set gradient(enabled: boolean) {
    if (enabled === undefined) {
      return
    }
    this._gradient = enabled
    if (this._initialized) {
      this.updateBackgroundGradient()
    }
  }

  /**
   * @returns type of the background gradient: Linear, or Radial.
   */
  public get gradientType(): GradientType {
    return this._gradientType
  }

  /**
   * @param type set type of the background gradient: Linear or Radial.
   */
  public set gradientType(type: GradientType) {
    if (type === undefined) {
      return
    }
    this._gradientType = type
    if (this._initialized) {
      if (this._gradientType === "Rectangle") {
        // rectangle requires border
        this.renderMeshVisual.mainPass.border = 1
      } else {
        if (!this._border) this.renderMeshVisual.mainPass.border = 0
      }
      this.updateBackgroundGradient()
    }
  }

  /**
   * @returns vec2 of the background starting position.
   * The start position defines the range for the stops.
   */
  public get gradientStartPosition(): vec2 {
    return this._gradientStartPosition
  }

  /**
   * @param position set vec2 of the background starting position.
   * The start position defines the range for the stops.
   */
  public set gradientStartPosition(position: vec2) {
    if (position === undefined) {
      return
    }
    this._gradientStartPosition = position
  }

  /**
   * @returns vec2 of the background ending position.
   * The end position defines the range for the stops.
   */
  public get gradientEndPosition(): vec2 {
    return this._gradientEndPosition
  }

  /**
   * @param position set vec2 of the background ending position.
   * The end position defines the range for the stops.
   */
  public set gradientEndPosition(position: vec2) {
    if (position === undefined) {
      return
    }
    this._gradientEndPosition = position
  }

  /**
   * @returns boolean whether or not the border is enabled.
   */
  public get border(): boolean {
    return this._border
  }

  /**
   * @param enabled boolean to show or hide the border.
   */
  public set border(enabled: boolean) {
    if (enabled === undefined) {
      return
    }
    this._border = enabled
    if (this._initialized) {
      this.renderMeshVisual.mainPass.border = enabled ? 1 : 0
      // need border calculations if using gradient type rectangle
      if (!enabled) {
        this.borderSize = 0
        if (this._gradientType === "Rectangle") {
          this.renderMeshVisual.mainPass.border = 1
        }
      }
      this.updateBorderGradient()
    }
  }

  /**
   * @returns current border thickness in centimeters in local space.
   */
  public get borderSize(): number {
    return this._borderSize
  }

  /**
   * @param borderSize set border thickness in centimeters in local space.
   */
  public set borderSize(borderSize: number) {
    if (borderSize === undefined) {
      return
    }
    this._borderSize = borderSize
    if (this._initialized) {
      this.renderMeshVisual.mainPass.borderSize = borderSize
    }
  }

  /**
   * @returns vec4 of the solid border color (not gradient).
   */
  public get borderColor(): vec4 {
    return this._borderColor
  }

  /**
   * @param color set vec4 of the solid border color (not gradient).
   */
  public set borderColor(color: vec4) {
    if (color === undefined) {
      return
    }
    this._borderColor = color
    if (this._initialized) {
      this.renderMeshVisual.mainPass.borderColor = color
    }
  }

  /**
   * @returns which type of border: either Color or Gradient.
   */
  public get borderType(): BorderType {
    return this._borderType
  }

  /**
   * @param type set border type: either Color or Gradient.
   */
  public set borderType(type: BorderType) {
    if (type === undefined) {
      return
    }
    this._borderType = type
    if (this._initialized) {
      this.updateBorderGradient()
    }
  }

  /**
   * @returns type of gradient for the border gradient: Linear or Radial.
   */
  public get borderGradientType(): GradientType {
    return this._borderGradientType
  }

  /**
   * @param type set type of gradient for the border gradient: Linear or Gradient.
   */
  public set borderGradientType(type: GradientType) {
    if (type === undefined) {
      return
    }
    this._borderGradientType = type
    if (this._initialized) {
      this.updateBorderGradient()
    }
  }

  /**
   * @returns vec2 of current border gradient start position.
   * The start position defines the range for the stops.
   */
  public get borderGradientStartPosition(): vec2 {
    return this._borderGradientStartPosition
  }

  /**
   * @param position set vec2 of the border gradient start position.
   * The start position defines the range for the stops.
   */
  public set borderGradientStartPosition(position: vec2) {
    if (position === undefined) {
      return
    }
    this._borderGradientStartPosition = position
  }

  /**
   * @returns vec2 of current border gradient end position.
   * The end position defines the range for the stops.
   */
  public get borderGradientEndPosition(): vec2 {
    return this._borderGradientEndPosition
  }

  /**
   * @param position set vec2 of the border gradient end position.
   * The end position defines the range for the stops.
   */
  public set borderGradientEndPosition(position: vec2) {
    if (position === undefined) {
      return
    }
    this._borderGradientEndPosition = position
  }

  /**
   * get a stop from the background gradient at index
   * @param index: number
   * @returns GradientStop
   */
  public getBackgroundGradientStop = (index: number): GradientStop => {
    return {
      color: this["_gradientColor" + index],
      percent: this["_gradientPercent" + index],
      enabled: this["_gradientStop" + index]
    }
  }

  /**
   * set a stop in the background gradient
   * at given index, with parameters defined by GradientStop
   * @param index: number
   * @param stop: GradientStop
   */
  public setBackgroundGradientStop = (index: number, stop: GradientStop, needsUpdate: boolean = true) => {
    if (stop.color !== undefined) this["_gradientColor" + index] = stop.color
    if (stop.percent !== undefined) this["_gradientPercent" + index] = stop.percent
    if (stop.enabled !== undefined) this["_gradientStop" + index] = stop.enabled
    else this["_gradientStop" + index] = true
    if (needsUpdate) this.updateBackgroundGradient()
  }

  /**
   * set background gradient using a GradientParameters input
   * @param gradientParameters: GradientParameters
   */
  public setBackgroundGradient = (gradientParameters: GradientParameters) => {
    if (gradientParameters.enabled !== undefined) this.gradient = gradientParameters.enabled
    if (gradientParameters.type !== undefined) this.gradientType = gradientParameters.type
    if (gradientParameters.stop0) this.setBackgroundGradientStop(0, gradientParameters.stop0, false)
    else this.setBackgroundGradientStop(0, {enabled: false}, false)
    if (gradientParameters.stop1) this.setBackgroundGradientStop(1, gradientParameters.stop1, false)
    else this.setBackgroundGradientStop(1, {enabled: false}, false)
    if (gradientParameters.stop2) this.setBackgroundGradientStop(2, gradientParameters.stop2, false)
    else this.setBackgroundGradientStop(2, {enabled: false}, false)
    if (gradientParameters.stop3) this.setBackgroundGradientStop(3, gradientParameters.stop3, false)
    else this.setBackgroundGradientStop(3, {enabled: false}, false)
    if (gradientParameters.stop4) this.setBackgroundGradientStop(4, gradientParameters.stop4, false)
    else this.setBackgroundGradientStop(4, {enabled: false}, false)
    if (gradientParameters.start) this.gradientStartPosition = gradientParameters.start
    if (gradientParameters.end) this.gradientEndPosition = gradientParameters.end

    this.updateBackgroundGradient()
  }

  /**
   * get a stop from the border gradient at index
   * @param index: number
   * @returns GradientStop
   */
  public getBorderGradientStop = (index: number): GradientStop => {
    return {
      color: this["_borderGradientColor" + index],
      percent: this["_borderGradientPercent" + index],
      enabled: this["_borderGradientStop" + index]
    }
  }

  /**
   * set a stop in the border gradient
   * at given index, with parameters defined by GradientStop
   * @param index: number
   * @param stop: GradientStop
   */
  public setBorderGradientStop = (index: number, stop: GradientStop, needsUpdate: boolean = true) => {
    if (stop.color !== undefined) this["_borderGradientColor" + index] = stop.color
    if (stop.percent !== undefined) this["_borderGradientPercent" + index] = stop.percent
    if (stop.enabled !== undefined) this["_borderGradientStop" + index] = stop.enabled
    else this["_borderGradientStop" + index] = true
    if (needsUpdate) this.updateBorderGradient()
  }

  /**
   * set background gradient using a GradientParameters input
   * @param gradientParameters: GradientParameters
   */
  public setBorderGradient = (gradientParameters: GradientParameters) => {
    if (gradientParameters.enabled !== undefined) this.borderType = gradientParameters.enabled ? "Gradient" : "Color"
    if (gradientParameters.type !== undefined) this.borderGradientType = gradientParameters.type
    if (gradientParameters.stop0) this.setBorderGradientStop(0, gradientParameters.stop0, false)
    else this.setBorderGradientStop(0, {enabled: false}, false)
    if (gradientParameters.stop1) this.setBorderGradientStop(1, gradientParameters.stop1, false)
    else this.setBorderGradientStop(1, {enabled: false}, false)
    if (gradientParameters.stop2) this.setBorderGradientStop(2, gradientParameters.stop2, false)
    else this.setBorderGradientStop(2, {enabled: false}, false)
    if (gradientParameters.stop3) this.setBorderGradientStop(3, gradientParameters.stop3, false)
    else this.setBorderGradientStop(3, {enabled: false}, false)
    if (gradientParameters.stop4) this.setBorderGradientStop(4, gradientParameters.stop4, false)
    else this.setBorderGradientStop(4, {enabled: false}, false)
    if (gradientParameters.start) this.borderGradientStartPosition = gradientParameters.start
    if (gradientParameters.end) this.borderGradientEndPosition = gradientParameters.end

    this.updateBorderGradient()
  }

  /**
   * Set Material asset that is cloned on initialize
   */
  public set material(material: Material) {
    if (material === undefined) {
      return
    }
    this._material = material
    if (this._initialized) {
      this.applyMaterial()
    }
  }

  /**
   * Get Material asset that is cloned on initialize
   */
  public get material(): Material {
    return this._material
  }

  /**
   * internal function to update material based on background gradient params
   */
  private updateBackgroundGradient = () => {
    let stops = 0
    if (this._gradient) {
      stops = 2
      this.renderMeshVisual.mainPass["colors[0]"] = this._gradientColor0
      this.renderMeshVisual.mainPass["percents[0]"] = this._gradientPercent0
      this.renderMeshVisual.mainPass["colors[1]"] = this._gradientColor1
      this.renderMeshVisual.mainPass["percents[1]"] = this._gradientPercent1
      if (this._gradientStop2) {
        stops = 3
        this.renderMeshVisual.mainPass["colors[2]"] = this._gradientColor2
        this.renderMeshVisual.mainPass["percents[2]"] = this._gradientPercent2
      }
      if (this._gradientStop3) {
        stops = 4
        this.renderMeshVisual.mainPass["colors[3]"] = this._gradientColor3
        this.renderMeshVisual.mainPass["percents[3]"] = this._gradientPercent3
      }
      if (this._gradientStop4) {
        stops = 5
        this.renderMeshVisual.mainPass["colors[4]"] = this._gradientColor4
        this.renderMeshVisual.mainPass["percents[4]"] = this._gradientPercent4
      }
      if (this._gradientStop5) {
        stops = 6
        this.renderMeshVisual.mainPass["colors[5]"] = this._gradientColor5
        this.renderMeshVisual.mainPass["percents[5]"] = this._gradientPercent5
      }

      if (this._gradientType === "Linear") {
        const angle = Math.atan2(
          this._gradientEndPosition.y - this._gradientStartPosition.y,
          this._gradientEndPosition.x - this._gradientStartPosition.x
        )
        const linearGradientStart =
          this._gradientStartPosition.x * Math.cos(-angle) - this._gradientStartPosition.y * Math.sin(-angle)
        this.renderMeshVisual.mainPass.linearGradientStart = linearGradientStart
        const linearGradientEnd =
          this._gradientEndPosition.x * Math.cos(-angle) - this._gradientEndPosition.y * Math.sin(-angle)
        this.renderMeshVisual.mainPass.linearGradientEnd = linearGradientEnd
        this.renderMeshVisual.mainPass.linearGradientAngle = angle
        this.renderMeshVisual.mainPass.linearGradientLength = linearGradientEnd - linearGradientStart
      } else if (this._gradientType === "Radial") {
        const diff = this._gradientEndPosition.sub(this._gradientStartPosition)
        this.renderMeshVisual.mainPass.radialGradientLength = diff.length
      }

      if (this._gradientType === "Linear") {
        this.renderMeshVisual.mainPass.gradientType = 0
      } else if (this._gradientType === "Radial") {
        this.renderMeshVisual.mainPass.gradientType = 1
      } else if (this._gradientType === "Rectangle") {
        this.renderMeshVisual.mainPass.gradientType = 2
      }
      this.renderMeshVisual.mainPass.gradientStartPosition = this._gradientStartPosition
    }

    this.renderMeshVisual.mainPass.stops = stops
  }

  /**
   * internal function to update material based on border gradient params
   */
  private updateBorderGradient = () => {
    let stops = 0
    if (this._borderType === "Gradient" && this.border) {
      stops = 2

      this.renderMeshVisual.mainPass["borderGradientColors[0]"] = this._borderGradientColor0
      this.renderMeshVisual.mainPass["borderGradientPercents[0]"] = this._borderGradientPercent0
      this.renderMeshVisual.mainPass["borderGradientColors[1]"] = this._borderGradientColor1
      this.renderMeshVisual.mainPass["borderGradientPercents[1]"] = this._borderGradientPercent1
      if (this._borderGradientStop2) {
        stops = 3
        this.renderMeshVisual.mainPass["borderGradientColors[2]"] = this._borderGradientColor2
        this.renderMeshVisual.mainPass["borderGradientPercents[2]"] = this._borderGradientPercent2
      }
      if (this._borderGradientStop3) {
        stops = 4
        this.renderMeshVisual.mainPass["borderGradientColors[3]"] = this._borderGradientColor3
        this.renderMeshVisual.mainPass["borderGradientPercents[3]"] = this._borderGradientPercent3
      }
      if (this._borderGradientStop4) {
        stops = 5
        this.renderMeshVisual.mainPass["borderGradientColors[4]"] = this._borderGradientColor4
        this.renderMeshVisual.mainPass["borderGradientPercents[4]"] = this._borderGradientPercent4
      }
      if (this._borderGradientStop5) {
        stops = 6
        this.renderMeshVisual.mainPass["borderGradientColors[5]"] = this._borderGradientColor5
        this.renderMeshVisual.mainPass["borderGradientPercents[5]"] = this._borderGradientPercent5
      }

      if (this._borderGradientType === "Linear") {
        const angle = Math.atan2(
          this._borderGradientEndPosition.y - this._borderGradientStartPosition.y,
          this._borderGradientEndPosition.x - this._borderGradientStartPosition.x
        )
        const linearGradientStart =
          this._borderGradientStartPosition.x * Math.cos(-angle) -
          this._borderGradientStartPosition.y * Math.sin(-angle)
        this.renderMeshVisual.mainPass.borderLinearGradientStart = linearGradientStart
        const linearGradientEnd =
          this._borderGradientEndPosition.x * Math.cos(-angle) - this._borderGradientEndPosition.y * Math.sin(-angle)
        this.renderMeshVisual.mainPass.borderLinearGradientEnd = linearGradientEnd
        this.renderMeshVisual.mainPass.borderLinearGradientAngle = angle
        this.renderMeshVisual.mainPass.borderLinearGradientLength = linearGradientEnd - linearGradientStart
      } else if (this._borderGradientType === "Radial") {
        const diff = this._borderGradientEndPosition.sub(this._borderGradientStartPosition)
        this.renderMeshVisual.mainPass.borderRadialGradientLength = diff.length
      }

      if (this._borderGradientType === "Linear") {
        this.renderMeshVisual.mainPass.borderGradientType = 0
      } else if (this._borderGradientType === "Radial") {
        this.renderMeshVisual.mainPass.borderGradientType = 1
      } else if (this._borderGradientType === "Rectangle") {
        this.renderMeshVisual.mainPass.borderGradientType = 2
      }
      this.renderMeshVisual.mainPass.borderGradientStartPosition = this._borderGradientStartPosition
    }

    this.renderMeshVisual.mainPass.borderGradientStops = stops
  }

  /**
   * Helper function to convert native LS types to readable strings
   */
  /**
   * MOVE THIS TO UTILITIES
   */
  private formatValue(value: any, indent: number = 0): string {
    const spaces = "  ".repeat(indent)

    if (value === null || value === undefined) {
      return "null"
    }

    // Helper function to format numbers
    const formatNumber = (num: number): string => {
      if (Number.isInteger(num)) return num.toString()
      return parseFloat(num.toFixed(3)).toString()
    }

    // Handle vec2
    if (value && typeof value === "object" && "x" in value && "y" in value && !("z" in value)) {
      return `vec2(${formatNumber(value.x)}, ${formatNumber(value.y)})`
    }

    // Handle vec3
    if (value && typeof value === "object" && "x" in value && "y" in value && "z" in value && !("w" in value)) {
      return `vec3(${formatNumber(value.x)}, ${formatNumber(value.y)}, ${formatNumber(value.z)})`
    }

    // Handle vec4
    if (value && typeof value === "object" && "x" in value && "y" in value && "z" in value && "w" in value) {
      return `vec4(${formatNumber(value.x)}, ${formatNumber(value.y)}, ${formatNumber(value.z)}, ${formatNumber(value.w)})`
    }

    // Handle arrays
    if (Array.isArray(value)) {
      if (value.length === 0) return "[]"
      const items = value.map((item) => this.formatValue(item, 0)).join(", ")
      return `[${items}]`
    }

    // Handle objects
    if (typeof value === "object") {
      const entries = Object.entries(value)
      if (entries.length === 0) return "{}"

      const formatted = entries
        .map(([key, val]) => {
          return `${spaces}  ${key}: ${this.formatValue(val, indent + 1)}`
        })
        .join(",\n")

      return `{\n${formatted}\n${spaces}}`
    }

    // Handle primitives
    if (typeof value === "string") {
      return `"${value}"`
    }

    if (typeof value === "number") {
      return formatNumber(value)
    }

    return String(value)
  }

  /**
   * Prints the current configuration of the RoundedRectangle
   * to the console in a readable format.
   * Useful for debugging and understanding the current state.
   */
  public printConfig() {
    const configOutput: any = {}

    configOutput.size = this.size
    configOutput.cornerRadius = this.cornerRadius

    configOutput.background = {}
    if (this.gradient) {
      configOutput.backgroundGradient = {}
      configOutput.backgroundGradient.type = this.gradientType
      configOutput.backgroundGradient.start = this.gradientStartPosition
      configOutput.backgroundGradient.end = this.gradientEndPosition
      configOutput.backgroundGradient.stop0 = this.getBackgroundGradientStop(0)
      configOutput.backgroundGradient.stop1 = this.getBackgroundGradientStop(1)
      configOutput.backgroundGradient.stop2 = this.getBackgroundGradientStop(2)
      configOutput.backgroundGradient.stop3 = this.getBackgroundGradientStop(3)
      configOutput.backgroundGradient.stop4 = this.getBackgroundGradientStop(4)
    } else if (this.useTexture) {
      configOutput.texture = this.texture
      configOutput.textureMode = this.textureMode
      configOutput.textureWrap = this.textureWrap
    } else {
      configOutput.backgroundColor = this.backgroundColor
    }

    if (this.border) {
      configOutput.border = {}
      configOutput.border.borderSize = this.borderSize
      if (this.borderType === "Gradient") {
        configOutput.borderGradient = {}
        configOutput.borderGradient.type = this.borderGradientType
        configOutput.borderGradient.start = this.borderGradientStartPosition
        configOutput.borderGradient.end = this.borderGradientEndPosition
        configOutput.borderGradient.stop0 = this.getBorderGradientStop(0)
        configOutput.borderGradient.stop1 = this.getBorderGradientStop(1)
        configOutput.borderGradient.stop2 = this.getBorderGradientStop(2)
        configOutput.borderGradient.stop3 = this.getBorderGradientStop(3)
        configOutput.borderGradient.stop4 = this.getBorderGradientStop(4)
      } else {
        configOutput.border.color = this.borderColor
      }
    }

    print("RoundedRectangle Configuration:")
    print(this.formatValue(configOutput))
  }
}
