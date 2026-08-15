import {Style} from "../Style"
import {Theme} from "../Theme"
import {CapsuleButtonParameters} from "./Styles/CapsuleButtonParameters"
import {RectangleButtonParameters} from "./Styles/RectangleButtonParameters"
import {RoundButtonParameters} from "./Styles/RoundButtonParameters"

export enum SnapOS2Styles {
  "PrimaryNeutral" = "PrimaryNeutral",
  "Primary" = "Primary",
  "Secondary" = "Secondary",
  "Special" = "Special",
  "Ghost" = "Ghost",
  "Custom" = "Custom"
}

export const SnapOS2: Theme = {
  get name(): string {
    return "SnapOS2"
  },
  get styles(): Record<string, Record<string, Style>> {
    return {
      RoundButton: RoundButtonParameters,
      RectangleButton: RectangleButtonParameters,
      CapsuleButton: CapsuleButtonParameters
    }
  }
}
