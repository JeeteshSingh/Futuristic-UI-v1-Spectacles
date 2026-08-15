import animate, {CancelSet} from "SpectaclesInteractionKit.lspkg/Utils/animate"
import {withAlpha} from "SpectaclesInteractionKit.lspkg/Utils/color"
import Event from "SpectaclesInteractionKit.lspkg/Utils/Event"
import {GradientParameters, RoundedRectangle} from "./Visuals/RoundedRectangle/RoundedRectangle"

const TOOLTIP_FADE_DURATION = 0.333
const TOOLTIP_PADDING = new vec2(0.66, 0.25)
const TOOLTIP_BACKING_GRADIENT: GradientParameters = {
  enabled: true,
  type: "Rectangle",
  stop0: {enabled: true, percent: -1, color: new vec4(0.15, 0.15, 0.15, 1)},
  stop1: {enabled: true, percent: 1, color: new vec4(0.24, 0.24, 0.24, 1)}
}

const TOOLTIP_BORDER_GRADIENT: GradientParameters = {
  enabled: true,
  type: "Linear",
  start: new vec2(1, 1),
  end: new vec2(-1, -1),
  stop0: {enabled: true, percent: -1, color: new vec4(0.05, 0.05, 0.05, 1)},
  stop1: {enabled: true, percent: 1, color: new vec4(0.4, 0.4, 0.4, 1)}
}

const TEXT_COLOR = new vec4(0.72, 0.72, 0.72, 1)

@component
export class Tooltip extends BaseScriptComponent {
  @input("int")
  private _renderOrder: number = 1000
  @input
  private _tip: string = "Helpful Hint"

  private backing: RoundedRectangle
  private textComponent: Text

  private fadeCancelSet: CancelSet = new CancelSet()

  private _size: vec2 = vec2.zero()

  private managedSceneObjects: SceneObject[] = []
  private managedComponents: Component[] = []

  private isUpdatingBackingSize: boolean = false
  private onCompleteHandlers: (() => void)[] = []

  private initialized: boolean = false

  private onDestroyEvent: Event = new Event()
  public readonly onDestroy = this.onDestroyEvent.publicApi()

  /**
   * The current tooltip text.
   * @returns The tooltip string associated with this instance.
   */
  public get tip(): string {
    return this._tip
  }

  /**
   * The current tooltip text.
   * @param value - The new tooltip text to display.
   */
  public set tip(value: string) {
    if (value === undefined) {
      return
    }
    this._tip = value
    if (this.textComponent) {
      if (this.textComponent.text !== this._tip) {
        this.textComponent.text = this._tip
        this.updateBackingSize()
      }
    }
  }

  /**
   * The render order of the tooltip.
   */
  public get renderOrder(): number {
    return this._renderOrder
  }

  /**
   * The render order of the tooltip.
   */
  public set renderOrder(value: number) {
    if (value === undefined) {
      return
    }
    this._renderOrder = value
    if (this.initialized) {
      this.backing.renderOrder = value
      this.textComponent.renderOrder = value + 1
    }
  }

  /**
   * Sets the tooltip's visibility state.
   *
   * @param isOn - If `true`, the tooltip will be shown; if `false`, it will be hidden.
   *
   * This method fades the tooltip's alpha to 1 (visible) or 0 (hidden) depending on the `isOn` parameter,
   * provided that both `backing` and `textComponent` are present.
   */
  public setOn(isOn: boolean) {
    if (this.backing && this.textComponent) {
      this.fadeAlpha(isOn ? 1 : 0, () => {})
    }
  }

  public updateBackingSize(onComplete?: () => void) {
    if (onComplete) {
      this.onCompleteHandlers.push(onComplete)
    }
    if (this.isUpdatingBackingSize) {
      return
    }
    this.isUpdatingBackingSize = true
  }

  public onAwake() {
    this.backing = this.sceneObject.createComponent(RoundedRectangle.getTypeName())
    this.managedComponents.push(this.backing)
    this.backing.initialize()
    this.backing.gradient = true
    this.backing.setBackgroundGradient(TOOLTIP_BACKING_GRADIENT)
    this.backing.border = true
    this.backing.setBorderGradient(TOOLTIP_BORDER_GRADIENT)
    this.backing.borderSize = 0.05
    this.backing.renderMeshVisual.mainPass.blendMode = BlendMode.PremultipliedAlphaAuto
    this.backing.renderMeshVisual.mainMaterial.mainPass.depthTest = false
    this.backing.renderOrder = this._renderOrder
    const textObject = global.scene.createSceneObject("TooltipText")
    this.managedSceneObjects.push(textObject)
    textObject.layer = this.sceneObject.layer
    textObject.createComponent("Component.ScreenTransform")
    this.textComponent = textObject.createComponent("Component.Text")
    this.managedComponents.push(this.textComponent)
    this.textComponent.textFill.color = TEXT_COLOR
    this.textComponent.renderOrder = this._renderOrder + 1
    textObject.setParent(this.sceneObject)

    this.initialized = true

    this.createEvent("OnStartEvent").bind(() => {
      this.textComponent.text = this._tip
      this.backing.renderMeshVisual.mainPass.opacityFactor = 0
      this.textComponent.textFill.color = withAlpha(this.textComponent.textFill.color, 0)
      this.updateBackingSize()
    })

    this.createEvent("LateUpdateEvent").bind(() => {
      if (this.isUpdatingBackingSize) {
        this.calculateBackingSize()
        this.isUpdatingBackingSize = false
        this.onCompleteHandlers.forEach((handler) => {
          handler()
        })
        this.onCompleteHandlers = []
      }
    })

    this.createEvent("OnEnableEvent").bind(() => {
      this.managedComponents.forEach((component) => {
        if (!isNull(component) && component) {
          component.enabled = true
        }
      })
    })

    this.createEvent("OnDisableEvent").bind(() => {
      this.managedComponents.forEach((component) => {
        if (!isNull(component) && component) {
          component.enabled = false
        }
      })
    })

    this.createEvent("OnDestroyEvent").bind(() => {
      this.fadeCancelSet.cancel()
      this.managedComponents.forEach((component) => {
        if (!isNull(component) && component) {
          component.destroy()
        }
      })
      this.managedComponents = []
      this.managedSceneObjects.forEach((sceneObject) => {
        if (!isNull(sceneObject) && sceneObject) {
          sceneObject.destroy()
        }
      })
      this.managedSceneObjects = []
      this.onDestroyEvent.invoke()
    })
  }

  private calculateBackingSize(): void {
    if (this.textComponent && this.backing) {
      const textBoundingBox = this.textComponent.getBoundingBox()
      const width = textBoundingBox.getSize().x
      const height = textBoundingBox.getSize().y
      this._size = new vec2(width + TOOLTIP_PADDING.x * 2, height + TOOLTIP_PADDING.y * 2)
      this.backing.size = this._size
      this.backing.cornerRadius = 0.5
      this.isUpdatingBackingSize = false
    }
  }

  private fadeAlpha = (alpha: number, onComplete: () => void = () => {}) => {
    const startingOpacity = this.backing.renderMeshVisual.mainPass.opacityFactor
    const startingTextColor = this.textComponent.textFill.color
    this.fadeCancelSet.cancel()
    animate({
      duration: TOOLTIP_FADE_DURATION * Math.abs(alpha - startingOpacity),
      cancelSet: this.fadeCancelSet,
      update: (t) => {
        this.backing.renderMeshVisual.mainPass.opacityFactor = MathUtils.lerp(startingOpacity, alpha, t)
        this.textComponent.textFill.color = vec4.lerp(startingTextColor, withAlpha(startingTextColor, alpha), t)
      },
      ended: () => {
        // complete
        onComplete()
      }
    })
  }
}
