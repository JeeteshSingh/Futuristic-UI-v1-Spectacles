import {
  CursorMode,
  InteractorCursor
} from "SpectaclesInteractionKit.lspkg/Components/Interaction/InteractorCursor/InteractorCursor"
import {Frame, InputState} from "../Frame"
import {FrameState} from "./FrameInputHandler"

export type CursorManagerOptions = {
  interactorCursor?: InteractorCursor
  frame: Frame
}

export default class CursorHandler {
  /**
   *
   * Manages custom cursor states
   * used for indicating contextual functionality
   * swaps textures
   * animates effects
   *
   */

  /**
   * mode is used to select the current active texture
   * updated in Frame update loop to match the FrameInputController state
   */
  public mode: CursorMode = CursorMode.Auto
  private lastMode: CursorMode = this.mode
  private frame: Frame = this.options.frame
  private interactorCursor: InteractorCursor | null = null

  public constructor(private options: CursorManagerOptions) {
    this.interactorCursor = options.interactorCursor ?? null
  }

  /**
   * sets current position of cursor
   * ignored if cursor is in lockMode
   */
  public set position(pos: vec3) {
    if (pos === undefined) {
      return
    }

    this.interactorCursor.cursorPosition = pos
  }

  /**
   * update
   * @param inputState
   * @param frameState
   *
   * method called in main loop
   * watches for changed CursorModes to swap textures
   * updates position and triggers animations
   */

  public update = (_inputState: InputState, _frameState: FrameState) => {
    if (!this.interactorCursor) {
      return
    }

    // handle switching cursors
    if (this.mode !== this.lastMode) {
      this.interactorCursor.cursorMode = this.mode
      this.lastMode = this.mode
    }
  }

  /**
   * Sets the InteractorCursor for the handler to control.
   * @param cursor
   */
  public setCursor(cursor: InteractorCursor): void {
    if (cursor === undefined) {
      return
    }
    if (this.interactorCursor !== cursor && this.interactorCursor) {
      this.resetCursor()
    }
    this.interactorCursor = cursor
  }

  /**
   * Reset the position override & mode of the interactor cursor.
   */
  public resetCursor() {
    if (this.interactorCursor) {
      this.interactorCursor.cursorMode = CursorMode.Auto
    }
    this.lastMode = CursorMode.Auto
    this.mode = CursorMode.Auto
  }
}
