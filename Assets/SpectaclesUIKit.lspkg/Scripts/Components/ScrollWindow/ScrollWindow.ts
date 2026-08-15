import {
  Interactable,
  InteractableEventArgs
} from "SpectaclesInteractionKit.lspkg/Components/Interaction/Interactable/Interactable"
import {Interactor} from "SpectaclesInteractionKit.lspkg/Core/Interactor/Interactor"
import {InteractorEvent} from "SpectaclesInteractionKit.lspkg/Core/Interactor/InteractorEvent"
import WorldCameraFinderProvider from "SpectaclesInteractionKit.lspkg/Providers/CameraProvider/WorldCameraFinderProvider"
import animate, {CancelSet} from "SpectaclesInteractionKit.lspkg/Utils/animate"
import Event, {PublicApi} from "SpectaclesInteractionKit.lspkg/Utils/Event"
import ReplayEvent from "SpectaclesInteractionKit.lspkg/Utils/ReplayEvent"
import {findAllComponentsInSelfOrChildren} from "SpectaclesInteractionKit.lspkg/Utils/SceneObjectUtils"
import {SpringAnimate} from "SpectaclesInteractionKit.lspkg/Utils/springAnimate"
import {Frustum} from "../../Utility/Frustum"
import {getElement} from "../../Utility/UIKitUtilities"
import {Element} from "../Element"

// a small number
const EPSILON = 0.0025
// time window for additive gestures
const GESTURE_ACCUMULATION_TIME_MS = 300
// minimum velocity to be considered for spring
const SIGNIFICANT_VELOCITY_THRESHOLD = 0.1
// how much to decay velocity when accumulating
const VELOCITY_DECAY_FACTOR = 0.7
// how fast to fling
const FLING_MULTIPLIER = 1
// how fast to slow
const FRICTION_FACTOR = 0.95
// how much overshoot is allowed max
const MAX_OVERSHOOT_FACTOR = 0.45
// Minimum velocity before lerping is applied
const MINIMUM_SCROLLING_VELOCITY = 0.15
// Velocity smoothing factor (0-1, lower = smoother but more lag)
const VELOCITY_SMOOTHING = 0.3
// Number of velocity samples to track for better predictions
const VELOCITY_HISTORY_SIZE = 5
// Weights for velocity history (most recent has highest weight)
const VELOCITY_HISTORY_WEIGHTS = [0.35, 0.25, 0.2, 0.12, 0.08] // Sums to 1.0

const EDGE_BOUNCE_STRENGTH = 1.0

type ScrollEventArg = {
  startPosition: vec2
  dragAmount: vec2
}

export type VisibleWindow = {
  bottomLeft: vec2
  topRight: vec2
}

/**
 * A low-level scrolling interaction solution for Spectacles.
 *
 * Children of this Component's SceneObject will be masked into windowSize and scrollable by scrollDimensions
 */
@component
export class ScrollWindow extends BaseScriptComponent {
  @input
  @hint("Enable Vertical Scrolling")
  private _vertical: boolean = true
  @input
  @hint("Enable Horizontal Scrolling")
  private _horizontal: boolean = false

  @input("vec2", "{32,32}")
  @hint(
    "Size of masked window viewport in local space. <br><br>Note: to set dynamically, use <code>setWindowSize</code>"
  )
  private _windowSize: vec2 = new vec2(32, 32)
  @input("vec2", "{32,100}")
  @hint("Size of total scrollable area. <br><br>Note: to set dynamically, use <code>setScrollDimensions</code>")
  private _scrollDimensions: vec2 = new vec2(32, 100)

  @input
  @label("Scroll Position")
  @hint("Scroll Position in pixels in local space")
  private _scrollPosition: vec2 = vec2.zero()

  @input
  private _scrollSnapping: boolean = false

  @input
  @showIf("_scrollSnapping")
  private _snapRegion: vec2 = new vec2(8, 8)

  @input
  @hint("Add black fade to edges <code>(rendering trick for transparency)</code>")
  private _edgeFade: boolean = false

  private initialized: boolean = false

  private _scrollingPaused: boolean = false

  /**
   * Whether scrolling is currently paused
   * @returns true if scrolling is paused, false otherwise
   */
  public get scrollingPaused(): boolean {
    return this._scrollingPaused
  }

  /**
   * Pause or resume scrolling
   * @param scrollingPaused - true to pause scrolling, false to resume
   */
  public set scrollingPaused(scrollingPaused: boolean) {
    // reset accumulated velocity
    if (this.initialized && scrollingPaused) {
      this.cancelCurrentInteractor()
      this.accumulatedVelocity = vec3.zero()
      this.lastGestureEndTime = 0
      this.committedSnapTarget.x = null
      this.committedSnapTarget.y = null
      this.startingPageIndex.x = 0
      this.startingPageIndex.y = 0
    }
    this._scrollingPaused = scrollingPaused
  }

  // world camera
  private camera: WorldCameraFinderProvider = WorldCameraFinderProvider.getInstance()
  private cameraComponent = this.camera.getComponent()

  // scene object stuff
  private transform: Transform
  private screenTransform: ScreenTransform
  private collider: ColliderComponent
  private _interactable: Interactable
  private maskingComponent: MaskingComponent
  private rmv: RenderMeshVisual
  private mesh: RenderMesh = requireAsset("../../../Meshes/Unit Plane.mesh") as RenderMesh
  private material: Material = requireAsset("../../../Materials/ScrollWindowFadeMask.mat") as Material

  private managedSceneObjects: SceneObject[] = []
  private managedComponents: Component[] = []

  private scroller: SceneObject

  /**
   * transform of the object that does scroll movement
   */
  private scrollerTransform: Transform

  /**
   * Frustum that handles helper viewport logic.
   * Use this to test if your content is visible within the scroll window.
   */
  public readonly frustum: Frustum = new Frustum()

  // scroll logic
  private startPosition: vec3 = vec3.zero()
  private interactorOffset: vec3 = vec3.zero()
  private interactorUpdated: boolean = false
  /**
   * The currently active interactor controlling this scroll window
   */
  private activeInteractor: Interactor | null = null
  /**
   * is currently dragging
   */
  private isDragging: boolean = false
  private _isControlledExternally: boolean = false

  private velocity: vec3 = vec3.zero()
  private accumulatedVelocity: vec3 = vec3.zero()
  private lastPosition: vec3 = this.startPosition
  private lastGestureEndTime: number = 0
  /**
   * History of recent velocity samples for better fling predictions
   * Most recent samples are at the beginning of the array
   */
  private velocityHistory: vec3[] = []
  private dragAmount: vec2 = vec2.zero()
  private onInitializedEvent: ReplayEvent<void> = new ReplayEvent()
  private scrollDragEvent: Event<ScrollEventArg> = new Event()
  private onScrollDimensionsUpdatedEvent: Event<vec2> = new Event()
  private onScrollPositionUpdatedEvent: Event<vec2> = new Event()

  private scrollTweenCancel = new CancelSet()

  /**
   * Event that fires when the ScrollWindow has been initialized
   */
  public readonly onInitialized: PublicApi<void> = this.onInitializedEvent.publicApi()

  /**
   * Event that fires during scroll drag interactions.
   * Use this event to execute logic when the user drags to scroll.
   */
  public readonly onScrollDrag: PublicApi<ScrollEventArg> = this.scrollDragEvent.publicApi()

  /**
   * Event that fires when scroll dimensions are updated.
   * Use this event to execute logic when the scrollable area size changes.
   */
  public readonly onScrollDimensionsUpdated: PublicApi<vec2> = this.onScrollDimensionsUpdatedEvent.publicApi()

  /**
   * Event that fires when scroll position is updated.
   * Use this event to execute logic when the scroll position changes.
   * The position is in local space.
   */
  public readonly onScrollPositionUpdated: PublicApi<vec2> = this.onScrollPositionUpdatedEvent.publicApi()

  /**
   * When true, disables the bounce-back effect at the edges of the scroll area.
   * When false (default), the scroll window will use a spring animation to bounce back when scrolled beyond bounds.
   */
  private _hardStopAtEnds: boolean = false

  /**
   * When an Interactor hovers the ScrollWindow within this boundary (using normalized positions from -1 to 1),
   * all child ColliderComponents will be enabled.
   *
   * For example, if we provide a Rect with Rect.create(-1, 1, -0.8, 1),
   * hovering the bottom 10% of the ScrollWindow will not enable the child ColliderComponents.
   */
  private _enableChildCollidersBoundary: Rect = Rect.create(-1, 1, -1, 1)

  /**
   * turn on top secret debug visuals
   */
  private debugRender: boolean = false

  private colliderShape = Shape.createBoxShape()

  private spring = new SpringAnimate(150, 21, 1)

  private isSubscribedToEvents = false
  private eventUnsubscribes = []

  private colliderToElementMap: Map<ColliderComponent, Element> = new Map<ColliderComponent, Element>()

  /**
   * Tracks the committed snap target position for each axis.
   * Once a snap target is determined, we commit to it until the snap completes.
   */
  private committedSnapTarget: {x: number | null; y: number | null} = {x: null, y: null}

  /**
   * Tracks the starting page index when a drag begins (for deadzone calculation)
   */
  private startingPageIndex: {x: number; y: number} = {x: 0, y: 0}

  /**
   * get whether this scroll window is initialized
   */
  public get isInitialized(): boolean {
    return this.initialized
  }

  /**
   * get the number of children in the content of scroll window
   */
  public get children(): SceneObject[] {
    if (!this.initialized) {
      return []
    }
    return this.scroller.children
  }

  /**
   * The Interactable component of this scroll window
   * @returns Interactable component
   */
  public get interactable(): Interactable {
    return this._interactable
  }

  /**
   * Whether vertical scrolling is enabled
   * @returns true if vertical scrolling is enabled, false otherwise
   */
  public get vertical(): boolean {
    return this._vertical
  }

  /**
   * Whether vertical scrolling is enabled
   * @param value - true to enable vertical scrolling, false to disable
   */
  public set vertical(value: boolean) {
    if (value === undefined) {
      return
    }
    this._vertical = value
  }

  /**
   * Whether horizontal scrolling is enabled
   * @returns true if horizontal scrolling is enabled, false otherwise
   */
  public get horizontal(): boolean {
    return this._horizontal
  }

  /**
   * Whether horizontal scrolling is enabled
   * @param value - true to enable horizontal scrolling, false to disable
   */
  public set horizontal(value: boolean) {
    if (value === undefined) {
      return
    }
    this._horizontal = value
  }

  /**
   * Whether this scroll window is controlled externally
   * @returns true if controlled externally, false otherwise
   */
  public get isControlledExternally(): boolean {
    return this._isControlledExternally
  }

  /**
   * Whether this scroll window is controlled externally
   * @param value - true to control externally, false to control internally
   */
  public set isControlledExternally(value: boolean) {
    if (value === undefined) {
      return
    }
    if (this._isControlledExternally && !value) {
      // Transitioning from external control to internal control
      this.applyAccumulatedVelocity()
    } else if (!this._isControlledExternally && value) {
      // Transitioning from internal control to external control
      this.resetDragState()
    }
    this._isControlledExternally = value
  }

  /**
   * Whether this scroll window is using snap scrolling
   * @returns true if snap scrolling is enabled, false otherwise
   */
  public get scrollSnapping(): boolean {
    return this._scrollSnapping
  }

  /**
   * Whether this scroll window is using snap scrolling
   * @param value - true to enable snap scrolling, false to disable
   */
  public set scrollSnapping(scrollSnapping: boolean) {
    if (scrollSnapping === undefined) {
      return
    }
    this._scrollSnapping = scrollSnapping
  }

  /**
   * The size of each snap segment in the scroll window
   * @returns vec2 of the size of each snap segment in local space.
   */
  public get snapRegion(): vec2 {
    return this._snapRegion
  }

  /**
   * The size of each snap segment in the scroll window
   * @param snapRegion - The size of each snap segment in local space.
   */
  public set snapRegion(snapRegion: vec2) {
    if (snapRegion === undefined) {
      return
    }
    this._snapRegion = snapRegion
  }

  /**
   * The scroll position in local space
   */
  public get scrollPosition(): vec2 {
    return this._scrollPosition
  }

  /**
   * The scroll position in local space
   */
  public set scrollPosition(position: vec2) {
    if (position === undefined) {
      return
    }
    if (this.initialized) {
      this.scrollTweenCancel()
      const scrollerLocalPosition = this.scrollerTransform.getLocalPosition()
      let newPosition = new vec3(position.x, position.y, scrollerLocalPosition.z)

      // Apply overscroll resistance if needed
      newPosition = this.applyOverscrollIfNeeded(newPosition)

      this.updateScrollerPosition(newPosition)

      if (this.scrollSnapping) {
        // Update velocity from position change
        this.updateVelocityFromPosition(newPosition)
      }
    } else {
      this._scrollPosition = position
    }
  }

  /**
   * The scroll position in normalized space
   * -1, 1 on the x (left to right) if scrollDimensions.x is not -1, otherwise the scroll position.x in pixels
   * -1, 1 on the y (bottom to top) if scrollDimensions.y is not -1, otherwise the scroll position.y in pixels
   */
  public get scrollPositionNormalized(): vec2 {
    const normalizedScrollPosition = vec2.zero()
    normalizedScrollPosition.x =
      this._scrollDimensions.x !== -1 ? this._scrollPosition.x / this.rightEdge : this._scrollPosition.x
    normalizedScrollPosition.y =
      this._scrollDimensions.y !== -1 ? this._scrollPosition.y / this.topEdge : this._scrollPosition.y
    return normalizedScrollPosition
  }

  /**
   * The scroll position in normalized space
   * -1, 1 on the x (left to right)
   * -1, 1 on the y (bottom to top)
   */
  public set scrollPositionNormalized(normalizedPosition: vec2) {
    if (normalizedPosition === undefined) {
      return
    }
    if (this.initialized) {
      this.scrollTweenCancel()

      const scrollerLocalPosition = this.scrollerTransform.getLocalPosition()
      let newPosition = new vec3(
        this._scrollDimensions.x !== -1 ? normalizedPosition.x * this.rightEdge : normalizedPosition.x,
        this._scrollDimensions.y !== -1 ? normalizedPosition.y * this.topEdge : normalizedPosition.y,
        scrollerLocalPosition.z
      )

      // Apply overscroll resistance if needed
      newPosition = this.applyOverscrollIfNeeded(newPosition)

      this.updateScrollerPosition(newPosition)

      if (this.scrollSnapping) {
        // Update velocity from position change
        this.updateVelocityFromPosition(newPosition)
      }
    } else {
      this._scrollPosition.x =
        this._scrollDimensions.x !== -1 ? normalizedPosition.x * this.rightEdge : normalizedPosition.x
      this._scrollPosition.y =
        this._scrollDimensions.y !== -1 ? normalizedPosition.y * this.topEdge : normalizedPosition.y
    }
  }

  /**
   * The size of the masked window viewport in local space
   * @returns vec2 of the current window size
   */
  public get windowSize(): vec2 {
    return this._windowSize
  }

  /**
   * The size of the masked window viewport in local space
   * @param size - The window size in local space
   */
  public set windowSize(size: vec2) {
    if (size === undefined) {
      return
    }
    if (this.initialized) {
      this.setWindowSize(size)
    } else {
      this._windowSize = size
    }
  }

  /**
   * The size of the total scrollable area
   * @returns vec2 of the current scroll dimensions
   */
  public get scrollDimensions(): vec2 {
    return this._scrollDimensions
  }

  /**
   * The size of the total scrollable area
   * @param size - The scroll dimensions in local space
   */
  public set scrollDimensions(size: vec2) {
    if (size === undefined) {
      return
    }
    if (this.initialized) {
      this.setScrollDimensions(size)
    } else {
      this._scrollDimensions = size
    }
  }

  /**
   * Whether edge fade is enabled
   * @returns true if edge fade is enabled, false otherwise
   */
  public get edgeFade(): boolean {
    return this._edgeFade
  }

  /**
   * Whether edge fade is enabled
   * @param value - true to enable edge fade, false to disable
   */
  public set edgeFade(value: boolean) {
    if (value === undefined) {
      return
    }
    if (this.initialized) {
      this.enableEdgeFade(value)
    } else {
      this._edgeFade = value
    }
  }

  /**
   * Whether hard stop at ends is enabled
   * When true, disables the bounce-back effect at the edges of the scroll area.
   * When false (default), the scroll window will use a spring animation to bounce back when scrolled beyond bounds.
   * @returns true if hard stop at ends is enabled, false otherwise
   */
  public get hardStopAtEnds(): boolean {
    return this._hardStopAtEnds
  }

  /**
   * Whether hard stop at ends is enabled
   * @param value - true to enable hard stop at ends, false to disable
   */
  public set hardStopAtEnds(value: boolean) {
    if (value === undefined) {
      return
    }
    this._hardStopAtEnds = value
  }

  /**
   * The boundary within which child colliders will be enabled when an interactor hovers over the ScrollWindow.
   * Uses normalized positions from -1 to 1 on both axes.
   * For example, if we provide a Rect with Rect.create(-1, 1, -0.8, 1),
   * hovering the bottom 10% of the ScrollWindow will not enable the child ColliderComponents.
   * @returns The current enable child colliders boundary
   */
  public get enableChildCollidersBoundary(): Rect {
    return this._enableChildCollidersBoundary
  }

  /**
   * The boundary within which child colliders will be enabled when an interactor hovers over the ScrollWindow.
   * @param value - The boundary rect using normalized positions from -1 to 1
   */
  public set enableChildCollidersBoundary(value: Rect) {
    if (value === undefined) {
      return
    }
    this._enableChildCollidersBoundary = value
  }

  public onAwake() {
    this.createEvent("OnEnableEvent").bind(() => {
      if (this.initialized) {
        this.subscribeToEvents(true)
        this.managedComponents.forEach((component) => {
          if (!isNull(component) && component) {
            if (component === this.rmv) {
              component.enabled = this._edgeFade
            } else {
              component.enabled = true
            }
          }
        })
        this.cancelCurrentInteractor()
      }
    })
    this.createEvent("OnDisableEvent").bind(() => {
      if (this.initialized) {
        this.subscribeToEvents(false)
        this.managedComponents.forEach((component) => {
          if (!isNull(component) && component) {
            component.enabled = false
          }
        })
        this.enableChildColliders(true)
      }
    })
    this.createEvent("OnDestroyEvent").bind(() => {
      this.scrollTweenCancel()
      if (this.scroller) {
        // When destroying the scroll window, we need to reparent the children to the scene object
        this.scroller.children.forEach((child) => {
          child.setParent(this.sceneObject)
        })
      }
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
    this.createEvent("OnStartEvent").bind(this.initialize.bind(this))
    this.createEvent("LateUpdateEvent").bind(this.update.bind(this))
  }

  /**
   * Adds a SceneObject to this scroll window's scrollable content area.
   * The object's parent will be set to the internal scroller object.
   *
   * @param object - The SceneObject to add to the scroll window
   */
  public addObject(object: SceneObject): void {
    object.setParent(this.scroller ?? this.sceneObject)
  }

  /**
   * Initializes the ScrollWindow component.
   * This method runs once on creation and sets up all necessary components and event handlers.
   */
  public initialize = () => {
    if (this.scrollSnapping) {
      if (
        this.horizontal &&
        this.scrollDimensions.x > this.windowSize.x &&
        this.snapRegion.x > 0 &&
        (this.scrollDimensions.x / this.snapRegion.x) % 1 !== 0
      ) {
        throw new Error("ScrollWindow: scrollDimensions.x must be divisible by snapRegion.x")
      }
      if (
        this.vertical &&
        this.scrollDimensions.y > this.windowSize.y &&
        this.snapRegion.y > 0 &&
        (this.scrollDimensions.y / this.snapRegion.y) % 1 !== 0
      ) {
        throw new Error("ScrollWindow: scrollDimensions.y must be divisible by snapRegion.y")
      }
    }

    if (this.initialized) return

    this.transform = this.sceneObject.getTransform()
    /**
     * when you create this, does it overwrite existing local transform?
     */
    this.screenTransform =
      this.sceneObject.getComponent("ScreenTransform") || this.sceneObject.createComponent("ScreenTransform")
    /**
     * like i gotta do this??
     */
    this.screenTransform.position = this.transform.getLocalPosition()
    this.collider =
      this.sceneObject.getComponent("ColliderComponent") || this.sceneObject.createComponent("ColliderComponent")
    this.managedComponents.push(this.collider)
    this.maskingComponent =
      this.sceneObject.getComponent("MaskingComponent") || this.sceneObject.createComponent("MaskingComponent")
    this.managedComponents.push(this.maskingComponent)
    this._interactable =
      this.sceneObject.getComponent(Interactable.getTypeName()) ||
      this.sceneObject.createComponent(Interactable.getTypeName())
    this.managedComponents.push(this._interactable)
    this._interactable.isScrollable = true

    if (this._edgeFade) {
      this.createEdgeFade()
    }

    this.setWindowSize(this._windowSize)

    this.collider.shape = this.colliderShape
    this.collider.fitVisual = false
    this.collider.debugDrawEnabled = this.debugRender

    this._interactable.enableInstantDrag = true

    const currentChildren = [...this.sceneObject.children]

    this.scroller = global.scene.createSceneObject("Scroller")
    this.managedSceneObjects.push(this.scroller)
    this.scroller.layer = this.sceneObject.layer
    this.scroller.setParent(this.sceneObject)
    this.scrollerTransform = this.scroller.getTransform()

    // move children under this.scroller
    for (let i = 0; i < currentChildren.length; i++) {
      const thisChild = currentChildren[i]
      thisChild.setParent(this.scroller)
    }

    this.subscribeToEvents(this.enabled)

    // Initialize scroll position
    const initialPosition = new vec3(this.scrollPosition.x, this.scrollPosition.y, 0)
    if (this._scrollSnapping) {
      if (
        this._horizontal &&
        this.snapRegion.x > 0 &&
        (this._scrollDimensions.x === -1 || this._scrollDimensions.x > this._windowSize.x)
      ) {
        const pageIndex = this.getPageIndexFromPosition("x", this._scrollPosition.x)
        if (this._scrollDimensions.x !== -1) {
          // Bounded: use nearEdge-relative position
          initialPosition.x = this.rightEdge + pageIndex * this.snapRegion.x
          initialPosition.x = MathUtils.clamp(initialPosition.x, this.rightEdge, this.leftEdge)
        } else {
          // Unbounded: use center-relative position
          initialPosition.x = pageIndex * this.snapRegion.x
        }
      }

      if (
        this._vertical &&
        this.snapRegion.y > 0 &&
        (this._scrollDimensions.y === -1 || this._scrollDimensions.y > this._windowSize.y)
      ) {
        const pageIndex = this.getPageIndexFromPosition("y", this._scrollPosition.y)
        if (this._scrollDimensions.y !== -1) {
          // Bounded: use nearEdge-relative position
          initialPosition.y = this.topEdge + pageIndex * this.snapRegion.y
          initialPosition.y = MathUtils.clamp(initialPosition.y, this.topEdge, this.bottomEdge)
        } else {
          // Unbounded: use center-relative position
          initialPosition.y = pageIndex * this.snapRegion.y
        }
      }
    }

    // Set initial position if not at origin
    if (initialPosition.x !== 0 || initialPosition.y !== 0) {
      this.updateScrollerPosition(initialPosition)
    }

    this.initialized = true
    this.onInitializedEvent.invoke()
  }

  private subscribeToEvents = (subscribe: boolean) => {
    const onHoverStart = (event: InteractorEvent) => {
      if (this.scrollingPaused) {
        return
      }
      const intersection = event.interactor.raycastPlaneIntersection(this._interactable)
      if (intersection) {
        const localIntersection = this.screenTransform.worldPointToLocalPoint(intersection)
        if (
          localIntersection.x < this._enableChildCollidersBoundary.left ||
          localIntersection.x > this._enableChildCollidersBoundary.right ||
          localIntersection.y < this._enableChildCollidersBoundary.bottom ||
          localIntersection.y > this._enableChildCollidersBoundary.top
        ) {
          event.stopPropagation()
        } else {
          this.enableChildColliders(true)
        }
      } else {
        this.enableChildColliders(false)
      }
    }

    const onHoverUpdate = (event: InteractorEvent) => {
      if (this.scrollingPaused) {
        return
      }
      const intersection = event.interactor.raycastPlaneIntersection(this._interactable)
      if (intersection) {
        const localIntersection = this.screenTransform.worldPointToLocalPoint(intersection)
        if (
          localIntersection.x < this._enableChildCollidersBoundary.left ||
          localIntersection.x > this._enableChildCollidersBoundary.right ||
          localIntersection.y < this._enableChildCollidersBoundary.bottom ||
          localIntersection.y > this._enableChildCollidersBoundary.top
        ) {
          event.stopPropagation()
        } else {
          this.enableChildColliders(true)
        }
      } else {
        this.enableChildColliders(false)
      }
    }

    const onHoverEnd = () => {
      this.enableChildColliders(false)
    }

    const onTriggerStart = (event: InteractorEvent) => {
      if (this.scrollingPaused) {
        return
      }

      // If there's already an active interactor, cancel it first
      if (this.activeInteractor && this.activeInteractor !== event.interactor) {
        this.cancelCurrentInteractor()
      }

      // Set new active interactor
      this.activeInteractor = event.interactor

      // Reset state for new interaction
      this.resetDragState()
    }

    const onTriggerCanceled = (event: InteractorEvent) => {
      // Only process cancellation from the active interactor
      if (this.activeInteractor !== event.interactor) {
        return
      }

      this.cancelCurrentInteractor()

      // Apply any accumulated velocity from previous gestures if we have momentum
      if (this.accumulatedVelocity.length > 0) {
        // Use existing accumulated velocity for continued scrolling
        this.spring.velocity = this.accumulatedVelocity.uniformScale(FLING_MULTIPLIER)
      } else {
        // No accumulated velocity, stop completely
        this.spring.velocity = vec3.zero()
      }
    }

    const onDragUpdate = (event: InteractorEvent) => {
      if (this.scrollingPaused) {
        return
      }

      if (this.activeInteractor?.inputType !== event.interactor.inputType) {
        return
      }

      if (event.interactor) {
        const interactedElement = getElement(event.interactor.currentInteractable.sceneObject)
        if (interactedElement && interactedElement.isDraggable && !interactedElement.inactive) {
          return
        }

        const intersection = event.interactor.raycastPlaneIntersection(this._interactable)
        if (intersection) {
          this.scrollTweenCancel()

          const interactorPos = this.transform.getInvertedWorldTransform().multiplyPoint(intersection)

          if (!this.interactorUpdated) {
            this.interactorOffset = interactorPos
            this.interactorUpdated = true
            this.isDragging = true
            this.committedSnapTarget.x = null
            this.committedSnapTarget.y = null
            this.cancelChildInteraction(event)
          }

          this.dragAmount = interactorPos.sub(this.interactorOffset)

          let newPosition = this.startPosition.add(interactorPos.sub(this.interactorOffset))
          newPosition.z = 0

          // Apply overscroll resistance if needed
          newPosition = this.applyOverscrollIfNeeded(newPosition)

          this.updateScrollerPosition(newPosition)

          this.scrollDragEvent.invoke({
            startPosition: this.startPosition,
            dragAmount: this.dragAmount
          })

          if (event.target.sceneObject === this.sceneObject || event.propagationPhase === "BubbleUp") {
            // Update velocity from position change
            this.updateVelocityFromPosition(newPosition)
          }
        }
      }
    }

    const onDragEnd = (event: InteractorEvent) => {
      if (this.activeInteractor !== event.interactor) {
        return
      }

      this.activeInteractor = null
      this.isDragging = false

      if (event.target.sceneObject !== this.sceneObject) {
        const interactedElement = getElement(event.target.sceneObject)
        if (!interactedElement?.isDraggable) {
          event.stopPropagation()
        }
      }

      // Apply accumulated velocity for fling behavior
      this.applyAccumulatedVelocity()
    }

    if (this.isSubscribedToEvents === subscribe) return
    this.isSubscribedToEvents = subscribe
    if (subscribe) {
      this.eventUnsubscribes = [
        this._interactable.onHoverEnter.add(onHoverStart.bind(this)),
        this._interactable.onHoverUpdate.add(onHoverUpdate.bind(this)),
        this._interactable.onHoverExit.add(onHoverEnd.bind(this)),
        this._interactable.onInteractorTriggerStart.add(onTriggerStart.bind(this)),
        this._interactable.onTriggerCanceled.add(onTriggerCanceled.bind(this)),
        this._interactable.onDragUpdate.add(onDragUpdate.bind(this)),
        this._interactable.onDragEnd.add(onDragEnd.bind(this))
      ]
    } else {
      this.eventUnsubscribes.forEach((unsubscribe) => unsubscribe())
      this.eventUnsubscribes = []
    }
  }

  /**
   * Helper function to tween scroll
   * @param position final position
   * @param time duration of tweened scroll in milliseconds
   */
  public tweenTo = (position: vec2, time: number) => {
    this.scrollTweenCancel()
    this.spring.velocity = vec3.zero()
    const scrollerLocalPosition = this.scrollerTransform.getLocalPosition()
    const finalPosition = new vec3(position.x, position.y, scrollerLocalPosition.z)

    animate({
      duration: time * 0.001,
      update: (t) => {
        this.updateScrollerPosition(vec3.lerp(scrollerLocalPosition, finalPosition, t))
      },
      cancelSet: this.scrollTweenCancel,
      easing: "ease-in-out-quad"
    })
  }

  /**
   * Gets the viewable window of local space at zero depth.
   * The window ranges from -windowSize.x/2 to windowSize.x/2 on the x-axis (left to right)
   * and -windowSize.y/2 to windowSize.y/2 on the y-axis (bottom to top).
   *
   * @returns VisibleWindow object containing bottomLeft and topRight corners in local space
   */
  public getVisibleWindow(): VisibleWindow {
    const visibleWindow: VisibleWindow = {
      bottomLeft: vec2.zero(),
      topRight: vec2.zero()
    }
    const scrollerLocalPosition = this.scrollerTransform.getLocalPosition()
    visibleWindow.bottomLeft.x = -scrollerLocalPosition.x - this._windowSize.x * 0.5
    visibleWindow.bottomLeft.y = -scrollerLocalPosition.y - this._windowSize.y * 0.5
    visibleWindow.topRight.x = -scrollerLocalPosition.x + this._windowSize.x * 0.5
    visibleWindow.topRight.y = -scrollerLocalPosition.y + this._windowSize.y * 0.5
    return visibleWindow
  }

  /**
   * Gets the viewable window in normalized space at zero depth.
   * The window ranges from -1 to 1 on the x-axis (left to right)
   * and -1 to 1 on the y-axis (bottom to top).
   *
   * @returns VisibleWindow object containing bottomLeft and topRight corners in normalized space
   */
  public getVisibleWindowNormalized(): VisibleWindow {
    const visibleWindow: VisibleWindow = this.getVisibleWindow()
    visibleWindow.bottomLeft.x /= this._scrollDimensions.x * 0.5
    visibleWindow.bottomLeft.y /= this._scrollDimensions.y * 0.5
    visibleWindow.topRight.x /= this._scrollDimensions.x * 0.5
    visibleWindow.topRight.y /= this._scrollDimensions.y * 0.5
    return visibleWindow
  }

  private get topEdge(): number {
    return this._scrollDimensions.y * -0.5 + this._windowSize.y * 0.5
  }

  private get bottomEdge(): number {
    return this._scrollDimensions.y * 0.5 - this._windowSize.y * 0.5
  }

  private get leftEdge(): number {
    return this._scrollDimensions.x * 0.5 - this._windowSize.x * 0.5
  }

  private get rightEdge(): number {
    return this._scrollDimensions.x * -0.5 + this._windowSize.x * 0.5
  }

  /**
   * Sets the size of the masked window viewport in local space.
   *
   * @param size - The window size in local space
   */
  private setWindowSize = (size: vec2) => {
    this._windowSize = size
    this.screenTransform.anchors.left = this._windowSize.x * -0.5
    this.screenTransform.anchors.right = this._windowSize.x * 0.5
    this.screenTransform.anchors.bottom = this._windowSize.y * -0.5
    this.screenTransform.anchors.top = this._windowSize.y * 0.5
    if (this._edgeFade) {
      this.material.mainPass.windowSize = size
      this.material.mainPass.radius = this.maskingComponent.cornerRadius
    }
    this.colliderShape.size = new vec3(this._windowSize.x, this._windowSize.y, 1)
    this.collider.shape = this.colliderShape
  }

  /**
   * Sets the size of the total scrollable area in local space.
   *
   * @param size - The scroll dimensions in local space
   */
  private setScrollDimensions = (size: vec2) => {
    this._scrollDimensions = size
    this.setWindowSize(this._windowSize)
    this.onScrollDimensionsUpdatedEvent.invoke(this._scrollDimensions)
  }

  /**
   * Enables or disables the black fade effect at the edges of the scroll window.
   * This is a rendering trick for transparency.
   *
   * @param enable - true to enable edge fade, false to disable
   */
  private enableEdgeFade = (enable: boolean) => {
    this._edgeFade = enable
    if (enable && !this.rmv) {
      this.createEdgeFade()
    }
    if (this.rmv) {
      this.rmv.enabled = enable
    }
  }

  /**
   * Optimized bounds checking that calculates clamped position and out-of-bounds status in one pass
   * @param scrollPos - The scroll position to check
   * @returns Object containing the clamped position and whether the original position was out of bounds
   */
  private getClampedBoundsAndCheckOutOfBounds(scrollPos: vec3): {
    clamped: vec3
    isOutOfBounds: boolean
  } {
    const clampedX =
      this._scrollDimensions.x === -1
        ? scrollPos.x
        : this._scrollDimensions.x > this._windowSize.x
          ? MathUtils.clamp(scrollPos.x, this.rightEdge, this.leftEdge)
          : 0

    const clampedY =
      this._scrollDimensions.y === -1
        ? scrollPos.y
        : this._scrollDimensions.y > this._windowSize.y
          ? MathUtils.clamp(scrollPos.y, this.topEdge, this.bottomEdge)
          : 0

    const clamped = new vec3(clampedX, clampedY, 0)

    const isOutOfBounds =
      Math.abs(scrollPos.x - clampedX) > EPSILON ||
      Math.abs(scrollPos.y - clampedY) > EPSILON ||
      Math.abs(scrollPos.z - clamped.z) > EPSILON

    return {clamped, isOutOfBounds}
  }

  private isOutOfBounds(scrollPos: vec3): boolean {
    return this.getClampedBoundsAndCheckOutOfBounds(scrollPos).isOutOfBounds
  }

  /**
   * Gets the current scroll velocity (fling velocity).
   *
   * @returns The current velocity as a vec3
   */
  public readonly getVelocity = (): vec3 => this.spring.velocity

  /**
   * Sets the scroll velocity for programmatic scrolling animations.
   *
   * @param velocity - The velocity to set in local space units per frame
   */
  public setVelocity = (velocity: vec2): void => {
    this.spring.velocity = new vec3(velocity.x, velocity.y, this.spring.velocityZ)
  }

  private enableChildColliders = (enable: boolean): void => {
    const childColliders = findAllComponentsInSelfOrChildren(this.sceneObject, "ColliderComponent")

    // Prune cache entries for colliders that no longer exist
    const currentColliders = new Set(childColliders)
    for (const cachedCollider of this.colliderToElementMap.keys()) {
      if (!currentColliders.has(cachedCollider)) {
        this.colliderToElementMap.delete(cachedCollider)
      }
    }

    for (let i = 0; i < childColliders.length; i++) {
      const collider = childColliders[i]
      if (collider === this.collider) continue

      // Get the element from the cache
      let element = this.colliderToElementMap.get(collider)

      // Resolve and cache if not seen in cache before
      if (element === undefined) {
        element = getElement(collider.sceneObject.getParent())
        if (element && element.collider) {
          this.colliderToElementMap.set(element.collider, element)
        }
      }

      if (element && element.collider === collider) {
        collider.enabled = enable && element.enabled && !element.inactive
      } else {
        collider.enabled = enable
      }
    }
  }

  private cancelCurrentInteractor = () => {
    this.activeInteractor = null
    this.isDragging = false
    this.interactorUpdated = false
    this.velocity = vec3.zero()
    this.dragAmount = vec2.zero()
    this.interactorOffset = vec3.zero()
    this.enableChildColliders(false)
    this.scrollTweenCancel()

    this.clearVelocityHistory()

    // Reset spring state to prevent overflow corruption during pause
    this.spring.velocity = vec3.zero()

    // If we're out of bounds, snap back to clamped position immediately
    if (!this._hardStopAtEnds) {
      const currentPosition = this.scrollerTransform.getLocalPosition()
      const boundsCheck = this.getClampedBoundsAndCheckOutOfBounds(currentPosition)
      if (boundsCheck.isOutOfBounds) {
        this.updateScrollerPosition(boundsCheck.clamped)
      }
    }
  }

  private cancelChildInteraction = (e: InteractableEventArgs) => {
    const childInteractables = findAllComponentsInSelfOrChildren(this.sceneObject, Interactable.getTypeName())

    for (let i = 0; i < childInteractables.length; i++) {
      const interactable = childInteractables[i]
      if (interactable === this._interactable) continue
      interactable.triggerCanceled(e)
    }
  }

  private createEdgeFade = () => {
    this.rmv = this.sceneObject.getComponent("RenderMeshVisual") || this.sceneObject.createComponent("RenderMeshVisual")
    this.managedComponents.push(this.rmv)
    this.rmv.mesh = this.mesh
    this.material = this.material.clone()
    this.rmv.mainMaterial = this.material
  }

  private updateScrollerPosition = (newPosition: vec3): vec3 => {
    const currentPos = this.scrollerTransform.getLocalPosition()
    if (this._hardStopAtEnds) {
      if (this._scrollDimensions.y !== -1 && (newPosition.y < this.topEdge || newPosition.y > this.bottomEdge)) {
        newPosition.y = currentPos.y
      }
      if (this._scrollDimensions.x !== -1 && (newPosition.x > this.leftEdge || newPosition.x < this.rightEdge)) {
        newPosition.x = currentPos.x
      }
    }
    if (!this._horizontal) newPosition.x = currentPos.x
    if (!this._vertical) newPosition.y = currentPos.y
    this.scrollerTransform.setLocalPosition(newPosition)

    this._scrollPosition = new vec2(newPosition.x, newPosition.y)

    this.onScrollPositionUpdatedEvent.invoke(new vec2(newPosition.x, newPosition.y))
    return newPosition
  }

  private calculateAxisResistance(displacement: number, maxOverscroll: number): number {
    if (Math.abs(displacement) <= EPSILON) {
      return 0
    }

    // Normalize displacement to 0-1 range
    const normalized = Math.abs(displacement) / maxOverscroll
    // Apply exponential curve with configurable strength
    // Higher strength = more resistance (slower falloff)
    const curveExponent = 0.5 + EDGE_BOUNCE_STRENGTH * 0.2
    const resistanceFactor = Math.pow(1 - Math.min(normalized, 1), curveExponent)
    // Apply resistance
    return Math.sign(displacement) * maxOverscroll * (1 - resistanceFactor)
  }

  /**
   * Applies non-linear overscroll resistance for natural rubber band effect
   * Uses exponential curve for more realistic bounce feel
   */
  private applyOverscrollResistance(displacement: vec3): vec3 {
    const maxOverscroll = new vec2(this._windowSize.x * MAX_OVERSHOOT_FACTOR, this._windowSize.y * MAX_OVERSHOOT_FACTOR)

    const resistedX = this.calculateAxisResistance(displacement.x, maxOverscroll.x)
    const resistedY = this.calculateAxisResistance(displacement.y, maxOverscroll.y)

    return new vec3(resistedX, resistedY, 0)
  }

  private getPageIndexFromPosition(axis: "x" | "y", currentPosition: number): number {
    const snapSize = this.snapRegion[axis]
    const hasBounds = this._scrollDimensions[axis] !== -1

    if (hasBounds) {
      // Bounded scrolling: calculate page index relative to nearEdge
      const nearEdge = axis === "x" ? this.rightEdge : this.topEdge
      const currentPageFloat = (currentPosition - nearEdge) / snapSize
      const currentPageIndex = Math.round(currentPageFloat)
      return currentPageIndex
    } else {
      // Unbounded scrolling: calculate page index relative to center (0)
      const currentPageFloat = currentPosition / snapSize
      const currentPageIndex = Math.round(Math.abs(currentPageFloat)) * Math.sign(currentPageFloat)
      return currentPageIndex
    }
  }

  /**
   * Helper to check if velocity directions match for accumulation
   */
  private shouldAccumulateAxis(accumulated: number, current: number): boolean {
    return accumulated === 0 || Math.sign(current) === Math.sign(accumulated)
  }

  private addVelocityToHistory(velocity: vec3): void {
    // Add to the beginning (most recent)
    this.velocityHistory.unshift(new vec3(velocity.x, velocity.y, velocity.z))

    // Trim to size limit
    if (this.velocityHistory.length > VELOCITY_HISTORY_SIZE) {
      this.velocityHistory.pop()
    }
  }

  /**
   * Calculates weighted average velocity from history for better predictions
   * More recent samples have higher weight
   */
  private getWeightedAverageVelocity(): vec3 {
    if (this.velocityHistory.length === 0) {
      return vec3.zero()
    }

    const weightedVelocity = vec3.zero()
    let totalWeight = 0

    for (let i = 0; i < this.velocityHistory.length; i++) {
      const weight = VELOCITY_HISTORY_WEIGHTS[i] || 0
      const sample = this.velocityHistory[i]

      weightedVelocity.x += sample.x * weight
      weightedVelocity.y += sample.y * weight
      weightedVelocity.z += sample.z * weight

      totalWeight += weight
    }

    // Normalize by total weight (in case we have fewer samples than history size)
    if (totalWeight > 0) {
      weightedVelocity.x /= totalWeight
      weightedVelocity.y /= totalWeight
      weightedVelocity.z /= totalWeight
    }

    return weightedVelocity
  }

  private clearVelocityHistory(): void {
    this.velocityHistory = []
  }

  /**
   * Applies overscroll resistance if the position is out of bounds
   */
  private applyOverscrollIfNeeded(position: vec3): vec3 {
    if (!this._hardStopAtEnds) {
      const boundsCheck = this.getClampedBoundsAndCheckOutOfBounds(position)
      if (boundsCheck.isOutOfBounds) {
        const overshootAmount = position.sub(boundsCheck.clamped)
        const overshootWithResistance = this.applyOverscrollResistance(overshootAmount)
        return boundsCheck.clamped.add(overshootWithResistance)
      }
    }
    return position
  }

  /**
   * Updates velocity based on position change with smoothing and history tracking
   */
  private updateVelocityFromPosition(newPosition: vec3): void {
    const newVelocity = newPosition.sub(this.lastPosition)
    newVelocity.z = 0
    if (
      Math.abs(newVelocity.x) > SIGNIFICANT_VELOCITY_THRESHOLD ||
      Math.abs(newVelocity.y) > SIGNIFICANT_VELOCITY_THRESHOLD
    ) {
      // Apply exponential smoothing to reduce jitter
      this.velocity.x = this.velocity.x * (1 - VELOCITY_SMOOTHING) + newVelocity.x * VELOCITY_SMOOTHING
      this.velocity.y = this.velocity.y * (1 - VELOCITY_SMOOTHING) + newVelocity.y * VELOCITY_SMOOTHING
      this.velocity.z = 0

      // Add to velocity history for better fling predictions
      this.addVelocityToHistory(this.velocity)
    }
    this.lastPosition = newPosition
  }

  /**
   * Resets the drag state for a new interaction (either from direct drag or external control)
   */
  private resetDragState(): void {
    this.startPosition = this.scrollerTransform.getLocalPosition()
    this.lastPosition = this.startPosition
    this.interactorOffset = vec3.zero()
    this.velocity = vec3.zero()
    this.interactorUpdated = false
    this.dragAmount = vec2.zero()

    this.clearVelocityHistory()

    // Capture starting page index for deadzone calculation
    if (this._scrollSnapping) {
      this.committedSnapTarget.x = null
      this.committedSnapTarget.y = null
      this.startingPageIndex.x = this.getPageIndexFromPosition("x", this.startPosition.x)
      this.startingPageIndex.y = this.getPageIndexFromPosition("y", this.startPosition.y)
    }
  }

  /**
   * Applies accumulated velocity to spring for fling behavior
   */
  private applyAccumulatedVelocity(): void {
    // Use weighted average velocity from history for better predictions
    const predictedVelocity = this.getWeightedAverageVelocity()

    this.accumulateVelocity(predictedVelocity)

    // Apply the accumulated velocity to spring
    this.spring.velocity = this.accumulatedVelocity.uniformScale(FLING_MULTIPLIER)
  }

  private accumulateVelocity(currentVelocity: vec3): void {
    const currentTime = getTime() * 1000
    const timeSinceLastGesture = currentTime - this.lastGestureEndTime

    // Reset if too much time passed
    if (timeSinceLastGesture > GESTURE_ACCUMULATION_TIME_MS) {
      this.accumulatedVelocity = currentVelocity
      this.lastGestureEndTime = currentTime
      return
    }

    // Calculate time-based decay factor
    const timeFactor = 1 - timeSinceLastGesture / GESTURE_ACCUMULATION_TIME_MS
    const decayFactor = VELOCITY_DECAY_FACTOR * timeFactor

    // Accumulate per axis if directions match
    this.accumulatedVelocity.x = this.shouldAccumulateAxis(this.accumulatedVelocity.x, currentVelocity.x)
      ? this.accumulatedVelocity.x * decayFactor + currentVelocity.x
      : currentVelocity.x

    this.accumulatedVelocity.y = this.shouldAccumulateAxis(this.accumulatedVelocity.y, currentVelocity.y)
      ? this.accumulatedVelocity.y * decayFactor + currentVelocity.y
      : currentVelocity.y

    this.accumulatedVelocity.z = 0 // Z-axis not used for scrolling

    this.lastGestureEndTime = currentTime
  }

  /**
   * Helper method to handle non-snapping friction-based scrolling for a single axis
   * @param axis - 'x' or 'y' to indicate which axis to process
   * @param currentPosition - current scroll position
   * @param clampedPosition - clamped bounds position
   * @returns object with updated position and whether position should be updated
   */
  private processFrictionScrolling(
    axis: "x" | "y",
    currentPosition: vec3,
    clampedPosition: vec3
  ): {position: vec3; shouldUpdate: boolean} {
    const isHorizontal = axis === "x"
    const velocity = isHorizontal ? this.spring.velocityX : this.spring.velocityY
    const otherAxisVelocity = isHorizontal ? this.spring.velocityY : this.spring.velocityX

    if (Math.abs(velocity) > MINIMUM_SCROLLING_VELOCITY) {
      const newVelocity = velocity * FRICTION_FACTOR
      this.spring.velocity = isHorizontal
        ? new vec3(newVelocity, otherAxisVelocity, this.spring.velocityZ)
        : new vec3(otherAxisVelocity, newVelocity, this.spring.velocityZ)

      const positionDelta = isHorizontal ? new vec3(newVelocity, 0, 0) : new vec3(0, newVelocity, 0)
      const newPosition = currentPosition.add(positionDelta)

      return {position: newPosition, shouldUpdate: true}
    } else if (Math.abs(velocity) > 0) {
      this.spring.velocity = isHorizontal
        ? new vec3(0, otherAxisVelocity, this.spring.velocityZ)
        : new vec3(otherAxisVelocity, 0, this.spring.velocityZ)

      const clampedValue = isHorizontal ? clampedPosition.x : clampedPosition.y
      const newPosition = isHorizontal
        ? new vec3(clampedValue, currentPosition.y, currentPosition.z)
        : new vec3(currentPosition.x, clampedValue, currentPosition.z)

      return {position: newPosition, shouldUpdate: true}
    }

    return {position: currentPosition, shouldUpdate: false}
  }

  /**
   * Helper method to handle snap scrolling logic for a single axis
   * Uses spring physics throughout for smooth, consistent motion
   * Includes dynamic deadzone: must scroll more than 1/4 of a snapRegion to trigger movement
   * Smart boundary handling: ensures snap targets are always within valid scroll boundaries
   * @param axis - 'x' or 'y' to indicate which axis to process
   * @param currentPosition - current scroll position
   * @returns object with updated position and whether position should be updated
   */
  private processSnapScrolling(axis: "x" | "y", currentPosition: vec3): {position: vec3; shouldUpdate: boolean} {
    const isHorizontal = axis === "x"
    const snapSize = this.snapRegion[axis]
    const currentAxisPosition = this.scrollPosition[axis]

    const velocity = isHorizontal ? this.spring.velocityX : this.spring.velocityY

    // Check if we have a committed snap target
    let targetPos = this.committedSnapTarget[axis]

    // Only calculate a new target if we don't have one committed yet
    if (targetPos === null) {
      // Determine which page the current position is in
      const currentPageIndex = this.getPageIndexFromPosition(axis, currentAxisPosition)
      const startPageIndex = this.startingPageIndex[axis]
      const hasBounds = this._scrollDimensions[axis] !== -1

      // Calculate distance traveled from starting page (convert page index to absolute position)
      let startingPagePosition: number
      if (hasBounds) {
        const nearEdge = isHorizontal ? this.rightEdge : this.topEdge
        startingPagePosition = nearEdge + startPageIndex * snapSize
      } else {
        startingPagePosition = startPageIndex * snapSize
      }
      const distanceFromStart = Math.abs(currentAxisPosition - startingPagePosition)

      // Check if we've exceeded the deadzone (one-quarter of snapRegion)
      const hasExceededDeadzone = distanceFromStart > snapSize / 4

      let targetPageIndex = currentPageIndex

      if (hasExceededDeadzone && Math.abs(velocity) > MINIMUM_SCROLLING_VELOCITY) {
        // Use velocity direction and magnitude to determine target
        const velocitySign = Math.sign(velocity)
        const normalizedVelocity = Math.abs(velocity) / snapSize

        // More aggressive page advancement based on velocity
        // Using ceil ensures even small flicks advance at least one page
        targetPageIndex = currentPageIndex + Math.ceil(normalizedVelocity) * velocitySign
      } else if (!hasExceededDeadzone) {
        // Within deadzone, snap back to starting page
        targetPageIndex = startPageIndex
      }

      // This ensures we always snap to valid, reachable pages
      if (hasBounds) {
        const nearEdge = isHorizontal ? this.rightEdge : this.topEdge
        const farEdge = isHorizontal ? this.leftEdge : this.bottomEdge
        const maxValidPageIndex = Math.floor((farEdge - nearEdge) / snapSize)
        targetPageIndex = MathUtils.clamp(targetPageIndex, 0, maxValidPageIndex)
      }

      // Convert page index to position (bounded: nearEdge-relative, unbounded: center-relative)
      if (hasBounds) {
        const nearEdge = isHorizontal ? this.rightEdge : this.topEdge
        targetPos = nearEdge + targetPageIndex * snapSize
      } else {
        targetPos = targetPageIndex * snapSize
      }

      // Commit to this target
      this.committedSnapTarget[axis] = targetPos
    }

    const distanceToTarget = targetPos - currentAxisPosition

    // Use spring physics for smooth approach to target
    if (Math.abs(distanceToTarget) > EPSILON) {
      const targetPosition = isHorizontal
        ? new vec3(targetPos, currentPosition.y, currentPosition.z)
        : new vec3(currentPosition.x, targetPos, currentPosition.z)

      const newPosition = new vec3(currentPosition.x, currentPosition.y, currentPosition.z)
      this.spring.evaluate(currentPosition, targetPosition, newPosition)

      return {position: newPosition, shouldUpdate: true}
    } else {
      // Reached target, clear commitment and stop velocity on this axis
      this.committedSnapTarget[axis] = null

      if (isHorizontal) {
        this.spring.velocity = new vec3(0, this.spring.velocityY, this.spring.velocityZ)
      } else {
        this.spring.velocity = new vec3(this.spring.velocityX, 0, this.spring.velocityZ)
      }

      return {position: currentPosition, shouldUpdate: false}
    }
  }

  private update = () => {
    const scale = this.transform.getWorldScale()

    // calculate frustum visible through scroll window
    this.frustum.setFromNearPlane(
      this.camera,
      this.cameraComponent.far,
      new vec2(
        (this.screenTransform.anchors.right - this.screenTransform.anchors.left) * scale.x,
        (this.screenTransform.anchors.top - this.screenTransform.anchors.bottom) * scale.y
      ),
      this.transform
    )

    if (this.debugRender) {
      this.frustum.render()
    }

    /**
     * If the scroll window is scrollingPaused, don't update the scroll position
     * and do not update the scroller position or velocity
     */
    if (this.scrollingPaused) return

    /**
     * If the scroll window is controlled externally (e.g., by ScrollBar),
     * don't apply spring velocity, friction, or snapping effects
     */
    if (this._isControlledExternally) {
      return
    }

    // Early exit optimization: skip physics calculations when idle
    if (!this.isDragging) {
      const velocity = this.spring.velocity
      const hasVelocity = velocity.length > EPSILON

      if (!hasVelocity) {
        // Check if we're settled in bounds
        const cScrollPosition = this.scrollerTransform.getLocalPosition()
        const isOutOfBounds = !this._hardStopAtEnds && this.isOutOfBounds(cScrollPosition)

        if (!isOutOfBounds) {
          // Completely idle and in bounds - skip all physics updates
          return
        }
      }
    }

    if (this._horizontal || this._vertical) {
      // overshoot logic
      if (!this.isDragging && !this._hardStopAtEnds) {
        let cScrollPosition = this.scrollerTransform.getLocalPosition()
        const boundsCheck = this.getClampedBoundsAndCheckOutOfBounds(cScrollPosition)

        if (boundsCheck.isOutOfBounds) {
          this.spring.evaluate(cScrollPosition, boundsCheck.clamped, cScrollPosition)

          const boundsCheckAfterSpring = this.getClampedBoundsAndCheckOutOfBounds(cScrollPosition)
          if (!boundsCheckAfterSpring.isOutOfBounds) {
            this.updateScrollerPosition(boundsCheck.clamped)
            this.spring.velocity = vec3.zero()
          } else {
            this.updateScrollerPosition(cScrollPosition)
          }
        } else {
          // Track whether any axis needs position update
          let shouldUpdatePosition = false

          if (this._horizontal) {
            if (this.scrollSnapping && this.snapRegion.x > 0) {
              const result = this.processSnapScrolling("x", cScrollPosition)
              cScrollPosition.x = result.position.x
              shouldUpdatePosition = shouldUpdatePosition || result.shouldUpdate
            } else {
              const result = this.processFrictionScrolling("x", cScrollPosition, boundsCheck.clamped)
              cScrollPosition = result.position
              shouldUpdatePosition = shouldUpdatePosition || result.shouldUpdate
            }
          }
          if (this._vertical) {
            if (this.scrollSnapping && this.snapRegion.y > 0) {
              const result = this.processSnapScrolling("y", cScrollPosition)
              cScrollPosition.y = result.position.y
              shouldUpdatePosition = shouldUpdatePosition || result.shouldUpdate
            } else {
              const result = this.processFrictionScrolling("y", cScrollPosition, boundsCheck.clamped)
              cScrollPosition = result.position
              shouldUpdatePosition = shouldUpdatePosition || result.shouldUpdate
            }
          }

          if (shouldUpdatePosition) {
            this.updateScrollerPosition(cScrollPosition)
          }
        }
      }
    }
  }
}
