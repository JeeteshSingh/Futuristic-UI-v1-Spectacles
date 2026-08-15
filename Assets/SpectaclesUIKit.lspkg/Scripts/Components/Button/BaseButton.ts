import NativeLogger from "SpectaclesInteractionKit.lspkg/Utils/NativeLogger"

import {Callback, createCallbacks} from "../../../Scripts/Utility/SceneUtilities"
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import Event, {PublicApi} from "SpectaclesInteractionKit.lspkg/Utils/Event"
import {StateName} from "../Element"
import {Toggleable} from "../Toggle/Toggleable"
import {VisualElement} from "../VisualElement"

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const log = new NativeLogger("Button")

/**
 * The `Button` class represents a button component in the Spectacles UI Kit.
 * It extends the `VisualElement` class and initializes a default visual if none is provided.
 *
 * @extends VisualElement
 */
export abstract class BaseButton extends VisualElement implements Toggleable {
  @input
  private _toggleable: boolean = false
  @input
  @showIf("_toggleable")
  @hint("The default state of the Toggle")
  protected _defaultToOn: boolean = false
  @input
  @hint("Enable this to add functions from another script to this component's callbacks")
  protected addCallbacks: boolean = false
  @ui.group_start("Callbacks")
  @showIf("addCallbacks")
  @input
  @label("On Trigger Up Callbacks")
  private triggerUpCallbacks: Callback[] = []
  @input
  @label("On Trigger Down Callbacks")
  private triggerDownCallbacks: Callback[] = []
  @input
  @showIf("_toggleable")
  @label("On Value Changed Callbacks")
  protected onValueChangeCallbacks: Callback[] = []
  @input
  @showIf("_toggleable")
  @label("On Finished Callbacks")
  protected onFinishedCallbacks: Callback[] = []
  @ui.group_end
  private _isOn: boolean = false

  protected get isToggle(): boolean {
    return this._toggleable
  }

  private onValueChangeEvent: Event<number> = new Event<number>()
  public readonly onValueChange: PublicApi<number> = this.onValueChangeEvent.publicApi()
  private onFinishedEvent: Event<boolean> = new Event<boolean>()
  public readonly onFinished: PublicApi<boolean> = this.onFinishedEvent.publicApi()

  /**
   * Gets the current state of the toggle.
   *
   * @returns {boolean} - Returns `true` if the toggle is on, otherwise `false`.
   */
  public get isOn(): boolean {
    return this._isOn
  }

  /**
   * Sets the state of the toggle.
   * If the new state is different from the current state, it updates the state,
   * triggers the updateCheck method, and invokes the onValueChangeEvent.
   *
   * @param on - A boolean indicating the new state of the toggle.
   */
  public set isOn(on: boolean) {
    if (on === undefined) {
      return
    }
    this.setOn(on, false)
  }

  public setIsToggleable(isToggle: boolean): void {
    if (this._toggleable === false && isToggle) {
      // programmatically forcing toggleable
      print(`WARNING: ${this.sceneObject.name} is being automatically converted to a toggle.`)
    }
    this._toggleable = isToggle
    // undo previous settings
    this.removeInteractableListeners()
    // sets interactable state machine to be a toggle
    this.setUpInteractableListeners()
  }

  public initialize(): void {
    this._isOn = this._defaultToOn
    this.stateName = this._defaultToOn ? StateName.toggledDefault : StateName.default
    super.initialize()

    if (this.isToggle) {
      this._interactableStateMachine.toggle = this._isOn
    }
  }

  protected setUpEventCallbacks(): void {
    super.setUpEventCallbacks()
    if (this.addCallbacks) {
      this.onTriggerUp.add(createCallbacks(this.triggerUpCallbacks))
      this.onTriggerDown.add(createCallbacks(this.triggerDownCallbacks))
      this.onValueChange.add(createCallbacks(this.onValueChangeCallbacks))
      this.onFinished.add(createCallbacks(this.onFinishedCallbacks))
    }
  }

  protected setState(stateName: StateName): void {
    super.setState(stateName)
    const shouldBeOn =
      stateName === StateName.toggledDefault ||
      stateName === StateName.toggledHovered ||
      stateName === StateName.toggledTriggered
    if (this._isOn !== shouldBeOn) {
      this.setOn(shouldBeOn, true) // explicit = true to notify toggle group
    }
  }

  /**
   * Toggle on/off the toggle by setting its state
   *
   * @param on - A boolean value indicating the desired toggle state.
   */
  public toggle(on: boolean): void {
    if (this.isToggle) {
      this.setOn(on, true)
    } else {
      print("WARNING: this is not in toggle mode! Did you mean to check `isToggle`?")
    }
  }

  protected abstract createDefaultVisual(): void

  protected setOn(on: boolean, explicit: boolean): void {
    if (this.initialized) {
      if (this._isOn === on) {
        return
      }
      this._isOn = on
      if (this.isToggle) {
        this._interactableStateMachine.toggle = on
      }
      this.onValueChangeEvent.invoke(this._isOn ? 1 : 0)
      this.onFinishedEvent.invoke(explicit)
    } else {
      this._defaultToOn = on
    }
  }
}
