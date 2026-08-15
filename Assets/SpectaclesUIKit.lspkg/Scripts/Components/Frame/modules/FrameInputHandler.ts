import {InteractableManipulation} from "SpectaclesInteractionKit.lspkg/Components/Interaction/InteractableManipulation/InteractableManipulation"
import {CursorMode} from "SpectaclesInteractionKit.lspkg/Components/Interaction/InteractorCursor/InteractorCursor"
import Event from "SpectaclesInteractionKit.lspkg/Utils/Event"
import {Frame, InputState} from "../Frame"
import CursorHandler from "./CursorHandler"

export type FrameInputOptions = {
  frame: Frame
  manipulate: InteractableManipulation
  content: SceneObject
  transform: Transform
  cursorHandler: CursorHandler
  isInteractable: boolean
  allowScaling: boolean
  onScalingStartEvent: Event
  onScalingEndEvent: Event
  allowScalingTopLeft?: boolean
  allowScalingTopRight?: boolean
}

/**
 *
 * Which state is the input handler in currently
 *
 */
export type FrameState = {
  scaling: boolean
  translating: boolean
  rotating: boolean
  ignoring: boolean
  interacting: boolean
  hoveringInteractable: boolean
}

/**
 *
 * Container Frame Input Modes
 * Auto ( no explicit mode )
 * Scaling ( with corners defined )
 * Rotating
 * Translating
 *
 */
export enum Modes {
  Auto = "auto",
  ScaleTopLeft = "scaleTopLeft",
  ScaleBottomRight = "scaleBottomRight",
  ScaleTopRight = "scaleTopRight",
  ScaleBottomLeft = "scaleBottomLeft",
  Translating = "translating"
}

export default class FrameInputHandler {
  /**
   *
   * This class takes the inputs from the raycaster
   * and uses it to control the frame manipulations
   * as well as provide that information to visual affordance
   *
   */
  public allowScaling: boolean = this.options.allowScaling
  public allowScalingTopLeft: boolean = this.options.allowScalingTopLeft ?? true
  public allowScalingTopRight: boolean = this.options.allowScalingTopRight ?? true
  private corner: vec2 = vec2.one()
  private frame: Frame = this.options.frame

  private manipulate: InteractableManipulation = this.options.manipulate

  public lastHovered: boolean = false

  private cursorHandler = this.options.cursorHandler
  private mode: Modes = Modes.Auto
  public readonly state: FrameState = {
    rotating: false,
    scaling: false,
    translating: false,
    ignoring: false,
    hoveringInteractable: false,
    interacting: false
  }

  private onTranslationStartEvent = new Event()
  /**
   * Callback for when translation begins
   *
   * NOTE: The reason we need to add this event in FrameInputHandler, instead of relying on the container frame's
   * internal InteractableManipulation component is because the way this class keeps track of state means that
   * we don't set the InteractableManipulation's canTranslate property until after the user has started translating,
   * which has the effect of causing InteractableManipulation to NOT invoke the onTranslationStart event.
   */
  public readonly onTranslationStart = this.onTranslationStartEvent.publicApi()

  private onTranslationEndEvent = new Event()
  /**
   * Callback for when translation ends
   */
  public readonly onTranslationEnd = this.onTranslationEndEvent.publicApi()

  private _scalingLastFrame: boolean = false

  /**
   * Returns true if the frame was scaling last frame
   */
  public get scalingLastFrame(): boolean {
    return this._scalingLastFrame
  }

  public constructor(private options: FrameInputOptions) {}

  /*
   * Helper for programmatic components
   */
  public get isInteractable(): boolean {
    return this.options.isInteractable
  }

  public set isInteractable(isInteractable: boolean) {
    if (isInteractable === undefined) {
      return
    }
    this.options.isInteractable = isInteractable
  }

  public isInZone: boolean = false
  public isInZoneLast: boolean = false

  private getMode(inputState: InputState) {
    const position = inputState.position

    const xEdge: number = (this.frame.innerSize.x + this.frame.padding.x) * 0.5
    const yEdge: number = (this.frame.innerSize.y + this.frame.padding.y) * 0.5

    this.isInZone = this.frame.grabZones.length ? false : true
    if (this.frame.grabZones.length && this.frame.grabZoneOnly) {
      for (let i = 0; i < this.frame.grabZones.length; i++) {
        const thisZone = this.frame.grabZones[i]
        if (
          position.x >= thisZone.x &&
          position.y >= thisZone.y &&
          position.x <= thisZone.z &&
          position.y <= thisZone.w
        ) {
          this.isInZone = true
        }
      }
    } else {
      this.isInZone = true
    }

    if (inputState.innerInteractableActive || !inputState.hierarchyHovered || !this.isInZone) {
      this.mode = Modes.Auto
    } else if (position.x < -xEdge && position.y < -yEdge && this.allowScaling) {
      this.mode = Modes.ScaleBottomLeft
    } else if (position.x < -xEdge && position.y > yEdge && this.allowScaling) {
      if (this.allowScalingTopLeft) {
        this.mode = Modes.ScaleTopLeft
      } else {
        this.state.ignoring = true
        this.mode = Modes.Auto
      }
    } else if (position.x > xEdge && position.y < -yEdge && this.allowScaling) {
      this.mode = Modes.ScaleBottomRight
    } else if (position.x > xEdge && position.y > yEdge && this.allowScaling) {
      if (this.allowScalingTopRight) {
        this.mode = Modes.ScaleTopRight
      } else {
        this.state.ignoring = true
        this.mode = Modes.Auto
      }
    } else if (position.x > xEdge) {
      // right edge
      this.mode = Modes.Translating
    } else if (position.x < -xEdge) {
      // left edge
      this.mode = Modes.Translating
    } else if (position.y < -yEdge) {
      // bottom edge
      this.mode = Modes.Translating
    } else if (position.y > yEdge) {
      // top edge
      this.mode = Modes.Translating
    } else {
      // not in corner or on edge
      if (this.isInteractable === false) {
        this.mode = Modes.Translating
      } else if (!this.state.ignoring && !this.state.scaling && !this.state.translating) {
        // hovering interactable
        this.mode = Modes.Auto
      }
    }
  }

  private handleState(inputState: InputState) {
    this._scalingLastFrame = this.state.scaling
    const position = inputState.position
    if (inputState.pinching) {
      if (
        this.isInZone &&
        !this.state.ignoring &&
        !this.state.scaling &&
        !this.state.translating &&
        !this.state.rotating &&
        !this.state.interacting
      ) {
        // if pinching and not already in am ode
        switch (this.mode) {
          case Modes.ScaleBottomLeft:
            this.corner.x = -1
            this.corner.y = -1
            this.startScaling(position)
            break
          case Modes.ScaleTopLeft:
            this.corner.x = -1
            this.corner.y = 1
            this.startScaling(position)
            break
          case Modes.ScaleBottomRight:
            this.corner.x = 1
            this.corner.y = -1
            this.startScaling(position)
            break
          case Modes.ScaleTopRight:
            this.corner.x = 1
            this.corner.y = 1
            this.startScaling(position)
            break
          case Modes.Translating:
            this.setStateTranslating(true)
            break
          default:
            // touching but not in corner or on edge
            if (this.isInteractable === false) {
              // content is not interactable, activating translation
              this.setStateTranslating(true)
            } else {
              // content is interactable
              this.state.interacting = true
            }
            break
        }
      }
    } else {
      if (this.state.scaling) {
        // end scaling
        this.options.onScalingEndEvent.invoke()
      }

      this.setStateTranslating(false)
      this.state.scaling = false
      this.state.rotating = false
      this.state.ignoring = false
      this.state.interacting = false
    }

    if (this.frame.forceTranslate) {
      this.mode = Modes.Translating
      this.setStateTranslating(true)
    }
  }

  public update = (inputState: InputState) => {
    this.state.hoveringInteractable = false

    this.isInZoneLast = this.isInZone

    if (!inputState.pinching) this.getMode(inputState)

    this.handleState(inputState)

    if ((this.frame.allowTranslation && this.state.translating) || this.frame.forceTranslate) {
      this.manipulate.setCanTranslate(true)
    } else if (this.manipulate.canTranslate()) {
      this.manipulate.setCanTranslate(false)
    }

    //
    // handle cursor swaps
    if (!this.state.scaling || !this.state.translating) {
      if (!this.state.interacting) {
        if (this.mode === Modes.ScaleBottomLeft || this.mode === Modes.ScaleTopRight) {
          this.cursorHandler.mode = CursorMode.ScaleTopRight
        } else if (this.mode === Modes.ScaleBottomRight || this.mode === Modes.ScaleTopLeft) {
          this.cursorHandler.mode = CursorMode.ScaleTopLeft
        } else if (this.mode === Modes.Translating && (this.frame.allowTranslation || this.frame.forceTranslate)) {
          this.cursorHandler.mode = CursorMode.Translate
        } else {
          this.cursorHandler.mode = CursorMode.Auto
        }
      }

      if (this.lastHovered === false && inputState.hovered) {
        inputState.hovered = false
      }

      if (this.lastHovered === true && !inputState.hovered) {
        inputState.hovered = true
      }

      this.lastHovered = false
    }
  }

  /*eslint-disable @typescript-eslint/no-unused-vars */
  private startScaling = (touchPosition: vec3) => {
    this.state.scaling = true
    this.frame.scalingSizeStart = this.frame.innerSize.uniformScale(1)
    this.options.onScalingStartEvent.invoke()
  }

  private setStateTranslating(isTranslating: boolean) {
    if (isTranslating === this.state.translating) {
      return
    }

    this.state.translating = isTranslating

    if (this.state.translating) {
      this.onTranslationStartEvent.invoke()
    } else {
      this.onTranslationEndEvent.invoke()
    }
  }
}
