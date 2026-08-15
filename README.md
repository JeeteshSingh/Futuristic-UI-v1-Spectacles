# 🚀 Futuristic UI v1 (Snap Spectacles & Lens Studio 5.15+)

An open-source collection of spatial UI components, circular carousels, and gesture interaction helpers for **Snap Spectacles (2024)** built in **Lens Studio 5.15+**.

---

## 💡 Why This Project Exists

Building spatial interfaces for AR glasses is an exciting challenge for the entire developer community. When designing futuristic experiences on Spectacles, a few major pain points quickly emerge:

* **Limited Button Customization**: Default SIK and UI Kit buttons are mostly constrained to standard rectangles. `PolygonalButton` upgrades this—extending UIKit's `BaseButton` and SIK `Interactable` so you can create custom procedural polygon shapes, tune corner rounding and border ribbons, assign custom textures/icons, and add smooth hover/press animations.
* **Flexible 3D Carousels**: Supports both **Manual** carousels (for handcrafted sets of any size: 3, 4, 8, 12, etc.) and **Runtime Virtualized** carousels (for dynamic script-fed datasets).
* **Hand Menu Testing in Desktop Preview**: Positioning hand-attached menus usually involves endless guesswork and constant redeployments to hardware. `HandMenuHelper` provides stable palm coordinate anchors paired with a **Hand Preview Simulator** so you can tune your offsets and thresholds directly inside the Lens Studio desktop preview before pushing to device.
* **Natural 2-Handed Gestures**: AR glasses free up both hands. This project includes experimental 2-handed interactions—spawning carousels from a closed fist, scrolling with a 2-finger "sword swipe" while pinching to select, and a 4-finger multi-pinch palm bookmarking system.
* **Gesture Hint HUDs with Vision Tethering**: Short video tutorial HUDs with a 3-part controller system (video playback, timing animation, and head-vision tethering) to guide users through custom gestures.

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

> [!TIP]
> **Best Testing Practice**: Test **one sample section at a time** in Lens Studio to keep your view clear and focused. Keep Camera, Lighting, and `SpectaclesInteractionKit` active throughout.

<br/>

### 1️⃣ Explore Button Shapes (`Buttons Frame`)

* **What to do**: Open the project (`Buttons Frame` is enabled by default).
* **Setup to Inspect**: Look at the child objects under `Buttons Frame Root`—their names act as configuration recipes:
  - `buttons can have text child`
  - `different shape presets`
  - `use textures`
  - `fit to size`
  - `animation type defaults`
* **Key Takeaway**: Notice how text and images are nested under `PolygonalButton` to fit the shape. When done, **disable** `Buttons Frame`.

---

### 2️⃣ Test the Carousels (`Carousel Samples`)

Enable `Carousel Samples`, and toggle **only one carousel at a time**:

#### 🎠 Manual Carousel (`Manual Carousel`)
* **Features**: Works with **any number of buttons** ($N = 3, 4, 8, 12...$) configured in the scene. `ManualPolygonalCarousel.ts` evenly distributes them on the circle automatically.
* **Testing**: Form a fist with your left hand to anchor the carousel, and poke or drag cards with your right hand. Supports momentum and magnetic snapping.

#### ⚡ Runtime Virtualized Carousel (`Runtime Carousel`)
* **Features**: Dynamically recycles a small pool of visual cards for large datasets via `VirtualizedPolygonalCarousel.ts`.
* **Testing**: Form a left-hand fist (`Carousel Fist GestureApp.ts`), and make a 2-finger "sword gesture" with your right hand (`SwordSwipeScroller.ts`) to roll-scroll around the wheel, then pinch to select.

#### ⭕ Simple Circle Carousel (`Simple Circle Polygonal Carousel`)
* **Features**: Lightweight static circular dial with direct touch physics.
* Disable `Carousel Samples` when finished.

---

### 3️⃣ Test the Palm Menu (`Palm Menu`)

* **Setup**: Disable other sample roots and enable `Palm Menu` (supports Left, Right, or Both hands).
* **Testing**: Face your palm toward your eyes: buttons appear perched near your fingertips. Bring your thumb to individual fingertips (Index, Middle, Ring, Pinky) to trigger actions.
* Disable `Palm Menu` when finished.

---

### 4️⃣ Test the Hand Menu Helper (`Hand Menu Sample`)

* **Setup**: Enable `Hand Menu Sample`.

> [!NOTE]
> **Desktop Preview Workflow**:
> 1. In `HandMenuHelper.ts`, check **`Debug Preview Simulator`** (ensure reference to `HandPreviewSimulator` is set).
> 2. Enable the `HandPreviewSimulator` SceneObject in the hierarchy to view 3D reference hands right inside the desktop preview.
> 3. Adjust your position offsets, rotation angles, and palm facing thresholds visually.

> [!IMPORTANT]
> **Deploying to Spectacles**: Uncheck `Debug Preview Simulator` and **disable** the `HandPreviewSimulator` SceneObject before sending to device!

---

### 5️⃣ Hint Cards & Vision-Tethered HUDs (`HINT VISUALS`)

Each tutorial card is built from 3 complementary scripts:
1. **`UniversalCameraFollowerTS.ts`**: Tethers and billboards the hint card in the user's field of view with angular/distance deadzones.
2. **`PolygonalButtonHintController.ts`**: Manages timed fade-in delays, hold durations, and fade-outs.
3. **`Video Player Controller Script.ts`**: Controls video playback rates (`1.5x`, `2.0x`) with speed-compensated looping.

Duplicate and customize these prefabs to teach custom gestures in your own projects!

---

## 🛠️ Practical Tuning Tips

* **Carousel Radius**: Use **`6.0` – `8.0` cm** for hand/fist-anchored carousels, or **`20.0` – `35.0` cm** for floating world-space menus.
* **Corner Radius**: Values around **`0.2` – `0.5`** provide subtle rounded corners.
* **Slot Offset**: Use integer offsets (`-2`, `-1`, `0`, `1`, `2`) to control which card starts at the primary angle.
* **Palm Facing Threshold**: Adjust `palmFacingThreshold` (**`55°` – `70°`**) depending on your preferred activation angle.

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
   - Install the required packages from the Lens Studio **Asset Library**:
     - **`SpectaclesInteractionKit`** (SIK) — *Required*: Core hand tracking, ray interactors, and poke/pinch events.
     - **`SpectaclesUIKit`** — *Required*: UI base components and themes extended by `PolygonalButton`.
     - **`SpectaclesShaderLibrary`** — *Optional*: Only needed if your customized materials reference specific library shaders.
5. **Add to Scene & Configure**:
   - Drag the prefab into your scene hierarchy and adjust Inspector properties to fit your experience!

---

## 📄 License

This project is licensed under the **[MIT License](LICENSE)**. 

Feel free to use, modify, and integrate these components and scripts into your own personal or commercial Lens Studio projects!
