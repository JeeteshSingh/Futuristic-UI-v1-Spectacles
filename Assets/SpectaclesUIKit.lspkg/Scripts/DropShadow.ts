import {GradientParameters, RoundedRectangle} from "./Visuals/RoundedRectangle/RoundedRectangle"

@component
export class DropShadow extends BaseScriptComponent {
  @input("int")
  private _renderOrder: number = 0
  
  @input
  private _size: vec2 = new vec2(3, 3)

  @input
  private _cornerRadius: number = 1.5

  @input("vec4", "{.43,.43,.43,.15}")
  @widget(new ColorWidget())
  private _color: vec4 = new vec4(11 / 255, 11 / 255, 11 / 255, 15 / 100)

  @input
  @widget(new SliderWidget(0.0, 1.0))
  private _spread: number = 0.5

  private shadow: RoundedRectangle
  private initialized: boolean = false

  /**
   * The size of the drop shadow.
   * @type {vec2}
   */
  public get size(): vec2 {
    return this._size
  }

  /**
   * The size of the drop shadow.
   * @param {vec2} value - The new size of the drop shadow.
   */
  public set size(value: vec2) {
    if (value === undefined) {
      return
    }
    this._size = value
    if (this.initialized) {
      this.shadow.size = new vec2(value.x, value.y)
    }
  }

  /**
   * The corner radius of the drop shadow.
   * @type {number}
   */
  public get cornerRadius(): number {
    return this._cornerRadius
  }

  /**
   * The corner radius of the drop shadow.
   * @param {number} value - The new corner radius of the drop shadow.
   */
  public set cornerRadius(value: number) {
    if (value === undefined) {
      return
    }
    this._cornerRadius = value
    if (this.initialized) {
      this.shadow.cornerRadius = value
    }
  }

  /**
   * The color of the drop shadow.
   * @type {vec4}
   */
  public get color(): vec4 {
    return this._color
  }

  /**
   * The color of the drop shadow.
   * @param {vec4} value - The new color of the drop shadow.
   */
  public set color(value: vec4) {
    this._color = value
    if (this.initialized) {
      this.shadow.setBackgroundGradient(this.defaultGradient)
    }
  }

  /**
   * The spread amount of the drop shadow.
   * @type {number}
   */
  public get spread(): number {
    return this._spread
  }

  /**
   * The spread amount of the drop shadow.
   * @param {number} spread - The new spread amount of the drop shadow.
   */
  public set spread(spread: number) {
    if (spread === undefined) {
      return
    }
    this._spread = spread
    if (this.initialized) {
      this.shadow.setBackgroundGradient(this.defaultGradient)
    }
  }

  /**
   * The render order of the shadow.
   */
  public get renderOrder(): number {
    return this._renderOrder
  }

  /**
   * The render order of the shadow.
   */
  public set renderOrder(value: number) {
    if (value === undefined) {
      return
    }
    this._renderOrder = value
    if (this.initialized) {
      this.shadow.renderOrder = value
    }
  }

  public get renderMeshVisual(): RenderMeshVisual {
    return this.shadow.renderMeshVisual
  }

  private get defaultGradient(): GradientParameters {
    return {
      type: "Rectangle",
      start: new vec2(-1, 0),
      end: new vec2(1, 0),
      stop0: {enabled: true, color: this.color, percent: 1 - this._spread * 3},
      stop1: {enabled: true, color: new vec4(this.color.x, this.color.y, this.color.z, 0), percent: 1},
      stop2: {enabled: false},
      stop3: {enabled: false},
      stop4: {enabled: false}
    } as GradientParameters
  }

  public onAwake() {
    this.initialize()
    this.createEvent("OnEnableEvent").bind(() => {
      if (!isNull(this.shadow) && this.shadow) {
        this.shadow.enabled = true
      }
    })
    this.createEvent("OnDisableEvent").bind(() => {
      if (!isNull(this.shadow) && this.shadow) {
        this.shadow.enabled = false
      }
    })
    this.createEvent("OnDestroyEvent").bind(() => {
      if (!isNull(this.shadow) && this.shadow) {
        this.shadow.destroy()
      }
      this.shadow = null
    })
  }

  /**
   * Initializes the drop shadow component.
   * This method creates a RoundedRectangle component and sets its properties
   * based on the input parameters.
   */
  public initialize() {
    this.shadow = this.sceneObject.createComponent(RoundedRectangle.getTypeName())
    this.shadow.initialize()

    this.shadow.size = new vec2(this._size.x, this._size.y)
    this.shadow.cornerRadius = this._cornerRadius
    this.shadow.border = false
    this.shadow.borderSize = 0
    this.shadow.gradient = true
    this.shadow.gradientType = "Rectangle"
    this.shadow.setBackgroundGradient(this.defaultGradient)

    this.shadow.renderMeshVisual.mainPass.colorMask = new vec4b(true, true, true, true)
    this.shadow.renderMeshVisual.mainPass.blendMode = BlendMode.PremultipliedAlphaAuto
    this.shadow.renderMeshVisual.mainMaterial.mainPass.depthTest = true
    this.shadow.renderMeshVisual.mainMaterial.mainPass.depthWrite = true
    this.shadow.renderOrder = this._renderOrder

    this.initialized = true
  }
}
