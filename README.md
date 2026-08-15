# Futuristic UI v1 (Snap Spectacles & Lens Studio 5.15+)

An open-source collection of experimental spatial UI components, circular carousels, and gesture interaction helpers for **Snap Spectacles (2024)** built in **Lens Studio 5.15+**.

---

## 💡 Why This Project Exists

Building spatial interfaces for AR glasses is an exciting challenge for the entire developer community. When designing futuristic experiences on Spectacles, a few major pain points quickly emerge:

1. **Limited Button Customization**: Default SIK and UI Kit buttons are mostly constrained to standard rectangles. `PolygonalButton` was built to upgrade this—extending UIKit's `BaseButton` and SIK `Interactable` so you can create custom procedural polygon shapes, tune corner rounding and border ribbons, assign custom textures/icons, and add smooth hover/press animations.
2. **Flexible Circular Carousels**: Whether you want to handcraft a custom wheel of 12 distinct buttons or dynamically stream $N$ items from a script, this project provides both **Manual** and **Runtime Virtualized** carousel architectures.
3. **Hand Menu Setup & Desktop Testing**: Positioning hand-attached menus usually involves endless guesswork and constant redeployments to the glasses. `HandMenuHelper` provides stable palm coordinate anchors, paired with a **Hand Preview Simulator** so you can tune your offsets and thresholds directly inside the Lens Studio desktop preview.
4. **Natural Hands-Free Gestures**: AR glasses free up both hands. This project includes experimental 2-handed interactions—spawning carousels from a closed fist, scrolling with a 2-finger "sword swipe" while pinching to select, and a 4-finger multi-pinch palm bookmarking system.
5. **Ready-to-Use Gesture Hint HUDs**: Short video tutorial HUDs and hint controller scripts to guide users through custom gestures.

---

## 📚 Component Guides Index

Deep-dive documentation and script references for each system:

| Component | Guide Path | What It Does |
| :--- | :--- | :--- |
| **🔷 Polygonal Buttons** | [`POLYGONAL_BUTTON_SYSTEM.md`](Assets/Futuristic%20UI%20v1%20Assets/Polygonal%20Button/POLYGONAL_BUTTON_SYSTEM.md) | Procedural 2D polygonal buttons, corner filleting, ribbon borders, and state color themes. |
| **🎡 Manual Carousel** | [`MANUAL_CAROUSEL_SYSTEM.md`](Assets/Futuristic%20UI%20v1%20Assets/Carousels/Manual%20Carousel/MANUAL_CAROUSEL_SYSTEM.md) | Automatically distributes your custom scene buttons into a circular wheel with touch dragging and snapping. |
| **⚡ Virtualized Carousel** | [`VIRTUALIZED_CAROUSEL_SYSTEM.md`](Assets/Futuristic%20UI%20v1%20Assets/Carousels/Runtime%20Virtualized%20Carousel/VIRTUALIZED_CAROUSEL_SYSTEM.md) | Script-driven carousel that recycles a small pool of visual cards to display large datasets. |
| **⚔️ Gesture Controllers** | [`GESTURE_SCROLLER_SYSTEM.md`](Assets/Futuristic%20UI%20v1%20Assets/Carousels/GESTURE_SCROLLER_SYSTEM.md) | Fist anchor spawning (`CarouselGestureApp`) and 2-finger circular swipe scrolling (`SwordSwipeScroller`). |
| **🖐️ Hand Menu Helper** | [`HAND_MENU_HELPER_SYSTEM.md`](Assets/Futuristic%20UI%20v1%20Assets/Hand%20Menu/HAND_MENU_HELPER_SYSTEM.md) | Stabilized palm coordinate frame and desktop preview simulator workflow for hand-attached menus. |
| **✨ Palm Menu** | [`PALM_MENU_GESTURE_SYSTEM.md`](Assets/Futuristic%20UI%20v1%20Assets/Palm%20Menu/PALM_MENU_GESTURE_SYSTEM.md) | 4-finger multi-pinch tool bookmarking (Index, Middle, Ring, Pinky) anchored to finger joints. |

---

## 🏗️ Master Scene Hierarchy (`Scene.scene`)

When you open `Scene.scene` in Lens Studio, the hierarchy is organized into modular sample roots. You can explore each feature by enabling its parent object while keeping Camera, Lighting, and `SpectaclesInteractionKit` active:

```
Scene Hierarchy
├── 📷 Camera Object (Main Camera + Default 3D Hands)
├── 💡 Lighting (Ambient Light + Directional Light)
├── 👓 SpectaclesInteractionKit ([REQUIRED] Core Interactors & Visuals)
├── 📦 PolygonalButton [Base template prefab to duplicate]
│
├── 🔘 Buttons Frame [Button shapes & style examples]
├── 🎡 Carousel Samples [Manual, Virtualized, and Simple Circle]
│   ├── 🎠 Manual Carousel
│   ├── ⚡ Runtime Carousel
│   └── ⭕ Simple Circle Polygonal Carousel
├── 🖐️ Palm Menu [4-finger multi-pinch bookmarking example]
├── 📐 Hand Menu Sample [Stabilized palm panel helper & simulator]
└── 🎬 HINT VISUALS [6 pre-configured video tutorial hint cards]
```

---

## 🔍 Detailed Feature Walkthrough

### 1. `Buttons Frame` — Custom Polygonal Buttons
* **What it demonstrates**: Upgrading beyond standard rectangular buttons.
* **Shape Presets**: Pentagon, Chevron, Trapezoid, Hexagon, Octagon, or Custom vertex arrays.
* **Corner Rounding & Segments**: Adjust `cornerRadius` (e.g. `0.2` – `0.5`) and `cornerSegments` to smooth out polygon corners.
* **Border Ribbons**: Configurable `borderWidth` for outer highlight outlines.
* **State Colors & Opacity**: Independent colors for Default, Hover, Select, Toggled, and Disabled states. Modifying `buttonOpacity` automatically propagates transparency to child text and image renderers.
* **Animations**: Subtle scale-down on press, Z-axis pop forward on hover/press, or both.
* **How to use**: Duplicate `PolygonalButton`, tweak its properties in the Inspector, add your own child icon/text, and save it as a prefab.

---

### 2. `Carousel Samples` — 3D Circular Carousels

#### A. Manual Carousel (`Manual Carousel`)
* **Best for**: Projects where you have a specific, handcrafted set of buttons (e.g. 12 distinct tools, zodiac cards, or menu items).
* **Auto Circular Distribution**: Place your buttons under the root object. At start, `ManualPolygonalCarousel.ts` automatically arranges them evenly along a circle in the vertical XY plane.
* **Orientation & Offset**:
  * `arcOffsetDegrees`: Rotates the circle (0° = Top, 90° = Right, 180° = Bottom, 270° = Left).
  * `slotOffset`: Shifts which button appears at the primary position (supports both positive and negative values, e.g. `-2`, `0`, `1`).
* **Interaction**: Supports direct poke/drag, inertia momentum, magnetic slot snapping, and exclusive single-selection radio toggling (`enableToggleBehavior`).
* **Test it**: Enable `Manual Carousel`, deploy to Spectacles, form a fist with your left hand, and poke/drag cards with your right hand.

#### B. Runtime Virtualized Carousel (`Runtime Carousel`)
* **Best for**: Projects where button lists are loaded dynamically via scripts (e.g. dynamic inventories, search results, or large datasets).
* **Card Recycling & Pooling**: Instantiates only a small pool of visual cards (e.g. 8 slots) and dynamically maps data as you scroll, allowing infinite wrapping without spawning dozens of objects.
* **Populator Script (`RuntimeCarouselExamplePopulator.ts`)**: Demonstrates how external scripts supply data arrays, assign icons/text, and listen to card click callbacks.
* **Test it**: Enable `Runtime Carousel`, form a left-hand fist to anchor the carousel in air, and use your right hand in a 2-finger "sword gesture" to fling-scroll around the wheel.

#### C. Simple Circle Carousel (`Simple Circle Polygonal Carousel`)
* A lightweight static circular layout without kinetic fling physics, ideal for fixed status dials or static radial tool selectors.

---

### 3. `Gesture Controllers` — Experimental 2-Handed Controls

* **Fist Anchor (`CarouselGestureApp.ts`)**:
  * Form and hold a fist in front of the camera (`gestureHoldTime ≈ 0.5s`) to spawn and anchor the carousel.
  * Uses a fused pipeline combining Snap's native `GestureModule` Grab ML classifier with Euclidean bone distance checks for reliable tracking.
  * Opening your hand triggers a smooth stagger fade-out.
* **Sword-Swipe Scroller (`SwordSwipeScroller.ts`)**:
  * Form a 2-finger "sword" gesture with your opposite hand and roll/swipe around the carousel's outer ring to scroll with kinetic momentum.
  * Preserves standard SIK pinching so you can swipe with two fingers and pinch with index+thumb to select items simultaneously.

---

### 4. `Hand Menu Sample` — Palm Helper & Desktop Preview Simulator

* **The Pain Point**: Hand menus are essential for Spectacles, but finding the right position offsets and palm angles usually requires constant back-and-forth testing on hardware.
* **Stabilized Palm Frame (`HandMenuHelper.ts`)**:
  * Uses multiple knuckle tracking points (`mid-0`, `index-0`, `pinky-0`, `wrist`) to calculate a stabilized reference frame that doesn't jitter when individual fingers twitch.
  * Uses an edge-origin layout so menus cleanly project outward alongside the palm.
* **Desktop Preview Simulator (`HandPreviewSimulator.ts`)**:
  * Enable **`Debug Preview Simulator`** on `HandMenuHelper` and enable `HandPreviewSimulator` to test your menu position, rotation offsets, and palm facing thresholds directly inside the Lens Studio desktop preview.
  * *Important*: Disable the preview simulator options before publishing your lens!

---

### 5. `Palm Menu` — 4-Finger Multi-Pinch Bookmarking (Experimental)

* **Concept**: Instead of relying solely on a single index-pinch, the Palm Menu uses the other 4 fingers (Index, Middle, Ring, Pinky) as quick-access bookmarks.
* **How it Works**:
  * Bring your thumb close to any fingertip to trigger that finger's assigned tool or action.
  * Buttons are anchored to the mid-knuckles and project outward toward the fingertips.
  * Uses palm-up billboarding so buttons face the camera while staying aligned with the finger direction.
  * Includes facing angle threshold tuning with dynamic hysteresis so the menu doesn't collapse during a pinch.
* *Note*: This gesture is experimental and depends on good lighting conditions for hand tracking, but provides a fun glimpse into multi-finger spatial shortcuts.

---

### 6. `HINT VISUALS` & Hint Controllers

* Includes 6 pre-configured video tutorial HUD cards for teaching custom gestures to users.
* **Video Player Controller (`Video Player Controller Script.ts`)**: Plays video textures with custom playback speeds (`playbackRate = 1.5x`, `2.0x`) and speed-compensated looping to prevent trailing freeze frames.
* **Hint Controller (`PolygonalButtonHintController.ts`)**: Manages automatic fade-in delays, hold durations, and fade-outs, showing how `PolygonalButton` can serve as an animated semi-transparent HUD plate.

---

## 🛠️ Practical Tuning Tips

* **Carousel Radius**: For hand/fist-anchored carousels, a radius around **`6.0` – `8.0` cm** fits comfortably around the hand. For floating world-space menus, increase to **`20.0` – `35.0` cm**.
* **Corner Radius**: Values around **`0.2` – `0.5`** create subtle rounding, while higher values create capsule/pill shapes. Increase `cornerSegments` (e.g. `4` – `8`) for smoother curves.
* **Slot Offset**: Supports positive and negative integer shifts (`-2`, `-1`, `0`, `1`, `2`) to control which card starts at the primary angle.
* **Palm Facing Threshold**: Adjust `palmFacingThreshold` (typically **`55°` – `70°`**) depending on whether you want a stricter facing requirement or easier activation.

---

## 🚀 Setup & Requirements

* **Target Device**: Snap Spectacles (2024)
* **Lens Studio**: Version `5.15.4` or higher (fully compatible with 5.22+)
* **Required Packages**: `SpectaclesInteractionKit` (SIK), `SpectaclesUIKit`, `SpectaclesShaderLibrary`
* **Language**: TypeScript

### How to Use in Your Project:
1. Copy the `Assets/Futuristic UI v1 Assets` folder into your Lens Studio project.
2. Ensure `SpectaclesInteractionKit` is installed in your project's Asset Library.
3. Drag any prefab or component (e.g. `PolygonalButton`, `ManualPolygonalCarousel`, `VirtualizedPolygonalCarousel`, or `HandMenuHelper`) into your scene.

---

## 📄 License

This project is licensed under the **[MIT License](LICENSE)**. 

Feel free to use, modify, and integrate these components and scripts into your own personal or commercial Lens Studio projects!
