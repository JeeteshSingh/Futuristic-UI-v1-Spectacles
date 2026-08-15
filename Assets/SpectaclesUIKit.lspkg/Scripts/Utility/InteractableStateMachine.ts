import {Interactable} from "SpectaclesInteractionKit.lspkg/Components/Interaction/Interactable/Interactable"
import {InteractorEvent} from "SpectaclesInteractionKit.lspkg/Core/Interactor/InteractorEvent"
import Event from "SpectaclesInteractionKit.lspkg/Utils/Event"
import NativeLogger from "SpectaclesInteractionKit.lspkg/Utils/NativeLogger"

const log = new NativeLogger("InteractableStateMachine")

enum State {
  "default" = "default",
  "hovered" = "hovered",
  "triggered" = "triggered",
  "toggledDefault" = "toggledDefault",
  "toggledHovered" = "toggledHovered",
  "toggledTriggered" = "toggledTriggered"
}

enum Action {
  "hover" = "hover",
  "unHover" = "unHover",
  "triggerStart" = "triggerStart",
  "triggerEnd" = "triggerEnd",
  "triggerEndOutside" = "triggerEndOutside",
  "triggerCancel" = "triggerCancel",
  "toggleOn" = "toggleOn",
  "toggleOff" = "toggleOff"
}

export type StateEvent = {
  state: State
  event?: InteractorEvent
}

@component
export class InteractableStateMachine extends BaseScriptComponent {
  public interactable: Interactable = this.sceneObject.getComponent(Interactable.getTypeName())

  private initialized: boolean = false

  private _state: State = State.default

  public isToggle: boolean = false
  public isDraggable: boolean = false
  public untoggleOnClick: boolean = true

  public events: {[key in State]: Event<StateEvent>} = {
    default: new Event<StateEvent>(),
    hovered: new Event<StateEvent>(),
    triggered: new Event<StateEvent>(),
    toggledDefault: new Event<StateEvent>(),
    toggledHovered: new Event<StateEvent>(),
    toggledTriggered: new Event<StateEvent>()
  }

  public readonly onDefault = this.events.default.publicApi()
  public readonly onHovered = this.events.hovered.publicApi()
  public readonly onTriggered = this.events.triggered.publicApi()
  public readonly onToggledDefault = this.events.toggledDefault.publicApi()
  public readonly onToggledHovered = this.events.toggledHovered.publicApi()
  public readonly onToggledTriggered = this.events.toggledTriggered.publicApi()

  private triggered: boolean = false
  private isDragging: boolean = false

  public onAwake() {
    if (!this.interactable) {
      log.e(`Interactable not found on this object: ${this.sceneObject.name}`)
    }

    this.createEvent("OnStartEvent").bind(this.onStart)
    this.createEvent("OnDisableEvent").bind(this.onDisable)
  }

  private onStart = () => {
    if (!this.initialized) {
      this.initialize()
    }
  }

  private onDisable = () => {
    if (this.state === State.hovered) {
      this.state = State.default
    } else if (this.state === State.toggledHovered) {
      this.state = State.toggledDefault
    }
  }

  public initialize = () => {
    this.interactable.onHoverEnter.add((e: InteractorEvent) => {
      if (this.interactable.enabled) {
        if (this.triggered) this.transition(Action.triggerStart)
        else this.transition(Action.hover, e)
      }
    })

    this.interactable.onHoverExit.add((e: InteractorEvent) => {
      if (this.interactable.enabled) {
        if (this.triggered) {
          // Only unhover the Interactable if the Interactable is not meant to keep hover on trigger.
          if (!this.interactable.keepHoverOnTrigger) {
            this.transition(Action.unHover, e)
          }
        } else {
          this.transition(Action.unHover, e)
        }
      }
    })

    this.interactable.onTriggerStart.add((e: InteractorEvent) => {
      if (this.interactable.enabled && e.propagationPhase === "Target") {
        this.transition(Action.triggerStart, e)
        this.triggered = true
      }
    })

    this.interactable.onDragStart.add(() => {
      if (this.interactable.enabled) {
        if (this.isDraggable) this.isDragging = true
      }
    })

    this.interactable.onTriggerEnd.add((e: InteractorEvent) => {
      if (this.interactable.enabled) {
        this.transition(Action.triggerEnd, e)
      }
      this.triggered = false
      this.isDragging = false
    })

    this.interactable.onTriggerEndOutside.add((e: InteractorEvent) => {
      if (this.interactable.enabled) {
        this.transition(Action.triggerEndOutside, e)
      }
      this.triggered = false
      this.isDragging = false
    })

    this.interactable.onTriggerCanceled.add((e: InteractorEvent) => {
      if (this.interactable.enabled) {
        this.transition(Action.triggerCancel, e)
      }
      this.triggered = false
      this.isDragging = false
    })

    this.initialized = true
  }

  public get state() {
    return this._state
  }

  public set state(newState: State) {
    if (newState === undefined || newState === this._state) {
      return
    }
    const lastState = this._state
    this._state = newState
    this.events[this._state].invoke({state: lastState})
  }

  public transition = (action: Action, e: InteractorEvent = null) => {
    const lastState = this._state
    this._state = this.getTransition(action)
    log.d(`----------------------`)
    log.d(`lastState = ${lastState}`)
    log.d(`action = ${action}`)
    log.d(`state = ${this.state}`)
    this.events[this.state].invoke({state: lastState, event: e})
  }

  public set toggle(on: boolean) {
    if (on === undefined) {
      return
    }
    if (on) {
      this.transition(Action.toggleOn)
    } else {
      this.transition(Action.toggleOff)
    }
  }

  public get toggle() {
    return (
      this.state === State.toggledTriggered ||
      this.state === State.toggledDefault ||
      this.state === State.toggledHovered
    )
  }

  private triggeredTriggerEnd(): State {
    if (this.isToggle) {
      if (this.isDragging) {
        if (!this.toggle) return State.hovered
        else return State.toggledTriggered
      }
      return State.toggledHovered
    }
    return State.hovered
  }

  private toggledTriggeredTriggerEnd(): State {
    if (this.untoggleOnClick) {
      if (this.isDragging) {
        if (!this.toggle) return State.hovered
        else return State.toggledTriggered
      }
      return State.hovered
    }
    return State.toggledTriggered
  }

  private transitions: {[key in State]: {[innerKey in Action]: State | (() => State)}} = {
    default: {
      hover: State.hovered,
      unHover: State.default,
      triggerStart: State.triggered,
      triggerEnd: State.default,
      triggerEndOutside: State.default,
      triggerCancel: State.default,
      toggleOn: State.toggledDefault,
      toggleOff: State.default
    },
    hovered: {
      hover: State.hovered,
      unHover: State.default,
      triggerStart: State.triggered,
      triggerEnd: State.hovered,
      triggerEndOutside: State.default,
      triggerCancel: State.hovered,
      toggleOn: State.toggledHovered,
      toggleOff: State.hovered
    },
    triggered: {
      hover: State.triggered,
      unHover: State.default,
      triggerStart: State.triggered,
      triggerEnd: this.triggeredTriggerEnd.bind(this),
      triggerEndOutside: State.default,
      triggerCancel: State.default,
      toggleOn: State.toggledTriggered,
      toggleOff: State.triggered
    },
    toggledDefault: {
      hover: State.toggledHovered,
      unHover: State.toggledDefault,
      triggerStart: State.toggledTriggered,
      triggerEnd: State.toggledHovered,
      triggerEndOutside: State.toggledDefault,
      triggerCancel: State.toggledDefault,
      toggleOn: State.toggledDefault,
      toggleOff: State.default
    },
    toggledHovered: {
      hover: State.toggledHovered,
      unHover: State.toggledDefault,
      triggerStart: State.toggledTriggered,
      triggerEnd: State.toggledHovered,
      triggerEndOutside: State.toggledDefault,
      triggerCancel: State.toggledDefault,
      toggleOn: State.toggledHovered,
      toggleOff: State.hovered
    },
    toggledTriggered: {
      hover: State.toggledHovered,
      unHover: State.toggledDefault,
      triggerStart: State.toggledTriggered,
      triggerEnd: this.toggledTriggeredTriggerEnd.bind(this),
      triggerEndOutside: State.toggledDefault,
      triggerCancel: State.toggledDefault,
      toggleOn: State.toggledTriggered,
      toggleOff: State.triggered
    }
  }

  private getTransition = (action: Action): State => {
    const thisTransition = this.transitions[this.state][action]
    if (typeof thisTransition === "function") {
      return thisTransition()
    } else {
      return thisTransition
    }
  }
}
