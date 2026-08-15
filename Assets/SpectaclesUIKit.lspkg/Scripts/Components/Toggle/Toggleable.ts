import {PublicApi} from "SpectaclesInteractionKit.lspkg/Utils/Event"

/**
 * Interface representing a toggleable component.
 */
export interface Toggleable {
  /**
   * sceneObject - The scene object associated with the toggleable component.
   * @returns The scene object of the toggleable component.
   */
  get sceneObject(): SceneObject

  /**
   * initialize the component
   */
  initialize(): void

  /**
   * Converts the component to a toggleable state.
   */
  setIsToggleable?(isToggleable: boolean): void

  /**
   * Indicates whether the toggleable component has been initialized.
   */
  get initialized(): boolean

  /**
   * Indicates whether the toggle is currently on.
   */
  get isOn(): boolean

  /**
   * Sets the toggle state, implicitly and silently
   * Setting this does not trigger toggle group to turn on/off other toggles.
   *
   * @param on - A boolean value indicating the desired toggle state.
   */
  set isOn(on: boolean)

  /**
   * Set the toggleable on or off.
   * @param on - A boolean value indicating the desired toggle state.
   */
  toggle(on: boolean): void

  /**
   * Event that is triggered when the component is initialized.
   */
  readonly onInitialized: PublicApi<void>

  /**
   * Event that is triggered when the toggle value changes.
   */
  readonly onValueChange: PublicApi<number>

  /**
   * Event that is triggered when the toggle finishes its action.
   * The event data represents whether it's an explicit change.
   */
  readonly onFinished: PublicApi<boolean>
}
