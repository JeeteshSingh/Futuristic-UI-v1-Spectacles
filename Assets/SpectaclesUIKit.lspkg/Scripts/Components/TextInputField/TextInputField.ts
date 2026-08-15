require("LensStudio:TextInputModule") // eslint-disable-line @typescript-eslint/no-require-imports

import {Interactable} from "SpectaclesInteractionKit.lspkg/Components/Interaction/Interactable/Interactable"
import {TargetingMode} from "SpectaclesInteractionKit.lspkg/Core/Interactor/Interactor"
import {InteractorEvent} from "SpectaclesInteractionKit.lspkg/Core/Interactor/InteractorEvent"
import animate, {CancelSet} from "SpectaclesInteractionKit.lspkg/Utils/animate"
import Event from "SpectaclesInteractionKit.lspkg/Utils/Event"
import {CancelToken, clearTimeout, setTimeout} from "SpectaclesInteractionKit.lspkg/Utils/FunctionTimingUtils"
import NativeLogger from "SpectaclesInteractionKit.lspkg/Utils/NativeLogger"
import {
  BrightWarmYellow,
  DarkerGray,
  DarkerLessGray,
  DarkerYellow,
  DarkYellow,
  MediumDarkGray,
  TriggeredBorderYellow
} from "../../Themes/SnapOS-2.0/Colors"
import {SnapOS2Styles} from "../../Themes/SnapOS-2.0/SnapOS2"
import {Callback, createCallbacks} from "../../Utility/SceneUtilities"
import {GradientParameters} from "../../Visuals/RoundedRectangle/RoundedRectangle"
import {
  RoundedRectangleVisual,
  RoundedRectangleVisualParameters
} from "../../Visuals/RoundedRectangle/RoundedRectangleVisual"
import {IMAGE_MATERIAL_ASSET, StateName} from "../Element"
import {VisualElement} from "../VisualElement"
import {TextInputFieldManager} from "./TextInputFieldManager"

const log = new NativeLogger("TextInputField")

const DEBUG_RENDER = false
const PLACEHOLDER_TEXT_COLOR = new vec4(0.6, 0.6, 0.6, 1)
const DEFAULT_TEXT_COLOR = new vec4(1, 1, 1, 1)
const CORNER_RADIUS = 0.5

// meshes
const UNIT_PLANE: RenderMesh = requireAsset("../../../Meshes/Unit Plane.mesh") as RenderMesh

// textures
const EYE_ICON: Texture = requireAsset("../../../Textures/eye-icon.png") as Texture
const EYE_OFF_ICON: Texture = requireAsset("../../../Textures/eye-off-icon.png") as Texture

const OVERFLOW_WIDTH = 2.1

enum IconState {
  default,
  alternate
}

type TextInputFieldType = {
  textColor: vec4
  icon: IconState
  size?: () => vec3
}

/**
 * helper for internal keyboard dev
 */
const DEFAULT_BEHAVIOR = true

export type TextInputType = "default" | "numeric" | "password" | "format" | "pin"
export type IconSide = "left" | "right"

export const BORDER_GRADIENT_PARAMETERS: {[key: string]: GradientParameters} = {
  default: {
    enabled: true,
    type: "Linear",
    start: new vec2(-1.125, 0.7),
    end: new vec2(1.35, -0.7),
    stop0: {enabled: true, percent: 0, color: MediumDarkGray},
    stop1: {enabled: true, percent: 0.5, color: DarkerLessGray},
    stop2: {enabled: true, percent: 1, color: MediumDarkGray}
  },
  toggled: {
    enabled: true,
    start: new vec2(-1.125, 0.7),
    end: new vec2(1.35, -0.7),
    type: "Linear",
    stop0: {enabled: true, percent: 0, color: TriggeredBorderYellow},
    stop1: {enabled: true, percent: 0.5, color: DarkYellow},
    stop2: {enabled: true, percent: 1, color: TriggeredBorderYellow}
  },
  toggledHovered: {
    enabled: true,
    start: new vec2(-1.125, 0.7),
    end: new vec2(1.35, -0.7),
    type: "Linear",
    stop0: {enabled: true, percent: 0, color: BrightWarmYellow},
    stop1: {enabled: true, percent: 0.5, color: DarkerYellow},
    stop2: {enabled: true, percent: 1, color: BrightWarmYellow}
  }
}

const BACKGROUND_GRADIENT_PARAMETERS: {[key: string]: GradientParameters} = {
  toggled: {
    enabled: true,
    type: "Linear",
    stop0: {enabled: true, percent: 0, color: DarkerGray},
    stop1: {enabled: true, percent: 0.5, color: DarkerGray}
  },
  default: {
    enabled: true,
    type: "Linear",
    stop0: {enabled: true, percent: 0, color: DarkerGray},
    stop1: {enabled: true, percent: 0.5, color: DarkerGray}
  }
}

/**
 * TextInputField
 * Component to add a TextField to a Spectacles Lens
 * Uses text input system under the hood
 * Automatically writes text into a mesh that is adjustable by scale and size
 */
@component
export class TextInputField extends VisualElement {
  @input("string", "default")
  @widget(
    new ComboBoxWidget([
      new ComboBoxItem("Default", "default"),
      new ComboBoxItem("Numeric", "numeric"),
      new ComboBoxItem("Password", "password"),
      new ComboBoxItem("Pin", "pin")
    ])
  )
  public inputType: TextInputType = "default"

  @input
  @showIf("inputType", "format")
  @widget(
    new ComboBoxWidget([
      new ComboBoxItem("Date", "date"),
      new ComboBoxItem("Email", "email"),
      new ComboBoxItem("URL", "url")
    ])
  )
  public formatType: string = "date"

  @input
  @hint("Text that is displayed before any text is entered")
  public placeholderText: string = ""

  @input
  @hint("Font Family")
  @allowUndefined
  public fontFamily: Font

  @input
  @hint("Use an icon?")
  public useIcon: boolean = false
  @input
  @showIf("useIcon", true)
  @allowUndefined
  @hint("Icon Texture")
  public icon: Texture

  @input
  @showIf("useIcon")
  @hint("Switch to a different icon on focus")
  public changeIconOnFocus: boolean = false
  @input
  @showIf("changeIconOnFocus", true)
  @hint("Alternate icon used on focus")
  public alternateIcon: Texture

  @input
  @hint("Throw error if unfocused with no input")
  public contentRequiredOnDeactivate: boolean = false

  @input
  @hint("Enable this to add functions from another script to this component's callbacks")
  protected addCallbacks: boolean = false
  @input
  @showIf("addCallbacks")
  @label("On Text Changed Callbacks")
  private onTextChangedCallbacks: Callback[] = []
  @input
  @showIf("addCallbacks")
  @label("On Keyboard State Changed Callbacks")
  private onKeyboardStateChangedCallbacks: Callback[] = []

  protected _style: SnapOS2Styles = SnapOS2Styles.Custom

  /**
   * do scale animation on hover
   */
  public scaleOnHover: boolean = false

  /**
   * custom font size
   * if not set, it will automatically scale from size.y
   */
  public fontSize: number | null = null

  protected _visual: RoundedRectangleVisual // override the visual to use RoundedRectangleVisual

  private originalSize: vec3

  private textParent: SceneObject
  private textParentScreenTransform: ScreenTransform
  private textParentTransform: Transform
  private textObject: SceneObject
  private textObjectScreenTransform: ScreenTransform
  public textComponent: Text

  private leftIconObject: SceneObject = null
  private leftIconScreenTransform: ScreenTransform = null
  private _leftIconRMV: RenderMeshVisual = null

  private rightIconObject: SceneObject = null
  private rightIconScreenTransform: ScreenTransform = null
  private rightIconRMV: RenderMeshVisual = null
  private rightIconInteractable: Interactable = null
  private rightIconCollider: ColliderComponent = null
  private rightIconColliderShape: BoxShape = null

  private passwordSide: IconSide = "right"
  private iconSide: IconSide = "left"

  private textCache: string = ""
  private renderedTextCache: string = ""
  private isEditing: boolean = false

  private textInputFieldManager: TextInputFieldManager = TextInputFieldManager.getInstance()

  private keyboardOptions = new TextInputSystem.KeyboardOptions()

  private hidePassword: boolean = true

  private keyboardTimeoutCancelToken: CancelToken

  private stateCancelSet = new CancelSet()

  private typingEvent = new Event()

  /**
   * called when the keyboard calls onTextChanged
   * ie: anytime there is typing on the keyboard
   */
  public readonly onTyping = this.typingEvent.publicApi()
  private textChanged = new Event<string>()
  /**
   * called when the underlying text value of this component changes
   * uses the current value of the keyboard as its parameter
   */
  public readonly onTextChanged = this.textChanged.publicApi()
  private returnKeyPressed = new Event<string>()
  /**
   * called when the return key is pressed on the keyboard
   * uses the current value of the keyboard as its parameter
   */
  public readonly onReturnKeyPressed = this.returnKeyPressed.publicApi()
  private keyboardStateChanged = new Event<boolean>()
  /**
   * called when the keyboard state changes
   * uses a boolean isOpen to indicate if the keyboard is open or closed
   */
  public readonly onKeyboardStateChanged = this.keyboardStateChanged.publicApi()
  private editModeEvent = new Event<boolean>()
  /**
   * called when this component enters edit mode
   */
  public readonly onEditMode = this.editModeEvent.publicApi()

  private isPlaceholder: boolean = true

  private _textOffset: vec2 = null

  private _lastScale: vec3 = vec3.one()

  private readonly _textInputFieldStates: Map<StateName, TextInputFieldType> = new Map([
    [
      StateName.default,
      {
        textColor: DEFAULT_TEXT_COLOR,
        icon: IconState.default,
        size: () => this.originalSize
      }
    ],
    [
      StateName.hovered,
      {
        textColor: DEFAULT_TEXT_COLOR,
        icon: IconState.default,
        size: () => {
          return this.calculateHoverScale()
        }
      }
    ],
    [
      StateName.triggered,
      {
        textColor: DEFAULT_TEXT_COLOR,
        icon: IconState.default,
        size: () => {
          return this.calculateHoverScale()
        }
      }
    ],
    [
      StateName.toggledDefault,
      {
        textColor: DEFAULT_TEXT_COLOR,
        icon: IconState.alternate
      }
    ],
    [
      StateName.toggledHovered,
      {
        textColor: DEFAULT_TEXT_COLOR,
        icon: IconState.alternate,
        size: () => {
          return this.calculateHoverScale()
        }
      }
    ],
    [
      StateName.error,
      {
        textColor: DEFAULT_TEXT_COLOR,
        icon: IconState.default
      }
    ],
    [
      StateName.errorHovered,
      {
        textColor: DEFAULT_TEXT_COLOR,
        icon: IconState.default,
        size: () => {
          return this.calculateHoverScale()
        }
      }
    ],
    [
      StateName.inactive,
      {
        textColor: DEFAULT_TEXT_COLOR,
        icon: IconState.default
      }
    ]
  ])

  public get leftIconRMV(): RenderMeshVisual {
    return this._leftIconRMV
  }

  protected get isToggle(): boolean {
    return true
  }

  public onAwake(): void {
    this.textParent = global.scene.createSceneObject("textParent")
    this.managedSceneObjects.add(this.textParent)
    this.textParent.layer = this.sceneObject.layer
    this.textParentScreenTransform = this.textParent.createComponent("ScreenTransform")
    this.textParentTransform = this.textParent.getTransform()
    this.textObject = global.scene.createSceneObject("textObject")
    this.textObject.layer = this.sceneObject.layer
    this.textObjectScreenTransform = this.textObject.createComponent("ScreenTransform")
    this.textComponent = this.textObject.getComponent("Text") || this.textObject.createComponent("Text")
    this.managedComponents.add(this.textComponent)

    this.textInputFieldManager.addField(this)
    super.onAwake()
  }

  /**
   * function to setup text field
   * call manually if creating dynamically and seeing a frame without the parameters you assign
   */
  public initialize() {
    if (this._initialized) {
      return
    }

    this.originalSize = this._size

    if (!this._visual) {
      const parameters: Partial<RoundedRectangleVisualParameters> = {
        default: {
          baseType: "Gradient",
          baseGradient: BACKGROUND_GRADIENT_PARAMETERS.default,
          hasBorder: true,
          borderSize: 0.125,
          borderType: "Gradient",
          shouldPosition: true,
          borderGradient: BORDER_GRADIENT_PARAMETERS.default
        },
        hovered: {
          localPosition: new vec3(0, 0, 1),
          borderGradient: BORDER_GRADIENT_PARAMETERS.toggledHovered
        },
        triggered: {
          localPosition: new vec3(0, 0, 0.5),
          baseGradient: BACKGROUND_GRADIENT_PARAMETERS.toggled,
          borderGradient: BORDER_GRADIENT_PARAMETERS.toggled
        },
        toggledDefault: {
          localPosition: new vec3(0, 0, 0.5),
          baseGradient: BACKGROUND_GRADIENT_PARAMETERS.toggled,
          borderGradient: BORDER_GRADIENT_PARAMETERS.toggledHovered
        },
        toggledHovered: {
          localPosition: new vec3(0, 0, 0.5),
          baseGradient: BACKGROUND_GRADIENT_PARAMETERS.toggled,
          borderGradient: BORDER_GRADIENT_PARAMETERS.toggled
        }
      }
      const defaultVisual: RoundedRectangleVisual = new RoundedRectangleVisual({
        sceneObject: this.sceneObject,
        style: parameters
      })
      defaultVisual.cornerRadius = CORNER_RADIUS
      this._visual = defaultVisual
    }

    super.initialize()
    this.updateScale(this.transform.getWorldScale())

    // setup text
    this.textParent.setParent(this.sceneObject)
    this.textObject.setParent(this.textParent)
    this.textParentScreenTransform.position = new vec3(0, 0, 0.01)

    this.textCache = this.placeholderText
    this.setVisibleText(this.textCache)
    this.textComponent.textFill.color = PLACEHOLDER_TEXT_COLOR
    this.textComponent.depthTest = true
    this.textComponent.horizontalAlignment = HorizontalAlignment.Left
    if (this.fontFamily) this.textComponent.font = this.fontFamily
    this.textObjectScreenTransform.anchors = Rect.create(-1, 1, -1, 1)
    this.textObjectScreenTransform.offsets = Rect.create(0, 0, 0, 0)
    this.textObjectScreenTransform.enableDebugRendering = DEBUG_RENDER
    this.textParentScreenTransform.enableDebugRendering = DEBUG_RENDER

    // icons
    this.setUseIcon(this.useIcon)

    this.setUsePassword(this.inputType === "password")

    let keyboardType = TextInputSystem.KeyboardType.Text
    switch (this.inputType) {
      case "numeric":
        keyboardType = TextInputSystem.KeyboardType.Num
        break
      case "password":
        keyboardType = TextInputSystem.KeyboardType.Password
        break
      case "pin":
        keyboardType = TextInputSystem.KeyboardType.Pin
        break
    }

    // prepare keyboard
    this.keyboardOptions.enablePreview = true
    this.keyboardOptions.keyboardType = keyboardType
    this.keyboardOptions.returnKeyType = TextInputSystem.ReturnKeyType.Done
    this.keyboardOptions.onTextChanged = (text) => {
      this.isEditing = true
      this.text = text
      this.typingEvent.invoke()
    }

    this.keyboardOptions.onKeyboardStateChanged = (isOpen: boolean) => {
      this.keyboardStateChanged.invoke(isOpen)
      if (DEFAULT_BEHAVIOR) {
        if (!isOpen) {
          this._hasError = false
          this.editMode(false)
        }
      }
    }

    this.keyboardOptions.onReturnKeyPressed = () => {
      this.returnKeyPressed.invoke(this.text)
    }

    this._interactableStateMachine.untoggleOnClick = false

    this._updateRenderOrder(this._renderOrder)

    this.setSize(this.getSize())
  }

  protected createDefaultVisual(): void {
    if (!this._visual) {
      const defaultVisual: RoundedRectangleVisual = new RoundedRectangleVisual(this)
      defaultVisual.cornerRadius = CORNER_RADIUS
      defaultVisual.baseType = "Gradient"
      defaultVisual.setBaseGradientPositions(new vec2(0, 0), new vec2(0.5, 0))
      defaultVisual.defaultGradient = BACKGROUND_GRADIENT_PARAMETERS.default
      defaultVisual.hoveredGradient = BACKGROUND_GRADIENT_PARAMETERS.default
      defaultVisual.triggeredGradient = BACKGROUND_GRADIENT_PARAMETERS.toggled
      defaultVisual.inactiveGradient = BACKGROUND_GRADIENT_PARAMETERS.default
      defaultVisual.defaultHasBorder = true
      defaultVisual.defaultBorderSize = 0.2
      defaultVisual.isBorderGradient = true
      defaultVisual.borderDefaultGradient = BORDER_GRADIENT_PARAMETERS.default
      defaultVisual.borderHoveredGradient = BORDER_GRADIENT_PARAMETERS.toggledHovered
      defaultVisual.borderTriggeredGradient = BORDER_GRADIENT_PARAMETERS.toggled
      defaultVisual.borderInactiveGradient = BORDER_GRADIENT_PARAMETERS.default
      defaultVisual.setBorderGradientPositions(new vec2(-1.25, 0.7), new vec2(1.25, -0.7))
      this._visual = defaultVisual
    }
  }

  protected setUpEventCallbacks(): void {
    if (this.addCallbacks) {
      this.onTextChanged.add(createCallbacks(this.onTextChangedCallbacks))
      this.onKeyboardStateChanged.add(createCallbacks(this.onKeyboardStateChangedCallbacks))
      super.setUpEventCallbacks()
    }
  }

  private checkForEmptyText = () => {
    if (this.text === "") {
      this.isPlaceholder = true
      this.updateText(this.placeholderText)
      this.textComponent.textFill.color = PLACEHOLDER_TEXT_COLOR
      if (this.contentRequiredOnDeactivate) {
        this._hasError = true
      }
    }
  }

  private calculateHoverScale = (): vec3 => {
    return this.originalSize.uniformScale(1.05)
  }

  protected onTriggerUpHandler(event: InteractorEvent): void {
    if (event.target !== this.interactable) return
    if (!this.isEditing) {
      if (this.textInputFieldManager.active.size > 0 || this.textInputFieldManager.recentlyClosed) {
        this.textInputFieldManager.deselectAll().then(() => {
          this.keyboardTimeoutCancelToken = setTimeout(() => {
            this.editMode(true)
          }, 750)
        })
      } else {
        this.keyboardTimeoutCancelToken = setTimeout(() => {
          this.editMode(true)
        }, 16)
      }
    }
  }

  private updateText = (text: string) => {
    this.textComponent.text =
      this.inputType === "password" && !this.isPlaceholder && this.hidePassword ? "*".repeat(text.length) : text
  }

  /**
   *
   * @param text set current visible text
   * bypasses setting underlying *value* of this TextInputField
   */
  public setVisibleText = (text: string) => {
    this.updateText(text)
    this.renderedTextCache = text

    // Need to reset alignment and overflow to default to get the correct width
    this.textComponent.horizontalAlignment = HorizontalAlignment.Left
    this.textComponent.horizontalOverflow = HorizontalOverflow.Overflow
    const width =
      (this.textComponent.getBoundingBox().getSize().x / this.textParentScreenTransform.anchors.getSize().x) * 2
    if (width > OVERFLOW_WIDTH) {
      // is overflowing
      this.textComponent.horizontalAlignment = HorizontalAlignment.Right
      this.textComponent.horizontalOverflow = HorizontalOverflow.TruncateFront
    } else {
      // not overflowing
      this.textComponent.horizontalAlignment = HorizontalAlignment.Left
      this.textComponent.horizontalOverflow = HorizontalOverflow.Truncate
    }
  }

  /**
   * set current text displayed in
   */
  public set text(text: string) {
    if (text === undefined) {
      return
    }
    this.textCache = text
    if (text === "") {
      this.isPlaceholder = true
      // this.textCache = this.placeholderText
      this.setVisibleText(this.textCache)
      this.textComponent.textFill.color = PLACEHOLDER_TEXT_COLOR
    } else {
      this.isPlaceholder = false
      this.setVisibleText(text)
      this.textComponent.textFill.color = DEFAULT_TEXT_COLOR
    }
    if (!this.isEditing) this.checkForEmptyText()
    this.textChanged.invoke(text)
  }

  /**
   * Full string in the input
   */
  public get text() {
    return this.textCache
  }

  /**
   *
   * @param editing start or stop editing
   */
  public editMode = (editing: boolean) => {
    this.editModeEvent.invoke(editing)
    if (DEFAULT_BEHAVIOR) {
      if (editing && !this.isEditing) {
        // start editing
        this._interactableStateMachine.toggle = true
        this.textComponent.textFill.color = DEFAULT_TEXT_COLOR
        if (this.isPlaceholder) {
          // first click on editing
          this.isPlaceholder = false
          this.keyboardOptions.initialText = ""
          this.textCache = ""
          this.updateText("")
          this.textChanged.invoke(this.text)
        } else {
          this.keyboardOptions.initialText = this.text
        }
        global.textInputSystem.requestKeyboard(this.keyboardOptions)
        this.isEditing = true
        this.textInputFieldManager.registerActive(this)
      } else if (editing === false) {
        if (this._interactableStateMachine.toggle) {
          this._interactableStateMachine.toggle = false
          this.isEditing = false
          this.textInputFieldManager.deregisterActive(this)
          global.textInputSystem.dismissKeyboard()
        }
        this.checkForEmptyText()
        this.cancelRequestKeyboard()
      }
    }
  }

  /**
   * @returns vec2 current text offset override
   */
  public get textOffset(): vec2 {
    return this._textOffset
  }

  /**
   * @param offset set current text offset override
   * to "unset" set this to undefined
   */
  public set textOffset(offset: vec2) {
    if (offset === undefined) {
      return
    }
    this._textOffset = offset
    this.updateTextOffset()
  }

  private _updateRenderOrder(value: number) {
    this._visual.renderMeshVisual.renderOrder = value
    if (this._leftIconRMV) this._leftIconRMV.renderOrder = value + 1
    this.textComponent.renderOrder = value + 1
  }

  public set renderOrder(value: number) {
    if (value === undefined) {
      return
    }
    this._renderOrder = value
    if (this._initialized) {
      this._updateRenderOrder(value)
    }
  }

  /**
   * applies current text offset
   */
  private updateTextOffset = () => {
    if (this.textOffset) {
      this.textObjectScreenTransform.offsets.left = this.textOffset.x
      this.textObjectScreenTransform.offsets.right = this.textOffset.y
    } else {
      // reset according to icon position
      this.setUseIcon(this.useIcon)
      this.setUsePassword(this.inputType === "password")
    }
  }

  private cancelRequestKeyboard = () => {
    log.d(`cancelling timeout ${this.sceneObject.name}`)
    clearTimeout(this.keyboardTimeoutCancelToken)
  }

  protected updateScale(thisScale: vec3) {
    const inset = this._size.y * 0.3 // offset from side based on height
    this.textComponent.size = this.fontSize ? this.fontSize * (this._size.y / this.originalSize.y) : this._size.y * 16 // scale text based on height
    this.textParentScreenTransform.anchors.top = this._size.y * 0.5
    this.textParentScreenTransform.anchors.bottom = this._size.y * -0.5
    this.textParentScreenTransform.anchors.left = this._size.x * -0.5 + inset
    this.textParentScreenTransform.anchors.right = this._size.x * 0.5 - inset

    this._lastScale = thisScale.uniformScale(1)
  }

  private _updateSize = (size: vec3) => {
    this._visual.size = size
    this._visual.cornerRadius = CORNER_RADIUS // scale corner radius based on height

    // use functions to do resizing
    this.setUseIcon(this.useIcon)
    this.setUsePassword(this.inputType === "password")

    this.textParentScreenTransform.position = new vec3(0, 0, 0.01)

    this.updateScale(size)
  }

  /**
   *
   * @param size vec3 set rendering size
   * @param setBaseSize vec3 overwrite cached starting size
   */
  public setSize = (size: vec3, setBaseSize: boolean = true) => {
    super.size = size
    this._updateSize(size)
    if (setBaseSize) this.originalSize = size
  }

  /**
   *
   * @returns vec3 of current size
   */
  public getSize = (): vec3 => {
    return this._size
  }

  /**
   *
   * @param type set type of TextInputField
   * "default", "password", "numeric  " or "format"
   */
  public setInputType = (type: TextInputType) => {
    this.inputType = type
    this.setUsePassword(this.inputType === "password")
    this.setVisibleText(this.textCache)
  }

  /**
   *
   * @param side set side of icon and password ui
   */
  public setIconSide = (side: IconSide) => {
    if (side === "left") {
      this.iconSide = "left"
      this.passwordSide = "right"
    } else {
      this.iconSide = "right"
      this.passwordSide = "left"
    }

    // call with current values to reposition
    this.setUseIcon(this.useIcon)
    this.setInputType(this.inputType)
  }

  /**
   *
   * @param useIcon turn on whether or not to use the icon
   * note: still requires an icon set to .icon!
   */
  public setUseIcon = (useIcon: boolean) => {
    this.useIcon = useIcon

    if (this.useIcon) {
      if (!this.leftIconObject) {
        this.leftIconObject = global.scene.createSceneObject("LeftIcon")
        this.managedSceneObjects.add(this.leftIconObject)
        this.leftIconObject.layer = this.sceneObject.layer
        this.leftIconObject.setParent(this.textParent)
        this.leftIconScreenTransform = this.leftIconObject.createComponent("ScreenTransform")
        this.leftIconScreenTransform.offsets = Rect.create(-0, this._size.y * 0.5, -0, 0)
        this.leftIconScreenTransform.anchors = Rect.create(-1, -1, -0.5, 0.5)
        this._leftIconRMV = this.leftIconObject.createComponent("RenderMeshVisual")
        this.managedComponents.add(this._leftIconRMV)
        this._leftIconRMV.mesh = UNIT_PLANE
        this._leftIconRMV.mainMaterial = IMAGE_MATERIAL_ASSET.clone()
        this._leftIconRMV.mainMaterial.mainPass.baseTex = this.icon
        this._leftIconRMV.mainMaterial.mainPass.depthTest = true
      }
      this.leftIconObject.enabled = true
      this.leftIconScreenTransform.enableDebugRendering = DEBUG_RENDER
      const inset = this._size.y * 0.15 // position side icon based on height
      this.textObjectScreenTransform.offsets[this.iconSide] =
        this.iconSide === "right" ? this._size.y * -0.5 - inset : this._size.y * 0.5 + inset
      if (this.iconSide === "right") {
        this.leftIconScreenTransform.offsets["left"] = this._size.y * -0.5
        this.leftIconScreenTransform.offsets["right"] = 0
      }
      if (this.iconSide === "left") {
        this.leftIconScreenTransform.offsets["right"] = this._size.y * 0.5
        this.leftIconScreenTransform.offsets["left"] = 0
      }
      this.leftIconScreenTransform.anchors =
        this.iconSide === "right" ? Rect.create(1, 1, -0.5, 0.5) : Rect.create(-1, -1, -0.5, 0.5)
    } else {
      if (this.leftIconObject) {
        this.leftIconObject.enabled = false
        this.leftIconScreenTransform.enableDebugRendering = false
        this.textObjectScreenTransform.offsets[this.iconSide] = 0
      }
    }
    if (this.textOffset) this.updateTextOffset()
  }

  /**
   *
   * @returns SceneObject of "left" icon
   */
  public getIcon = () => this.leftIconObject

  /**
   *
   * @returns SceneObject of right icon
   */
  public getPasswordIcon = () => this.rightIconObject

  private setUsePassword = (isPassword: boolean) => {
    if (isPassword) {
      if (!this.rightIconObject) {
        this.rightIconObject = global.scene.createSceneObject("RightIcon")
        this.managedSceneObjects.add(this.rightIconObject)
        this.rightIconObject.layer = this.sceneObject.layer
        this.rightIconObject.setParent(this.textParent)
        this.rightIconScreenTransform = this.rightIconObject.createComponent("ScreenTransform")
        this.rightIconScreenTransform.offsets = Rect.create(this._size.y * -0.5, 0, -0, 0)
        this.rightIconScreenTransform.anchors = Rect.create(1, 1, -0.5, 0.5)
        this.rightIconRMV = this.rightIconObject.createComponent("RenderMeshVisual")
        this.managedComponents.add(this.rightIconRMV)
        this.rightIconRMV.mesh = UNIT_PLANE
        this.rightIconRMV.mainMaterial = IMAGE_MATERIAL_ASSET.clone()
        this.rightIconRMV.mainMaterial.mainPass.baseTex = EYE_OFF_ICON
        this.rightIconRMV.mainMaterial.mainPass.depthTest = true
        this.rightIconCollider = this.rightIconObject.createComponent("ColliderComponent")
        this.managedComponents.add(this.rightIconCollider)
        this.rightIconColliderShape = Shape.createBoxShape()
        this.rightIconCollider.fitVisual = false
        this.rightIconColliderShape.size = new vec3(this._size.y * 0.5, this._size.y * 0.5, 1)
        this.rightIconCollider.shape = this.rightIconColliderShape
        this.rightIconInteractable = this.rightIconObject.createComponent(Interactable.getTypeName())
        this.managedComponents.add(this.rightIconInteractable)
        this.rightIconInteractable.targetingMode = TargetingMode.All
        this.rightIconInteractable.onTriggerEnd.add(() => {
          this.hidePassword = !this.hidePassword
          if (this.hidePassword) {
            this.rightIconRMV.mainMaterial.mainPass.baseTex = EYE_OFF_ICON
          } else {
            this.rightIconRMV.mainMaterial.mainPass.baseTex = EYE_ICON
          }
          this.setVisibleText(this.textCache)
        })
      }
      this.rightIconObject.enabled = true
      this.rightIconCollider.debugDrawEnabled = DEBUG_RENDER
      this.rightIconScreenTransform.enableDebugRendering = DEBUG_RENDER
      const inset = this._size.y * 0.15 // position side icon based on height
      this.textObjectScreenTransform.offsets[this.passwordSide] =
        this.passwordSide === "right" ? this._size.y * -0.5 - inset : this._size.y * 0.5 + inset
      if (this.passwordSide === "right") {
        this.rightIconScreenTransform.offsets["left"] = this._size.y * -0.5
        this.rightIconScreenTransform.offsets["right"] = 0
      }
      if (this.passwordSide === "left") {
        this.rightIconScreenTransform.offsets["right"] = this._size.y * 0.5
        this.rightIconScreenTransform.offsets["left"] = 0
      }
      this.rightIconScreenTransform.anchors =
        this.passwordSide === "right" ? Rect.create(1, 1, -0.5, 0.5) : Rect.create(-1, -1, -0.5, 0.5)
    } else {
      this.textObjectScreenTransform.offsets[this.passwordSide] = 0
      if (this.rightIconObject) {
        this.rightIconCollider.debugDrawEnabled = false
        this.rightIconScreenTransform.enableDebugRendering = false
        this.rightIconObject.enabled = false
      }
    }
    if (this.textOffset) this.updateTextOffset()
  }

  /**
   *
   * @param state set current state of TextInputField (usually handled automatically)
   */
  public setState(stateName: StateName) {
    this.stateCancelSet()

    super.setState(stateName)
    const state = this._textInputFieldStates.get(stateName)

    if (this._leftIconRMV) {
      if (state.icon === IconState.alternate && this.changeIconOnFocus) {
        this._leftIconRMV.mainMaterial.mainPass.baseTex = this.alternateIcon
      } else if (this.icon && this.useIcon) {
        if (this._leftIconRMV.mainMaterial.mainPass.baseTex !== this.icon) {
          this._leftIconRMV.mainMaterial.mainPass.baseTex = this.icon
        }
      }
    }

    animate({
      cancelSet: this.stateCancelSet,
      duration: 0.333,
      easing: "ease-in-quart",
      update: (t) => {
        if (this.scaleOnHover) {
          const newSize = state.size ? state.size() : this.originalSize
          this.setSize(vec3.lerp(this._size, newSize, t), false)
        }
      }
    })
  }

  protected update() {
    const thisScale = this.transform.getWorldScale()
    if (!thisScale.equal(this._lastScale)) {
      this.updateScale(thisScale)
    }

    super.update()
  }

  protected release() {
    this.stateCancelSet()
    this.textInputFieldManager.removeField(this)
    super.release()
  }
}
