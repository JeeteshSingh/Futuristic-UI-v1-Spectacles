import {withAlpha} from "SpectaclesInteractionKit.lspkg/Utils/color"
import {RoundButton} from "../../Button/RoundButton"
import {Frame, FrameAppearance, InputState} from "../Frame"
import {FrameButton} from "./FrameButton"

type ButtonConfig = {
  button: RoundButton
  imageTexture: Texture
  type: "close" | "follow"
  isToggle?: boolean
  callback?: () => void
}

type ButtonHandlerConfig = {
  frame: Frame
  state: InputState
}

const closeIcon: Texture = requireAsset("../../../../Textures/close-icon-1.png") as Texture
const followIcon: Texture = requireAsset("../../../../Textures/follow-white.png") as Texture
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const unfollowIcon: Texture = requireAsset("../../../../Textures/follow-black.png") as Texture
const imageButtonPrefab: ObjectPrefab = requireAsset("../../../../Prefabs/FrameButton.prefab") as ObjectPrefab

type ButtonSettings = {
  buttonSize: number
  offset: number
  iconScale: vec3
}

const ButtonManagerConstants: Record<FrameAppearance, ButtonSettings> = {
  Large: {
    buttonSize: 3.25,
    offset: 0.75,
    iconScale: new vec3(1.75, 1.75, 1)
  },
  Small: {
    buttonSize: 2.25,
    offset: 0.375,
    iconScale: new vec3(1.15, 1.15, 1)
  }
}

/**
 * TODO Add methods for setting the button icons dynamically
 * TODO ADD methods for swapping the buttons out
 */

/**
 * ButtonHandler is a utility class that manages the close and follow buttons
 */
export default class ButtonHandler {
  public readonly closeButton: RoundButton
  private closeIcon: Image
  private _closeButtonOffset: vec3 = vec3.zero()
  public set closeButtonOffset(value: vec3) {
    if (value === undefined) {
      return
    }
    this._closeButtonOffset = value
    this.resize()
  }
  public get closeButtonOffset(): vec3 {
    return this._closeButtonOffset
  }

  public readonly followButton: RoundButton
  private followIcon: Image
  private _followButtonOffset: vec3 = vec3.zero()
  public set followButtonOffset(value: vec3) {
    if (value === undefined) {
      return
    }
    this._followButtonOffset = value
    this.resize()
  }
  public get followButtonOffset(): vec3 {
    return this._followButtonOffset
  }

  private frame: Frame = this.options.frame
  private inputState: InputState = this.options.state

  public constructor(private options: ButtonHandlerConfig) {}

  /**
   *
   * @param enable - Whether to enable or disable the close button.
   */
  public enableCloseButton(enable: boolean) {
    if (enable && !this.closeButton) {
      this.createButton({
        button: this.closeButton,
        type: "close",
        imageTexture: closeIcon
      })
    }
    if (this.closeButton) this.closeButton.sceneObject.enabled = enable
  }

  /**
   *
   * @param enable - Whether to enable or disable the follow button.
   */
  public enableFollowButton(enable: boolean) {
    if (enable && !this.followButton) {
      this.createButton({
        button: this.followButton,
        type: "follow",
        imageTexture: followIcon,
        isToggle: true
      })
    }
    if (this.followButton) this.followButton.sceneObject.enabled = enable
  }

  private createButton(config: ButtonConfig) {
    const buttonObject = imageButtonPrefab.instantiate(this.frame.frameObject)
    buttonObject.layer = this.frame.frameObject.layer
    this[config.type + "Button"] = buttonObject.getComponent(RoundButton.getTypeName())
    const thisButton: RoundButton = this[config.type + "Button"]
    thisButton.onTriggerUp.add(() => {
      this.inputState.pinching = false
    })
    if (config.isToggle) thisButton.setIsToggleable?.(true)
    thisButton.initialize()
    thisButton.width = ButtonManagerConstants[this.frame.appearance].buttonSize
    const frameButton: FrameButton = buttonObject.getComponent(FrameButton.getTypeName())
    frameButton.initialize(config.imageTexture)
    frameButton.image.getTransform().setLocalScale(ButtonManagerConstants[this.frame.appearance].iconScale)
    this[config.type + "Icon"] = frameButton.image
    this.resize()
  }

  /**
   * Resizes the buttons based on the frame size and offsets.
   */
  public resize() {
    if (this.closeButton) {
      const width = ButtonManagerConstants[this.frame.appearance].buttonSize
      const offset = ButtonManagerConstants[this.frame.appearance].offset
      this.closeButton.width = width
      this.closeButton.transform.setLocalPosition(
        new vec3(
          this.frame.totalSize.x * -0.5 + width * 0.5 + offset,
          this.frame.totalSize.y * 0.5 - width * 0.5 - offset,
          0.1
        ).add(this._closeButtonOffset)
      )
    }

    if (this.followButton) {
      const width = ButtonManagerConstants[this.frame.appearance].buttonSize
      const offset = ButtonManagerConstants[this.frame.appearance].offset
      this.followButton.width = width
      this.followButton.transform.setLocalPosition(
        new vec3(
          this.frame.totalSize.x * 0.5 - width * 0.5 - offset,
          this.frame.totalSize.y * 0.5 - width * 0.5 - offset,
          0.1
        ).add(this._followButtonOffset)
      )
    }
  }

  public set opacity(alpha: number) {
    if (alpha === undefined) {
      return
    }
    if (this.closeButton) {
      this.closeButton.sceneObject.enabled = alpha > 0
      this.closeButton.visual.renderMeshVisual.mainPass.opacityFactor = alpha
      this.closeIcon.mainPass.baseColor = withAlpha(this.closeIcon.mainPass.baseColor, alpha)
      this.closeIcon.enabled = alpha > 0
    }
    if (this.followButton) {
      this.followButton.sceneObject.enabled = alpha > 0
      this.followButton.visual.renderMeshVisual.mainPass.opacityFactor = alpha
      this.followIcon.mainPass.baseColor = withAlpha(this.followIcon.mainPass.baseColor, alpha)
      this.followIcon.enabled = alpha > 0
    }
  }

  public set renderOrder(renderOrder: number) {
    if (renderOrder === undefined) {
      return
    }
    if (this.closeButton) {
      this.closeButton.renderOrder = renderOrder
      this.closeIcon.renderOrder = renderOrder + 1
    }
    if (this.followButton) {
      this.followButton.renderOrder = renderOrder
      this.followIcon.renderOrder = renderOrder + 1
    }
  }
}
