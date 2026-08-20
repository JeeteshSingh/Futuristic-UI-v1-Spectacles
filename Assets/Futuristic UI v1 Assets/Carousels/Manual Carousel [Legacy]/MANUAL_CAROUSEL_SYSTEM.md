# ManualPolygonalCarousel System Guide & Complete API Reference

The **ManualPolygonalCarousel** system is a UI layout component designed for Lens Studio and Spectacles (2024). It arranges existing child SceneObject buttons along a circular arc on the XY plane, providing smooth touch/pinch drag interactions, momentum flinging, magnetic slot snapping, edge fading, and staggered entry/exit animations.

<p align="center">
  <img src="../../../../docs/media/manual pokescroll.gif" alt="Manual Carousel Interaction" width="60%" />
  <br/>
  <em>Figure: Manual Carousel distributing child buttons along a circular arc with direct poke-and-drag physics.</em>
</p>

---

## Primary Use Case: When to Use Manual Carousel vs. Virtualized Carousel

| Feature | Virtualized Carousel (`VirtualizedPolygonalCarousel`) | Manual Carousel (`ManualPolygonalCarousel`) |
| :--- | :--- | :--- |
| **Card Generation** | Instantiates recycled prefabs dynamically from data arrays (`setItems()`). | Operates directly on **existing child SceneObjects** placed under `carouselRoot`. |
| **Dataset Size** | Large or infinite lists (e.g., 39 apps, 100 items, live feeds). | **Fixed, static button counts** (e.g. 5, 8, 12 buttons). |
| **Card Customization** | All cards share identical prefab geometry and size. | **Individual custom sizes, unique polygon shapes, or unique child layouts per button.** |
| **Click / Tap Handling** | Injected via `CarouselItemData.onTap` callback array. | **Configured individually per button in Inspector** (or via `ManualCarouselDemoController`). |

### Why Choose Manual Carousel?
Use `ManualPolygonalCarousel` when you have a specific, fixed number of buttons (e.g. 12 features or 5 main app tabs) where each button has **custom inspector action callbacks**, **custom individual sizes**, or **unique custom iconography/layouts** that should not be dynamically overwritten by a dataset array.

---

## Button Compatibility & SIK Parity

* **PolygonalButton Compatibility**: Fully optimized for child objects containing `PolygonalButton` components. It automatically syncs button opacity, Z-pop displacement, and state color transitions.
* **Spectacles UIKit / SIK Parity**: Compatible with any Spectacles UIKit / SIK button component (or custom script inheriting from `BaseButton` or exposing `isOn` and `opacity` properties).

---

## Inspector Inputs vs. Script API Mapping

| Inspector Section | Inspector Input Name | Script API Reference (TypeScript) | Type | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Carousel Root** | `carouselRoot` | *(Inspector Only)* | `SceneObject` | Parent object containing static child buttons |
| **Visible Slots** | `slotCount` | *(Inspector Only)* | `number` | Number of visible card slots in the arc |
| **Buffer Slots** | `bufferSlots` | *(Inspector Only)* | `number` | Extra hidden slots for smooth off-screen wrapping |
| **Arc Degrees** | `arcAngleDegrees` | *(Inspector Only)* | `number` | Visible arc angle. Keep < 300° to prevent overlapping |
| **Arc Offset** | `arcOffsetDegrees` | *(Inspector Only)* | `number` | Rotates the whole arc around the circle in degrees (0° = Top, 90° = Right, 180° = Bottom, 270° = Left) |
| **Slot Offset** | `slotOffset` | *(Inspector Only)* | `number` | Shifts the starting button index along the circle (e.g., +1, -1) |
| **Radius** | `radius` | *(Inspector Only)* | `number` | Radius in cm (~6cm for hand palm, ~30cm for floating menu) |
| **Align To Circle**| `alignRotationToCircle`| *(Inspector Only)* | `boolean` | Must be `true` for radial alignment (otherwise flat cards) |
| **Layout Axis** | `layoutAxis` | *(Inspector Only)* | `"XY" \| "XZ" \| "YZ"` | **Recommended: "XY"**. Standard straight face-on circle |
| **Rotation Offset**| `rotationOffset` | *(Inspector Only)* | `vec3` | Rotates button mesh orientation within its slot |
| **Toggle Mode** | `enableToggleBehavior` | *(Inspector Only)* | `boolean` | Exclusive radio-button toggle mode across items |
| **Allow All Off** | `allowAllTogglesOff` | *(Inspector Only)* | `boolean` | Allows deselecting active item on second tap |
| **Direct Drag** | `enableDirectDrag` | *(Inspector Only)* | `boolean` | Enable for direct SIK hand ray/pinch card dragging |
| **External Drag** | `enableExternalDrag` | *(Inspector Only)* | `boolean` | Enable for sword swipe / gesture apps (`externalScrollBy`) |
| **Animate On Start**| `animateOnStart` | *(Inspector Only)* | `boolean` | `true` for dev preview; `false` for gesture-triggered lenses |
| **Entry Anim** | `enableEntryAnimation` | `carousel.playEntryAnimation()` | `void` | Triggers pop-in stagger animation (call programmatically) |
| **Exit Anim** | *(same toggle: `enableEntryAnimation`)* | `carousel.playExitAnimation()` | `void` | Triggers pop-out exit animation (call programmatically) |

---

## Detailed Section-by-Section Usage & Options Guide

### 1. Core Setup
* **`carouselRoot`**: The parent `SceneObject` containing all your manually created child buttons.
  > [!IMPORTANT]
  > **Architectural Usage**: `carouselRoot` is the object you translate and rotate in scripts (e.g. anchoring to the user's palm via `HandMenuHelper` or `CarouselGestureApp`). Manual Carousel fetches all button script components attached under `carouselRoot` and positions them along the circular arc without breaking internal slot math.

---

### 2. Layout & Customization
* **`slotCount`**: The number of buttons visible concurrently within the active carousel arc (e.g. `5`).
* **`bufferSlots`**: Hidden off-screen slots allocated on both sides of the visible arc to ensure smooth wrapping during scrolling.
* **`arcAngleDegrees`**: Defines the total angle span of the carousel arc.
  > [!WARNING]
  > **360° Overlap Warning**: Setting `arcAngleDegrees` to `360` is NOT recommended because buttons will overlap! Keep `arcAngleDegrees` **less than 300°** (e.g., `180°` to `270°`) to get a clean, non-overlapping circular arc.
* **`arcOffsetDegrees`**: Rotates the position of the entire circle in degrees:
  * `0°`: **12 o'clock (Top)**
  * `90°`: **3 o'clock (Right)**
  * `180°`: **6 o'clock (Bottom)**
  * `270°` / `-90°`: **9 o'clock (Left)**
* **`slotOffset`**: Integer offset that shifts which button starts at the primary angle without rotating the wheel geometry (`0` = default, `1` = shift forward by 1 slot, `-1` = shift backward by 1 slot).
* **`radius`**: Distance from the carousel center in cm. Requires experimentation depending on the use case:
  * **~6.0 cm**: Ideal for tight hand/palm-anchored menus.
  * **~30.0 cm**: Ideal for larger world-floating HUD menus.
* **`alignRotationToCircle`**: **MUST BE ENABLED (`true`)** to rotate each button radially along the circular path. If disabled (`false`), cards spawn in circular positions but face flat/straight without radial rotation.
* **`layoutAxis`**: Determines the 3D plane alignment of the circle (`XY`, `XZ`, `YZ`).
  * **Recommended: `"XY"`** — Renders a clean, face-on straight circle.
  * If selecting **`"XZ"` (horizontal flat table plane)** or **`"YZ"` (side profile plane)**, ensure your `rotationOffset` and parent orientation are adjusted to align with that plane.
* **`faceInward`**: Controls whether card faces point inward toward the circle center or outward.
* **`faceCamera` / `camera`**: Experimental billboarding option to force cards to rotate toward the camera.
* **`rotationOffset`**: Rotates the button mesh inside its slot (default `{0, 0, 90}`). Use this to align custom button orientation so they sit correctly along the arc.
* **`fadeAtEdges` & `fadeRange`**: Smoothly scales down and fades out card opacity toward the outer edges of the arc, making slot wrapping completely smooth and natural.

---

### 3. Features & External Interaction
* **`enableDirectDrag`**:
  * **Enable (`true`)**: Registers direct SIK hand ray/pinch/poke drag event listeners on each card button so users can rotate the carousel directly by touching or dragging card surfaces.
  * **Disable (`false`)**: Completely disables direct SIK card touch drag event listeners.
* **`enableExternalDrag`**:
  * **Enable (`true`)**: Enables external drag API methods (`externalScrollBy`, `externalDragStart`, `externalDragUpdate`, `externalDragEnd`) so external gesture controllers (e.g. `SwordSwipeScroller` or `CarouselGestureApp`) can drive rotation.
  * **Disable (`false`)**: Causes external scroll calls from gesture controllers to be safely ignored.
* **Independent Controls & Interaction Rule**:
  > [!IMPORTANT]
  > Both toggles operate independently. You can enable direct hand dragging (`enableDirectDrag = true`), external gesture scrolling (`enableExternalDrag = true`), or both simultaneously depending on your interaction requirements.
* **`invertDrag`**: On (`true`) by default because pulling a physical ribbon feels natural. Disable if you want opposite touch direction.
* **`dragSensitivity` / `inertiaDamping` / `snapSharpness` / `minVelocityToSnap` / `maxDragVelocity`**: Tuning parameters for testing touch drag response, fling velocity, and magnetic slot snapping.
* **`enableToggleBehavior`**: Enables exclusive radio-button selection mode across child buttons (only 1 button active at a time).
* **`allowAllTogglesOff`**: When `true`, tapping an already-selected button toggles it off, leaving no buttons selected.

---

### 4. Entry Animations & Development Workflow
* **`enableEntryAnimation`**: Enables staggered pop-in and pop-out scaling animations.
* **`animateOnStart`**:
  > [!TIP]
  > **Workflow Tip**: Keep `animateOnStart = true` while developing inside Lens Studio to preview the entry pop-in animation on start. **Uncheck `animateOnStart = false` for production deployment** so the carousel stays hidden on lens open until programmatically triggered by a hand gesture or script!
* **`entryDuration` / `entryStaggerTime`**: Controls pop-in scale duration and slot delay offset.
* **`staggerDirection`**:
  * `0`: **Left to Right** (Leftmost card pops first)
  * `1`: **Right to Left** (Rightmost card pops first)
  * `2`: **Center Outward** (Center card pops first, expanding outwards)

---

## Setting Up Individual Button Callbacks

Unlike `VirtualizedPolygonalCarousel` (which dynamically overwrites button properties from a `CarouselItemData` array), `ManualPolygonalCarousel` **does NOT handle `onTap` arrays or overwrite button callbacks**.

### How to Bind Actions:
1. Select each child button SceneObject under `carouselRoot`.
2. Configure button callbacks directly on the button's script component in the Inspector (e.g., calling custom functions or playing audio).
3. Alternatively, attach a controller script like `ManualCarouselDemoController` to expose `onButton0`..`11` functions that hook into each button's Inspector events!

---

## Complete Public API Reference (Script Access)

Access `ManualPolygonalCarousel` via:
`const carousel = sceneObject.getComponent("Component.ScriptComponent") as ManualPolygonalCarousel;`

### 1. Trigger Entry & Exit Animations

```typescript
// Play pop-in entry animation (programmatically triggered on gesture detection)
carousel.playEntryAnimation();

// Play pop-out exit animation (programmatically triggered on gesture release)
carousel.playExitAnimation();
```

---

### 2. Hierarchy Rebuild

```typescript
// Re-fetches child button objects under carouselRoot and updates layout
carousel.rebuild();
```

---

### 3. External Driver API (Sword Swipe / Hand Controllers)

When `enableExternalDrag` is set to `true`, use these methods to drive carousel scrolling from custom hand gestures or input controllers:

```typescript
// Call on gesture start
carousel.externalDragStart();

// Call on gesture move (pass delta float value)
carousel.externalDragUpdate(deltaX);

// Scroll by discrete step offset
carousel.externalScrollBy(-1.0); // Scroll right 1 slot

// Call on gesture release (triggers momentum fling & slot snap)
carousel.externalDragEnd();
```

---

### 4. Dynamic Selection & Slot Count

```typescript
// Programmatically select a slot index as the active toggle
carousel.selectCard(0); // Selects Button 1 and turns off other cards

// Dynamically change visible slot count at runtime
carousel.setSlotCount(7);
```
