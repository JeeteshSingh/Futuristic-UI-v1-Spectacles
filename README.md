# Futuristic UI v1 (Snap Spectacles & Lens Studio 5.15+)

An open-source collection of experimental spatial UI components, circular carousels, and gesture interaction helpers for **Snap Spectacles (2024)** built in **Lens Studio 5.15+**.

---

## 💡 Why This Project Exists

Building spatial interfaces for AR glasses is an exciting challenge for the entire developer community. When designing futuristic experiences on Spectacles, a few major pain points quickly emerge:

1. **Limited Button Customization**: Default SIK and UI Kit buttons are mostly constrained to standard rectangles. `PolygonalButton` was built to upgrade this—extending UIKit's `BaseButton` and SIK `Interactable` so you can create custom procedural polygon shapes, tune corner rounding and border ribbons, assign custom textures/icons, and add smooth hover/press animations.
2. **Flexible Circular Carousels**: Whether you want to handcraft a custom wheel of any number of buttons (3, 4, 8, 12, etc.) or dynamically stream items from a script, this project provides both **Manual** and **Runtime Virtualized** carousel architectures.
3. **Hand Menu Setup & Desktop Testing**: Positioning hand-attached menus usually involves endless guesswork and constant redeployments to the glasses. `HandMenuHelper` provides stable palm coordinate anchors, paired with a **Hand Preview Simulator** so you can tune your offsets and thresholds directly inside the Lens Studio desktop preview before pushing to device.
4. **Natural Hands-Free Gestures**: AR glasses free up both hands. This project includes experimental 2-handed interactions—spawning carousels from a closed fist, scrolling with a 2-finger "sword swipe" while pinching to select, and a 4-finger multi-pinch palm bookmarking system.
5. **Ready-to-Use Gesture Hint HUDs**: Short video tutorial HUDs and hint controller scripts to guide users through custom gestures.

---

## 📚 Component Guides Index

Deep-dive documentation and script references for each system:

| Component | Guide Path | What It Does |
| :--- | :--- | :--- |
| **🔷 Polygonal Buttons** | [`POLYGONAL_BUTTON_SYSTEM.md`](Assets/Futuristic%20UI%20v1%20Assets/Polygonal%20Button/POLYGONAL_BUTTON_SYSTEM.md) | Procedural 2D polygonal buttons, corner filleting, ribbon borders, and state color themes. |
| **🎡 Manual Carousel** | [`MANUAL_CAROUSEL_SYSTEM.md`](Assets/Futuristic%20UI%20v1%20Assets/Carousels/Manual%20Carousel/MANUAL_CAROUSEL_SYSTEM.md) | Automatically distributes any set of scene buttons into a circular wheel with touch dragging and snapping. |
| **⚡ Virtualized Carousel** | [`VIRTUALIZED_CAROUSEL_SYSTEM.md`](Assets/Futuristic%20UI%20v1%20Assets/Carousels/Runtime%20Virtualized%20Carousel/VIRTUALIZED_CAROUSEL_SYSTEM.md) | Script-driven carousel that recycles a small pool of visual cards to display large dynamic datasets. |
| **⚔️ Gesture Controllers** | [`GESTURE_SCROLLER_SYSTEM.md`](Assets/Futuristic%20UI%20v1%20Assets/Carousels/GESTURE_SCROLLER_SYSTEM.md) | Fist anchor spawning (`Carousel Fist GestureApp.ts`) and 2-finger circular swipe scrolling (`SwordSwipeScroller.ts`). |
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
├── 🔘 Buttons Frame [Button shapes & capability examples]
├── 🎡 Carousel Samples [Manual, Virtualized, and Simple Circle]
│   ├── 🎠 Manual Carousel
│   ├── ⚡ Runtime Carousel
│   └── ⭕ Simple Circle Polygonal Carousel
├── 🖐️ Palm Menu [4-finger multi-pinch bookmarking example]
├── 📐 Hand Menu Sample [Stabilized palm panel helper & simulator]
└── 🎬 HINT VISUALS [6 pre-configured video tutorial hint cards]
```

---

## 🧪 Step-by-Step Testing & Walkthrough Guide

To get the cleanest experience when testing this project in Lens Studio or on your Spectacles, test each sample section one at a time:

### Step 1: Explore Button Shapes (`Buttons Frame`)
1. Open the project. `Buttons Frame` is enabled by default.
2. Look at each child object under `Buttons Frame Root`—the names describe how each button is set up (e.g. `buttons can have text child`, `different shape presets`, `use textures`, `fit to size`, `animation type defaults`).
3. Notice how text and images are positioned as children of the `PolygonalButton` mesh to fit the button size.
4. When finished exploring, **disable** `Buttons Frame`.

### Step 2: Test the Carousels (`Carousel Samples`)
Enable `Carousel Samples`, and test **only one carousel at a time**:

* **Manual Carousel (`Manual Carousel`)**:
  - Enable `Manual Carousel` (ensure Runtime and Simple Circle are disabled).
  - Works with **any number of buttons** ($N = 3, 4, 8, 12...$) configured in the scene. `ManualPolygonalCarousel.ts` automatically distributes them evenly along the circle.
  - Deploy to Spectacles: show your left hand fist to anchor, and use your right hand to poke or drag the cards with momentum and magnetic snapping.
  - Disable `Manual Carousel`.

* **Runtime Virtualized Carousel (`Runtime Carousel`)**:
  - Enable `Runtime Carousel`.
  - Driven by `VirtualizedPolygonalCarousel.ts` and `RuntimeCarouselExamplePopulator.ts` to dynamically recycle cards for large datasets.
  - Deploy to Spectacles: form a fist with your left hand (`Carousel Fist GestureApp.ts`), and make a 2-finger "sword gesture" with your right hand (`SwordSwipeScroller.ts`) to roll-scroll around the wheel, then pinch to select.
  - Disable `Runtime Carousel`.

* **Simple Circle Carousel (`Simple Circle Polygonal Carousel`)**:
  - Lightweight static circular dial with direct touch physics.
  - Disable `Carousel Samples` when done.

### Step 3: Test the Palm Menu (`Palm Menu`)
1. Ensure `Buttons Frame` and `Carousel Samples` are disabled.
2. Enable `Palm Menu`.
3. Supports **Left Hand, Right Hand, or Both Hands**.
4. Face your palm toward your eyes: buttons appear perched near your fingertips. Bring your thumb to individual fingertips (Index, Middle, Ring, Pinky) to trigger actions.
5. Disable `Palm Menu` when done.

### Step 4: Test the Hand Menu Helper (`Hand Menu Sample`)
1. Enable `Hand Menu Sample`.
2. **Desktop Preview Testing**:
   - In `HandMenuHelper` (`HandMenuHelper.ts`), check **`Debug Preview Simulator`** and ensure the reference to `HandPreviewSimulator` is set.
   - Enable the `HandPreviewSimulator` SceneObject in the hierarchy to display 3D reference hands right inside the Lens Studio desktop preview.
   - Adjust your position offsets, rotation offsets, and palm facing thresholds visually until the menu aligns where you want.
3. **Testing on Spectacles**:
   - **Important**: Uncheck `Debug Preview Simulator` and **disable** the `HandPreviewSimulator` SceneObject before deploying to your device so the debug hands don't appear in your view.
   - Deploy and test with your physical hands.

### Step 5: Understand Hint HUDs (`HINT VISUALS`)
* Inspect how hint cards are constructed: `Parent Script (Hint Controller)` $\rightarrow$ `Container Plate (PolygonalButton)` $\rightarrow$ `Image (Video Texture)`.
* `PolygonalButtonHintController.ts` and `Video Player Controller Script.ts` can be duplicated and customized in your own projects to guide users with animated gesture tutorials.

---

## 🔍 Detailed Feature Overview

### 1. Polygonal Buttons (`PolygonalButton.ts`)
* **Extends UIKit `BaseButton` & SIK `Interactable`**: Drop-in replacement for standard buttons with full SIK ray targeting, pinch, and poke compatibility.
* **Procedural Geometry**: Pentagon (0), Chevron (1), Trapezoid (2), Hexagon (3), Octagon (4), or Custom vertex arrays.
* **Corner Rounding & Segments**: `cornerRadius` (e.g. `0.2` – `0.5`) and `cornerSegments` (tessellation detail) to smooth corners.
* **Border Ribbons**: Configurable `borderWidth` for outer outline ribbons.
* **Dynamic State Colors**: Configurable colors for Default, Highlight (Hover), Select (Triggered), Toggled, and Disabled states.
* **Alpha Propagation**: Modifying `buttonOpacity` automatically updates transparency across all nested child images and text components.

### 2. Manual Carousel (`ManualPolygonalCarousel.ts`)
* **Any Number of Buttons**: Arrange as many custom button prefabs as you need under the root object.
* **Automatic Circular Layout**: Distributes buttons evenly along the XY circle at start.
* **Tuning Offsets**:
  * `arcOffsetDegrees`: Rotates the circle orientation (0° = Top, 90° = Right, 180° = Bottom, 270° = Left).
  * `slotOffset`: Shifts starting button index (supports negative and positive integers, e.g. `-2`, `-1`, `0`, `1`, `2`).
* **Physics & Toggling**: Direct SIK touch dragging, momentum inertia, magnetic snapping, and exclusive radio-button toggling (`enableToggleBehavior`).

### 3. Runtime Virtualized Carousel (`VirtualizedPolygonalCarousel.ts`)
* **Memory-Efficient Card Pooling**: Recycles a fixed pool of visual cards to display large or dynamic datasets without instantiating dozens of objects.
* **Dynamic API**: Controlled via `carousel.setItems(...)` and `carousel.selectItem(index)`.

### 4. 2-Handed Spatial Gesture Controllers
* **Fist Anchor (`Carousel Fist GestureApp.ts`)**:
  * Spawns and anchors the carousel to a held fist (`gestureHoldTime ≈ 0.5s`).
  * Fuses Snap's native `GestureModule` Grab ML classifier with Euclidean bone distance checks.
  * Opening your hand triggers a smooth exit stagger animation.
* **Sword-Swipe Scroller (`SwordSwipeScroller.ts`)**:
  * Use a 2-finger sword gesture on your opposite hand to roll-scroll around the carousel ring.
  * Preserves standard SIK pinching so you can swipe with two fingers and pinch to select simultaneously.

### 5. Stabilized Hand Menu Helper (`HandMenuHelper.ts`)
* **Knuckle-Derived Frame**: Calculates a stabilized palm frame from multiple knuckle tracking points (`mid-0`, `index-0`, `pinky-0`, `wrist`), eliminating jitter from finger twitches.
* **Edge-Origin Layout**: Offsetting the local origin to the menu's outer edge causes the menu to cleanly project outward alongside the palm.
* **Desktop Preview Rig (`HandPreviewSimulator.ts`)**: Built-in 3D hand references for tuning offsets in desktop preview before deploying to hardware.

### 6. Palm Menu (`PalmMenuGestureApp.ts`)
* **4-Finger Multi-Pinch Shortcuts**: Tracks thumb proximity to Index, Middle, Ring, and Pinky fingertips.
* **Knuckle Anchoring**: Buttons anchor to mid-knuckles and project outward to stay stable while appearing near fingertips.
* **Palm-Up Billboarding**: Buttons face the camera while locking their vertical axis along the palm's finger direction (`cameraFacingAxis` and `buttonUpAxis`).
* **Hysteresis Threshold**: $+25^\circ$ facing hysteresis prevents the menu from collapsing during pinch motions.

---

## 🛠️ Practical Tuning Tips

* **Carousel Radius**: Set around **`6.0` – `8.0` cm** for hand/fist-anchored carousels. For floating world-space menus, use **`20.0` – `35.0` cm**.
* **Corner Radius**: Values around **`0.2` – `0.5`** give subtle rounded corners, while higher values produce pill/capsule shapes.
* **Palm Facing Thresholds**: Adjust `palmFacingThreshold` (**`55°` – `70°`**) depending on your preferred activation angle.
* **Slot Offset**: Use integer offsets (`-2`, `-1`, `0`, `1`, `2`) to control which card starts at the primary angle in both manual and virtualized carousels.

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
