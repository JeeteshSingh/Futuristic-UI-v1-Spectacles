# 🔍 Futuristic UI v1 — Detailed Feature Overview

This document provides a comprehensive technical breakdown of every component, script, and interaction system in **Futuristic UI v1** for Snap Spectacles.

---

## 1. 🔷 Polygonal Button System (`PolygonalButton.ts`)

`PolygonalButton` is a procedural 2D button generator that directly extends Spectacles UIKit's `BaseButton` and integrates with SIK's `Interactable` system.

### Key Capabilities:
* **Procedural Geometry Generation**: Generates 2D polygon meshes at runtime using Lens Studio's `MeshBuilder`. Choose from 5 presets (`Pentagon`, `Chevron`, `Trapezoid`, `Hexagon`, `Octagon`) or supply custom 2D vertex arrays.
* **Corner Rounding & Tessellation**: `cornerRadius` (e.g. `0.2` – `0.5`) adds smooth fillets to sharp polygon vertices. `cornerSegments` controls arc smoothness.
* **Border Ribbon**: `borderWidth` creates an outer highlight ribbon around the button perimeter.
* **6-State Dynamic Color Engine**: Configurable color properties for:
  - `Default` (Normal state)
  - `Highlight` (Hovered by ray or poke cursor)
  - `Select` (Triggered on pinch or push)
  - `Toggled` (Active radio toggle state)
  - `Toggled Hover` / `Toggled Select`
  - `Disabled` (Non-interactive)
* **Alpha Propagation**: Modifying `buttonOpacity` automatically updates the alpha channel across all nested child images (`Component.Image`) and text renderers (`Component.Text` / `Text3D`).
* **Micro-Animations**: Choose between `Scale` (subtle compression on press), `Position` (Z-pop forward on hover/select), `Both`, or `None`.

---

## 2. 🎠 Manual Carousel System (`ManualPolygonalCarousel.ts`)

The Manual Carousel arranges handcrafted sets of buttons into a circular wheel with touch dragging, kinetic momentum, and slot snapping.

### Key Capabilities:
* **Any Number of Buttons ($N$)**: Arrange 3, 4, 8, 12, or any number of custom button prefabs under the root object. The script calculates angular spacing automatically:
  $$\Delta\theta = \frac{\text{arcAngleDegrees}}{N - 1}$$
* **XY-Plane Circular Distribution**: Distributes child buttons along a vertical face-on circle of radius `radius`.
* **Orientation & Slot Offsets**:
  - `arcOffsetDegrees`: Rotates the circle orientation (0° = Top/12 o'clock, 90° = Right/3 o'clock, 180° = Bottom, 270° = Left).
  - `slotOffset`: Shifts which button appears at the primary position (supports negative and positive integers: `-2`, `-1`, `0`, `1`, `2`).
* **Physics & Snapping**: Direct SIK poke/drag interaction, smooth inertia damping after release, and magnetic slot snapping.
* **Radio Toggling**: Built-in exclusive single-selection mode (`enableToggleBehavior`) with optional deselect (`allowAllTogglesOff`).

---

## 3. ⚡ Runtime Virtualized Carousel (`VirtualizedPolygonalCarousel.ts`)

A script-driven carousel designed for large or dynamic datasets where instantiating hundreds of 3D objects would degrade performance.

### Key Capabilities:
* **Card Recycling & Pooling**: Instantiates only a small pool of visual cards (e.g. 8 slots) and dynamically maps data as you scroll, allowing infinite wrapping without spawning dozens of objects.
* **Cached Data Binding**: Tracks `_lastDataIndex` on recycled slots to only re-bind text and textures when a slot changes data, preserving active SIK hover and press states.
* **Dynamic Script API**:
  - `carousel.setItems(dataArray)`: Injects item titles, textures, and icons dynamically.
  - `carousel.selectItem(dataIndex)`: Programmatically selects an item index.
  - `carousel.onItemSelected`: Event callback triggered when an item is selected.
* **Populator Integration**: Paired with `RuntimeCarouselExamplePopulator.ts` to showcase real-time data feeding and event handling.

---

## 4. ⚔️ 2-Handed Spatial Gesture Controllers

### A. Fist Anchor Spawner (`Carousel Fist GestureApp.ts`)
* **Fist Spawning**: Form and hold a closed fist (`gestureHoldTime ≈ 0.5s`) to spawn the carousel anchored to your hand.
* **Fused Detection Pipeline**: Combines Snap's native `GestureModule` Grab ML classifier (`getGrabBeginEvent` / `getGrabEndEvent`) with continuous Euclidean bone distance checks (`wrist` $\rightarrow$ `indexKnuckle` / `fingertip`), eliminating tracking dropouts.
* **Staggered Animations**: Smooth pop-in on fist hold, and sequential card fade-out when opening the hand.

### B. Sword-Swipe Kinetic Scroller (`SwordSwipeScroller.ts`)
* **2-Finger Sword Gesture**: Form a 2-finger "sword" pose with your opposite hand and roll/swipe around the carousel's outer ring.
* **Virtual Cylinder Mapping**: Projects the hand onto an invisible cylindrical shell surrounding the carousel to convert 3D hand velocity into rotational scroll momentum.
* **SIK Pinch Compatibility**: Preserves standard SIK pinch targeting so you can swipe with two fingers and pinch to select items simultaneously.

---

## 5. 🖐️ Stabilized Hand Menu Helper (`HandMenuHelper.ts`)

### Key Capabilities:
* **Knuckle-Derived Stabilized Frame**: Computes a stable palm coordinate frame from multiple knuckle tracking points (`mid-0`, `index-0`, `pinky-0`, `wrist`), eliminating jitter from individual finger twitches.
* **Edge-Origin Pivot Layout**: Placing the local origin `(0,0,0)` at the outer edge of the menu causes the panel to project cleanly outward alongside the palm.
* **Desktop Preview Simulator (`HandPreviewSimulator.ts`)**:
  - Bundles 3D reference hand models directly into the Lens Studio desktop preview.
  - Check **`Debug Preview Simulator`** on `HandMenuHelper` and enable `HandPreviewSimulator` to test position offsets, rotation angles, and facing thresholds without deploying to hardware.

---

## 6. ✨ 4-Finger Multi-Pinch Palm Menu (`PalmMenuGestureApp.ts`)

### Key Capabilities:
* **Multi-Pinch Shortcuts**: Tracks 3D thumb proximity to 4 individual fingertips (Index, Middle, Ring, Pinky), turning the hand into a 4-slot quick-access bookmarking palette.
* **Knuckle Anchoring**: Buttons anchor to mid-knuckles (`index-1`, `mid-1`, `ring-1`, `pinky-1`) and project outward along the finger axis, remaining stable while appearing perched near fingertips.
* **Palm-Up Billboarding**: Uses an orthogonal dual-basis look-at transform that billboards buttons toward the camera (`dirToCamera`) while locking their vertical axis strictly along the **palm's finger direction** (`wrist` $\rightarrow$ `middleKnuckle`).
* **Hysteresis Facing Gate**: Opens when palm faces the eyes (`palmFacingThreshold ≈ 65°`) and applies a dynamic $+25^\circ$ hysteresis buffer while active to prevent accidental menu closing during pinch motions.

---

## 7. 🎬 Video Tutorial HUDs & Hint Controllers

### Key Capabilities:
* **Modular HUD Construction**: Pre-built hierarchy pattern:
  `Parent Controller (Script)` $\rightarrow$ `Container Plate (PolygonalButton)` $\rightarrow$ `Image (Video Texture Provider)`.
* **Speed-Compensated Looping (`Video Player Controller Script.ts`)**: Plays video textures with custom playback speeds (`1.5x`, `2.0x`) and includes an `UpdateEvent` loop watcher to prevent trailing freeze frames.
* **Polygonal Button as a HUD Container**: `PolygonalButtonHintController.ts` animates button opacity to create timed tutorial popups (`startDelay`, `afterInDelay`, `outDuration`).
