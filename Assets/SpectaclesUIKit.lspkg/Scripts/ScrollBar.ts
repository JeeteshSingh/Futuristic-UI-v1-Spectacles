import {withAlpha} from "SpectaclesInteractionKit.lspkg/Utils/color"
import Event, {PublicApi, unsubscribe} from "SpectaclesInteractionKit.lspkg/Utils/Event"
import {clamp} from "SpectaclesInteractionKit.lspkg/Utils/mathUtils"
import {ScrollWindow} from "./Components/ScrollWindow/ScrollWindow"
import {Slider} from "./Components/Slider/Slider"
import {gradientParameterClone, isEqual} from "./Utility/UIKitUtilities"
import {GradientParameters} from "./Visuals/RoundedRectangle/RoundedRectangle"
import {
  RoundedRectangleVisual,
  RoundedRectangleVisualParameters
} from "./Visuals/RoundedRectangle/RoundedRectangleVisual"

enum ScrollOrientation {
  Horizontal = "Horizontal",
  Vertical = "Vertical"
}

const darkGray = new vec4(0.22, 0.22, 0.22, 1)
const mediumGray = new vec4(0.31, 0.31, 0.31, 1)
const lightGray = new vec4(0.4, 0.4, 0.4, 1)

const bgDarkGray = new vec4(0.15, 0.15, 0.15, 1)
const bgMediumGray = new vec4(0.2, 0.2, 0.2, 1)
const bgLightGray = new vec4(0.25, 0.25, 0.25, 1)

const SCROLL_BAR_BACKGROUND_GRADIENT: GradientParameters = {
  enabled: true,
  type: "Rectangle",
  start: new vec2(0, -1),
  end: new vec2(0, 1),
  stop0: {enabled: true, percent: -1, color: bgMediumGray},
  stop1: {enabled: true, percent: 2, color: bgDarkGray}
}

const SCROLL_BAR_BACKGROUND_HOVERED_GRADIENT: GradientParameters = {
  enabled: true,
  type: "Rectangle",
  start: new vec2(0, -1),
  end: new vec2(0, 1),
  stop0: {enabled: true, percent: -1, color: bgLightGray},
  stop1: {enabled: true, percent: 2, color: bgMediumGray}
}

const SCROLL_BAR_BACKGROUND_TRIGGERED_GRADIENT: GradientParameters = SCROLL_BAR_BACKGROUND_HOVERED_GRADIENT

const SCROLL_BAR_BACKGROUND_INACTIVE_GRADIENT: GradientParameters = {
  enabled: true,
  type: "Rectangle",
  start: new vec2(0, -1),
  end: new vec2(0, 1),
  stop0: {enabled: true, percent: 0, color: withAlpha(bgMediumGray, 0)},
  stop1: {enabled: true, percent: 1, color: withAlpha(bgDarkGray, 0)}
}

const SCROLL_BAR_KNOB_GRADIENT: GradientParameters = {
  enabled: true,
  type: "Rectangle",
  stop0: {enabled: true, percent: -1, color: darkGray},
  stop1: {enabled: true, percent: -0.25, color: darkGray},
  stop2: {enabled: true, percent: 2, color: mediumGray}
}

const SCROLL_BAR_KNOB_HOVERED_GRADIENT: GradientParameters = {
  enabled: true,
  type: "Rectangle",
  stop0: {enabled: true, percent: -1, color: mediumGray},
  stop1: {enabled: true, percent: -0.25, color: mediumGray},
  stop2: {enabled: true, percent: 2, color: lightGray}
}

const SCROLL_BAR_KNOB_TRIGGERED_GRADIENT: GradientParameters = SCROLL_BAR_KNOB_HOVERED_GRADIENT

const SCROLL_BAR_KNOB_INACTIVE_GRADIENT: GradientParameters = {
  enabled: true,
  type: "Rectangle",
  stop0: {enabled: true, percent: -1, color: withAlpha(darkGray, 0)},
  stop1: {enabled: true, percent: -0.25, color: withAlpha(darkGray, 0)},
  stop2: {enabled: true, percent: 2, color: withAlpha(mediumGray, 0)}
}

@component
export class ScrollBar extends BaseScriptComponent {
  @input("int", "0")
  private _renderOrder: number = 0

  @input
  private size: vec2 = new vec2(20, 1.8)

  @input
  @widget(new ComboBoxWidget([new ComboBoxItem("Horizontal", "Horizontal"), new ComboBoxItem("Vertical", "Vertical")]))
  private orientation: string = "Vertical"

  @input
  private scrollWindow: ScrollWindow

  @input
  private _playAudio: boolean = false

  private slider: Slider
  private _trackVisual: RoundedRectangleVisual | undefined
  private _knobVisual: RoundedRectangleVisual | undefined

  private windowSize: number = 0
  private contentLength: number = 0

  private _inactive: boolean = false

  private initialized: boolean = false

  private isDraggingSlider: boolean = false
  private _currentValue: number = 0

  private unsubscribes: unsubscribe[] = []

  private onScrolledEvent: Event<number> = new Event()

  /**
   * Event that is invoked when the scrollbar value changes.
   * Provides the current normalized value (0-1) of the scrollbar position.
   */
  public readonly onScrolled: PublicApi<number> = this.onScrolledEvent.publicApi()

  /**
   * Gets whether audio should be played for scrollbar interactions.
   *
   * @returns {boolean} `true` if audio should be played; otherwise, `false`.
   */
  public get playAudio(): boolean {
    return this._playAudio
  }

  /**
   * Sets whether audio should be played for scrollbar interactions.
   *
   * @param playAudio - A boolean indicating whether audio should be played (`true`) or not (`false`).
   */
  public set playAudio(playAudio: boolean) {
    if (playAudio === undefined) {
      return
    }
    this._playAudio = playAudio
    if (this.initialized) {
      this.slider.playAudio = playAudio
    }
  }

  /**
   * Gets the render order of the scrollbar.
   *
   * @returns {number} The render order of the scrollbar.
   */
  public get renderOrder(): number {
    return this._renderOrder
  }

  /**
   * Sets the render order of the scrollbar.
   *
   * @param order - The render order of the scrollbar.
   */
  public set renderOrder(order: number) {
    if (order === undefined) {
      return
    }
    this._renderOrder = order
    if (this.initialized) {
      this.slider.renderOrder = order
    }
  }

  /**
   * Gets the track visual of the scrollbar.
   *
   * @returns {RoundedRectangleVisual | undefined} The track visual of the scrollbar.
   */
  public get trackVisual(): RoundedRectangleVisual | undefined {
    return this._trackVisual
  }

  /**
   * Sets the track visual of the scrollbar.
   *
   * @param visual - The new track visual of the scrollbar.
   */
  public set trackVisual(visual: RoundedRectangleVisual | undefined) {
    if (visual === undefined) {
      return
    }
    if (isEqual<RoundedRectangleVisual>(this._trackVisual, visual)) {
      return
    }
    this._trackVisual = visual
    if (this.initialized) {
      this.slider.visual = this._trackVisual
    }
  }

  /**
   * Gets the knob visual of the scrollbar.
   *
   * @returns {RoundedRectangleVisual | undefined} The knob visual of the scrollbar.
   */
  public get knobVisual(): RoundedRectangleVisual | undefined {
    return this._knobVisual
  }

  /**
   * Sets the knob visual of the scrollbar.
   *
   * @param visual - The new knob visual of the scrollbar.
   */
  public set knobVisual(visual: RoundedRectangleVisual | undefined) {
    if (visual === undefined) {
      return
    }
    if (isEqual<RoundedRectangleVisual>(this._knobVisual, visual)) {
      return
    }
    this._knobVisual = visual
    if (this.initialized) {
      this.slider.knobVisual = this._knobVisual
    }
  }

  /**
   * Gets whether the scrollbar is inactive.
   *
   * @returns {boolean} `true` if the scrollbar is inactive; otherwise, `false`.
   */
  public get inactive(): boolean {
    return this._inactive
  }

  /**
   * Sets whether the scrollbar is inactive.
   *
   * @param inactive - A boolean indicating whether the scrollbar should be inactive (`true`) or not (`false`).
   */
  public set inactive(inactive: boolean) {
    if (inactive === undefined) {
      return
    }
    this._inactive = inactive
    if (this.initialized) {
      this.updateSliderVisibility()
    }
  }

  /**
   * Gets whether the scrollbar is scrollable.
   *
   * @returns {boolean} `true` if the scrollbar is scrollable; otherwise, `false`.
   */
  public get isScrollable(): boolean {
    return (
      ((this.orientation === ScrollOrientation.Horizontal && this.scrollWindow.horizontal) ||
        (this.orientation === ScrollOrientation.Vertical && this.scrollWindow.vertical)) &&
      this.contentLength > this.windowSize
    )
  }

  /**
   * Gets the current value of the scrollbar.
   *
   * @returns {number} The current value of the scrollbar.
   */
  public get currentValue(): number {
    return this._currentValue
  }

  /**
   * Lifecycle method called when the component awakens.
   * Initializes the scrollbar by creating the slider component, setting up visuals,
   * and configuring event handlers.
   */
  public onAwake() {
    this.createEvent("OnStartEvent").bind(() => {
      const sliderObject = global.scene.createSceneObject("ScrollBarSlider")
      sliderObject.setParent(this.sceneObject)
      this.slider = sliderObject.createComponent(Slider.getTypeName())
      this.setupDefaultVisuals()
      this.slider.visual = this._trackVisual
      this.slider.knobVisual = this._knobVisual
      this.slider.hasTrackVisual = false
      this.slider.playAudio = this._playAudio
      if (this.orientation === ScrollOrientation.Horizontal) {
        if (!this.scrollWindow.horizontal) {
          throw new Error(
            "Error setting up scrollbar: ScrollWindow orientation is not compatible with horizontal scrollbar"
          )
        } else {
          this.windowSize = this.scrollWindow.windowSize.x
        }
      } else if (this.orientation === ScrollOrientation.Vertical) {
        if (!this.scrollWindow.vertical) {
          throw new Error(
            "Error setting up scrollbar: ScrollWindow orientation is not compatible with vertical scrollbar"
          )
        } else {
          this.windowSize = this.scrollWindow.windowSize.y
        }
      }

      this.updateContentLength()

      this.slider.onInitialized.add(() => {
        this.initialized = true
        this.slider.size = new vec3(this.size.x, this.size.y, 1)
        this.slider.renderOrder = this._renderOrder
        if (this.unsubscribes.length === 0) {
          this.setupScrollWindowEventHandlers()
          this.setupSliderEventHandlers()
        }
        this.updateSliderKnobPosition()
        this.updateSliderKnobSize()
        this.updateSliderVisibility()
      })

      this.createEvent("OnEnableEvent").bind(() => {
        if (this.unsubscribes.length === 0) {
          this.setupScrollWindowEventHandlers()
          this.setupSliderEventHandlers()
        }
        this.slider.enabled = true
      })
      this.createEvent("OnDisableEvent").bind(() => {
        this.unsubscribes.forEach((unsubscribe) => unsubscribe())
        this.unsubscribes = []
        this.slider.enabled = false
      })
      this.createEvent("OnDestroyEvent").bind(() => {
        this.unsubscribes.forEach((unsubscribe) => unsubscribe())
        this.unsubscribes = []
        this.slider.sceneObject.destroy()
      })
      this.slider.createEvent("OnDestroyEvent").bind(() => {
        this.unsubscribes.forEach((unsubscribe) => unsubscribe())
        this.unsubscribes = []
      })
    })
  }

  private setupDefaultVisuals() {
    if (this._trackVisual === undefined) {
      const trackParameters: Partial<RoundedRectangleVisualParameters> = {
        default: {
          baseType: "Gradient",
          hasBorder: false,
          baseGradient: gradientParameterClone(SCROLL_BAR_BACKGROUND_GRADIENT)
        },
        hovered: {
          baseGradient: gradientParameterClone(SCROLL_BAR_BACKGROUND_HOVERED_GRADIENT)
        },
        triggered: {
          baseGradient: gradientParameterClone(SCROLL_BAR_BACKGROUND_TRIGGERED_GRADIENT)
        },
        inactive: {
          baseGradient: gradientParameterClone(SCROLL_BAR_BACKGROUND_INACTIVE_GRADIENT)
        }
      }
      this._trackVisual = new RoundedRectangleVisual({
        sceneObject: this.slider.sceneObject,
        style: trackParameters,
        transparent: true
      })
      this._trackVisual.renderMeshVisual.mainPass.blendMode = BlendMode.PremultipliedAlphaAuto
      this._trackVisual.renderMeshVisual.mainPass.colorMask = new vec4b(true, true, true, true)
      this._trackVisual.shouldColorChange = true
      this._trackVisual.cornerRadius = this.size.y * 0.5
      this._trackVisual.initialize()
    }
    if (this._knobVisual === undefined) {
      const knobParameters: Partial<RoundedRectangleVisualParameters> = {
        default: {
          baseType: "Gradient",
          hasBorder: false,
          baseGradient: gradientParameterClone(SCROLL_BAR_KNOB_GRADIENT)
        },
        hovered: {
          baseGradient: gradientParameterClone(SCROLL_BAR_KNOB_HOVERED_GRADIENT)
        },
        triggered: {
          baseGradient: gradientParameterClone(SCROLL_BAR_KNOB_TRIGGERED_GRADIENT)
        },
        inactive: {
          baseGradient: gradientParameterClone(SCROLL_BAR_KNOB_INACTIVE_GRADIENT)
        }
      }
      const knobObject = global.scene.createSceneObject("ScrollBarKnob")
      knobObject.setParent(this.slider.sceneObject)
      this._knobVisual = new RoundedRectangleVisual({
        sceneObject: knobObject,
        style: knobParameters,
        transparent: true
      })
      this._knobVisual.renderMeshVisual.mainPass.blendMode = BlendMode.PremultipliedAlphaAuto
      this._knobVisual.renderMeshVisual.mainPass.colorMask = new vec4b(true, true, true, true)
      this._knobVisual.shouldColorChange = true
      this._knobVisual.initialize()
    }
  }

  private setupScrollWindowEventHandlers() {
    this.unsubscribes.push(
      this.scrollWindow.onScrollDimensionsUpdated.add(() => {
        this.updateContentLength()
        this.updateSliderKnobSize()
        this.updateSliderVisibility()
      })
    )
    this.unsubscribes.push(
      this.scrollWindow.onScrollPositionUpdated.add(() => {
        if (!this.isDraggingSlider) {
          this.updateSliderKnobPosition()
        }
      })
    )
  }

  private setupSliderEventHandlers() {
    this.unsubscribes.push(
      this.slider.interactable.onTriggerStart.add(() => {
        this.isDraggingSlider = true
        this.scrollWindow.isControlledExternally = true
      })
    )

    this.unsubscribes.push(
      this.slider.onFinished.add(() => {
        this.isDraggingSlider = false
        this.scrollWindow.isControlledExternally = false
      })
    )

    this.unsubscribes.push(
      this.slider.interactable.onTriggerCanceled.add(() => {
        this.isDraggingSlider = false
        this.scrollWindow.scrollSnapping = false
      })
    )

    this.unsubscribes.push(
      this.slider.onValueChange.add((value) => {
        if (this.isDraggingSlider) {
          if (this.scrollWindow) {
            if (this.orientation === ScrollOrientation.Horizontal) {
              this.scrollWindow.scrollPositionNormalized = new vec2(
                value * 2 - 1,
                this.scrollWindow.scrollPositionNormalized.y
              )
            } else if (this.orientation === ScrollOrientation.Vertical) {
              this.scrollWindow.scrollPositionNormalized = new vec2(
                this.scrollWindow.scrollPositionNormalized.x,
                value * 2 - 1
              )
            }
          }
          if (this._currentValue !== value) {
            this._currentValue = value
            this.onScrolledEvent.invoke(this._currentValue)
          }
        }
      })
    )
  }

  private updateContentLength() {
    if (this.scrollWindow) {
      const scrollDimensions = this.scrollWindow.scrollDimensions
      if (this.orientation === ScrollOrientation.Horizontal) {
        if (scrollDimensions.x === -1) {
          throw new Error(
            "Error setting up scrollbar: ScrollWindow horizontal dimension is not compatible with horizontal scrollbar"
          )
        } else {
          this.contentLength = scrollDimensions.x
        }
      } else if (this.orientation === ScrollOrientation.Vertical) {
        if (scrollDimensions.y === -1) {
          throw new Error(
            "Error setting up scrollbar: ScrollWindow vertical dimension is not compatible with vertical scrollbar"
          )
        } else {
          this.contentLength = scrollDimensions.y
        }
      }
    }
  }

  private updateSliderKnobPosition() {
    if (this.slider) {
      let scrollPosition = 0
      if (this.orientation === ScrollOrientation.Horizontal) {
        scrollPosition = this.scrollWindow.scrollPositionNormalized.x
      } else if (this.orientation === ScrollOrientation.Vertical) {
        scrollPosition = this.scrollWindow.scrollPositionNormalized.y
      }

      const newCurrentValue = clamp(scrollPosition / 2 + 0.5, 0, 1)
      if (this._currentValue !== newCurrentValue) {
        this._currentValue = newCurrentValue
        this.slider.currentValue = this._currentValue
        this.onScrolledEvent.invoke(this._currentValue)
      }
    }
  }

  private updateSliderKnobSize() {
    if (this.slider && this._knobVisual) {
      const width = this.slider.customKnobSize ? this.slider.knobSize.y : this.slider.size.y
      let length = this.slider.size.x
      if (this.contentLength > 0) {
        length *= Math.min(this.windowSize / this.contentLength, 1)
      }
      this.slider.knobSize = new vec2(Math.max(length, width), width)
      this._knobVisual.cornerRadius = width * 0.5
    }
  }

  private updateSliderVisibility() {
    if (this.slider) {
      this.slider.inactive = this._inactive
      this.slider.interactable.enabled = this.isScrollable
    }
  }
}
