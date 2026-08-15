import {DragInteractorEvent} from "SpectaclesInteractionKit.lspkg/Core/Interactor/InteractorEvent"
import animate, {CancelSet} from "SpectaclesInteractionKit.lspkg/Utils/animate"
import Event from "SpectaclesInteractionKit.lspkg/Utils/Event"
import NativeLogger from "SpectaclesInteractionKit.lspkg/Utils/NativeLogger"
import {Callback, createCallbacks} from "../../Utility/SceneUtilities"
import {HSVtoRGB} from "../../Utility/UIKitUtilities"
import {GradientParameters, RoundedRectangle} from "../../Visuals/RoundedRectangle/RoundedRectangle"
import {
  RoundedRectangleVisual,
  RoundedRectangleVisualParameters
} from "../../Visuals/RoundedRectangle/RoundedRectangleVisual"
import {StateName} from "../Element"
import {Slider} from "./Slider"

const log = new NativeLogger("ConfirmationSlider")

const TRACKFILL_Z_OFFSET: number = 0.01

const FillGradient: Record<string, vec4> = {
  stop0Color0: HSVtoRGB(0, 0, 0.8, 1),
  stop0Color1: HSVtoRGB(43, 0.59, 0.31, 1),
  stop1Color0: HSVtoRGB(51, 0.49, 0.64, 1),
  stop1Color1: HSVtoRGB(51, 0.49, 0.64, 1)
}

const FillParameters: Partial<GradientParameters> = {
  start: new vec2(-1, 0),
  end: new vec2(1, 0)
}

const SliderVisualParameters: Partial<RoundedRectangleVisualParameters> = {
  default: {
    baseType: "Gradient",
    baseGradient: {
      start: new vec2(0, 1),
      end: new vec2(0, -1),
      stop0: {
        percent: 0,
        color: HSVtoRGB(0, 0, 0.12, 1)
      },
      stop1: {
        percent: 1,
        color: HSVtoRGB(0, 0, 0.17, 1)
      }
    },
    hasBorder: true,
    borderSize: 0.1,
    borderType: "Gradient",
    borderGradient: {
      start: new vec2(-0.9, 1),
      end: new vec2(0.9, -1),
      stop0: {
        percent: 0,
        color: HSVtoRGB(0, 0.0, 0.28, 1)
      },
      stop1: {
        percent: 0.5,
        color: HSVtoRGB(0, 0, 0.17, 0)
      },
      stop2: {
        percent: 1,
        color: HSVtoRGB(0, 0, 0.36, 1)
      }
    }
  }
}

const KnobVisualParameters: Partial<RoundedRectangleVisualParameters> = {
  default: {
    baseType: "Gradient",
    baseGradient: {
      start: new vec2(-0.8, 1),
      end: new vec2(0.8, -1),
      stop0: {
        percent: 0,
        color: HSVtoRGB(51, 0.18, 0.15, 1)
      },
      stop1: {
        percent: 1,
        color: HSVtoRGB(50, 0.6, 0.35, 1)
      }
    },
    hasBorder: true,
    borderType: "Gradient",
    borderGradient: {
      start: new vec2(-0.8, 1),
      end: new vec2(0.8, -1),
      stop0: {
        percent: 0,
        color: HSVtoRGB(50, 0.5, 0.46, 1)
      },
      stop1: {
        percent: 1,
        color: HSVtoRGB(51, 0.37, 0.13, 1)
      }
    }
  },
  hovered: {
    baseGradient: {
      start: new vec2(-0.8, 1),
      end: new vec2(0.8, -1),
      stop0: {
        percent: 0,
        color: HSVtoRGB(50, 0.42, 0.23, 1)
      },
      stop1: {
        percent: 1,
        color: HSVtoRGB(50, 0.58, 0.47, 1)
      }
    },
    borderGradient: {
      start: new vec2(-0.8, 1),
      end: new vec2(0.8, -1),
      stop0: {
        percent: 0,
        color: HSVtoRGB(50, 0.5, 0.5, 1)
      },
      stop1: {
        percent: 1,
        color: HSVtoRGB(51, 0.37, 0.15, 1)
      }
    }
  },
  triggered: {
    baseGradient: {
      start: new vec2(-0.8, 1),
      end: new vec2(0.8, -1),
      stop0: {
        percent: 0,
        color: HSVtoRGB(43, 0.59, 0.29, 1)
      },
      stop1: {
        percent: 0.5,
        color: HSVtoRGB(45, 0.63, 0.68, 1)
      },
      stop2: {
        percent: 1,
        color: HSVtoRGB(51, 0.44, 0.68, 1)
      }
    },
    borderGradient: {
      start: new vec2(-0.8, 1),
      end: new vec2(0.8, -1),
      stop0: {
        percent: 0,
        color: HSVtoRGB(48, 0.36, 0.94, 1)
      },
      stop1: {
        percent: 0.5,
        color: HSVtoRGB(0, 0.0, 0.16, 1)
      },
      stop2: {
        percent: 1,
        color: HSVtoRGB(48, 0.36, 0.94, 1)
      }
    }
  }
}

/**
 * Component for a confirmation slider that allows users to slide to confirm an action.
 * It provides visual feedback and triggers an event when the confirmation is successful.
 */
@component
export class ConfirmationSlider extends Slider {
  @input
  @showIf("addCallbacks")
  @label("On Confirmation Callbacks")
  private onConfirmationCallbacks: Callback[] = []

  @input
  @showIf("addCallbacks")
  @label("On Reset Callbacks")
  private onResetCallbacks: Callback[] = []

  @input("number", "0.9")
  private _confirmationThreshold: number = 0.9

  private onConfirmationEvent = new Event<void>()
  /**
   * Event that is triggered when the slider is successfully confirmed.
   */
  public readonly onConfirmation = this.onConfirmationEvent.publicApi()

  private onResetEvent = new Event<void>()
  /**
   * Event that is triggered when the slider is reset to its initial state.
   */
  public readonly onReset = this.onResetEvent.publicApi()

  private customFillObject: SceneObject
  private customTrackFill: RoundedRectangle

  public readonly hasTrackVisual: boolean = true
  protected override _knobSize: vec2 = new vec2(3, 3)
  public readonly customKnobSize: boolean = false

  private shineCancel: CancelSet

  /**
   * Sets the value that the slider must reach on finished to trigger a confirmation.
   * @param value - A number between 0 and 1 representing the threshold.
   */
  public set confirmationThreshold(value: number) {
    if (value === undefined) {
      return
    }
    if (value < 0 || value > 1) {
      log.w("Confirmation threshold must be between 0 and 1.")
      return
    }
    this._confirmationThreshold = value
  }

  /**
   * Gets the current confirmation threshold.
   * @returns The confirmation threshold value (0 to 1).
   */
  public get confirmationThreshold(): number {
    return this._confirmationThreshold
  }

  public onAwake(): void {
    super.onAwake()
  }

  protected createDefaultVisual(): void {
    if (!this._visual) {
      const defaultVisual: RoundedRectangleVisual = new RoundedRectangleVisual({
        sceneObject: this.sceneObject,
        style: SliderVisualParameters
      })
      defaultVisual.renderMeshVisual.mainMaterial = requireAsset(
        "../../../Materials/ConfirmationSlider.mat"
      ) as Material
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
      this._knobVisual.renderMeshVisual.mainPass.blendMode = BlendMode.PremultipliedAlphaAuto
      this._knobSize = new vec2(this.size.y * 1.5, this.size.y)
      knobObject.setParent(this.sceneObject)
    }

    this.customFillObject = global.scene.createSceneObject("ConfirmationSliderFill")
    this.managedSceneObjects.add(this.customFillObject)
    this.customFillObject.layer = this.sceneObject.layer
    this.customFillObject.setParent(this.sceneObject)
    this.customTrackFill = this.customFillObject.createComponent(RoundedRectangle.getTypeName())
    this.managedComponents.add(this.customTrackFill)
    this.customTrackFill.initialize()
    this.customTrackFill.gradient = true
    this.updateCustomFillSize()
    this.onKnobMoved.add(this.updateCustomFillSize.bind(this))
  }

  protected setUpEventCallbacks(): void {
    if (this.addCallbacks) {
      this.onConfirmation.add(createCallbacks(this.onConfirmationCallbacks))
      this.onReset.add(createCallbacks(this.onResetCallbacks))
    }
    super.setUpEventCallbacks()
  }

  private updateCustomFillSize() {
    const borderSize = (this._visual as RoundedRectangleVisual).borderSize
    const fillSize = this.customTrackFill.size.uniformScale(1)
    fillSize.y = this.size.y - borderSize * 2
    fillSize.x = MathUtils.lerp(fillSize.y, this.size.x - borderSize * 2, this.knobValue)
    const xPos = MathUtils.lerp((this.size.x - borderSize * 2) * -0.5 + fillSize.y * 0.5, 0, this.knobValue)
    this.customFillObject.getTransform().setLocalPosition(new vec3(xPos, 0, TRACKFILL_Z_OFFSET))
    this.customTrackFill.cornerRadius = fillSize.y * 0.5
    this.customTrackFill.size = fillSize
    this.customTrackFill.setBackgroundGradient({
      ...FillParameters,
      stop0: {
        percent: 0,
        color: vec4.lerp(FillGradient.stop0Color0, FillGradient.stop0Color1, this.knobValue)
      },
      stop1: {
        percent: 1,
        color: vec4.lerp(FillGradient.stop1Color0, FillGradient.stop1Color1, this.knobValue)
      }
    })
  }

  protected onInteractableDragEnd(dragEvent: DragInteractorEvent): void {
    super.onInteractableDragEnd(dragEvent)
    const shineFactor = this.visual.renderMeshVisual.mainPass.shineFactor
    this.shineCancel?.cancel()
    animate({
      cancelSet: this.shineCancel,
      duration: 0.2 * Math.abs(shineFactor - 1),
      update: (t) => {
        this.visual.renderMeshVisual.mainPass.shineFactor = MathUtils.lerp(shineFactor, 1, t)
      }
    })
    if (this.currentValue < this._confirmationThreshold) {
      this.updateCurrentValue(0, true)
      this.setState(StateName.default)
    } else {
      this.interactable.enabled = false
      animate({
        duration: 0.3 * Math.abs(1 - this._knobVisual.renderMeshVisual.mainPass.opacityFactor),
        update: (t) => {
          this._knobVisual.renderMeshVisual.mainPass.opacityFactor = 1 - t
        },
        ended: () => {
          this._knobVisual.sceneObject.enabled = false
        }
      })
      this.updateCurrentValue(1, true)
      this.onConfirmationEvent.invoke()
      this.setState(StateName.toggledDefault)
    }
  }

  protected onInteractableDragStart(dragEvent: DragInteractorEvent): void {
    super.onInteractableDragStart(dragEvent)
    const shineFactor = this.visual.renderMeshVisual.mainPass.shineFactor
    this.shineCancel?.cancel()
    animate({
      cancelSet: this.shineCancel,
      duration: 0.2 * Math.abs(shineFactor),
      update: (t) => {
        this.visual.renderMeshVisual.mainPass.shineFactor = MathUtils.lerp(shineFactor, 0, t)
      }
    })
  }

  /**
   * Reset the confirmation slider to its initial state.
   */
  public reset() {
    if (this._initialized) {
      this.interactable.enabled = true
      this._knobVisual.sceneObject.enabled = true
      this._knobVisual.renderMeshVisual.mainPass.opacityFactor = 1
    }
    this.updateCurrentValue(0, false)
    this.onResetEvent.invoke()
  }

  protected enableManagedComponents() {
    this.managedComponents.forEach((component) => {
      if (!isNull(component) && component) {
        if (component === this.interactable) {
          component.enabled = !this.inactive && this.currentValue < this._confirmationThreshold
        } else if (component === this.collider) {
          component.enabled = !this.inactive
        } else {
          component.enabled = true
        }
      }
    })
  }
}
