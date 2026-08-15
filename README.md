# 🚀 Futuristic UI v1 (Snap Spectacles & Lens Studio 5.15+)

An open-source collection of spatial UI components, circular carousels, and gesture interaction helpers for **Snap Spectacles (2024)** built in **Lens Studio 5.15+**.

---

## 💡 Why This Project Exists

Building spatial interfaces for AR glasses is an exciting challenge for the entire developer community. When designing futuristic experiences on Spectacles, a few major pain points quickly emerge:

* **Limited Button Customization**: Default SIK and UI Kit buttons are mostly constrained to standard rectangles. `PolygonalButton` was built to upgrade this—extending UIKit's `BaseButton` and SIK `Interactable` so you can create custom procedural polygon shapes, tune corner rounding and border ribbons, assign custom textures/icons, and add smooth hover/press animations.
* **Flexible 3D Carousels**: Supports both **Manual** carousels (for handcrafted sets of any size: 3, 4, 8, 12, etc.) and **Runtime Virtualized** carousels (for dynamic script-fed datasets).
* **Hand Menu Testing in Desktop Preview**: Positioning hand-attached menus usually involves endless guesswork and constant redeployments to hardware. `HandMenuHelper` provides stable palm coordinate anchors paired with a **Hand Preview Simulator** so you can tune your offsets and thresholds directly inside the Lens Studio desktop preview before pushing to device.
* **Natural 2-Handed Gestures**: AR glasses free up both hands. This project includes experimental 2-handed interactions—spawning carousels from a closed fist, scrolling with a 2-finger "sword swipe" while pinching to select, and a 4-finger multi-pinch palm bookmarking system.
* **Ready-to-Use Gesture Hint HUDs**: Short video tutorial HUDs and hint controller scripts to guide users through custom gestures.

---

## 📚 Documentation Index

| Guide | Link | What It Covers |
| :--- | :--- | :--- |
| **📖 Deep-Dive Feature Overview** | [`FEATURE_OVERVIEW.md`](FEATURE_OVERVIEW.md) | In-depth technical breakdown of all 6 components and systems. |
| **🔷 Polygonal Buttons** | [`POLYGONAL_BUTTON_SYSTEM.md`](Assets/Futuristic%20UI%20v1%20Assets/Polygonal%20Button/POLYGONAL_BUTTON_SYSTEM.md) | Procedural polygon generation, corner filleting, borders, and state colors. |
| **🎡 Manual Carousel** | [`MANUAL_CAROUSEL_SYSTEM.md`](Assets/Futuristic%20UI%20v1%20Assets/Carousels/Manual%20Carousel/MANUAL_CAROUSEL_SYSTEM.md) | Circular layout for any number of buttons, drag physics, and slot snapping. |
| **⚡ Virtualized Carousel** | [`VIRTUALIZED_CAROUSEL_SYSTEM.md`](Assets/Futuristic%20UI%20v1%20Assets/Carousels/Runtime%20Virtualized%20Carousel/VIRTUALIZED_CAROUSEL_SYSTEM.md) | Memory-efficient card recycling, infinite wrapping, and dynamic script data. |
| **⚔️ Gesture Controllers** | [`GESTURE_SCROLLER_SYSTEM.md`](Assets/Futuristic%20UI%20v1%20Assets/Carousels/GESTURE_SCROLLER_SYSTEM.md) | Fist anchor spawning (`Carousel Fist GestureApp.ts`) and sword swiping (`SwordSwipeScroller.ts`). |
| **🖐️ Hand Menu Helper** | [`HAND_MENU_HELPER_SYSTEM.md`](Assets/Futuristic%20UI%20v1%20Assets/Hand%20Menu/HAND_MENU_HELPER_SYSTEM.md) | Stabilized palm coordinate frame and desktop preview simulator workflow. |
| **✨ Palm Menu** | [`PALM_MENU_GESTURE_SYSTEM.md`](Assets/Futuristic%20UI%20v1%20Assets/Palm%20Menu/PALM_MENU_GESTURE_SYSTEM.md) | 4-finger multi-pinch tool bookmarking (Index, Middle, Ring, Pinky). |

---

## 🏗️ Scene Structure (`Scene.scene`)

When you open `Scene.scene` in Lens Studio, the hierarchy is organized into modular sample roots. You can explore each feature by enabling its parent object while keeping Camera, Lighting, and `SpectaclesInteractionKit` active:

```
Scene Hierarchy
├── 📷 Camera Object (Main Camera + Default 3D Hands)
├── 💡 Lighting (Ambient Light + Directional Light)
├── 👓 SpectaclesInteractionKit ([REQUIRED] Core Interactors & Visuals)
├── 📦 PolygonalButton [Base template prefab to duplicate]
│
├── 🔘 Buttons Frame [Button shapes & setup examples]
├── 🎡 Carousel Samples [Manual, Virtualized, and Simple Circle]
│   ├── 🎠 Manual Carousel
│   ├── ⚡ Runtime Carousel
│   └── ⭕ Simple Circle Polygonal Carousel
├── 🖐️ Palm Menu [4-finger multi-pinch bookmarking example]
├── 📐 Hand Menu Sample [Stabilized palm panel helper & simulator]
└── 🎬 HINT VISUALS [6 pre-configured video tutorial hint cards]
```

---

## 🧪 Testing & Walkthrough Guide

To get the cleanest experience when testing this project in Lens Studio or on your Spectacles, test each sample section one at a time:

### 1. Explore Button Shapes (`Buttons Frame`)
* Open the project (`Buttons Frame` is enabled by default).
* Inspect the child objects under `Buttons Frame Root`—their names describe how each button is set up (e.g. `buttons can have text child`, `different shape presets`, `use textures`, `fit to size`, `animation type defaults`).
* Notice how text and images are positioned as children of the `PolygonalButton` mesh to fit the button size.
* When finished exploring, **disable** `Buttons Frame`.

### 2. Test the Carousels (`Carousel Samples`)
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

### 3. Test the Palm Menu (`Palm Menu`)
* Ensure `Buttons Frame` and `Carousel Samples` are disabled, then enable `Palm Menu` (works on Left Hand, Right Hand, or Both Hands).
* Face your palm toward your eyes: buttons appear perched near your fingertips. Bring your thumb to individual fingertips (Index, Middle, Ring, Pinky) to trigger actions.
* Disable `Palm Menu` when done.

### 4. Test the Hand Menu Helper (`Hand Menu Sample`)
* Enable `Hand Menu Sample`.
* **Desktop Preview Testing**:
  - In `HandMenuHelper` (`HandMenuHelper.ts`), check **`Debug Preview Simulator`** and ensure the reference to `HandPreviewSimulator` is set.
  - Enable the `HandPreviewSimulator` SceneObject in the hierarchy to display 3D reference hands right inside the Lens Studio desktop preview.
  - Adjust your position offsets, rotation offsets, and palm facing thresholds visually until the menu aligns where you want.
* **Testing on Spectacles**:
  - **Important**: Uncheck `Debug Preview Simulator` and **disable** the `HandPreviewSimulator` SceneObject before deploying to your device so the debug hands don't appear in your view.
  - Deploy and test with your physical hands.

### 5. Hint Cards & HUDs (`HINT VISUALS`)
* Inspect how hint cards are constructed: `Parent Script (Hint Controller)` $\rightarrow$ `Container Plate (PolygonalButton)` $\rightarrow$ `Image (Video Texture)`.
* `PolygonalButtonHintController.ts` and `Video Player Controller Script.ts` can be duplicated and customized in your own projects to guide users with animated gesture tutorials.

---

## 🛠️ Practical Tuning Tips

* **Carousel Radius**: Set around **`6.0` – `8.0` cm** for hand/fist-anchored carousels. For floating world-space menus, use **`20.0` – `35.0` cm**.
* **Corner Radius**: Values around **`0.2` – `0.5`** give subtle rounded corners, while higher values produce pill/capsule shapes.
* **Slot Offset**: Use integer offsets (`-2`, `-1`, `0`, `1`, `2`) to control which card starts at the primary angle in both manual and virtualized carousels.
* **Palm Facing Threshold**: Adjust `palmFacingThreshold` (**`55°` – `70°`**) depending on whether you want a stricter facing requirement or easier activation.

---

## 📦 How to Use in Your Own Project

You can easily extract any button, carousel, or gesture interaction system from this project into your own lenses:

1. **Choose What You Need**:
   - Identify the component or setup you want in your project (e.g. `PolygonalButton`, a customized `Manual Carousel`, `Virtualized Carousel`, `HandMenuHelper`, or the gesture controllers).
2. **Export as Prefab or Package**:
   - In the Asset panel, right-click your configured SceneObject or folder and select **Export as Prefab (`.prefab`)** or **Export Package (`.lspkg`)**.
3. **Import into Your Project**:
   - Open your target Lens Studio project and drag the exported prefab or `.lspkg` into your Asset panel.
4. **Ensure Dependencies Are Installed**:
   - Make sure the following required packages are installed from the Lens Studio **Asset Library**:
     - **`SpectaclesInteractionKit`** (SIK) — Core hand tracking, ray interactors, and poke/pinch events.
     - **`SpectaclesUIKit`** — UI base components and themes extended by `PolygonalButton`.
     - **`SpectaclesShaderLibrary`** — Material shaders used across visual themes.
5. **Add to Scene & Configure**:
   - Drag the prefab into your scene hierarchy and adjust Inspector properties to fit your experience!

---

## 📄 License

This project is licensed under the **[MIT License](LICENSE)**. 

Feel free to use, modify, and integrate these components and scripts into your own personal or commercial Lens Studio projects!
