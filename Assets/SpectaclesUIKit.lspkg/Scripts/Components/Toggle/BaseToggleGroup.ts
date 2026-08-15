import Event from "SpectaclesInteractionKit.lspkg/Utils/Event"
import NativeLogger from "SpectaclesInteractionKit.lspkg/Utils/NativeLogger"
import {Callback, createCallbacks} from "../../Utility/SceneUtilities"
import {isEqual} from "../../Utility/UIKitUtilities"
import {Toggleable} from "./Toggleable"

/* eslint-disable @typescript-eslint/no-unused-vars */
const log = new NativeLogger("ToggleGroup")

export type ToggleSelectedArgs = {
  toggleable: Toggleable
  value: any
}

/**
 * BaseToggleGroup is an abstract class that provides functionality for managing a group of Toggleable components.
 * It handles the registration and deregistration of Toggleables, and ensures that only one Toggleable can be
 * active at a time unless configured otherwise.
 *
 * @abstract
 * @extends BaseScriptComponent
 */
@component
export abstract class BaseToggleGroup extends BaseScriptComponent {
  @input
  @hint("Is it allowed that no toggle is switched on?")
  private _allowAllTogglesOff: boolean = false

  @input
  @hint("Enable this to add functions from another script to this component's callbacks")
  protected addCallbacks: boolean = false
  @input
  @showIf("addCallbacks")
  @label("On Toggle Selected Callbacks")
  private onToggleSelectedCallbacks: Callback[] = []

  private _firstOnToggle: number = -1
  private initialized: boolean = false

  private _toggleableToValue: Map<Toggleable, any> = new Map<Toggleable, any>()
  private _toggleFinishedHandlers: Map<Toggleable, () => void> = new Map()
  private _initializedToggles: Set<Toggleable> = new Set()

  private onToggleSelectedEvent: Event<ToggleSelectedArgs> = new Event<ToggleSelectedArgs>()
  /**
   * An event that is triggered when a toggle is selected within the group.
   *
   * @remarks
   * Use this event to listen for changes in the toggle group selection state.
   * Subscribers will be notified whenever a toggle is selected.
   */
  public readonly onToggleSelected = this.onToggleSelectedEvent.publicApi()

  private _toggleables: Toggleable[] = []
  /**
   * Gets the list of toggleable components managed by this toggle group.
   *
   * @returns An array of `Toggleable` objects representing the toggleable components.
   */
  public get toggleables(): Toggleable[] {
    return this._toggleables
  }

  /**
   * Gets a value indicating whether all toggles in the group are allowed to be turned off.
   *
   * When this property is `true`, it means that none of the toggles in the group
   * are required to remain active, allowing all toggles to be in an "off" state.
   *
   * @returns A boolean value indicating if all toggles can be turned off.
   */
  public get allowAllTogglesOff(): boolean {
    return this._allowAllTogglesOff
  }

  /**
   * Sets whether all toggles in the group can be turned off simultaneously.
   *
   * @param value - A boolean indicating if all toggles can be turned off.
   *                If `true`, all toggles can be deselected at the same time.
   */
  public set allowAllTogglesOff(value: boolean) {
    if (value === undefined) {
      return
    }
    if (isEqual<boolean>(this._allowAllTogglesOff, value)) {
      return
    }
    this._allowAllTogglesOff = value
    if (this.initialized) {
      this.configureToggles()
      this.reset()
    }
  }

  public get firstOnToggle(): number {
    return this._firstOnToggle
  }

  public set firstOnToggle(value: number) {
    this._firstOnToggle = value
  }

  /**
   * Registers a toggleable component with the toggle group, with an optional value.
   *
   * @param toggleable - The toggleable component to be registered.
   * @param value - An optional value associated with the toggleable.
   */
  public registerToggleable(toggleable: Toggleable, value: any = null) {
    this.toggleables.push(toggleable)
    this._toggleableToValue.set(toggleable, value)
    this.initializeToggle(toggleable)
    // if basetogglegroup has run setup already, rerun init for each registered toggleable
    if (this.initialized) this.configureToggles()
    this.reset()
  }

  /**
   * Deregisters a toggleable component from the toggle group.
   *
   * This method removes the specified toggleable component from the list of
   * registered toggleables and also removes its associated event handler.
   *
   * @param toggleable - The toggleable component to be deregistered.
   */
  public deregisterToggleable(toggleable: Toggleable) {
    this.toggleables.splice(this.toggleables.indexOf(toggleable), 1)
    if (this._toggleableToValue.has(toggleable)) {
      this._toggleableToValue.delete(toggleable)
    }
    this.removeToggleableEventHandler(toggleable)
    this._initializedToggles.delete(toggleable)
  }

  public onAwake() {
    this.createEvent("OnStartEvent").bind(() => {
      this.onStart()
    })
    this.createEvent("OnDestroyEvent").bind(() => {
      this.onDestroyed()
    })
  }

  private onStart() {
    if (this.addCallbacks) {
      this.onToggleSelected.add(createCallbacks(this.onToggleSelectedCallbacks))
    }
    this.setUpToggleables() // Set up the toggleables when the component starts
    this.configureToggles()
    this.reset()
    this.initialized = true
  }

  private onDestroyed() {
    while (this.toggleables.length > 0) {
      const toggleable = this.toggleables[0]
      this.deregisterToggleable(toggleable)
    }
  }

  private setUpToggleables() {
    for (let i = 0; i < this.toggleables.length; i++) {
      const toggleable = this.toggleables[i]
      this.initializeToggle(toggleable)
    }
  }

  /**
   * Initializes the ToggleGroup component, by determining the first item that is toggled on.
   */
  private configureToggles() {
    for (let i = 0; i < this.toggleables.length; i++) {
      if (this._firstOnToggle === -1 && this.toggleables[i].isOn) {
        this._firstOnToggle = i
        break
      }
    }

    if (!this._allowAllTogglesOff && this._firstOnToggle === -1 && this.toggleables.length > 0) {
      this._firstOnToggle = 0
    }
  }

  /**
   * Resets all toggleable components within the group based on firstOnToggle
   */
  private reset() {
    this.toggleables.forEach((toggleable) => {
      this.resetToggle(toggleable)
    })
  }

  /**
   * A public API to reset the togglegroup
   */
  public resetToggleGroup() {
    this.reset()
  }

  private onToggleFinishedEventHandler = (toggleable: Toggleable, explicit: boolean) => {
    if (explicit) {
      if (toggleable.isOn) {
        this.toggleables.forEach((t) => {
          if (t !== toggleable) {
            t.isOn = false
          }
        })
      } else if (!this._allowAllTogglesOff) {
        toggleable.isOn = true
      }
    }
    if (explicit && toggleable.isOn) {
      const toggleSelectArgs = {toggleable, value: this._toggleableToValue.get(toggleable)}
      this.onToggleSelectedEvent.invoke(toggleSelectArgs)
    }
  }

  private setUpToggleableEventHandler(toggleable: Toggleable) {
    const handler = this.onToggleFinishedEventHandler.bind(this, toggleable)
    this._toggleFinishedHandlers.set(toggleable, handler)
    toggleable.onFinished.add(handler)
  }

  private removeToggleableEventHandler(toggleable: Toggleable) {
    const handler = this._toggleFinishedHandlers.get(toggleable)
    if (handler) {
      toggleable.onFinished.remove(handler)
      this._toggleFinishedHandlers.delete(toggleable)
    }
  }

  private initializeToggle(toggleable: Toggleable) {
    if (this._initializedToggles.has(toggleable)) return
    toggleable.initialize()
    toggleable.setIsToggleable?.(true)
    this.setUpToggleableEventHandler(toggleable)
    this._initializedToggles.add(toggleable)
  }

  private resetToggle(toggleable: Toggleable) {
    if (this._firstOnToggle !== -1) {
      if (toggleable.isOn && this.toggleables[this._firstOnToggle] !== toggleable) {
        toggleable.isOn = false
      } else if (!toggleable.isOn && this.toggleables[this._firstOnToggle] === toggleable) {
        toggleable.isOn = true
      }
    }
  }
}
