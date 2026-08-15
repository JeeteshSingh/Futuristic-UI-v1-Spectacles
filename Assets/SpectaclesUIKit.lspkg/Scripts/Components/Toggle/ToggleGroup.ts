import {BaseButton} from "../Button/BaseButton"
import {BaseToggleGroup} from "./BaseToggleGroup"
import {Toggleable} from "./Toggleable"

/**
 * Represents a group of toggles.
 *
 * @extends BaseToggleGroup
 */
@component
export class ToggleGroup extends BaseToggleGroup {
  @input
  private _toggles: BaseButton[] = []

  public get toggleables(): Toggleable[] {
    return this._toggles
  }
}
