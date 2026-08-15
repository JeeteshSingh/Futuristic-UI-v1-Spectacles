# 🚀 Futuristic UI v1 (Snap Spectacles & Lens Studio 5.15+)

An open-source collection of spatial UI components, circular carousels, and gesture interaction helpers for **Snap Spectacles (2024)** built in **Lens Studio 5.15+**.

---

## 💡 Why This Project Exists

Building spatial interfaces for AR glasses is an exciting challenge for the entire developer community. When designing futuristic experiences on Spectacles, a few major pain points quickly emerge:

* **Limited Button Customization**: `PolygonalButton` upgrades standard rectangular buttons with procedural 2D polygon shapes, corner rounding, ribbon borders, state colors, and micro-animations.
* **Flexible 3D Carousels**: Supports both **Manual** carousels (for handcrafted sets of any size) and **Runtime Virtualized** carousels (for dynamic script-fed datasets).
* **Hand Menu Testing in Desktop Preview**: `HandMenuHelper` provides stable palm anchors paired with a **Hand Preview Simulator** so you can tune offsets directly in the Lens Studio desktop preview without constant hardware redeployments.
* **Natural 2-Handed Gestures**: Fist-hold carousel spawning, 2-finger "sword swipe" rolling with concurrent pinch selection, and a 4-finger multi-pinch palm bookmarking system.
* **Video Tutorial Hint HUDs**: Pre-configured tutorial video cards and hint controllers to guide users through custom gestures.

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

Explore the project by testing one sample section at a time while keeping Camera, Lighting, and `SpectaclesInteractionKit` enabled:

### 1. Explore Button Shapes (`Buttons Frame`)
* Open the project (`Buttons Frame` is enabled by default).
* Inspect the child objects under `Buttons Frame Root`—their names describe how each button is set up (e.g. `buttons can have text child`, `different shape presets`, `use textures`, `fit to size`, `animation type defaults`).
* Disable `Buttons Frame` when finished.

### 2. Test the Carousels (`Carousel Samples`)
Enable `Carousel Samples`, and test **one carousel at a time**:
* **Manual Carousel (`Manual Carousel`)**:
  - Works with **any number of buttons** ($N = 3, 4, 8, 12...$) configured in the scene.
  - Test on Spectacles: hold a fist with your left hand to anchor, and poke or drag cards with your right hand.
* **Runtime Virtualized Carousel (`Runtime Carousel`)**:
  - Dynamically recycles a pool of cards for large datasets.
  - Test on Spectacles: form a left-hand fist (`Carousel Fist GestureApp.ts`), and make a 2-finger "sword gesture" with your right hand (`SwordSwipeScroller.ts`) to roll-scroll around the wheel, then pinch to select.
* **Simple Circle Carousel (`Simple Circle Polygonal Carousel`)**:
  - Lightweight static circular dial with direct touch physics.

### 3. Test the Palm Menu (`Palm Menu`)
* Turn off other sample roots and enable `Palm Menu` (works on Left, Right, or Both hands).
* Face your palm toward your eyes: buttons appear perched near your fingertips. Bring your thumb to individual fingertips (Index, Middle, Ring, Pinky) to trigger actions.

### 4. Test the Hand Menu Helper (`Hand Menu Sample`)
* Enable `Hand Menu Sample`.
* **Desktop Testing**: In `HandMenuHelper.ts`, check **`Debug Preview Simulator`** and enable the `HandPreviewSimulator` SceneObject to view 3D reference hands right inside the Lens Studio desktop preview.
* **Device Testing**: **Disable** `Debug Preview Simulator` and the `HandPreviewSimulator` SceneObject before deploying to Spectacles!

### 5. Hint Cards & HUDs (`HINT VISUALS`)
* Inspect how hint cards are constructed (`Script Controller` $\rightarrow$ `Container Plate` $\rightarrow$ `Image with Video Texture`). Duplicate and customize them to guide users through your own custom gestures.

---

## 🛠️ Practical Tuning Tips

* **Carousel Radius**: Use **`6.0` – `8.0` cm** for hand/fist-anchored carousels, or **`20.0` – `35.0` cm** for floating world-space menus.
* **Corner Radius**: Values around **`0.2` – `0.5`** provide subtle rounded corners.
* **Slot Offset**: Use integer offsets (`-2`, `-1`, `0`, `1`, `2`) to control which card starts at the primary angle.
* **Palm Facing Threshold**: Adjust `palmFacingThreshold` (**`55°` – `70°`**) depending on your preferred activation angle.

---

## 🚀 Setup & Requirements

* **Target Device**: Snap Spectacles (2024)
* **Lens Studio**: Version `5.15.4` or higher (compatible with 5.22+)
* **Required Packages**: `SpectaclesInteractionKit` (SIK), `SpectaclesUIKit`, `SpectaclesShaderLibrary`
* **Language**: TypeScript

### How to Use in Your Project:
1. Copy the `Assets/Futuristic UI v1 Assets` folder into your project.
2. Ensure `SpectaclesInteractionKit` is installed in your project's Asset Library.
3. Drag any prefab or component into your scene.

---

## 📄 License

This project is licensed under the **[MIT License](LICENSE)**. 

Feel free to use, modify, and integrate these components and scripts into your own personal or commercial Lens Studio projects!
