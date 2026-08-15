import {Billboard} from "SpectaclesInteractionKit.lspkg/Components/Interaction/Billboard/Billboard"
import {
  Interactable,
  TargetingVisual
} from "SpectaclesInteractionKit.lspkg/Components/Interaction/Interactable/Interactable"
import {InteractableManipulation} from "SpectaclesInteractionKit.lspkg/Components/Interaction/InteractableManipulation/InteractableManipulation"
import {InteractionPlane} from "SpectaclesInteractionKit.lspkg/Components/Interaction/InteractionPlane/InteractionPlane"
import {HandInteractor} from "SpectaclesInteractionKit.lspkg/Core/HandInteractor/HandInteractor"
import {Interactor, InteractorInputType, TargetingMode} from "SpectaclesInteractionKit.lspkg/Core/Interactor/Interactor"
import {InteractorEvent} from "SpectaclesInteractionKit.lspkg/Core/Interactor/InteractorEvent"
import {CursorControllerProvider} from "SpectaclesInteractionKit.lspkg/Providers/CursorControllerProvider/CursorControllerProvider"
import animate, {CancelSet} from "SpectaclesInteractionKit.lspkg/Utils/animate"
import Event, {PublicApi, unsubscribe} from "SpectaclesInteractionKit.lspkg/Utils/Event"
import {lerp} from "SpectaclesInteractionKit.lspkg/Utils/mathUtils"
import {HSVtoRGB} from "../../Utility/UIKitUtilities"
import {RoundedRectangle} from "../../Visuals/RoundedRectangle/RoundedRectangle"
import {RoundButton} from "../Button/RoundButton"
import ButtonHandler from "./modules/ButtonHandler"
import CursorHandler from "./modules/CursorHandler"
import FrameInputHandler from "./modules/FrameInputHandler"
import HoverBehavior from "./modules/HoverBehavior"
import SmoothFollow from "./modules/SmoothFollow"
import SnappingHandler from "./modules/SnappingHandler"

const frameMaterial: Material = requireAsset("../../../Materials/Frame.mat") as Material

export type InputState = {
  hovered: boolean
  hierarchyHovered: boolean
  pinching: boolean
  position: vec3
  drag: vec3
  innerInteractableActive: boolean
}

export enum FrameAppearance {
  "Large" = "Large",
  "Small" = "Small"
}

type HitPosition = {
  localPosition: vec2
  normalizedPosition: vec2
}

const FrameConstants = {
  contentOffset: 0.001,
  opacityTweenDuration: 0.4,
  cursorHighlightAnimationDuration: 0.3,
  squeezeTweenDuration: 0.4,
  nearFieldInteractionZoneDistance: 15,
  containerGradientBright: HSVtoRGB(0, 0, 0.25, 0.85),
  containerGradientDark: HSVtoRGB(0, 0, 0.15, 0.85),
  containerGradientDarkest: HSVtoRGB(0, 0, 0.2, 0.85),
  borderColor: HSVtoRGB(0, 0, 0.7, 1),
  borderActiveColor: HSVtoRGB(55, 0.5, 0.8, 1),
  highlightColorStop1: HSVtoRGB(0, 0, 0.5, 1),
  highlightColorStop2: HSVtoRGB(0, 0, 0.35, 1),
  highlightActiveColorStop1: HSVtoRGB(50, 1, 0.7, 1),
  highlightActiveColorStop2: HSVtoRGB(40, 1, 0.6, 1)
}

const DEBUG_DRAW = false
const borderDebugColor = new vec4(0, 1, 1, 1)
const debugRed = new vec4(1, 0, 0, 1)

/**
 * @module Frame
 *
 * @description Frame component that provides a customizable UI frame with interaction capabilities.
 * It supports features like resizing, moving, billboarding, snapping, and interaction with buttons.
 * It can also follow the user's view and has options for hover behavior and interaction plane.
 */
@component
export class Frame extends BaseScriptComponent {
  /**
   * When enabled, the frame automatically appears when hovered and hides when
   * not being interacted with. Disable to manually control frame visibility.
   */
  @ui.group_start("Frame Settings")
  @hint("Controls the appearance, size, and interaction behavior of the frame.")
  @input
  @hint(
    "When enabled, the frame automatically appears when hovered and hides when not being interacted with. Disable \
to manually control frame visibility."
  )
  public autoShowHide: boolean = true

  @input
  @widget(new ComboBoxWidget([new ComboBoxItem("Large", "Large"), new ComboBoxItem("Small", "Small")]))
  @hint(
    "Preset appearance configurations for the frame. <br><br> <code>Large</code> is useful for <i>far-field</i> interactons. <br><br> While, <code>Small</code> is useful for <i>near-field</i> interactions"
  )
  private _appearance: string = FrameAppearance.Large
  public get appearance(): string {
    return this._appearance
  }
  public set appearance(appearance: FrameAppearance) {
    this._appearance = appearance
    if (this.appearance === FrameAppearance.Large) {
      this.border = 4
      this._roundedRectangle.cornerRadius = 2.25
      this._roundedRectangle.borderSize = 0.25
      this.shader.dotsHighlightStop1 = 0.15
      this.shader.dotsScalar = 0.8
      this._buttonHandler.resize()
    } else if (this.appearance === FrameAppearance.Small) {
      this.border = 2.5
      this._roundedRectangle.cornerRadius = 1.4
      this._roundedRectangle.borderSize = 0.125
      this.shader.dotsHighlightStop1 = 0.12
      this.shader.dotsScalar = 1.2
      this._buttonHandler.resize()
    }
    this.scaleFrame(true)
  }

  @input("vec2", "{32,32}")
  @hint("Size of the frames's inner content area. In local space centimeters.")
  private _innerSize: vec2 = new vec2(32, 32)
  /**
   * Size of the frames's inner content area.
   */
  public get innerSize(): vec2 {
    return this._innerSize
  }
  public set innerSize(size: vec2) {
    this._innerSize = size
    this.scaleFrame(true)
  }

  @input("vec2", "{0,0}")
  @hint(
    "Extra padding that maintains a fixed size in centimeters regardless of frame scaling, useful for toolbars and \
fixed-size UI elements. In local space centimeters."
  )
  private _padding: vec2 = new vec2(0, 0)
  /**
   * Extra padding that maintains a fixed size in centimeters regardless of frame scaling, useful for toolbars and
   * fixed-size UI elements
   */
  public get padding(): vec2 {
    return this._padding
  }
  public set padding(padding: vec2) {
    this._padding = padding
    this.scaleFrame(true)
  }
  /**
   * Enables interactive scaling of the frame via corner handles.
   */
  @input
  @hint("Enables interactive scaling of the frame via corner handles.")
  private _allowScaling: boolean = true
  /**
   * Allows the container to scale width and height independently.
   * When enabled, scaling is non-uniform and each axis is clamped
   * to its configured min/max size limits.
   */
  @input
  @hint("Allows independent width/height scaling, clamped to min/max sizes.")
  @showIf("allowScaling")
  public allowNonUniformScaling: boolean = false
  /**
   * Automatically scales child content when the frame is resized to maintain proportions.
   */
  @input
  @hint("Automatically scales child content when the frame is resized to maintain proportions.")
  public autoScaleContent: boolean = true
  /**
   * When enabled, Z-axis scaling of content will match X-axis scaling during frame resizing.
   */
  @input
  @hint("When enabled, Z-axis scaling of content will match X-axis scaling during frame resizing.")
  public relativeZ: boolean = true
  /**
   * When enabled, allows interaction with content inside the frame and hides the frames's glow for visual
   * clarity.
   */
  @input
  @hint("When enabled, only the borders are interactive for controlling the frame.")
  private _onlyInteractOnBorder: boolean = false
  /**
   * Enables moving the frame.
   */
  @input
  @hint("Enables moving the frame.")
  public allowTranslation: boolean = true
  /**
   * When enabled, creates a transparent center in the frame, allowing content behind the frame to be visible.
   */
  @input
  @hint("When enabled, creates a transparent center in the frame, allowing content behind the frame to be visible.")
  private _cutOutCenter: boolean = false
  public get cutOutCenter(): boolean {
    return this._cutOutCenter
  }
  public set cutOutCenter(cutOut: boolean) {
    this._cutOutCenter = cutOut
    this.shader.cutOutCenter = this._cutOutCenter
  }
  @ui.group_end
  @ui.label("")
  @ui.group_start("Min/Max Size")
  @hint("Sets the minimum and maximum dimensions that the frame can be resized to.")
  /**
   * Minimum dimensions that the frame can be resized to. In local space centimeters.
   */
  @input("vec2", "{10,10}")
  @hint("Minimum dimensions that the frame can be resized to. In local space centimeters.")
  private _minimumSize: vec2 = new vec2(10, 10)
  /**
   * Maximum dimensions that the frame can be resized to. In local space centimeters.
   */
  @input("vec2", "{150,150}")
  @hint("Maximum dimensions that the frame can be resized to. In local space centimeters.")
  private _maximumSize: vec2 = new vec2(150, 150)
  @ui.group_end
  @ui.label("")
  @ui.group_start("Billboarding")
  @hint("Controls how the frame automatically rotates to face the camera/user.")
  /**
   * Enables the frame to automatically rotate to face the camera/user.
   */
  @input
  @hint("Enables the frame to automatically rotate to face the camera/user.")
  private useBillboarding: boolean = true
  /**
   * When enabled, the frame rotates around the X-axis to face the user, but only during movement/translation
   * unless xAlways is also enabled.
   */
  @input
  @showIf("useBillboarding")
  @hint(
    "When enabled, the frame rotates around the X-axis to face the user, but only during movement/translation \
unless xAlways is also enabled."
  )
  private xOnTranslate: boolean = true
  /**
   * When enabled, the frame continuously rotates around the X-axis to face the user, regardless of movement.
   */
  @input
  @showIf("xOnTranslate")
  @hint("When enabled, the frame continuously rotates around the X-axis to face the user, regardless of movement.")
  private xAlways: boolean = false
  /**
   * A buffered degrees (both positive and negative) on the x-axis before the frame billboards to face the user.
   */
  @input
  @showIf("xAlways")
  @hint("A buffered degrees on the x-axis before the frame billboards to face the user.")
  private xBufferDegrees: number = 0
  /**
   * When enabled, the frame rotates around the Y-axis to face the user, but only during movement/translation
   * unless yAlways is also enabled.
   */
  @input
  @showIf("useBillboarding")
  @hint(
    "When enabled, the frame rotates around the Y-axis to face the user, but only during movement/translation \
unless yAlways is also enabled."
  )
  private yOnTranslate: boolean = true
  /**
   * When enabled, the frame continuously rotates around the Y-axis to face the user, regardless of movement.
   */
  @input
  @showIf("yOnTranslate")
  @hint("When enabled, the frame continuously rotates around the Y-axis to face the user, regardless of movement.")
  private yAlways: boolean = false
  /**
   * A buffered degrees (both positive and negative) on the y-axis before the frame billboards to face the user.
   */
  @input
  @showIf("yAlways")
  @hint("A buffered degrees on the y-axis before the frame billboards to face the user.")
  private yBufferDegrees: number = 0
  @ui.group_end
  @ui.label("")
  @ui.group_start("Snapping")
  @hint("Controls how the frame snaps to other frames or world features when moved.")
  /**
   * Enables frame snapping functionality for automatic alignment to other frames or world features when
   * moved.
   */
  @input
  @hint(
    "Enables frame snapping functionality for automatic alignment to other frames or world features when \
moved."
  )
  private useSnapping: boolean = false
  /**
   * Enables snapping to other frames when moving.
   */
  @input
  @showIf("useSnapping")
  @hint("Enables snapping to other frames when moving.")
  private itemSnapping: boolean = false
  /**
   * Enables snapping to physical surfaces in the real-world environment when moving.
   */
  @input
  @showIf("useSnapping")
  @hint("Enables snapping to physical surfaces in the real-world environment when moving.")
  private worldSnapping: boolean = false
  @ui.group_end
  @ui.label("")
  @ui.group_start("Follow Behavior")
  @hint("Controls whether the frame automatically follows the user's view when moving around.")
  @input
  @hint("Shows a button that allows users to toggle whether the frame follows their view as they move.")
  private _showFollowButton: boolean = false
  /**
   * Shows a button that allows users to toggle whether the frame follows their view as they move.
   */
  public get showFollowButton(): boolean {
    return this._showFollowButton
  }
  public set showFollowButton(show: boolean) {
    this._showFollowButton = show
    this._buttonHandler.enableFollowButton(this._showFollowButton)
  }

  /**
   * When enabled, creates a follow behavior that keeps the frame in front of the user's view.
   */
  @input
  @label("Use Built-In Follow Behavior")
  @showIf("_showFollowButton")
  @hint("When enabled, creates a follow behavior that keeps the frame in front of the user's view.")
  private useFollowBehavior: boolean = false
  /**
   * Controls whether the frame actively follows the user's view. Setting this defines the initial state.
   */
  @input
  @showIf("useFollowBehavior")
  @hint("Turns on the following. If this is set to true, it will begin following the user immediately.")
  private _following: boolean = false
  public get following(): boolean {
    return this._following
  }

  @ui.group_end
  @ui.label("")
  @ui.group_start("Close Button")
  @hint("Controls whether a close button is displayed in the corner of the frame.")
  @input
  @hint("Shows a button that allows users to close or dismiss the frame.")
  private _showCloseButton: boolean = false
  /**
   * Shows a button that allows users to close or dismiss the frame.
   */
  public get showCloseButton(): boolean {
    return this._showCloseButton
  }
  public set showCloseButton(show: boolean) {
    this._showCloseButton = show
    this._buttonHandler.enableCloseButton(this._showCloseButton)
  }
  @ui.group_end
  @ui.group_start("Interaction Plane")
  @hint("Settings for an interaction plane that extends around the frame.")
  /**
   * Enables an Interaction Plane that creates a near-field targeting zone around the frame that improves
   * precision when interacting with buttons and UI elements using hand tracking.
   */
  @input
  @hint(
    "Enables an Interaction Plane that creates a near-field targeting zone around the frame that improves \
precision when interacting with buttons and UI elements using hand tracking."
  )
  private _enableInteractionPlane: boolean = true

  @input
  @showIf("_enableInteractionPlane")
  @hint("Offset position for the interaction plane relative to the frame center.")
  private _interactionPlaneOffset: vec3 = new vec3(0, 0, 0)

  /**
   * Get the offset position for the interaction plane relative to the frame center.
   */
  public get interactionPlaneOffset(): vec3 {
    return this._interactionPlaneOffset
  }

  /**
   * Set the offset position for the interaction plane relative to the frame center.
   * @param offset - The new offset.
   */
  public set interactionPlaneOffset(offset: vec3) {
    this._interactionPlaneOffset = offset
    this.updateInteractionPlane()
  }

  @input
  @showIf("_enableInteractionPlane")
  @hint("Padding that extends the InteractionPlane size.")
  private _interactionPlanePadding: vec2 = new vec2(0, 0)

  /**
   * Get the size of the padding around the InteractionPlane.
   */
  public get interactionPlanePadding(): vec2 {
    return this._interactionPlanePadding
  }

  /**
   * Set the size of the padding around the InteractionPlane.
   * @param padding - The new padding.
   */
  public set interactionPlanePadding(padding: vec2) {
    this._interactionPlanePadding = padding
    this.updateInteractionPlane()
  }

  /**
   * Sets the preferred targeting visual. (Requires the V2 Cursor to be enabled on InteractorCursors).
   * - 0: None
   * - 1: Cursor (default)
   * - 2: Ray
   */
  @input
  @showIf("_enableInteractionPlane")
  @hint(
    "Sets the preferred targeting visual. (Requires the V2 Cursor to be enabled on InteractorCursors).\n\n\
- 0: None\n\
- 1: Cursor (default)\n\
- 2: Ray"
  )
  @widget(new ComboBoxWidget([new ComboBoxItem("None", 0), new ComboBoxItem("Cursor", 1), new ComboBoxItem("Ray", 2)]))
  private _targetingVisual: number = TargetingVisual.Cursor

  @ui.group_end
  @ui.separator
  public content: SceneObject
  public frameObject: SceneObject

  private _transform: Transform
  /**
   * Transform of top level frame object.
   */
  public get transform(): Transform {
    return this._transform
  }

  private _contentTransform: Transform
  /**
   * Transform of content parent SceneObject.
   */
  public get contentTransform(): Transform {
    return this._contentTransform
  }

  private inputHandler: FrameInputHandler
  private cursorHandler: CursorHandler
  private _buttonHandler: ButtonHandler

  public get closeButton(): RoundButton {
    return this._buttonHandler.closeButton
  }

  public get followButton(): RoundButton {
    return this._buttonHandler.followButton
  }

  private _border: number = 4
  private _ogBorder: number = this._border
  /**
   * Width of the border around the frame.
   */
  public get border(): number {
    return this._border
  }
  public set border(border: number) {
    this._border = border
    this.shader.frameBorder = border
    this._ogBorder = border
    this.scaleFrame()
  }

  private snappingHandler: SnappingHandler
  private _hoverBehavior: HoverBehavior
  /**
   * Handles hover behavior for the frame.
   */
  public get hoverBehavior(): HoverBehavior {
    return this._hoverBehavior
  }

  private _roundedRectangle: RoundedRectangle
  /**
   * RoundedRectangle component for the frame, used for rendering the frame's visual.
   */
  public get roundedRectangle(): RoundedRectangle {
    return this._roundedRectangle
  }

  private shader: Pass

  public collider = this.sceneObject.createComponent("ColliderComponent")
  private colliderShape: BoxShape

  private _interactable = this.sceneObject.createComponent(Interactable.getTypeName())

  private _manipulate: InteractableManipulation = this.sceneObject.createComponent(
    InteractableManipulation.getTypeName()
  )

  private _billboardComponent: Billboard
  /**
   * Billboard component for the frame, used for automatic rotation to face the camera/user.
   */
  public get billboardComponent(): Billboard {
    return this._billboardComponent
  }

  private managedSceneObjects: SceneObject[] = []
  private managedComponents: Component[] = [this.collider, this._interactable, this._manipulate]

  private _onSnappingCompleteEvent: Event = new Event()
  /**
   * Public api for adding functions to the onSnappingComplete event handler.
   */
  public readonly onSnappingComplete: PublicApi<void> = this._onSnappingCompleteEvent.publicApi()

  /**
   * Reference to frame's default front follow behavior.
   */
  public smoothFollow: SmoothFollow = null

  /**
   * TotalSize is the total size of the frame including border and padding in local space centimeters.
   */
  public get totalSize() {
    return new vec2(
      this.innerSize.x + this.border * 2 + this.padding.x,
      this.innerSize.y + this.border * 2 + this.padding.y
    )
  }

  /**
   * Event handler for frame scaling update.
   */
  private _onScalingUpdateEvent: Event = new Event()
  /**
   * Public api for adding functions to the onScalingUpdate event handler.
   */
  public readonly onScalingUpdate = this._onScalingUpdateEvent.publicApi()
  /**
   * Event handler for frame scaling started.
   */
  private _onScalingStartEvent: Event = new Event()
  /**
   * Public api for adding functions to the onScalingStart event handler.
   */
  public readonly onScalingStart = this._onScalingStartEvent.publicApi()

  /**
   * Event handler for frame scaling ended.
   */
  private _onScalingEndEvent: Event = new Event()
  /**
   * Public api for adding functions to the onScalingEnd event handler.
   */
  public readonly onScalingEnd = this._onScalingEndEvent.publicApi()

  private _onTranslationStartEvent = new Event()
  /**
   * Public api for adding functions to the onTranslationStartEvent event handler.
   */
  public readonly onTranslationStart = this._onTranslationStartEvent.publicApi()

  private _onTranslationEndEvent = new Event()
  /**
   * Public api for adding functions to the _onTranslationEndEvent event handler.
   */
  public readonly onTranslationEnd = this._onTranslationEndEvent.publicApi()

  private _translatingLastFrame: boolean = false

  private _onHoverEnterInnerInteractableEvent = new Event()
  public readonly onHoverEnterInnerInteractable = this._onHoverEnterInnerInteractableEvent.publicApi()

  private _onHoverExitInnerInteractableEvent = new Event()
  public readonly onHoverExitInnerInteractable = this._onHoverExitInnerInteractableEvent.publicApi()

  private _hoveringInnerInteractableLast: boolean = false

  private _dragStart = vec3.zero()

  private _interactableHoverOpacity: number = 1

  private _forceTranslate: boolean = false

  public get forceTranslate() {
    return this._forceTranslate
  }

  public set forceTranslate(forceTranslate: boolean) {
    this._forceTranslate = forceTranslate
  }

  private _scalingSizeStart: vec2 = vec2.zero()

  /**
   * Getter for the initial scaling size.
   */
  public get scalingSizeStart(): vec2 {
    return this._scalingSizeStart
  }
  /**
   * Setter for the initial scaling size.
   */
  public set scalingSizeStart(thisSize: vec2) {
    this._scalingSizeStart = thisSize
  }

  private _forcePreserveScale: boolean = false

  private _inputState: InputState = {
    hovered: false,
    hierarchyHovered: false,
    pinching: false,
    position: vec3.zero(),
    drag: vec3.zero(),
    innerInteractableActive: false
  }

  /**
   * Current interactor that is interacting with the frame.
   */
  public currentInteractor: Interactor = null

  private _hoveringContentLast: boolean = false

  private _opacity: number = 1
  private _opacityCancel: CancelSet = new CancelSet()
  private _cursorHighlightCancel: CancelSet = new CancelSet()

  /**
   * Boolean tracking visibility of frame.
   */
  private _isVisible: boolean = true

  private set isVisible(isVisible: boolean) {
    this._isVisible = isVisible
  }

  public get isVisible() {
    return this._isVisible
  }

  private _initialized: boolean = false

  private _onInitializedEvent: Event = new Event()
  /**
   * Public api for adding functions to the onInitializedEvent event handler.
   */
  public readonly onInitialized = this._onInitializedEvent.publicApi()

  private _onShowVisualEvent: Event = new Event()
  /**
   * Public api for adding functions to the onShowVisualEvent event handler.
   *
   * onShowVisual is invoked when the frame _starts_ to show its visuals.
   */
  public readonly onShowVisual = this._onShowVisualEvent.publicApi()

  private _onHideVisualEvent: Event = new Event()
  /**
   * Public api for adding functions to the onHideVisualEvent event handler.
   *
   * onHideVisual is invoked when the frame has _finished_ hiding its visuals.
   */
  public readonly onHideVisual = this._onHideVisualEvent.publicApi()

  private unsubscribes: unsubscribe[] = []

  private lastInnerSize: vec2 = vec2.zero()
  private originalInnerSize: vec2 = vec2.zero()

  private _grabZones: vec4[] = []
  private _grabZoneOnly: boolean = false

  private squeezeCancel: CancelSet = new CancelSet()
  private squeezeAmount = this.border * 0.15

  private _interactionPlane!: InteractionPlane
  private _interactionPlaneTransform: Transform | null = null

  public get interactionPlane() {
    return this._interactionPlane
  }

  private set interactionPlane(interactionPlane: InteractionPlane) {
    this._interactionPlane = interactionPlane
    this._interactionPlaneTransform = interactionPlane.getTransform()
  }

  public onAwake() {
    this.createEvent("OnStartEvent").bind(this.initialize.bind(this))
  }

  /**
   * Initializes the frame component, setting up its visual appearance, interaction capabilities,
   */
  public initialize() {
    if (this._initialized) return

    // Setup frame.
    this.frameObject = global.scene.createSceneObject("FrameObject")
    this.managedSceneObjects.push(this.frameObject)
    this.frameObject.layer = this.sceneObject.layer
    this._roundedRectangle = this.frameObject.createComponent(RoundedRectangle.getTypeName())
    this.managedComponents.push(this._roundedRectangle)
    this._roundedRectangle.material = frameMaterial.clone()
    this._roundedRectangle.initialize()
    this._roundedRectangle.size = this.innerSize
    this._roundedRectangle.cornerRadius = 2.25
    this._roundedRectangle.border = true
    this._roundedRectangle.borderSize = 0.25
    this._roundedRectangle.borderColor = FrameConstants.borderColor
    this.shader = this._roundedRectangle.renderMeshVisual.mainMaterial.mainPass
    this.shader.highlightColorStop1 = FrameConstants.highlightColorStop1
    this.shader.highlightColorStop2 = FrameConstants.highlightColorStop2
    this.shader.highlightActiveColorStop1 = FrameConstants.highlightActiveColorStop1
    this.shader.highlightActiveColorStop2 = FrameConstants.highlightActiveColorStop2
    this.shader.isActive = 0
    this.shader.grabZonesCount = 0
    this.shader.highlightSize = 40
    this.shader.highlightStop1 = 0.2
    this.shader.highlightStop2 = 0
    this.shader.edgeHighlightStop1 = 0.4
    this.shader.edgeHighlightStop2 = 0
    this.shader.dotsHighlightStop1 = 0.15
    this.shader.dotsHighlightStop2 = 0
    this.shader.dotsScalar = 0.8
    this.shader.blendMode = BlendMode.PremultipliedAlphaAuto
    this.shader.colorMask = new vec4b(true, true, true, true)
    this.shader.twoSided = true

    this.cutOutCenter = this._cutOutCenter

    // Collider.
    this.colliderShape = Shape.createBoxShape()
    this.colliderShape.size = new vec3(this.innerSize.x, this.innerSize.y, 1)
    this.collider.shape = this.colliderShape
    this.collider.fitVisual = false

    // Parent object.
    this._transform = this.sceneObject.getTransform()

    // Setup content and reparent.
    this.content = global.scene.createSceneObject("content")
    this.managedSceneObjects.push(this.content)
    this.content.layer = this.sceneObject.layer
    this._contentTransform = this.content.getTransform()
    this.sceneObject.children.forEach((child: SceneObject) => {
      child.setParent(this.content)
    })
    this.frameObject.setParent(this.sceneObject)
    this.content.setParent(this.sceneObject)

    this._buttonHandler = new ButtonHandler({
      frame: this,
      state: this._inputState
    })

    this.showCloseButton = this._showCloseButton
    this.showFollowButton = this._showFollowButton

    this._buttonHandler.followButton?.onTriggerUp.add(() => {
      this.setFollowing(!this.following)
    })

    this.cursorHandler = new CursorHandler({
      frame: this
    })

    this.inputHandler = new FrameInputHandler({
      frame: this,
      manipulate: this._manipulate,
      content: this.content,
      transform: this.transform,
      cursorHandler: this.cursorHandler,
      isInteractable: this._onlyInteractOnBorder,
      allowScaling: this._allowScaling,
      onScalingEndEvent: this._onScalingEndEvent,
      onScalingStartEvent: this._onScalingStartEvent
    })

    this.onlyInteractOnBorder = this._onlyInteractOnBorder

    // Use the FrameInputHandler as the authoritative source on when translation starts.
    this.inputHandler.onTranslationStart.add(() => {
      this._onTranslationStartEvent.invoke()
      this.smoothFollow?.startDragging()
    })
    this.inputHandler.onTranslationEnd.add(() => {
      this._onTranslationEndEvent.invoke()
      this.smoothFollow?.finishDragging()
    })

    this._billboardComponent = this.useBillboarding ? this.sceneObject.createComponent(Billboard.getTypeName()) : null

    if (this.billboardComponent !== null) {
      this.managedComponents.push(this.billboardComponent)
      this.billboardComponent.xAxisEnabled = this.xAlways
      this.billboardComponent.yAxisEnabled = this.yAlways
      this.billboardComponent.axisBufferDegrees = new vec3(this.xBufferDegrees, this.yBufferDegrees, 0)
    }

    // Following logic.
    this.setFollowing(this.following)
    this._buttonHandler.followButton?.toggle(this.following)

    this.originalInnerSize = this.innerSize.uniformScale(1)

    this._interactionPlane = this.sceneObject.createComponent(InteractionPlane.getTypeName())
    this.managedComponents.push(this._interactionPlane)
    this._interactionPlane.proximityDistance = FrameConstants.nearFieldInteractionZoneDistance
    this._interactionPlane.targetingVisual = this._targetingVisual
    this._interactionPlane.enabled = this._enableInteractionPlane
    this._interactionPlaneTransform = this._interactionPlane.getTransform()

    this.updateInteractionPlane()

    this.border = this._border
    this.innerSize = this._innerSize
    this.padding = this._padding

    /**
     * @description Hover behavior for the frame, allowing it to respond to hover events for the frame, its content and ui.
     */
    this._hoverBehavior = new HoverBehavior(this._interactable)

    this.hideCursorHighlight()

    if (this.useSnapping) {
      this.createSnappableBehavior()
    }

    if (this.useFollowBehavior) {
      this.setUseFollow(true)
    }

    this.unsubscribes.push(
      this.hoverBehavior.onHoverStart.add((e: InteractorEvent) => {
        this.cursorHandler.setCursor(CursorControllerProvider.getInstance().getCursorByInteractor(e.interactor))
        if (this.autoShowHide) this.showVisual()
        if (!this.grabZoneOnly) this.showCursorHighlight()
        this._inputState.hovered = true
        this._inputState.hierarchyHovered = true
      })
    )

    this.unsubscribes.push(
      this.hoverBehavior.onHoverUpdate.add((e: InteractorEvent) => {
        const targetObject = e?.target.sceneObject

        if (e.interactor.targetHitInfo) {
          this.computeHitPosition(e.interactor)
        }

        const hoveringContentInteractable =
          targetObject !== this.sceneObject &&
          targetObject !== this._buttonHandler.closeButton?.sceneObject &&
          targetObject !== this._buttonHandler.followButton?.sceneObject

        const isNearFieldMode =
          (e.interactor.inputType & InteractorInputType.BothHands) !== 0 &&
          !(e.interactor as HandInteractor).isFarField()

        // Start hovering grab zone.
        if (
          !hoveringContentInteractable &&
          this.inputHandler.isInZone &&
          !this.inputHandler.isInZoneLast &&
          this.grabZoneOnly
        ) {
          this.showCursorHighlight()
        }
        // End hovering grab zone.
        if (
          !hoveringContentInteractable &&
          !this.inputHandler.isInZone &&
          !this.inputHandler.isInZoneLast &&
          this.grabZoneOnly
        ) {
          this.hideCursorHighlight()
        }

        // Hovering over interactable container content ONLY.
        if (hoveringContentInteractable && !isNearFieldMode) {
          if (!this._hoveringContentLast) {
            this.hideCursorHighlight()
          }
        } else {
          if (this._hoveringContentLast) {
            if (!this.grabZoneOnly || (this.grabZoneOnly && this.inputHandler.isInZone)) {
              this.showCursorHighlight()
            }
          }
        }
        this._hoveringContentLast = hoveringContentInteractable

        // Hover over interactable area ( non border container ) OR interactable container content.
        this._inputState.innerInteractableActive = targetObject !== this.sceneObject

        this._onInitializedEvent.invoke()
      })
    )

    this.unsubscribes.push(
      this.hoverBehavior.onHoverEnd.add(() => {
        if (this.autoShowHide) this.hideVisual()
        this.hideCursorHighlight()
        this._inputState.hovered = false
        this._inputState.hierarchyHovered = false
        this._inputState.innerInteractableActive = false
      })
    )

    this.unsubscribes.push(
      this._interactable.onTriggerStart((e: InteractorEvent) => {
        const targetObject = e?.target.sceneObject
        const hitLocal = this.computeHitPosition(e.interactor).localPosition
        this._dragStart = new vec3(hitLocal.x, hitLocal.y, 0)

        if (targetObject === this.sceneObject) {
          this._inputState.pinching = true
          this.currentInteractor = e.interactor
        }

        const initialHit = e.interactor.targetHitInfo.localHitPosition
        const worldHitPosition = targetObject.getTransform().getWorldTransform().multiplyPoint(initialHit)

        // Cache the initial local hit point relative to the billboard target's transform to use as pivot point.
        if (this.billboardComponent !== null) {
          this.billboardComponent.setPivot(
            this.billboardComponent.targetTransform.getInvertedWorldTransform().multiplyPoint(worldHitPosition),
            e.interactor
          )
        }
      })
    )

    this.unsubscribes.push(
      this._interactable.onTriggerUpdate((event: InteractorEvent) => {
        if (event.interactor.targetHitInfo && this.inputHandler.state.scaling) {
          // On scaling drag.
          const dragPos = this.computeHitPosition(event.interactor).localPosition
          const dragDelta = dragPos.sub(this._dragStart)
          const sizeDelta = new vec2(
            dragDelta.x * Math.sign(this._dragStart.x) * 2,
            dragDelta.y * Math.sign(this._dragStart.y) * 2
          )
          if (this.allowNonUniformScaling) {
            const newSizeX = this.scalingSizeStart.x + sizeDelta.x
            const newSizeY = this.scalingSizeStart.y + sizeDelta.y
            const clampedX = MathUtils.clamp(newSizeX, this.minimumSize.x, this.maximumSize.x)
            const clampedY = MathUtils.clamp(newSizeY, this.minimumSize.y, this.maximumSize.y)
            this.innerSize = new vec2(clampedX, clampedY)
          } else {
            const dragScale = 1 + Math.max(sizeDelta.x / this.scalingSizeStart.x, sizeDelta.y / this.scalingSizeStart.y)
            const minScale = Math.max(
              this.minimumSize.x / this.scalingSizeStart.x,
              this.minimumSize.y / this.scalingSizeStart.y
            )
            const maxScale = Math.min(
              this.maximumSize.x / this.scalingSizeStart.x,
              this.maximumSize.y / this.scalingSizeStart.y
            )
            this.innerSize = this.scalingSizeStart.uniformScale(MathUtils.clamp(dragScale, minScale, maxScale))
          }
        }
      })
    )

    this.unsubscribes.push(
      this._interactable.onTriggerEnd(() => {
        this._inputState.pinching = false
        this.currentInteractor = null
      })
    )

    this.unsubscribes.push(
      this._interactable.onTriggerEndOutside(() => {
        this._inputState.pinching = false
        this.currentInteractor = null
      })
    )

    this.unsubscribes.push(
      this._interactable.onTriggerCanceled(() => {
        this._inputState.pinching = false
        this.currentInteractor = null
      })
    )

    if (this.autoShowHide) this.hideVisual()

    this._buttonHandler.renderOrder = this.renderOrder

    this._interactable.targetingMode = TargetingMode.Direct | TargetingMode.Indirect
    this._interactable.allowMultipleInteractors = false
    this._manipulate.setCanScale(false)
    this._manipulate.setCanRotate(false)

    this.appearance = this._appearance as FrameAppearance

    this.createEvent("OnEnableEvent").bind(() => {
      this.managedComponents.forEach((component) => {
        if (!isNull(component) && component) {
          component.enabled = component === this._roundedRectangle ? this._isVisible : true
        }
      })
    })
    this.createEvent("OnDisableEvent").bind(() => {
      this.managedComponents.forEach((component) => {
        if (!isNull(component) && component) {
          component.enabled = false
        }
      })
    })
    this.createEvent("OnDestroyEvent").bind(() => {
      this._opacityCancel()
      this._cursorHighlightCancel()
      this.squeezeCancel()
      this.content.children.forEach((child) => {
        child.setParent(this.sceneObject)
      })
      this.managedComponents.forEach((component) => {
        if (!isNull(component) && component) {
          component.destroy()
        }
      })
      this.managedComponents = []
      this.managedSceneObjects.forEach((sceneObject) => {
        if (!isNull(sceneObject) && sceneObject) {
          sceneObject.destroy()
        }
      })
      this.managedSceneObjects = []
    })
    this.createEvent("UpdateEvent").bind(this.update.bind(this))
    this.createEvent("LateUpdateEvent").bind(this.lateUpdate.bind(this))

    this._initialized = true
  }

  private update() {
    this.inputHandler.update(this._inputState)

    this._inputState.innerInteractableActive ||= this.inputHandler.state.hoveringInteractable

    if (this._inputState.innerInteractableActive && !this._hoveringInnerInteractableLast) {
      const currentOpacity = this._opacity
      if (this.autoShowHide) {
        this.tweenOpacity(currentOpacity, this._interactableHoverOpacity)
      }
      // Start hovering inner interactable.
      this._onHoverEnterInnerInteractableEvent.invoke()
    } else if (!this._inputState.innerInteractableActive && this._hoveringInnerInteractableLast) {
      const currentOpacity = this._opacity
      if (this._inputState.hierarchyHovered) {
        if (this.autoShowHide) {
          this.tweenOpacity(currentOpacity, 1)
        }
      }
      // Stop hovering inner interactable.
      this._onHoverExitInnerInteractableEvent.invoke()
    }
    this._hoveringInnerInteractableLast = this._inputState.innerInteractableActive

    this.cursorHandler.update(this._inputState, this.inputHandler.state)

    if (this.inputHandler.state.scaling && !this.inputHandler.scalingLastFrame) {
      // First frame scaling.
      this.smoothFollow?.startDragging()
    }

    if (!this.inputHandler.state.scaling && this.inputHandler.scalingLastFrame) {
      // First frame NOT scaling.
      this.smoothFollow?.finishDragging()
    }

    if (this.inputHandler.state.translating) {
      this.snappingHandler?.update()
    }

    if (this.following) {
      this.smoothFollow?.onUpdate()
    }

    if (this.inputHandler.state.translating) {
      if (this.billboardComponent !== null) {
        this.billboardComponent.xAxisEnabled =
          (this.xOnTranslate && (this.allowTranslation || this.forceTranslate)) || this.xAlways
        this.billboardComponent.yAxisEnabled =
          (this.yOnTranslate && (this.allowTranslation || this.forceTranslate)) || this.yAlways
        this.billboardComponent.axisBufferDegrees = new vec3(0, 0, 0)
      }
      if (!this._translatingLastFrame) {
        // just started translating
        this.tweenBorderSize(this._border - this.squeezeAmount)
      }
      this._translatingLastFrame = true
    } else {
      if (this.billboardComponent !== null) {
        this.billboardComponent.xAxisEnabled = this.xAlways
        this.billboardComponent.yAxisEnabled = this.yAlways
        this.billboardComponent.axisBufferDegrees = new vec3(this.xBufferDegrees, this.yBufferDegrees, 0)
        if (this._translatingLastFrame) {
          this.billboardComponent.resetPivotPoint()
        }
      }
      if (this._translatingLastFrame) {
        // just stopped translating
        this.tweenBorderSize(this._ogBorder)
      }
      this._translatingLastFrame = false
    }

    if (this._inputState.pinching) {
      this.shader.isActive = 1
      this.roundedRectangle.borderColor = FrameConstants.borderActiveColor
    } else {
      this.shader.isActive = 0
      this.roundedRectangle.borderColor = FrameConstants.borderColor
    }

    if (DEBUG_DRAW) {
      //

      // debug draw border size on bottom center
      global.debugRenderSystem.drawBox(
        this.transform.getWorldPosition().sub(new vec3(0, this.totalSize.y * 0.5 - this.border * 0.5, 0.1)),
        this.border,
        this.border,
        0.1,
        borderDebugColor
      )
      // debug draw border size on bottom center
      global.debugRenderSystem.drawBox(
        this.transform.getWorldPosition().sub(new vec3(this.totalSize.x * 0.5 - this.border * 0.5, 0, 0.1)),
        this.border,
        this.border,
        0.1,
        borderDebugColor
      )

      // grab zones debug draw
      for (const grabZone of this.grabZones) {
        const worldPos = this.transform.getWorldPosition()
        const bottomLeft = new vec3(grabZone.x, grabZone.y, 0).add(worldPos)
        const topLeft = new vec3(grabZone.x, grabZone.w, 0).add(worldPos)
        const topRight = new vec3(grabZone.z, grabZone.w, 0).add(worldPos)
        const bottomRight = new vec3(grabZone.z, grabZone.y, 0).add(worldPos)
        global.debugRenderSystem.drawLine(bottomLeft, topLeft, debugRed)
        global.debugRenderSystem.drawLine(topLeft, topRight, debugRed)
        global.debugRenderSystem.drawLine(topRight, bottomRight, debugRed)
        global.debugRenderSystem.drawLine(bottomRight, bottomLeft, debugRed)
      }
    }
  }

  private lateUpdate() {
    this.hoverBehavior.lateUpdate()
  }

  private updateInteractionPlane() {
    if (!this._interactionPlane || !this._interactionPlaneTransform) {
      return
    }

    const paddedSize = this.totalSize.add(this._interactionPlanePadding)
    this._interactionPlane.planeSize = paddedSize

    this._interactionPlane.offset = this._interactionPlaneOffset
    this._interactionPlane.targetingVisual = this._targetingVisual
  }

  private scaleFrame = (isTrueScaleUpdate: boolean = true) => {
    this.roundedRectangle.size = this.totalSize
    this.updateInteractionPlane()

    this._buttonHandler.resize()

    // Determine if onScalingUpdate should be invoked before forcePreserveScale might be reset.
    const shouldInvokeScalingUpdate = !this._forcePreserveScale && isTrueScaleUpdate

    let newZScale = 1
    if (this.autoScaleContent) {
      if (!this._forcePreserveScale) {
        // Check if current size is constrained by min/max limits.
        const factorX = this.innerSize.x / Math.max(this.originalInnerSize.x, 0.001)
        const factorY = this.innerSize.y / Math.max(this.originalInnerSize.y, 0.001)
        newZScale = this.relativeZ ? Math.min(factorX, factorY) : 1

        this.contentTransform.setLocalScale(new vec3(factorX, factorY, newZScale))
      } else {
        // Update original with cloned cache to prevent reset on next scaling.
        this.originalInnerSize = this.lastInnerSize.uniformScale(1)
      }
    }

    this.colliderShape.size = new vec3(this.totalSize.x, this.totalSize.y, newZScale)
    this.collider.shape = this.colliderShape

    this.roundedRectangle.renderMeshVisual.mainMaterial.mainPass.frustumCullMin =
      this.colliderShape.size.uniformScale(-0.5)

    this.roundedRectangle.renderMeshVisual.mainMaterial.mainPass.frustumCullMax =
      this.colliderShape.size.uniformScale(0.5)

    this.smoothFollow?.resize(this.totalSize.x)

    if (shouldInvokeScalingUpdate) {
      this._onScalingUpdateEvent.invoke()
    }

    // // Reset forcePreserveScale after it has been used for decisions.
    if (this._forcePreserveScale) {
      this._forcePreserveScale = false
    }
  }

  /**
   * @param useFollow enable or disable the option to turn on the default follow behavior with the follow button
   */
  public setUseFollow = (useFollow: boolean) => {
    this.useFollowBehavior = useFollow
    if (useFollow && !this.smoothFollow) {
      this.smoothFollow = new SmoothFollow({
        frame: this
      })
    }
  }

  /**
   * @param isFollowing enable or disable the following button and default behavior ( if it is enabled )
   */
  public setFollowing = (following: boolean): void => {
    this._following = following
    if (this.following && this.billboardComponent !== null) {
      this.billboardComponent.xAxisEnabled = (this.xOnTranslate && this.allowTranslation) || this.xAlways
      this.billboardComponent.yAxisEnabled = (this.yOnTranslate && this.allowTranslation) || this.yAlways
    }
  }

  /**
   * Sets the buffer degrees for the billboard component. Will only be effective if Frame's billboarding is set to true, and xAlways and/or yAlways is set to true.
   * @param xBufferDegrees the buffer degrees for the x-axis
   * @param yBufferDegrees the buffer degrees for the y-axis
   */
  public setBillboardBufferDegrees(xBufferDegrees: number, yBufferDegrees: number): void {
    if (this.billboardComponent !== null) {
      this.xBufferDegrees = xBufferDegrees
      this.yBufferDegrees = yBufferDegrees
    }
  }

  /**
   * @returns whether interactive scaling of the frame via corner handles is enabled
   */
  public get allowScaling(): boolean {
    return this._allowScaling
  }

  /**
   * Sets whether interactive scaling of the frame via corner handles is enabled
   * @param allowScaling - if true, scaling is enabled through the corner handles
   */
  public set allowScaling(allowScaling: boolean) {
    this._allowScaling = allowScaling
    if (this.inputHandler) {
      this.inputHandler.allowScaling = allowScaling
    }
  }

  /**
   * @returns current renderOrder for the renderMeshVisual of the frame itself
   */
  public get renderOrder(): number {
    return this.roundedRectangle.renderMeshVisual.getRenderOrder()
  }

  /**
   * @param renderOrder sets renderOrder for the renderMeshVisual of the frame itself
   */
  public set renderOrder(renderOrder: number) {
    this.roundedRectangle.renderMeshVisual.setRenderOrder(renderOrder)
    this._buttonHandler.renderOrder = renderOrder
  }

  /**
   * @returns whether the snapping behavior is currently tweening
   */
  public isSnappingTweening = (): boolean => {
    if (this.snappingHandler) {
      return this.snappingHandler.isTweening
    }
    return false
  }

  /**
   * @returns whether the snapping behavior is checking for snappable elements
   */
  public isSnappingActive = (): boolean => {
    if (this.snappingHandler) {
      return this.snappingHandler.isActive
    }
    return false
  }

  /**
   * @returns the current grab zones of the frame
   */
  public get grabZones(): vec4[] {
    return this._grabZones
  }

  /**
   * Sets the grab zones of the frame, which are used for interaction
   */
  public set grabZones(grabZones: vec4[]) {
    this._grabZones = grabZones
    this.shader.grabZonesCount = this.grabZones.length
    this.shader.grabZones = this.grabZones
  }

  /**
   * @returns whether the frame only allows interaction in the grab zones
   */
  public get grabZoneOnly(): boolean {
    return this._grabZoneOnly
  }

  /**
   * Sets whether the frame only allows interaction in the grab zones
   * @param only - if true, interaction is limited to the grab zones
   */
  public set grabZoneOnly(only: boolean) {
    this._grabZoneOnly = only
  }

  /**
   * gets the onlyInteractOnBorder setting
   */
  public get onlyInteractOnBorder(): boolean {
    return this._onlyInteractOnBorder
  }

  /**
   * sets the onlyInteractOnBorder setting
   * @param onlyInteractOnBorder - if true, interaction is limited to the border of the frame
   */
  public set onlyInteractOnBorder(onlyInteractOnBorder: boolean) {
    this._onlyInteractOnBorder = onlyInteractOnBorder
    this.inputHandler.isInteractable = onlyInteractOnBorder
    this.shader.borderOnly = onlyInteractOnBorder ? 1 : 0
  }

  private createSnappableBehavior = () => {
    this.snappingHandler = new SnappingHandler({
      frame: this,
      interactable: this._interactable,
      worldSnapping: this.worldSnapping,
      itemSnapping: this.itemSnapping,
      onSnappingCompleteEvent: this._onSnappingCompleteEvent,
      onScalingUpdate: this.onScalingUpdate
    })
  }

  private computeHitPosition(interactor: Interactor): HitPosition {
    const position = interactor.planecastPoint
    const invertedWorldTransform = this.transform.getInvertedWorldTransform()
    const objectSpaceHit = invertedWorldTransform.multiplyPoint(position)
    this._inputState.position = objectSpaceHit
    const normalizedPosition = new vec2(
      (objectSpaceHit.x / this.totalSize.x) * 2,
      (objectSpaceHit.y / this.totalSize.y) * 2
    )

    if (!this.inputHandler.state.translating) {
      this.shader.cursorPosition = normalizedPosition
    }

    return {
      localPosition: objectSpaceHit,
      normalizedPosition: normalizedPosition
    }
  }

  /**
   * tween to show visuals of frame and elements
   */
  public showVisual = () => {
    // Enable on show.
    this.roundedRectangle.renderMeshVisual.enabled = true
    this.tweenOpacity(this._opacity, 1)
    this._onShowVisualEvent.invoke()
  }

  /**
   * tween to hide visuals of frame and elements
   */
  public hideVisual = () => {
    this.tweenOpacity(this._opacity, 0, () => {
      // Disable on hide.
      this.roundedRectangle.renderMeshVisual.enabled = false
      this._onHideVisualEvent.invoke()
    })
  }

  /**
   * tween from current opacity to target opacity, will cancel existing opacity tweens
   * @param currentOpacity
   * @param targetOpacity
   */
  public tweenOpacity = (currentOpacity: number, targetOpacity: number, endCallback = () => {}) => {
    this._opacityCancel.cancel()
    animate({
      duration: FrameConstants.opacityTweenDuration * Math.abs(targetOpacity - currentOpacity),
      update: (t: number) => {
        this.opacity = lerp(currentOpacity, targetOpacity, t)
        this._buttonHandler.opacity = lerp(currentOpacity, targetOpacity, t)
      },
      ended: endCallback,
      cancelSet: this._opacityCancel
    })
  }

  /**
   * @param opacity sets opacity for all frame elements
   * Note this parameter is effected by calls to `showVisual` and `hideVisual`.
   */
  public set opacity(opacity: number) {
    if (opacity > 0) {
      this.isVisible = true
    } else {
      this.isVisible = false
    }

    this._opacity = opacity
    this.roundedRectangle.renderMeshVisual.enabled = opacity > 0
    this.shader.opacityFactor = opacity
    this._buttonHandler.opacity = opacity
  }

  /**
   * @returns current opacity of frame elements
   */
  public get opacity(): number {
    return this._opacity
  }

  /**
   * @param _minimumSize sets the minimum size for all frame elements
   * Note this parameter controls the lower bound for scaling.
   */
  public set minimumSize(minimumSize: vec2) {
    this._minimumSize = minimumSize
    this.clampInnerSizeToBounds()
  }

  /**
   * @returns current minimum size of frame elements
   */
  public get minimumSize(): vec2 {
    return this._minimumSize
  }

  /**
   * @param _maximumSize sets the maximum size for all frame elements
   * Note this parameter controls the upper bound for scaling.
   */
  public set maximumSize(maximumSize: vec2) {
    this._maximumSize = maximumSize
    this.clampInnerSizeToBounds()
  }

  /**
   * @returns current maximum size of frame elements
   */
  public get maximumSize(): vec2 {
    return this._maximumSize
  }

  private clampInnerSizeToBounds() {
    const clampedX = MathUtils.clamp(this.innerSize.x, this.minimumSize.x, this.maximumSize.x)
    const clampedY = MathUtils.clamp(this.innerSize.y, this.minimumSize.y, this.maximumSize.y)
    if (clampedX !== this.innerSize.x || clampedY !== this.innerSize.y) {
      this.innerSize = new vec2(clampedX, clampedY)
    }
  }

  private showCursorHighlight = () => {
    this._cursorHighlightCancel()
    const startingHighlight = this.shader.isHovered
    animate({
      duration: FrameConstants.cursorHighlightAnimationDuration * (1 - startingHighlight),
      cancelSet: this._cursorHighlightCancel,
      update: (t) => {
        this.shader.isHovered = t
      }
    })
  }

  private hideCursorHighlight = () => {
    this._cursorHighlightCancel()
    const startingHighlight = this.shader.isHovered
    animate({
      duration: FrameConstants.cursorHighlightAnimationDuration * startingHighlight,
      cancelSet: this._cursorHighlightCancel,
      update: (t) => {
        this.shader.isHovered = startingHighlight - t * startingHighlight
      }
    })
  }

  private tweenBorderSize = (targetBorder: number) => {
    const currentBorder = this._border
    this.squeezeCancel()
    animate({
      duration: FrameConstants.squeezeTweenDuration * Math.abs(targetBorder - currentBorder),
      easing: "ease-out-back-cubic",
      update: (t: number) => {
        this._border = lerp(currentBorder, targetBorder, t)
      },
      cancelSet: this.squeezeCancel
    })
  }
}
