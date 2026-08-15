import {RoundedRectangleVisual} from "../../Visuals/RoundedRectangle/RoundedRectangleVisual"
import {BaseButton} from "./BaseButton"

@component
export class RectangleButton extends BaseButton {
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

      defaultVisual.cornerRadius = 0.5
      this._visual = defaultVisual
    }
  }
}
