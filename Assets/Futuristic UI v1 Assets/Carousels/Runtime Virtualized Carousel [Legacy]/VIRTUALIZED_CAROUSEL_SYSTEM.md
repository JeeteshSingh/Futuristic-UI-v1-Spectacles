# VirtualizedPolygonalCarousel System Guide & Complete Reference

The **VirtualizedPolygonalCarousel** system is a high-performance 3D UI carousel component designed for Lens Studio and Spectacles (2024). It dynamically recycles a tiny fixed pool of physical 3D button prefabs along a circular arc to display arbitrarily large or infinite datasets (e.g. 39 apps, 100 items, or live data feeds) with zero draw-call penalty or memory bloat.

<p align="center">
  <img src="../../../../docs/media/runtime sword finger.gif" alt="Runtime Virtualized Carousel Interaction" width="100%" />
  <br/>
  <em>Figure: Virtualized Carousel template recycling driven by two-handed sword-swipe kinetic scrolling and native SIK pinch selection.</em>
</p>

---

## Button Prefab Parity & Setup

While optimized for the **`PolygonalButton.prefab`**, `VirtualizedPolygonalCarousel` is **100% compatible with standard rectangular Spectacles UIKit `BaseButton` prefabs** or any custom interactive button prefab.
* When paired with `PolygonalButton`, it dynamically syncs custom shape geometry, corner filleting, state colors, and child opacities.
* When paired with standard rectangular buttons, it binds text, textures, and interaction events identically.

---

## Why Use Virtualization?

1. **Draw-Call & Memory Optimization**: Instantiating 39+ heavy 3D button prefabs creates severe draw call overhead, high frame times, and battery drain on Spectacles AR glasses. Virtualization creates only `slotCount` + `bufferSlots` (e.g. 5 + 2 = **7 physical cards** total) and continuously recycles them as you scroll.
2. **Infinite Data Support**: Display 10 items, 39 items, 100 items, or live feeds without changing scene hierarchy or increasing physical object counts.
3. **Seamless Recycling**: Uses edge scaling & alpha fading (`fadeAtEdges`) so physical button recycling at the arc boundaries is completely invisible to the user.
4. **Kinetic Inertia & Snap Dynamics**: Smooth, physics-driven dragging, momentum flinging, and snap-to-slot magnetic alignment.
5. **External Driver API**: Allows external gesture systems (e.g. `SwordSwipeScroller` or `CarouselGestureApp`) to drive carousel rotation seamlessly.

---

## Inspector Inputs vs. Script API Mapping

| Inspector Section | Inspector Input Name | Script API Reference (TypeScript) | Type | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Button Prefab** | `buttonPrefab` | *(Inspector Only)* | `ObjectPrefab` | Prefab containing `PolygonalButton` or `BaseButton` |
| **Button Scale** | `buttonScale` | *(Inspector Only)* | `number` | Scale multiplier for each instantiated button |
| **Carousel Root** | `carouselRoot` | *(Inspector Only)* | `SceneObject` | Parent container translated/rotated to move carousel |
| **Data Count** | `dataItemCount` | *(Fallback default)* | `number` | Default fallback item count if `setItems()` is not called |
| **Set Items Data** | *(Dynamic)* | `carousel.setItems(items)` | `CarouselItemData[]` | Primary dynamic data injection API |
| **Visible Slots** | `slotCount` | `carousel.setSlotCount(count)` | `number` | Number of visible card slots in the arc |
| **Buffer Slots** | `bufferSlots` | *(Inspector Only)* | `number` | Extra off-screen slots allocated for smooth recycling |
| **Arc Degrees** | `arcAngleDegrees` | *(Inspector Only)* | `number` | Visible arc angle. Keep < 300° to prevent overlapping |
| **Arc Offset** | `arcOffsetDegrees` | *(Inspector Only)* | `number` | Rotates the whole arc around the circle in degrees (0° = Top, 90° = Right, 180° = Bottom, 270° = Left) |
| **Slot Offset** | `slotOffset` | *(Inspector Only)* | `number` | Shifts the starting item index along the circle (e.g., +1, -1) |
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

### 1. Core Setup & Data
* **`buttonPrefab`**: Drag your `PolygonalButton.prefab` (or rectangular button prefab) here. This is the 3D card prefab that will be instantiated into the virtual slot pool.
* **`buttonScale`**: A scale multiplier that sets the baseline size for every instantiated button card.
* **`carouselRoot`**: The parent `SceneObject` where all physical card slots will be parented and positioned.
  > [!IMPORTANT]
  > **Architectural Usage**: `carouselRoot` is the object you move and track in scripts! For example, when anchoring the carousel to the user's hand/palm via `HandMenuHelper` or `CarouselGestureApp`, you translate and rotate `carouselRoot`. The carousel slot wrapper objects automatically move with `carouselRoot` without breaking internal circular positioning math.
* **`dataItemCount`**: Set by default to `20`, but **not strictly relevant** during runtime because you inject real items dynamically via `carousel.setItems(items)`.

---

### 2. Layout & Customization
* **`slotCount`**: The number of cards visible concurrently within the active carousel arc (e.g. `5`).
* **`bufferSlots`**: Hidden off-screen slots allocated on both sides of the visible arc to ensure smooth wrapping during scrolling (e.g. `2`).
* **`arcAngleDegrees`**: Defines the total angle span of the carousel arc.
  > [!WARNING]
  > **360° Overlap Warning**: Setting `arcAngleDegrees` to `360` is NOT recommended because cards will overlap! Keep `arcAngleDegrees` **less than 300°** (e.g., `180°` to `270°`) to get a clean, non-overlapping circular arc.
* **`arcOffsetDegrees`**: Rotates the position of the entire circle in degrees:
  * `0°`: **12 o'clock (Top)**
  * `90°`: **3 o'clock (Right)**
  * `180°`: **6 o'clock (Bottom)**
  * `270°` / `-90°`: **9 o'clock (Left)**
* **`slotOffset`**: Integer offset that shifts which data index starts at the primary angle without rotating the wheel geometry (`0` = default, `1` = shift forward by 1 slot, `-1` = shift backward by 1 slot).
* **`radius`**: Distance from the carousel center in cm. Requires experimentation depending on the use case:
  * **~6.0 cm**: Ideal for tight hand/palm-anchored menus.
  * **~30.0 cm**: Ideal for larger world-floating HUD menus.
* **`alignRotationToCircle`**: **MUST BE ENABLED (`true`)** to rotate each button radially along the circular path. If disabled (`false`), cards spawn in circular positions but face flat/straight without radial rotation.
* **`layoutAxis`**: Determines the 3D plane alignment of the circle (`XY`, `XZ`, `YZ`).
  * **Recommended: `"XY"`** — Renders a clean, face-on straight circle.
  * If selecting **`"XZ"` (horizontal flat table plane)** or **`"YZ"` (side profile plane)**, ensure your `rotationOffset` and parent orientation are adjusted to align with that plane.
* **`faceInward`**: Controls whether card faces point inward toward the circle center or outward.
* **`faceCamera` / `camera`**: Experimental billboarding option to force cards to rotate toward the camera. Use for specific experimentation only.
* **`rotationOffset`**: Rotates the button mesh inside its slot (default `{0, 0, 90}`). Use this to align custom button prefabs so they sit correctly along the arc.
* **`fadeAtEdges` & `fadeRange`**:
  * Gives smooth scaling-down and alpha-fading toward the outer edges of the arc.
  * Ensures that when cards reach the end of the arc and get recycled to the opposite side, the transition and recycling is completely invisible and non-jarring to the user.

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
* **`dragSensitivity` / `inertiaDamping` / `snapSharpness` / `minVelocityToSnap` / `maxDragVelocity`**: Tuning parameters for testing touch drag response, fling velocity, and magnetic slot snapping to find what feels best for your lens.
* **`enableToggleBehavior`**: Enables exclusive radio-button selection mode across virtual items (only 1 item active at a time).
* **`allowAllTogglesOff`**: When `true`, tapping an already-selected button toggles it off, leaving no items selected.

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

## Data Structure (`CarouselItemData`)

Inject data into the carousel using the `CarouselItemData` type:

```typescript
export type CarouselItemData = {
  title: string                           // Primary text header displayed on child Text
  subtitle?: string                       // Optional subtitle string
  texture?: Texture                       // Main background texture assigned to child Image
  icon?: Texture                          // Optional icon texture assigned to child Image
  onTap?: (isSelected?: boolean) => void  // Callback triggered when item is tapped/toggled
}
```

---

## Complete Public API Reference (Script Access)

Access `VirtualizedPolygonalCarousel` via:
`const carousel = sceneObject.getComponent("Component.ScriptComponent") as VirtualizedPolygonalCarousel;`

### 1. Assign Data Items (`setItems`)

```typescript
// Define dynamic items array
const items: CarouselItemData[] = [
  {
    title: "App 1",
    texture: textureAsset1,
    onTap: (isSelected) => {
      print("App 1 Tapped! Toggled state: " + isSelected);
    }
  },
  {
    title: "App 2",
    texture: textureAsset2,
    onTap: (isSelected) => {
      print("App 2 Tapped! Toggled state: " + isSelected);
    }
  }
];

// Inject items into carousel
carousel.setItems(items);
```

---

### 2. Trigger Entry & Exit Animations

```typescript
// Play pop-in entry animation (programmatically triggered on gesture detection)
carousel.playEntryAnimation();

// Play pop-out exit animation (programmatically triggered on gesture release)
carousel.playExitAnimation();
```

---

### 3. Rebuild & Resize Slots

```typescript
// Change visible slot count dynamically and rebuild card hierarchy
carousel.setSlotCount(7);

// Force hierarchy cleanup and re-instantiation
carousel.rebuild();

// Update custom polygon corner points on all recycled buttons
carousel.setCustomCornerPoints([
  new vec2(-2.5, -1.0),
  new vec2(2.5, -1.0),
  new vec2(1.5, 1.0),
  new vec2(-1.5, 1.0)
]);
```

---

### 4. External Driver API (Sword Swipe / Hand Controllers)

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

### 5. Dynamic Data Selection & Toggle Sync

```typescript
// Programmatically select an item in the virtual dataset
carousel.selectItem(3); // Selects Item 3 and syncs all physical card toggle states

// Manually re-sync toggle visual states across visible card slots
carousel.syncAllCardToggleStates();
```
