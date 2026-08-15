import {InteractorEvent} from "SpectaclesInteractionKit.lspkg/Core/Interactor/InteractorEvent"
import {unsubscribe} from "SpectaclesInteractionKit.lspkg/Utils/Event"
import {CancelToken, clearTimeout, setTimeout} from "SpectaclesInteractionKit.lspkg/Utils/FunctionTimingUtils"
import {findAllComponentsInSelfOrChildren} from "SpectaclesInteractionKit.lspkg/Utils/SceneObjectUtils"
import {SnapOS2Styles} from "../Themes/SnapOS-2.0/SnapOS2"
import {Tooltip} from "../Tooltip"
import {isEqual} from "../Utility/UIKitUtilities"
import {DropShadowVisual, DropShadowVisualParameters} from "../Visuals/DropShadowVisual"
import {RoundedRectangleVisual} from "../Visuals/RoundedRectangle/RoundedRectangleVisual"
import {Visual} from "../Visuals/Visual"
import {Element, StateName} from "./Element"

const DEFAULT_SHADOW_STYLE: Partial<DropShadowVisualParameters> = {
  default: {
    baseColor: new vec4(0.043, 0.043, 0.043, 0.4),
    shouldPosition: false,
    shouldScale: false,
    sizeOffset: new vec2(0.05, 0.05),
    spread: 0.2
  },
  hovered: {
    sizeOffset: new vec2(0.35, 0.35),
    spread: 0.5
  },
  triggered: {
    sizeOffset: new vec2(0.2, 0.2),
    spread: 0.3
  },
  toggledHovered: {
    sizeOffset: new vec2(0.35, 0.35),
    spread: 0.5
  },
  toggledTriggered: {
    sizeOffset: new vec2(0.2, 0.2),
    spread: 0.3
  }
}

/**
 * This constant determines how long the user must hover or interact with an element before the tooltip appears.
 */
const TOOLTIP_ACTIVATION_DELAY = 50 //in milliseconds

/**
 * Represents an abstract base class for visual elements in the UI framework.
 * This class extends the `Element` class and provides functionality for managing
 * a visual representation (`Visual`) and handles initialization and event binding for the visual element.
 *
 * @abstract
 */
export abstract class VisualElement extends Element {
  @input
  @widget(
    new ComboBoxWidget([
      new ComboBoxItem("PrimaryNeutral", "PrimaryNeutral"),
      new ComboBoxItem("Primary", "Primary"),
      new ComboBoxItem("Secondary", "Secondary"),
      new ComboBoxItem("Special", "Special"),
      new ComboBoxItem("Ghost", "Ghost")
    ])
  )
  protected _style: string = SnapOS2Styles.PrimaryNeutral

  @input
  private _hasShadow: boolean = false

  @input("vec3", "{0.05,-0.05,-0.01}")
  @showIf("_hasShadow")
  private _shadowPositionOffset: vec3 = vec3.zero()

  protected _visual: Visual
  protected visualEventHandlerUnsubscribes: unsubscribe[] = []

  private shadow: DropShadowVisual | undefined = undefined
  private shadowEventHandlerUnsubscribes: unsubscribe[] = []

  private tooltip: Tooltip
  private tooltipCancelToken: CancelToken

  /**
   * Gets the type string of the visual element.
   *
   * @returns {string} The type string of the visual element.
   */
  public get typeString(): string {
    return this.constructor.name
  }

  /**
   * Gets the associated `Visual` instance for this component.
   *
   * @returns {Visual} The `Visual` instance linked to this component.
   */
  public get visual(): Visual {
    return this._visual
  }

  /**
   * Gets the style of the visual element.
   *
   * @returns {string} The style of the visual element.
   */
  public get style(): string {
    return this._style as string
  }

  /**
   * Sets the associated `Visual` instance for this component.
   *
   * @param value - The `Visual` instance to assign.
   */
  public set visual(value: Visual) {
    if (value === undefined) {
      return
    }
    if (isEqual<Visual>(this._visual, value)) {
      return
    }
    this.destroyVisual()
    this._visual = value
    if (this._initialized) {
      this.configureVisual()
      this.setState(this.stateName) // set the new visual to current state
    }
  }

  /**
   * Gets the size of the visual element.
   *
   * @returns {vec3} The size of the visual element.
   */
  public get size(): vec3 {
    return this._size
  }

  /**
   * Sets the size of the visual element.
   *
   * @param size - A `vec3` representing the dimensions of the visual element.
   */
  public set size(size: vec3) {
    if (size === undefined) {
      return
    }
    super.size = size
    if (this._initialized) {
      this._visual.size = size
      if (this.shadow) {
        this.shadow.size = size
      }
    }
  }

  /**
   * Gets the render order of the visual element.
   *
   * @returns {number} The render order of the visual element.
   */
  public get renderOrder(): number {
    return this._renderOrder
  }

  /**
   * Sets the render order of the visual element.
   *
   * @param value - The render order of the visual element.
   */
  public set renderOrder(value: number) {
    if (value === undefined) {
      return
    }
    this._renderOrder = value
    if (this._initialized) {
      this._visual.renderMeshVisual.renderOrder = value
      if (this._hasShadow && this.shadow) {
        this.shadow.renderMeshVisual.renderOrder = value - 1
      }
    }
  }

  /**
   * Gets whether the visual element has a shadow.
   *
   * @returns {boolean} Whether the visual element has a shadow.
   */
  public get hasShadow(): boolean {
    return this._hasShadow
  }

  /**
   * Sets whether the visual element has a shadow.
   * If the hasShadow is set to true, the shadowVisual object will be created and configured.
   *
   * @param value - Whether the visual element has a shadow.
   */
  public set hasShadow(value: boolean) {
    if (value === undefined) {
      return
    }
    if (isEqual<boolean>(this._hasShadow, value)) {
      return
    }
    this._hasShadow = value
    if (this._initialized) {
      if (value) {
        this.createShadow()
        this.configureShadow()
        this.shadow.setState(this.stateName)
      } else {
        this.destroyShadow()
      }
    }
  }

  /**
   * Gets the associated `DropShadowVisual` instance for this component.
   *
   * @returns {DropShadowVisual | undefined} The `DropShadowVisual` instance linked to this component, if any.
   */
  public get shadowVisual(): DropShadowVisual | undefined {
    return this.shadow
  }

  /**
   * Gets the position offset of the shadow.
   *
   * @returns {vec3} The position offset of the shadow.
   */
  public get shadowPositionOffset(): vec3 {
    return this._shadowPositionOffset
  }

  /**
   * Sets the position offset of the shadow.
   *
   * @param value - The position offset of the shadow.
   */
  public set shadowPositionOffset(value: vec3) {
    if (value === undefined) {
      return
    }
    if (isEqual<vec3>(this._shadowPositionOffset, value)) {
      return
    }
    this._shadowPositionOffset = value
    if (this._initialized && this.shadow) {
      this.shadow.transform.setLocalPosition(this.currentPosition.uniformScale(-1).add(this._shadowPositionOffset))
    }
  }

  /**
   * Initializes the visual element and its associated properties and events.
   *
   * @override
   */
  public initialize(): void {
    if (this._initialized) {
      return
    }

    this.createDefaultVisual()
    this.createShadow()

    this._visual.renderMeshVisual.renderOrder = this._renderOrder
    if (this.shadow) {
      this.shadow.renderMeshVisual.renderOrder = this._renderOrder - 1
    }

    super.initialize()

    this.configureVisual()
    this.configureShadow()

    this.visual.onPositionChanged.add((args) => {
      this.currentPosition = args.current
      this.updateCollider()
    })

    this.visual.onScaleChanged.add((args) => {
      this.currentScale = args.current
      this.updateCollider()
    })

    if (!this.tooltip) {
      const tooltipComponents = findAllComponentsInSelfOrChildren(this.sceneObject, Tooltip.getTypeName())
      if (tooltipComponents.length > 0) {
        this.registerTooltip(tooltipComponents[0])
      }
    }

    this.setState(this.stateName)
  }

  /**
   * Registers a tooltip instance with the current component
   *
   * @param tooltip - The Tooltip instance to associate with this component.
   */
  public registerTooltip(tooltip: Tooltip): void {
    this.tooltip = tooltip
    this.tooltip.setOn(false)
  }

  /**
   * Sets the tooltip text for the visual element.
   *
   * @param text - The text to be displayed in the tooltip.
   */
  public setTooltip(text: string): void {
    if (this.tooltip) {
      if (this.tooltip.tip !== text) {
        this.tooltip.tip = text
      }
    }
  }

  protected abstract createDefaultVisual(): void

  protected configureVisual(): void {
    if (this._visual) {
      this.visualEventHandlerUnsubscribes.push(
        this._visual.onDestroyed.add(() => {
          this._visual = null
        })
      )

      this._visual.initialize()

      this._visual.size = this._size
    }
  }

  protected createShadow(): void {
    if (this._hasShadow) {
      const shadowObject = global.scene.createSceneObject(this.sceneObject.name + " Shadow")
      this.managedSceneObjects.add(shadowObject)
      shadowObject.setParent(this.sceneObject)
      this.shadow = new DropShadowVisual({sceneObject: shadowObject, style: DEFAULT_SHADOW_STYLE})
    }
  }

  protected configureShadow(): void {
    if (this.shadow) {
      this.shadowEventHandlerUnsubscribes.push(
        this.shadow.onDestroyed.add(() => {
          this.shadow = undefined
        }),
        this.visual.onPositionChanged.add((args) => {
          this.shadow.transform.setLocalPosition(args.current.uniformScale(-1).add(this._shadowPositionOffset))
        })
      )
      this.shadow.size = this.size
      if (this.visual instanceof RoundedRectangleVisual) {
        this.shadow.cornerRadius = this.visual.cornerRadius
      }
      const shadowTransform = this.shadow.transform
      shadowTransform.setLocalPosition(this.currentPosition.uniformScale(-1).add(this._shadowPositionOffset))
      shadowTransform.setLocalRotation(quat.quatIdentity())
    }
  }

  protected onEnabled() {
    super.onEnabled()
    this.enableVisuals()
  }

  protected onDisabled() {
    super.onDisabled()
    this.disableVisuals()
  }

  protected enableVisuals() {
    if (this._initialized) {
      if (!isNull(this.visual) && this.visual) {
        this.visual.enable()
      }
      if (!isNull(this.shadow) && this.shadow) {
        this.shadow.enable()
      }
    }
  }

  protected disableVisuals() {
    if (this._initialized) {
      if (!isNull(this.visual) && this.visual) {
        this.visual.disable()
      }
      if (!isNull(this.shadow) && this.shadow) {
        this.shadow.disable()
      }
    }
  }

  private destroyVisual(): void {
    this.visualEventHandlerUnsubscribes.forEach((unsubscribe) => unsubscribe())
    this.visualEventHandlerUnsubscribes = []
    if (this._visual) {
      this._visual.destroy()
    }
  }

  private destroyShadow(): void {
    this.shadowEventHandlerUnsubscribes.forEach((unsubscribe) => unsubscribe())
    this.shadowEventHandlerUnsubscribes = []
    if (this.shadow) {
      this.shadow.destroy()
    }
  }

  protected release(): void {
    if (!isNull(this._visual) && this._visual) {
      this._visual.destroy()
    }
    if (!isNull(this.shadow) && this.shadow) {
      this.shadow.destroy()
    }
    super.release()
  }

  protected setState(stateName: StateName): void {
    this._visual?.setState(stateName)
    if (this.shadow) {
      this.shadow.setState(stateName)
    }
    super.setState(stateName)
  }

  protected onHoverEnterHandler(event: InteractorEvent): void {
    this.setTooltipState(true)
    super.onHoverEnterHandler(event)
  }

  protected onHoverExitHandler(event: InteractorEvent): void {
    this.setTooltipState(false)
    super.onHoverExitHandler(event)
  }

  private updateCollider(): void {
    if (this._colliderFitElement) {
      const delta = this.deltaPosition.div(this.deltaScale)
      this.colliderShape.size = this._size.add(delta)
      this.collider.shape = this.colliderShape
      this.colliderTransform.setLocalPosition(delta.uniformScale(-1 / 2))
    }
  }

  private setTooltipState(isOn: boolean): void {
    if (this.tooltip) {
      if (isOn) {
        this.tooltipCancelToken = setTimeout(() => {
          if (this.tooltipCancelToken && !this.tooltipCancelToken.cancelled) {
            this.tooltip.setOn(true)
          }
        }, TOOLTIP_ACTIVATION_DELAY)
      } else {
        clearTimeout(this.tooltipCancelToken)
        this.tooltip.setOn(false)
      }
      const unsubscribe = this.tooltip.onDestroy.add(() => {
        clearTimeout(this.tooltipCancelToken)
        this.tooltipCancelToken = null
        this.tooltip = null
        unsubscribe()
      })
    }
  }
}
