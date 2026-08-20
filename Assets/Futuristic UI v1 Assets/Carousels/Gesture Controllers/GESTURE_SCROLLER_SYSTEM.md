# Gesture Controllers System Guide & API Reference

The **Gesture Controllers** system provides hands-free, motion-based controls for both `UnifiedPolygonalCarousel` and legacy carousels in Spectacles (2024). It consists of two dedicated components:
1. **`CarouselGestureApp` (`Carousel Fist GestureApp.ts`)**: Fist-activation controller that anchors the carousel to the user's hand and controls rotation via hand pose.
2. **`SwordSwipeScroller` (`SwordSwipeScroller.ts`)**: 6DoF hand-swipe momentum scroller that tracks circular slashing motions using the **Sword Finger Gesture** to fling the carousel.

<p align="center">
  <img src="../../../../docs/media/runtime sword finger.gif" alt="Sword Finger Gesture and Fist Anchoring" width="100%" />
  <br/>
  <em>Figure: Two-handed spatial interaction with fist anchoring and 2-finger sword-swipe kinetic scroller.</em>
</p>

---

## ⚔️ The Sword Finger Gesture (SwordSwipeScroller)

The **Sword Finger** is the hand pose required to activate `SwordSwipeScroller`. It mimics pointing two fingers forward like a sword:

| Finger | State | Detection Method |
| :--- | :--- | :--- |
| ☝️ **Index** | ✅ Extended (straight out) | `indexTip.distance(wrist) > extendThreshold` (~9 cm) |
| 🖕 **Middle** | ✅ Extended (straight out) | `middleTip.distance(wrist) > extendThreshold` (~9 cm) |
| 💍 **Ring** | ✅ Curled (closed in) | `ringTip.distance(wrist) < curlThreshold` (~12 cm) |
| 🤙 **Pinky** | ✅ Curled (closed in) | `pinkyTip.distance(wrist) < curlThreshold` (~12 cm) |
| ✌️ **Index + Middle tips** | Close together | `indexTip.distance(middleTip) < 5.0 cm` |

> [!TIP]
> All detection thresholds use **hysteresis**: once you are actively swiping, the thresholds loosen slightly (curl threshold expands to 14 cm, extend threshold relaxes to 7 cm, tips allowed up to 8 cm apart) to prevent accidental gesture cancellation during mid-swipe motion.

---

## 1. System Overview & Design Rationale

### What These Controllers Do
Both components extend the carousel interaction model beyond direct SIK pinch-on-card dragging — giving developers higher-level gesture triggers without requiring the user to aim and tap individual 3D button cards.

* **Fist Activation (`CarouselGestureApp`)**:
  * **Concept**: The user makes a natural fist gesture held for a configurable duration (`gestureHoldTime`, e.g. 0.5s). The carousel pops out anchored to the middle knuckle position (`mid-0`) in world space.
  * **Spatial Anchoring**: Moving the fist translates the carousel in 3D space via smooth damped lerp. Opening the hand triggers the exit stagger animation and hides the carousel.

* **Sword Swipe Scroller (`SwordSwipeScroller`)**:
  * **Concept**: Inspired by swiping a ribbon or spinning a wheel with two fingers. The user forms the **Sword Finger Gesture** (index + middle extended, ring + pinky curled) and sweeps their hand in a circular arc around the carousel's plane.
  * **Virtual Cylinder Interaction Zone**: Rather than tracking the hand anywhere in space, `SwordSwipeScroller` defines a virtual cylindrical shell centered on the carousel. The hand must be within the shell to register as scrolling. The cylinder is defined by two constraints:
    - **Radial Ring**: The hand's distance from the carousel center must be within `engageMargin` cm of the carousel's `radius`. Too far inside or outside the ring = no engagement.
    - **Depth Plane**: The hand's depth offset from the carousel plane must be within `depthMargin` cm. Too far behind or in front = sword lifted, drag ends.
  * This design creates a natural "touch zone" that feels like running fingers along the rim of a physical spinning wheel — only when you reach into the right area does the scroll begin, and pulling away or lifting off naturally ends the drag, which then triggers momentum fling and slot snap.

---

## 2. Technical Hand Tracking Math

### Fused Fist & Grab Detection Engine (`CarouselGestureApp`)

`CarouselGestureApp` uses a **fused dual-detection pipeline** combining Snap's hardware ML classifier with continuous Euclidean bone distance:

1. **Snap Native `GestureModule` (`useNativeGrab`)**:
   - Listens to Snap OS-level `getGrabBeginEvent` and `getGrabEndEvent` on both hands.
   - Provides zero-drift, ML-based grab recognition across all hand sizes without relying solely on bone distance math.
2. **Euclidean Bone Distance (`indexTip` $\leftrightarrow$ `wrist`)**:
   $$\text{fistDist} = \|\vec{P}_{\text{indexTip}} - \vec{P}_{\text{wrist}}\|$$
   - When $\text{fistDist} < \text{fistDistanceThreshold}$ (e.g. $< 10.0\text{ cm}$), the hand is recognized as closed.
   - Provides progressive hold timer capabilities (`gestureHoldTime = 0.5s`) before opening the menu.
3. **Fused State (`isBoneFist || isNativeGrab`)**:
   - Ensures continuous, rock-solid tracking: if finger occlusion causes the bone distance to spike momentarily, the native Grab event keeps the carousel pinned to your hand without dropping out.
   - **Hysteresis Protection**: When the carousel is already visible, the bone threshold expands by $+4.0\text{ cm}$ to prevent inadvertent menu flickering.

### Angular Arc Tracking & Virtual Cylinder Engagement (`SwordSwipeScroller`)

`SwordSwipeScroller` uses a **virtual cylindrical shell** centered on the carousel to define the interaction zone. Engagement only begins when two conditions are simultaneously met (on top of the Sword Finger Gesture):

**1. Radial Distance Check — Are you at the rim?**

`indexKnuckle` position is projected into the carousel's local coordinate space. Radial distance from center is compared against the carousel `radius`:

$$\text{radialDist} = \sqrt{P_{\text{local.X}}^2 + P_{\text{local.Y}}^2} \quad (\text{XY plane example})$$

$$\text{isNearEdge} = |\text{radialDist} - \text{radius}| < \text{engageMargin}$$

**2. Depth Distance Check — Is the sword in the plane?**

The hand's depth from the carousel plane (Z in XY mode) must be within `depthMargin`:

$$\text{isNotLifted} = |P_{\text{local.Z}}| < \text{depthMargin}$$

Moving the hand outside either boundary immediately cancels the swipe — calling `externalDragEnd()` which triggers momentum fling and slot snap.

**3. Angular Delta → Scroll Velocity**

While engaged, the angular position of `indexKnuckle` projected onto the carousel plane is tracked frame-to-frame:

$$\theta = \text{atan2}(P_{\text{local.Y}}, P_{\text{local.X}})$$

$$\Delta\theta = \text{wrap}(\theta_{\text{current}} - \theta_{\text{last}},\ {-\pi},\ {+\pi})$$

$$\text{scrollDelta} = \frac{\Delta\theta}{2\pi} \times \text{slotCount} \times \text{angularSensitivity}$$

Calls `(carousel as any).externalScrollBy(scrollDelta)` every frame during active engagement.

> [!NOTE]
> Both `engageMargin` and `depthMargin` use **hysteresis**: once a swipe is active, each threshold expands by 1.5× (e.g. 15 cm → 22.5 cm) so normal arc motion doesn't prematurely snap the drag off.

---


## 3. Inspector Controls & Values Breakdown

### `CarouselGestureApp` (`Carousel Fist GestureApp.ts`)

| Inspector Property | Script Property | Type | Default | Description / Usage |
| :--- | :--- | :--- | :--- | :--- |
| **Carousel Reference** | `carousel` | `ScriptComponent` | *Required* | Drag your `VirtualizedPolygonalCarousel` or `ManualPolygonalCarousel` script component here |
| **Main Camera** | `camera` | `Camera` | *Required* | Main camera reference for billboarding rotation |
| **Hand Selection** | `handType` | `number` (Enum) | `2` (Both) | `0` = Right Hand Only, `1` = Left Hand Only, `2` = Both Hands (detects active fist) |
| **Fist Offset** | `fistSidewardOffset` | `vec3` | `(0, 0, 0)` | Position offset in cm applied to the carousel relative to fist knuckle |
| **Gesture Hold Time** | `gestureHoldTime` | `number` | `0.5` | Duration in seconds the fist must be held to show the carousel |
| **Fist Threshold** | `fistDistanceThreshold` | `number` | `10.0` | Max distance in cm between index tip and wrist to register as fist |
| **Position Smoothing** | `positionSmoothing` | `number` | `10.0` | Damping speed for smooth 3D position tracking (`1.0` = smooth, `30.0` = rigid) |
| **Hand Interactor** | `handInteractor` | `ScriptComponent` | *Optional* | Drag SIK `HandInteractor` here to temporarily disable ray/poke cursors when menu is open |
| **Debug Text** | `debugText` | `Text` | *Optional* | Drag 2D/3D `Text` component here to display real-time tracking data and timers |

---

### `SwordSwipeScroller` (`SwordSwipeScroller.ts`)

| Inspector Property | Script Property | Type | Default | Description / Usage |
| :--- | :--- | :--- | :--- | :--- |
| **Carousel Reference** | `carousel` | `ScriptComponent` | *Required* | Drag target `VirtualizedPolygonalCarousel` or `ManualPolygonalCarousel` script here |
| **Hand Type** | `handType` | `string` | `"right"` | `"right"` = Right Hand Only, `"left"` = Left Hand Only |
| **Engage Margin** | `engageMargin` | `number` | `15.0` | How close in cm the hand must be to the carousel radius edge to engage a swipe |
| **Depth Margin** | `depthMargin` | `number` | `10.0` | Maximum depth in cm from the carousel plane before the finger is considered lifted |
| **Angular Sensitivity** | `angularSensitivity` | `number` | `1.0` | Multiplier for scroll speed from angular hand movement |
| **Invert Scroll** | `invertScroll` | `boolean` | `false` | Flips the direction of carousel rotation relative to hand movement |
| **Debug Text** | `debugText` | `Text` | *Optional* | Drag a `Text` component to display real-time swipe tracking state |

---

## 4. Integration & Interaction Rules

> [!IMPORTANT]
> **Enabling External Control on Carousel Components**:
> For `SwordSwipeScroller` or `CarouselGestureApp` to drive carousel rotation, make sure **`enableExternalDrag`** is set to **`true`** in the target carousel's Inspector panel.
> 
> * **`enableExternalDrag = true`**: Allows `externalScrollBy`, `externalDragStart`, `externalDragUpdate`, and `externalDragEnd` calls to drive rotation.
> * **`enableDirectDrag = true`**: Allows SIK hand ray/pinch touch dragging directly on individual card buttons.
> * Both toggles operate independently, giving you full control over interaction modes.
