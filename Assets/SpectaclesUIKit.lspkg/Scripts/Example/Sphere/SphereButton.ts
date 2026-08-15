import NativeLogger from "SpectaclesInteractionKit.lspkg/Utils/NativeLogger"
import {BaseButton} from "../../../Scripts/Components/Button/BaseButton"
import {SnapOS2Styles} from "../../Themes/SnapOS-2.0/SnapOS2"
import {SphereVisual} from "./Visual/SphereVisual"

const log = new NativeLogger("SphereButton") // eslint-disable-line @typescript-eslint/no-unused-vars

/**
 * Represents a SphereButton component that extends the base Toggle class.
 * This component initializes a SphereVisual instance and assigns it as the visual representation.
 *
 * @extends BaseButton - Inherits functionality from the Toggle class.
 */
@component
export class SphereButton extends BaseButton {
  @input
  @hint("Radius of Sphere In Local Space Units")
  private _radius: number = 1

  @input
  @hint(
    "Scale of the back of the Sphere in Local Space Units. A value closer to 0.0 makes the back of the sphere flatter, while a value closer to 1.0 retains its original shape."
  )
  @widget(new SliderWidget(0.0, 1.0))
  private _zBackScale: number = 1.0

  protected _size: vec3 = new vec3(2, 2, 2)

  protected _style: SnapOS2Styles = SnapOS2Styles.Custom

  /**
   * Gets the size of the sphere toggle as a 3D vector.
   *
   * @returns {vec3} The size of the sphere toggle.
   */
  public get size(): vec3 {
    return this._size
  }

  /**
   * Setter for the size property.
   *
   * The `size` property is not applicable for `SphereToggle`.
   * Use the `radius` property instead to define the size of the toggle.
   * A warning will be logged if this setter is used.
   *
   * @param size - The size value, which is ignored for `SphereToggle`.
   */
  public set size(size: vec3) {
    log.w(`Size is not applicable for SphereToggle. Use radius instead.`)
  }

  /**
   * Gets the radius of the sphere toggle.
   *
   * @returns {number} The radius of the sphere toggle in local space units.
   */
  public get radius(): number {
    return this._radius
  }

  /**
   * Gets the radius of the sphere toggle.
   *
   * @returns {number} The radius of the sphere toggle in local space units.
   */
  public set radius(radius: number) {
    if (radius === undefined) {
      return
    }
    this._radius = radius
    super.size = vec3.one().uniformScale(this._radius * 2)
  }

  /**
   * Gets the z-axis back scale of the sphere toggle.
   *
   * @returns {number} The z-axis back scale of the sphere toggle.
   */
  public get zBackScale(): number {
    return this._zBackScale
  }

  /**
   * Sets the z-axis back scale for the toggle's visual appearance.
   * This value determines the depth scaling effect applied to the toggle.
   *
   * @param zBackScale - The new z-axis back scale value to be applied.
   */
  public set zBackScale(zBackScale: number) {
    if (zBackScale === undefined) {
      return
    }
    ;(this._visual as SphereVisual).zBackScale = this._zBackScale = zBackScale
  }

  /**
   * Initializes the SphereToggle component. This method ensures that the component
   * is only initialized once. If not already initialized, it creates a `SphereVisual` instance to bind as visual.
   */
  public initialize() {
    super.initialize()

    this.radius = this._radius
    this.zBackScale = this._zBackScale
  }

  protected createDefaultVisual(): void {
    if (!this._visual) {
      this._visual = new SphereVisual({
        sceneObject: this.sceneObject
      })
    }
  }
}
