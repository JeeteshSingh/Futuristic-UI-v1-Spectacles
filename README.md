# 🚀 Futuristic UI v1 (Snap Spectacles & Lens Studio 5.15+)

An open-source collection of spatial UI components, circular carousels, and gesture interaction helpers for **Snap Spectacles (2024)** built in **Lens Studio 5.15+**.

---

## 💡 Why This Project Exists

Building spatial interfaces for AR glasses is an exciting challenge for the entire developer community. When designing futuristic experiences on Spectacles, a few major pain points quickly emerge:

* **Limited Button Customization**: Default SIK and UI Kit buttons are mostly constrained to standard rectangles. `PolygonalButton` upgrades this—extending UIKit's `BaseButton` and SIK `Interactable` so you can create custom procedural polygon shapes, tune corner rounding and border ribbons, assign custom textures/icons, and add smooth hover/press animations.
* **Unified 3D Carousel Framework**: `UnifiedPolygonalCarousel` unites both **Manual** (handcrafted sets with unique shapes and sizes) and **Runtime Virtualized** (dynamic data-fed recycling) carousels into a single, high-performance, multi-mode component.
* **Hand Menu Testing in Desktop Preview**: Positioning hand-attached menus usually involves endless guesswork and constant redeployments to hardware. `HandMenuHelper` provides stable palm coordinate anchors paired with a **Hand Preview Simulator** so you can tune your offsets and thresholds directly inside the Lens Studio desktop preview before pushing to device.
* **Natural 2-Handed Gestures**: AR glasses free up both hands. This project includes experimental 2-handed interactions—spawning carousels from a closed fist, scrolling with a 2-finger "sword swipe" while pinching to select, and a 4-finger multi-pinch palm bookmarking system.
* **Gesture Hint HUDs with Vision Tethering**: Short video tutorial HUDs with a 3-part controller system (video playback, timing animation, and head-vision tethering) to guide users through custom gestures.

---

## 📚 Documentation Index

| Guide | Link | What It Covers |
| :--- | :--- | :--- |
| **📖 Deep-Dive Feature Overview** | [`FEATURE_OVERVIEW.md`](FEATURE_OVERVIEW.md) | In-depth technical breakdown of all 6 components and systems. |
| **🌟 Unified Polygonal Carousel** | [`UNIFIED_CAROUSEL_SYSTEM.md`](Assets/Futuristic%20UI%20v1%20Assets/Carousels/Unified%20Polygonal%20Carousel/UNIFIED_CAROUSEL_SYSTEM.md) | **Primary**: Multi-mode carousel architecture (Manual & Virtualized presets, drag physics, toggle states). |
| **🔷 Polygonal Buttons** | [`POLYGONAL_BUTTON_SYSTEM.md`](Assets/Futuristic%20UI%20v1%20Assets/Polygonal%20Button/POLYGONAL_BUTTON_SYSTEM.md) | Procedural polygon generation, corner filleting, borders, and state colors. |
| **🎡 Manual Carousel [Legacy]** | [`MANUAL_CAROUSEL_SYSTEM.md`](Assets/Futuristic%20UI%20v1%20Assets/Carousels/Manual%20Carousel%20[Legacy]/MANUAL_CAROUSEL_SYSTEM.md) | Legacy manual button arrangement and inspector callback guide. |
| **⚡ Virtualized Carousel [Legacy]** | [`VIRTUALIZED_CAROUSEL_SYSTEM.md`](Assets/Futuristic%20UI%20v1%20Assets/Carousels/Runtime%20Virtualized%20Carousel%20[Legacy]/VIRTUALIZED_CAROUSEL_SYSTEM.md) | Legacy virtualized template recycling and script populator guide. |
| **⚔️ Gesture Controllers** | [`GESTURE_SCROLLER_SYSTEM.md`](Assets/Futuristic%20UI%20v1%20Assets/Carousels/Gesture%20Controllers/GESTURE_SCROLLER_SYSTEM.md) | Fist anchor spawning (`Carousel Fist GestureApp.ts`) and sword swiping (`SwordSwipeScroller.ts`). |
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

In the hierarchy under `Carousel Samples`, you will find sample setups for both **Manual** and **Runtime Virtualized** carousel architectures. 

> [!TIP]
> **Unified Component Recommendation**:
> While the legacy standalone `Manual Carousel` and `Runtime Carousel` components remain available in the project for reference, it is **strongly recommended to use `UnifiedPolygonalCarousel`** for all new work. It cleanly merges ~70% shared circular layout and physics logic into a single battle-tested component that supports both manual scene setups and dynamic virtualized datasets.

Enable `Carousel Samples`, and enable **only one carousel SceneObject at a time** to test:

---

#### 🌟 Unified Polygonal Carousel (`Unified Polygonal Carousel`)
* **Features**: The multipurpose component supporting both **Manual Mode** (custom scene buttons) and **Virtualized Mode** (dynamic data feeds).
* **Testing**:
  - In **Manual Mode**: Test with pre-placed buttons in the scene. Supports single radio-button toggle group selection or independent multi-select toggles.
  - In **Virtualized Mode**: Test with dynamic button array feeds (`setItems()`).
  - Supports direct SIK touch dragging along the arc as well as external gesture scrollers (`SwordSwipeScroller.ts`).

---

#### 🎠 Manual Carousel Setup (`Manual Carousel`)
* **Configuration**: Powered by `UnifiedPolygonalCarousel` configured in **Manual Mode** (`mode: "Manual"`). It operates directly on pre-placed child buttons in the scene ($N = 3, 4, 8, 12...$), automatically distributing them evenly along the circular arc.
* **How to Test in Preview / Device**:
  1. Make a **closed fist with your left hand** to anchor and spawn the carousel in world space (`Carousel Fist GestureApp.ts`).
  2. Use your **right hand** to poke and drag buttons along the arc, or poke directly to trigger button callbacks.
* **Spatial UX Insight & Known Consideration**:
  > [!NOTE]
  > When using a **single-hand poke-and-drag** interaction model on small spatial buttons, dragging to scroll can occasionally register as an accidental button selection upon release if finger dwell time is brief. 
  > This is a known trade-off of direct poke-and-scroll on AR glasses. See the Runtime Carousel below for the recommended two-handed alternative!

---

#### ⚡ Runtime Carousel Setup (`Runtime Carousel`)
* **Configuration**: Powered by `UnifiedPolygonalCarousel` configured in **Virtualized Mode** (`mode: "Virtualized"`). It dynamically recycles a lightweight pool of visual buttons at runtime for arbitrary dataset sizes (e.g. 20, 50, 100+ items) populated via scripts like `RuntimeCarouselExamplePopulator.ts`.
* **How to Test in Preview / Device**:
  1. Make a **closed fist with your left hand** to anchor and spawn the carousel.
  2. With your **right hand**, make a **2-finger "sword gesture"** and move your hand across the wheel to smoothly scroll (`SwordSwipeScroller.ts`).
  3. Use **native SIK pinch (direct targeting)** to select any button on the wheel.
* **Recommended Spatial Interaction Pattern**:
  > [!TIP]
  > **Why This Pattern Wins**: Decoupling the **scroll gesture** (2-finger sword swipe / external gesture) from **selection** (native SIK direct targeting / pinch) completely eliminates the poke-and-drag conflict! 
  > Whenever architecting custom spatial carousels for Spectacles, it is **recommended to use dedicated scroll gestures paired with native SIK pinch selection** rather than relying solely on direct poke-to-scroll.

---

#### ⭕ Simple Circle Carousel (`Simple Circle Polygonal Carousel`)
* **Features**: Lightweight, static circular dial with direct touch physics.
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
