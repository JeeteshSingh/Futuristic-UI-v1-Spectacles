import {withAlpha} from "SpectaclesInteractionKit.lspkg/Utils/color"
import {StateName} from "../../../Components/Element"
import {Visual, VisualArgs, VisualState} from "../../../Visuals/Visual"
import {Capsule3D} from "./Capsule3D"

/**
 * The `CapsuleVisual` class represents a visual component in the form of a capsule.
 * It extends the `Visual` class and provides functionality for managing the capsule's
 * appearance, size, and state transitions.
 *
 * @extends Visual
 */
export class Capsule3DVisual extends Visual {
  private _capsuleVisualStates: Map<StateName, VisualState>
  protected get visualStates(): Map<StateName, VisualState> {
    return this._capsuleVisualStates
  }

  /**
   * Gets the size of the Capsule3DVisual.
   *
   * @returns A `vec3` representing the dimensions of the Capsule3DVisual.
   */
  public get size(): vec3 {
    return super.size
  }

  /**
   * Sets the size of the Capsule3DVisual.
   * Updates both the internal `_size` property.
   *
   * @param size - A `vec3` object representing the dimensions of the Capsule3DVisual.
   */
  public set size(size: vec3) {
    if (size === undefined) {
      return
    }
    super.size = size
    if (this.initialized) {
      this.capsuleSize = size
    }
  }

  /**
   * Gets the `RenderMeshVisual` associated with the capsule.
   *
   * @returns {RenderMeshVisual} The visual representation of the capsule's mesh.
   */
  public get renderMeshVisual(): RenderMeshVisual {
    return this.capsule.renderMeshVisual
  }

  /**
   * Gets the base color of the capsule visual.
   *
   * @returns {vec4} The background color of the capsule as a 4-component vector.
   */
  public get baseColor(): vec4 {
    return this.capsule.backgroundColor
  }

  /**
   * Indicates whether the capsule visual has a border.
   *
   * @returns {boolean} The border property always returns false for the `CapsuleVisual` class,
   */
  public get hasBorder(): boolean {
    return false
  }

  /**
   * Gets the size of the border for the capsule visual.
   *
   * @returns The border size as a number. Currently, this always returns 0.
   */
  public get borderSize(): number {
    return 0
  }

  public constructor(args: VisualArgs) {
    super(args)
    this._sceneObject = args.sceneObject
    this.capsule = this._sceneObject.createComponent(Capsule3D.getTypeName())
    this.managedComponents.push(this.capsule)
    this.capsule.initialize()
    this._transform = this._sceneObject.getTransform()
    this.capsule.depth = this.size.z
    this.capsule.size = new vec2(this.size.x, this.size.y)
    this.initialize()
  }

  protected set baseColor(value: vec4) {
    this.capsule.backgroundColor = value
  }

  private get capsuleSize(): vec3 {
    return new vec3(this.capsule.size.x, this.capsule.size.y, this.capsule.depth)
  }

  private set capsuleSize(value: vec3) {
    if (value === undefined) {
      return
    }
    this.capsule.depth = value.z
    this.capsule.size = new vec2(value.x, value.y)
  }

  protected updateVisualStates(): void {
    this._capsuleVisualStates = new Map([
      [
        StateName.default,
        {
          baseColor: withAlpha(this.baseDefaultColor, 1),
          localScale: this.defaultScale,
          localPosition: this.defaultPosition
        }
      ],
      [
        StateName.hovered,
        {
          baseColor: withAlpha(this.baseHoveredColor, 1),
          localScale: this.hoveredScale,
          localPosition: this.hoveredPosition
        }
      ],
      [
        StateName.triggered,
        {
          baseColor: withAlpha(this.baseTriggeredColor, 1),
          localScale: this.triggeredScale,
          localPosition: this.triggeredPosition
        }
      ],
      [
        StateName.error,
        {
          baseColor: withAlpha(this.baseErrorColor, 1),
          localScale: this.errorScale,
          localPosition: this.errorPosition
        }
      ],
      [
        StateName.errorHovered,
        {
          baseColor: withAlpha(this.baseErrorColor, 1),
          localScale: this.hoveredScale,
          localPosition: this.hoveredPosition
        }
      ],
      [
        StateName.inactive,
        {
          baseColor: withAlpha(this.baseInactiveColor, 1),
          localScale: this.inactiveScale,
          localPosition: this.inactivePosition
        }
      ]
    ])
    super.updateVisualStates()
  }

  private get capsule(): Capsule3D {
    return this._visualComponent as Capsule3D
  }

  private set capsule(value: Capsule3D) {
    this._visualComponent = value
  }
}
