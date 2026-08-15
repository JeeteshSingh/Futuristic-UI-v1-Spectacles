import {RoundedRectangleVisual} from "../../Visuals/RoundedRectangle/RoundedRectangleVisual"
import {BaseButton} from "./BaseButton"

@component
export class RoundButton extends BaseButton {
  @input
  private _width: number = 3

  protected _size: vec3 = new vec3(this._width, this._width, 1)

  /**
   * The width of the RoundButton, which also determines its height.
   */
  public get width(): number {
    return this._width
  }

  public set width(width: number) {
    if (width === undefined) {
      return
    }
    this._width = width
    if (this._initialized) {
      this.size = new vec3(width, width, 1)
      ;(this.visual as RoundedRectangleVisual).cornerRadius = width * 0.5
    }
  }

  public initialize(): void {
    super.initialize()
    this._size = new vec3(this._width, this._width, 1)
  }

  protected createDefaultVisual(): void {
    if (!this._visual) {
      const defaultVisual: RoundedRectangleVisual = new RoundedRectangleVisual({
        sceneObject: this.sceneObject,
        style: {
          visualElementType: this.typeString,
          style: this._style
        },
        transparent: this._style === "Ghost"
      })
      defaultVisual.cornerRadius = this._width * 0.5
      this._visual = defaultVisual
    }
  }
}
