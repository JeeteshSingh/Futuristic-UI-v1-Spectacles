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
import {RadioButton} from "./RadioButton"

const DEFAULT_TOGGLED_VISUAL_DEPTH = 0.01
const DEFAULT_CHECK_VISUAL_DEPTH = 0.02

const CHECK_TEXTURES: {default: Texture; hovered: Texture; toggled: Texture} = {
  default: requireAsset("../../../Textures/check_default.png") as Texture,
  hovered: requireAsset("../../../Textures/check_hovered.png") as Texture,
  toggled: requireAsset("../../../Textures/check_toggledHovered.png") as Texture
}

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

const DEFAULT_CHECK_VISUAL_PARAMETERS: Partial<RoundedRectangleVisualParameters> = {
  default: {
    baseType: "Texture",
    baseTexture: CHECK_TEXTURES.default,
    hasBorder: false,
    shouldScale: false,
    shouldPosition: false,
    localScale: new vec3(1, 1, 1),
    localPosition: new vec3(0, 0, 0)
  },
  hovered: {
    baseTexture: CHECK_TEXTURES.hovered
  },
  toggledDefault: {
    baseTexture: CHECK_TEXTURES.default
  },
  toggledHovered: {
    baseTexture: CHECK_TEXTURES.toggled
  },
  toggledTriggered: {
    baseTexture: CHECK_TEXTURES.toggled
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
  }
}

const TOGGLED_WIDTH_RATIO = 0.8
const CHECK_MARK_SIZE_RATIO = 0.7

/**
 * Checkbox-style button derived from `RadioButton`.
 *
 * Composition:
 * - Base `RoundedRectangleVisual` (cornerRadius = 0.25 × size)
 * - "Toggled" `RoundedRectangleVisual` above the base
 * - Textured check visual (child of the toggled visual)
 *
 * Sizing:
 * - `_width` controls the base size (`width` setter updates it)
 * - `_toggledWidth` controls the toggled visual size
 * - `_checkSize` controls the check visual size (`checkWidth` mirrors it)
 *
 * Render order: base = `renderOrder`, toggled = `renderOrder + 1`, check = `renderOrder + 2`.
 */
@component
export class Checkbox extends RadioButton {
  @input
  @label("Size")
  protected _width: number = 3

  protected _toggledWidth: number = this._width * TOGGLED_WIDTH_RATIO

  protected _checkMarkSize: number = this._width * CHECK_MARK_SIZE_RATIO

  protected _checkMarkVisual: Visual
  private checkVisualEventHandlerUnsubscribes: unsubscribe[] = []

  /**
   * Gets the render order of the Checkbox.
   */
  public get renderOrder(): number {
    return this._renderOrder
  }

  /**
   * Sets the render order of the Checkbox and its toggled and check visuals.
   *
   * The toggled visual renders above the base (`order + 1`), and the check
   * visual renders above the toggled visual (`order + 2`).
   *
   * @param order - The base render order for the Checkbox.
   */
  public set renderOrder(order: number) {
    if (order === undefined) {
      return
    }
    super.renderOrder = order
    if (this._initialized) {
      if (this._checkMarkVisual) {
        this._checkMarkVisual.renderMeshVisual.renderOrder = order + 2
      }
    }
  }

  /**
   * Gets the check visual of the Checkbox.
   *
   * @returns {Visual} The visual object representing the check visual.
   */
  public get checkVisual(): Visual {
    return this._checkMarkVisual
  }

  /**
   * Sets the check visual
   *
   * Replaces any existing check visual, applies sizing, and syncs state.
   *
   * @param value - The new check visual.
   */
  public set checkVisual(value: Visual) {
    if (value === undefined) {
      return
    }
    if (isEqual<Visual>(this._checkMarkVisual, value)) {
      return
    }
    this.destroyCheckVisual()
    this._checkMarkVisual = value
    if (this._initialized) {
      this.configureCheckVisual()
      this._checkMarkVisual.size = new vec3(this._checkMarkSize, this._checkMarkSize, 1)
      ;(this._checkMarkVisual as RoundedRectangleVisual).cornerRadius = this._checkMarkSize * 0.25
      this._checkMarkVisual.setState(this.stateName)
    }
  }

  /**
   * Gets the size of the Checkbox button.
   *
   * @returns {number} The width of the Checkbox.
   */
  public get width(): number {
    return this._width
  }

  /**
   * Sets the size of the Checkbox button.
   * Uses a corner radius of 0.25 × size for a less rounded base than a radio button.
   *
   * @param width - The new size of the Checkbox.
   */
  public set width(width: number) {
    if (width === undefined) {
      return
    }
    this._width = width
    if (this._initialized) {
      this.size = new vec3(width, width, 1)
      ;(this.visual as RoundedRectangleVisual).cornerRadius = width * 0.25
    }
    this.toggledWidth = width * TOGGLED_WIDTH_RATIO
    this.checkMarkWidth = width * CHECK_MARK_SIZE_RATIO
  }

  /**
   * Sets the current visual state of the checkbox and its toggled visuals.
   *
   * @param stateName - The state to apply.
   */
  public setState(stateName: StateName): void {
    super.setState(stateName)
    if (this._initialized) {
      if (this.checkVisual) {
        this.checkVisual.setState(stateName)
      }
    }
  }

  public initialize(): void {
    super.initialize()

    if (this._checkMarkVisual) {
      this._checkMarkVisual.renderMeshVisual.renderOrder = this._renderOrder + 2
    }

    this.configureCheckVisual()
  }

  protected createDefaultVisual(): void {
    if (!this._visual) {
      const defaultVisual: RoundedRectangleVisual = new RoundedRectangleVisual({
        sceneObject: this.sceneObject,
        style: DEFAULT_VISUAL_PARAMETERS
      })
      defaultVisual.cornerRadius = this._width * 0.25
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
      defaultToggledVisual.cornerRadius = this._toggledWidth * 0.25
      this._toggledVisual = defaultToggledVisual
    }

    if (!this._checkMarkVisual) {
      const checkVisualObject = global.scene.createSceneObject("CheckVisual")
      this.managedSceneObjects.add(checkVisualObject)
      checkVisualObject.setParent(this._toggledVisual.sceneObject)
      checkVisualObject.getTransform().setLocalPosition(new vec3(0, 0, DEFAULT_CHECK_VISUAL_DEPTH))
      const defaultCheckMarkVisual = new RoundedRectangleVisual({
        sceneObject: checkVisualObject,
        style: DEFAULT_CHECK_VISUAL_PARAMETERS,
        transparent: true
      })
      defaultCheckMarkVisual.cornerRadius = this._checkMarkSize * 0.25
      this._checkMarkVisual = defaultCheckMarkVisual
    }
  }

  private configureCheckVisual(): void {
    if (this._checkMarkVisual) {
      this.checkVisualEventHandlerUnsubscribes.push(
        this._checkMarkVisual.onDestroyed.add(() => {
          this._checkMarkVisual = null
        })
      )

      this._checkMarkVisual.size = new vec3(this._checkMarkSize, this._checkMarkSize, 1)
    }
  }

  private destroyCheckVisual(): void {
    this.checkVisualEventHandlerUnsubscribes.forEach((unsubscribe) => unsubscribe())
    this.checkVisualEventHandlerUnsubscribes = []
    if (this._checkMarkVisual) {
      this._checkMarkVisual.destroy()
      this._checkMarkVisual = null
    }
  }

  protected onEnabled() {
    super.onEnabled()
    if (this._initialized) {
      this._checkMarkVisual?.enable()
    }
  }

  protected onDisabled() {
    super.onDisabled()
    if (this._initialized) {
      this._checkMarkVisual?.disable()
    }
  }

  protected release(): void {
    this._checkMarkVisual?.destroy()
    this._checkMarkVisual = null
    super.release()
  }

  /**
   * Gets the size of the toggled visual.
   *
   * @returns {number} The width of the toggled visual.
   */
  protected get toggledWidth(): number {
    return this._toggledWidth
  }

  /**
   * Sets the size of the toggled visual.
   * Uses a corner radius of 0.25 × size to match the styling.
   *
   * @param width - The new size of the toggled visual.
   */
  protected set toggledWidth(width: number) {
    if (width === undefined) {
      return
    }
    if (isEqual<number>(this._toggledWidth, width)) {
      return
    }
    this._toggledWidth = width
    if (this._initialized && this._toggledVisual) {
      this._toggledVisual.size = new vec3(width, width, 1)
      ;(this._toggledVisual as RoundedRectangleVisual).cornerRadius = width * 0.25
    }
  }

  /**
   * Gets the size of the check visual.
   *
   * @returns {number} The width of the check visual.
   */
  protected get checkMarkWidth(): number {
    return this._checkMarkSize
  }

  /**
   * Sets the size of the check visual.
   * Uses a corner radius of 0.25 × size to match the check styling.
   *
   * @param width - The new width of the check visual.
   */
  protected set checkMarkWidth(width: number) {
    if (width === undefined) {
      return
    }
    if (isEqual<number>(this._checkMarkSize, width)) {
      return
    }
    this._checkMarkSize = width
    if (this._initialized && this._checkMarkVisual) {
      this._checkMarkVisual.size = new vec3(width, width, 1)
      ;(this._checkMarkVisual as RoundedRectangleVisual).cornerRadius = width * 0.25
    }
  }
}
