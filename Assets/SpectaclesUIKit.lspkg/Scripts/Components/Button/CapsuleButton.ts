import {RoundedRectangleVisual} from "../../Visuals/RoundedRectangle/RoundedRectangleVisual"
import {BaseButton} from "./BaseButton"

@component
export class CapsuleButton extends BaseButton {
  @input
  protected _size: vec3 = new vec3(12, 3, 1)

  public get size(): vec3 {
    return this._size
  }

  public set size(size: vec3) {
    if (size === undefined) {
      return
    }
    super.size = size
    if (this._initialized) {
      this._visual.size = size
      ;(this.visual as RoundedRectangleVisual).cornerRadius = this.size.y * 0.5
    }
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
      defaultVisual.cornerRadius = this._size.y * 0.5
      this._visual = defaultVisual
    }
  }
}
