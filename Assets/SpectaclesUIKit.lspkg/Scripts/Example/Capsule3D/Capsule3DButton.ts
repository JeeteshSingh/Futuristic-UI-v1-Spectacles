import NativeLogger from "SpectaclesInteractionKit.lspkg/Utils/NativeLogger"
import {BaseButton} from "../../Components/Button/BaseButton"
import {SnapOS2Styles} from "../../Themes/SnapOS-2.0/SnapOS2"
import {Capsule3DVisual} from "./Visual/Capsule3DVisual"

const log = new NativeLogger("CapsuleButton") // eslint-disable-line @typescript-eslint/no-unused-vars

/**
 * Represents a CapsuleButton component that extends the base Toggle class.
 * This component initializes a CapsuleVisual instance and assigns it as the visual representation.
 *
 * @extends BaseButton - Inherits functionality from the Toggle class.
 */
@component
export class Capsule3DButton extends BaseButton {
  protected _style: SnapOS2Styles = SnapOS2Styles.Custom

  protected createDefaultVisual(): void {
    if (!this._visual) {
      this._visual = new Capsule3DVisual({
        sceneObject: this.sceneObject
      })
    }
  }
}
