import {
  RoundedRectangleVisual,
  RoundedRectangleVisualParameters
} from "../../Visuals/RoundedRectangle/RoundedRectangleVisual"

import {unsubscribe} from "SpectaclesInteractionKit.lspkg/Utils/Event"
import {SecondaryGradients} from "../../../Scripts/Themes/SnapOS-2.0/Gradients/SecondaryGradients"
import {PrimaryGradients} from "../../Themes/SnapOS-2.0/Gradients/PrimaryGradients"
import {isEqual} from "../../Utility/UIKitUtilities"
import {Visual} from "../../Visuals/Visual"
import {StateName} from "../Element"
import {BaseButton} from "./BaseButton"

const DEFAULT_TOGGLED_VISUAL_DEPTH = 0.01

const DEFAULT_VISUAL_PARAMETERS: Partial<RoundedRectangleVisualParameters> = {
  default: {
    baseType: "Gradient",
    baseGradient: SecondaryGradients.defaultBackground,
    hasBorder: true,
    borderType: "Gradient",
    borderGradient: SecondaryGradients.defaultBorder,
    shouldScale: false,
    shouldPosition: false,
    localScale: new vec3(1, 1, 1),
    localPosition: new vec3(0, 0, 0)
  },
  hovered: {
    baseGradient: SecondaryGradients.hoverBackground,
    borderGradient: SecondaryGradients.hoverBorder
  },
  toggledDefault: {
    baseGradient: PrimaryGradients.defaultBackground,
    borderGradient: PrimaryGradients.defaultBorder
  },
  toggledHovered: {
    baseGradient: PrimaryGradients.hoverBackground,
    borderGradient: PrimaryGradients.triggeredBorder
  }
}

const DEFAULT_TOGGLED_VISUAL_PARAMETERS: Partial<RoundedRectangleVisualParameters> = {
  default: {
    baseType: "Gradient",
    baseGradient: {
      enabled: true,
      type: "Linear",
      stop0: {
        enabled: false,
        percent: 0,
        color: vec4.zero()
      },
      stop1: {
        enabled: false,
        percent: 1,
        color: vec4.zero()
      }
    },
    hasBorder: false,
    shouldScale: false,
    shouldPosition: false,
    localScale: new vec3(1, 1, 1),
    localPosition: new vec3(0, 0, 0)
  },
  toggledDefault: {
    baseGradient: PrimaryGradients.triggeredBackground,
    hasBorder: true,
    borderSize: 0.05,
    borderType: "Gradient",
    borderGradient: PrimaryGradients.triggeredBorder
  },
  toggledHovered: {
    baseGradient: PrimaryGradients.triggeredBackground,
    hasBorder: true,
    borderSize: 0.05,
    borderType: "Gradient",
    borderGradient: PrimaryGradients.triggeredBorder
  },
  toggledTriggered: {
    baseGradient: PrimaryGradients.triggeredBackground,
    hasBorder: true,
    borderSize: 0.05,
    borderType: "Gradient",
    borderGradient: PrimaryGradients.triggeredBorder
  }
}

const TOGGLED_WIDTH_RATIO = 0.6666

/**
 * A circular toggle-style button with an inner toggled visual (dot).
 *
 * The outer button size is controlled by `_width`; the inner dot size is
 * controlled by `_toggledWidth`. Both visuals are `RoundedRectangleVisual`s
 * with corner radii set to half of their widths, and the toggled visual
 * renders above the base via `renderOrder + 1`.
 */
@component
export class RadioButton extends BaseButton {
  @input
  protected _width: number = 1

  protected _toggledWidth: number = this._width * TOGGLED_WIDTH_RATIO

  protected _size: vec3 = new vec3(this._width, this._width, 1)

  protected _toggledVisual: Visual
  private toggledVisualEventHandlerUnsubscribes: unsubscribe[] = []

  /**
   * Gets the render order of the RadioButton.
   */
  public get renderOrder(): number {
    return this._renderOrder
  }

  /**
   * Sets the render order of the RadioButton and its toggled visual.
   *
   * The toggled visual is rendered above the base visual using `order + 1`.
   *
   * @param order - The base render order for the RadioButton.
   */
  public set renderOrder(order: number) {
    if (order === undefined) {
      return
    }
    super.renderOrder = order
    if (this._initialized) {
      if (this._toggledVisual) {
        this._toggledVisual.renderMeshVisual.renderOrder = order + 1
      }
    }
  }

  /**
   * Gets the visual representation of the RadioButton's toggled visual.
   *
   * @returns {Visual} The visual object representing the toggled visual.
   */
  public get toggledVisual(): Visual {
    return this._toggledVisual
  }

  /**
   * Sets the visual used when the RadioButton is in the toggled state.
   *
   * Replaces any existing toggled visual, applies sizing, and syncs state.
   *
   * @param value - The new toggled visual.
   */
  public set toggledVisual(value: Visual) {
    if (value === undefined) {
      return
    }
    if (isEqual<Visual>(this._toggledVisual, value)) {
      return
    }
    this.destroyToggledVisual()
    this._toggledVisual = value
    if (this._initialized) {
      this.configureToggledVisual()
      this._toggledVisual.size = new vec3(this._toggledWidth, this._toggledWidth, 1)
      ;(this._toggledVisual as RoundedRectangleVisual).cornerRadius = this._toggledWidth * 0.5
      this._toggledVisual.setState(this.stateName)
    }
  }

  /**
   * Gets the width (diameter) of the RadioButton.
   *
   * @returns {number} The width of the RadioButton.
   */
  public get width(): number {
    return this._width
  }

  /**
   * Sets the width (diameter) of the RadioButton.
   * Updates the base visual size and corner radius when initialized.
   *
   * @param width - The new width of the RadioButton.
   */
  public set width(width: number) {
    if (width === undefined) {
      return
    }
    this._width = width
    if (this._initialized) {
      this.size = new vec3(width, width, 1)
      ;(this.visual as RoundedRectangleVisual).cornerRadius = width * 0.5
    }
    this.toggledWidth = width * TOGGLED_WIDTH_RATIO
  }

  /**
   * Sets the current visual state of the RadioButton and its toggled visual.
   *
   * @param stateName - The state to apply.
   */
  public setState(stateName: StateName): void {
    super.setState(stateName)
    if (this._initialized) {
      this._toggledVisual.setState(stateName)
    }
  }

  /**
   * Initializes the RadioButton, creating and configuring visuals as needed.
   * Also sets the initial enabled state for the toggled visual.
   */
  public initialize(): void {
    super.initialize()
    this._size = new vec3(this._width, this._width, 1)

    if (this._toggledVisual) {
      this._toggledVisual.renderMeshVisual.renderOrder = this._renderOrder + 1
    }

    this.configureToggledVisual()
  }

  protected createDefaultVisual(): void {
    if (!this._visual) {
      const defaultVisual: RoundedRectangleVisual = new RoundedRectangleVisual({
        sceneObject: this.sceneObject,
        style: DEFAULT_VISUAL_PARAMETERS
      })
      defaultVisual.cornerRadius = this._width * 0.5
      this._visual = defaultVisual
    }

    if (!this._toggledVisual) {
      const toggledVisualObject = global.scene.createSceneObject("ToggledVisual")
      this.managedSceneObjects.add(toggledVisualObject)
      toggledVisualObject.setParent(this.sceneObject)
      toggledVisualObject.getTransform().setLocalPosition(new vec3(0, 0, DEFAULT_TOGGLED_VISUAL_DEPTH))
      const defaultToggledVisual = new RoundedRectangleVisual({
        sceneObject: toggledVisualObject,
        style: DEFAULT_TOGGLED_VISUAL_PARAMETERS,
        transparent: true
      })
      defaultToggledVisual.cornerRadius = this._toggledWidth * 0.5
      defaultToggledVisual.shouldColorChange = true
      this._toggledVisual = defaultToggledVisual
    }
  }

  protected configureVisual(): void {
    super.configureVisual()
    if (this._visual) {
      this.visualEventHandlerUnsubscribes.push(
        this._visual.onDestroyed.add(() => {
          this._toggledVisual = null
        })
      )

      this._visual.size = new vec3(this._width, this._width, 1)
    }
  }

  private configureToggledVisual(): void {
    if (this._toggledVisual) {
      this.toggledVisualEventHandlerUnsubscribes.push(
        this._toggledVisual.onDestroyed.add(() => {
          this._toggledVisual = null
        })
      )

      this._toggledVisual.size = new vec3(this._toggledWidth, this._toggledWidth, 1)
    }
  }

  private destroyToggledVisual(): void {
    this.toggledVisualEventHandlerUnsubscribes.forEach((unsubscribe) => unsubscribe())
    this.toggledVisualEventHandlerUnsubscribes = []
    if (this._toggledVisual) {
      this._toggledVisual.destroy()
      this._toggledVisual = null
    }
  }

  protected enableVisuals() {
    super.enableVisuals()
    if (this._initialized) {
      if (!isNull(this._toggledVisual) && this._toggledVisual) {
        this._toggledVisual.enable()
      }
    }
  }

  protected disableVisuals() {
    super.disableVisuals()
    if (this._initialized) {
      if (!isNull(this._toggledVisual) && this._toggledVisual) {
        this._toggledVisual.disable()
      }
    }
  }

  protected release(): void {
    if (!isNull(this._toggledVisual) && this._toggledVisual) {
      this._toggledVisual.destroy()
    }
    this._toggledVisual = null
    super.release()
  }

  protected get isToggle(): boolean {
    return true
  }

  /**
   * Gets the width (diameter) of the toggled visual.
   *
   * @returns {number} The width of the toggled visual.
   */
  protected get toggledWidth(): number {
    return this._toggledWidth
  }

  /**
   * Sets the width (diameter) of the toggled visual.
   * If the new width is different from the current width, it updates the toggled visual.
   *
   * @param width - The new width of the toggled visual.
   */
  protected set toggledWidth(width: number) {
    if (width === undefined) {
      return
    }
    if (isEqual<number>(this._toggledWidth, width)) {
      return
    }
    this._toggledWidth = width
    if (this._initialized) {
      this._toggledVisual.size = new vec3(width, width, 1)
      ;(this._toggledVisual as RoundedRectangleVisual).cornerRadius = width * 0.5
    }
  }
}
