# PolygonalButton System Guide & Complete API Reference

The **PolygonalButton** system is an advanced, highly customizable UI component designed for Lens Studio and Spectacles (2024). It extends the native Spectacles UIKit `BaseButton` and Spectacles Interaction Kit (SIK) `Interactable` components to support procedural 2D custom geometry, filleted rounded corners, outer border ribbons, 6-state color transitions, and automatic child object opacity management.

<p align="center">
  <img src="../../../docs/media/button frames.png" alt="Procedural Polygonal Button Shapes" width="100%" />
  <br/>
  <em>Figure: Procedural polygon geometry presets, filleted corners, border outlines, and nested text/image layouts.</em>
</p>

---

## Inspector Inputs vs. Script API Mapping

Many properties exposed in the Lens Studio Inspector use specific input variable names, while the TypeScript runtime API provides clean getters, setters, or helper methods to access them.

| Inspector Section | Inspector Input Name | Script API Reference (TypeScript) | Type | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Shape Preset** | `shapePreset` | `button.setShapePreset(preset)` | `ShapePreset` | Switch preset enum dynamically (0 to 5) |
| **Custom Corners** | `customCorners` | `button.setCustomCorners(corners)` | `(PolygonVertex \| vec2)[]` | Rebuilds custom vertex array |
| **Polygon Scale** | `polygonScale` | `button.setPolygonScale(scale)` | `vec2 \| number` | Scales 2D geometry outline |
| **Animation Type** | `animationType` | `button.getAnimationType` / `button.setAnimationType` | `AnimationType` | Scale (0), Position (1), Both (2), None (3) |
| **Pop Distance** | `popDistance` | `button.getPopDistance` / `button.setPopDistance` | `number` | Z-axis displacement in cm |
| **Button Opacity** | `buttonOpacity` | `button.buttonOpacity = value` | `number` | Global alpha (0-1). Auto-syncs child text & images |
| **Is Toggleable** | `isToggleable` | `button._toggleable = value` | `boolean` | Must be `true` for toggle state colors to apply |
| **Is On (Toggle State)**| `isOn` | `button.isOn` | `boolean` | Current toggle state (`true` = active) |
| **Is Interactable** | *(SIK Interactable)* | `sceneObject.getComponent(Interactable.getTypeName()).enabled` | `boolean` | Disables/enables SIK hand interactions — access via `getComponent` |
| **Corner Radius** | `cornerRadius` | `button.cornerRadius` | `number` | Direct `@input` field — readable/writable |
| **Corner Segments** | `cornerSegments` | `button.cornerSegments` | `number` | Direct `@input` field — curve vertex resolution (default `6`) |
| **Border Width** | `borderWidth` | `button.borderWidth` | `number` | Direct `@input` field — outer ribbon border thickness in cm |
| **Use Textures** | `useTextures` | `button.useTextures` | `boolean` | Direct `@input` field — enable/disable texture tint multiplication |
| **Button Texture** | `buttonTexture` | `button.buttonTexture` | `Texture` | Direct `@input` field — main polygon body texture asset |
| **Border Texture** | `borderTexture` | `button.borderTexture` | `Texture` | Direct `@input` field — outer border ribbon texture asset |
| **Custom Material** | `customMaterial` | `button.customMaterial` | `Material` | Direct `@input` field — shader material pass override |
| **Default Body Color** | `defaultColor` | `button.getDefaultColor` / `button.setDefaultColor` | `vec4` | Idle background color (RGBA) |
| **Default Border Color**| `borderColor` | `button.getBorderColor` / `button.setBorderColor` | `vec4` | Idle outer border color |
| **Highlight Body Color**| `highlightColor` | `button.getHighlightColor` / `button.setHighlightColor` | `vec4` | Hovered background color |
| **Select Body Color** | `selectColor` | `button.getSelectColor` / `button.setSelectColor` | `vec4` | Triggered/pushed background color |
| **Toggled Body Color** | `toggledColor` | `button.getToggledColor` / `button.setToggledColor` | `vec4` | Active toggle background color |
| **Toggled Highlight** | `toggledHighlightColor` | `button.getToggledHighlightColor` / `button.setToggledHighlightColor` | `vec4` | Hovered background color while toggled |
| **Disabled Body Color**| `disabledColor` | `button.getDisabledColor` / `button.setDisabledColor` | `vec4` | Disabled background color |
| **Highlight Border Color**|`borderHighlightColor`| `button.getBorderHighlightColor` / `button.setBorderHighlightColor` | `vec4` | Hovered outer border color |
| **Select Border Color** | `borderSelectColor` | `button.getBorderSelectColor` / `button.setBorderSelectColor` | `vec4` | Triggered outer border color |
| **Toggled Border Color**| `borderToggledColor` | `button.getBorderToggledColor` / `button.setBorderToggledColor` | `vec4` | Active toggle outer border color |
| **Toggled Highlight Border**|`borderToggledHighlightColor`| `button.getBorderToggledHighlightColor` / `button.setBorderToggledHighlightColor` | `vec4` | Hovered outer border color while toggled |
| **Disabled Border Color**|`borderDisabledColor`| `button.getBorderDisabledColor` / `button.setBorderDisabledColor` | `vec4` | Disabled outer border color |

---

## Inspector Configuration Sections

### 1. Shape Preset Selection
* **Shape Preset** (`shapePreset`): Selects the polygon outline:
  * `0`: **Default Irregular Pentagon** (Futuristic 5-point asymmetric shield)
  * `1`: **Sci-Fi Chevron / Arrow** (Directional pointer with inset back edge)
  * `2`: **Futuristic Trapezoid** (Angled top-narrow quad)
  * `3`: **Asymmetric Quad** (Dynamic slanted rectangle)
  * `4`: **Hexagon** (6-sided symmetrical honeycomb tile)
  * `5`: **Custom Corner Points Array** (Exposes `customCorners` vec2 array)

### 2. Custom Corner Points (`customCorners`)
* **Shown when `shapePreset === 5` (Custom)**.
* **Coordinate Space**: `(0, 0)` is the center of the button.
* **Order**: Vertices MUST be specified in **counter-clockwise (CCW)** order around the center.
* **Scaling Behavior**:
  * When `Fit To Size` (`fitToSize`) is `true` (Default), coordinates define relative shape; the mesh auto-normalizes to fit target button dimensions (`size`, e.g. 4x4 cm).
  * When `Fit To Size` is `false`, coordinates act as absolute local space measurements.

---

## Custom Corner Points Library (Ready-to-Use Vector Arrays)

Set `shapePreset = 5` in the Inspector or call `button.setCustomCorners([...])` with any of these presets:

### 1. 5-Point Sci-Fi Star (10 Vertices)

```typescript
button.setCustomCorners([
  new vec2(0.0, 2.0),     // Top point
  new vec2(-0.47, 0.65),  // Inner top-left
  new vec2(-1.90, 0.62),  // Outer top-left
  new vec2(-0.76, -0.25), // Inner bot-left
  new vec2(-1.18, -1.62), // Outer bot-left
  new vec2(0.0, -0.80),   // Inner bot
  new vec2(1.18, -1.62),  // Outer bot-right
  new vec2(0.76, -0.25),  // Inner bot-right
  new vec2(1.90, 0.62),   // Outer top-right
  new vec2(0.47, 0.65)    // Inner top-right
]);
```

### 2. Cyber Shield (6 Vertices)

```typescript
button.setCustomCorners([
  new vec2(0.0, -2.5),   // Bottom sharp tip
  new vec2(2.0, -0.8),   // Bottom right shoulder
  new vec2(2.0, 1.8),    // Top right corner
  new vec2(0.0, 2.2),    // Top center crest
  new vec2(-2.0, 1.8),   // Top left corner
  new vec2(-2.0, -0.8)   // Bottom left shoulder
]);
```

### 3. Chamfered Octagon / Cyber Tile (8 Vertices)

```typescript
button.setCustomCorners([
  new vec2(1.0, -2.0),
  new vec2(2.0, -1.0),
  new vec2(2.0, 1.0),
  new vec2(1.0, 2.0),
  new vec2(-1.0, 2.0),
  new vec2(-2.0, 1.0),
  new vec2(-2.0, -1.0),
  new vec2(-1.0, -2.0)
]);
```

### 4. Sci-Fi Arrow / Wing Crest (6 Vertices)

```typescript
button.setCustomCorners([
  new vec2(0.0, -1.2),   // Bottom center inset notch
  new vec2(2.2, -2.2),   // Right bottom wing tip
  new vec2(1.8, 0.5),    // Right shoulder
  new vec2(0.0, 2.5),    // Top sharp point
  new vec2(-1.8, 0.5),   // Left shoulder
  new vec2(-2.2, -2.2)   // Left bottom wing tip
]);
```

### 5. 4-Point Star Spark / Diamond Burst (8 Vertices)

```typescript
button.setCustomCorners([
  new vec2(0.0, -2.5),   // Bottom tip
  new vec2(0.5, -0.5),   // Inner bot-right
  new vec2(2.5, 0.0),    // Right tip
  new vec2(0.5, 0.5),    // Inner top-right
  new vec2(0.0, 2.5),    // Top tip
  new vec2(-0.5, 0.5),   // Inner top-left
  new vec2(-2.5, 0.0),   // Left tip
  new vec2(-0.5, -0.5)   // Inner bot-left
]);
```

### 6. Slanted Sci-Fi Tag (6 Vertices)

```typescript
button.setCustomCorners([
  new vec2(-1.5, -2.0),  // Bottom-left corner
  new vec2(2.0, -2.0),   // Bottom-right corner
  new vec2(2.5, -0.5),   // Right peak
  new vec2(1.5, 2.0),    // Top-right corner
  new vec2(-2.0, 2.0),   // Top-left corner
  new vec2(-2.5, 0.5)    // Left peak
]);
```

---

## Geometry & Scaling Controls
* **Animation Type** (`animationType`): Determines hover & trigger visual pop.
* **Pop Distance** (`popDistance`): Distance in cm to translate on local Z-axis towards the camera on hover/trigger.
* **Fit To Size** (`fitToSize`): Auto-normalizes custom geometry to fill button bounding dimensions.
* **Polygon Scale** (`polygonScale`): 2D scale multiplier `vec2(X, Y)`.
* **Corner Radius** (`cornerRadius`): Radius in cm for filleted rounded corners (`0.0` = razor-sharp).
* **Corner Segments** (`cornerSegments`): Vertex subdivision density per corner arc (default `6`).
* **Border Width** (`borderWidth`): Thickness in cm of outer border stroke ribbon.

> [!NOTE]
> **Container-Isolated Z-Pop Animation**:
> Visual Z-pop displacement (`popDistance`) operates on an internal child `_visualContainer` holding the fill mesh, border ribbon, and all child text/icons. The root `SceneObject` transform is **never modified** by `PolygonalButton`, guaranteeing 100% compatibility with external layout scripts (carousels, grids) and custom scene placements!

---

## Interactive State Colors & Texture Multiplication
Configures background body colors and outer border ribbon colors for all 6 SIK states:
* **Default Color / Border Color**: Base visual state when idle.
* **Highlight Color / Border Highlight Color**: Hovered state when hand ray or finger approaches.
* **Select Color / Border Select Color**: Triggered state when pinched or poked.
* **Toggled Color / Border Toggled Color**: Active state when `isOn === true`.
* **Toggled Highlight Color / Border Toggled Highlight Color**: Hovered state while toggled active.
* **Disabled Color / Border Disabled Color**: Visual state when interactable is disabled.

> [!IMPORTANT]
> **Texture Color Multiplication**:
> When `useTextures = true` and a `buttonTexture` is assigned, the material pass multiplies the texture's base RGB values by the active state color (`defaultColor`, `highlightColor`, `selectColor`, `toggledColor`, `disabledColor`). This allows a single grayscale texture or icon map to be dynamically tinted into vibrant sci-fi state colors on the fly!
>
> **Custom Material Requirements**: If providing a `customMaterial` asset override, the shader pass MUST define:
> 1. `baseColor` (or `color`): a `vec4` uniform representing tint & opacity.
> 2. `baseTex` (or `baseTexture`): a `Texture` uniform for background texture mapping.
> Lens Studio's standard `Unlit.mat` or Spectacles UIKit `Image.mat` materials fulfill this contract natively.

---

## Textures & Materials
* **Custom Material** (`customMaterial`): Custom material pass override.
* **Button Opacity** (`buttonOpacity`): Global alpha (`0.0` to `1.0`). Automatically propagates to polygon body, border, and all child `Text`, `Text3D`, and `Image` components.
* **Use Textures** (`useTextures`): Enables texture mapping.
* **Button Texture** (`buttonTexture`): Texture applied to main polygon body (tinted by state colors).
* **Border Texture** (`borderTexture`): Texture applied to border ribbon (tinted by border state colors).

---

## Configure Interactable (SIK Integration)
* **Targeting Mode** (`targetingMode`): Direct (Pinch), Indirect (Raycast), Direct/Indirect, Poke, or All.
* **Targeting Visual** (`targetingVisual`): None, Cursor (V2 Cursor), or Ray.
* **Ignore Interaction Plane** (`ignoreInteractionPlane`): Bypasses parent interaction plane constraints.
* **Keep Hover On Trigger** (`keepHoverOnTrigger`): Locks cursor focus during trigger gestures.
* **Instant Drag** (`enableInstantDrag`): Bypasses drag distance threshold.
* **Is Scrollable** (`isScrollable`): Passes touch drag events to parent `ScrollView`.
* **Allow Multiple Interactors** (`allowMultipleInteractors`): Enables simultaneous multi-hand interactions.
* **Poke Directionality** (`enablePokeDirectionality`, `acceptableXDirections`, `acceptableYDirections`, `acceptableZDirections`): Restricts pokes to specific approach directions.
* **Use Filtered Pinch** (`useFilteredPinch`): Smooths noisy hand tracking pinches.

---

## Complete Public API Reference (Script Access)

Access `PolygonalButton` via `const button = sceneObject.getComponent("Component.ScriptComponent") as PolygonalButton;`

### 1. Toggle State & Behavior Sync
* `button.isOn`: `boolean`
* `button._toggleable`: `boolean`

```typescript
button._toggleable = true;
button.isOn = true;
```

---

### 2. Opacity & Child Opacity Syncing
* `button.buttonOpacity` (or `button.opacity`): `number` (Range `0.0` to `1.0`)

```typescript
button.buttonOpacity = 0.3;
```

---

### 3. Geometry & Preset Control Methods

* `button.setShapePreset(preset: ShapePreset): void`
* `button.setCustomCorners(corners: (PolygonVertex | vec2)[]): void`
* `button.setPolygonScale(scale: vec2 | number): void`

```typescript
import { ShapePreset, PolygonVertex } from "./PolygonalButton"

// Switch to Sci-Fi Chevron preset
button.setShapePreset(ShapePreset.SciFiChevron);

// Custom 4-point trapezoid shape
button.setCustomCorners([
  new vec2(-2.5, -1.0),
  new vec2(2.5, -1.0),
  new vec2(1.5, 1.0),
  new vec2(-1.5, 1.0)
]);

// Stretch X geometry by 1.5x
button.setPolygonScale(new vec2(1.5, 1.0));
```

---

### 4. Animation & Displacement API

> [!NOTE]
> `getAnimationType` and `getPopDistance` are **getter-style properties** (not functions). `setAnimationType` and `setPopDistance` are **setter-style properties**.

```typescript
// Read current animation type
const anim = button.getAnimationType; // Returns AnimationType enum value

// Set new animation type
button.setAnimationType = AnimationType.Position;

// Read current pop distance
const dist = button.getPopDistance; // Returns number in cm

// Set new pop distance
button.setPopDistance = 2.0;
```

---

### 5. Dynamic Color State Customization

> [!NOTE]
> All color states now have public getter/setter properties on `PolygonalButton`. Getters read the current `@input` value; setters write to both the `@input` field **and** the live `PolygonalVisual` backing field so color changes take effect immediately on the next rendered frame — no rebuild required.

```typescript
// Default state (body & border)
const currentColor = button.getDefaultColor;          // vec4
button.setDefaultColor = new vec4(0.2, 0.4, 0.8, 1.0);
button.setBorderColor = new vec4(0.5, 0.7, 1.0, 1.0);

// Hover state
button.setHighlightColor = new vec4(0.3, 0.6, 0.9, 1.0);
button.setBorderHighlightColor = new vec4(0.5, 0.7, 1.0, 1.0);

// Select / Triggered state  
button.setSelectColor = new vec4(0.9, 0.3, 0.1, 1.0);
button.setBorderSelectColor = new vec4(1.0, 0.5, 0.2, 1.0);

// Toggled state
button.setToggledColor = new vec4(0.9, 0.3, 0.1, 1.0);
button.setBorderToggledColor = new vec4(1.0, 0.5, 0.2, 1.0);

// Toggled + Hover state
button.setToggledHighlightColor = new vec4(0.3, 0.6, 0.9, 1.0);
button.setBorderToggledHighlightColor = new vec4(0.5, 0.7, 1.0, 1.0);

// Disabled state
button.setDisabledColor = new vec4(0.3, 0.3, 0.3, 0.5);
button.setBorderDisabledColor = new vec4(0.3, 0.3, 0.3, 0.5);
```

---

### 6. Toggle Management & Visual State Sync

```typescript
// Enable toggle functionality
button.setIsToggleable(true);

// Programmatically toggle state with immediate visual update
button.setOn(true);  // Switches visual state to toggledDefault
button.setOn(false); // Reverts visual state to default
```

---

## Hint Controller (`PolygonalButtonHintController`)

The `PolygonalButtonHintController` script component provides smooth opacity fade-in / fade-out sequences (`0.0` $\leftrightarrow$ `1.0`) for tutorial hint popups, animated MP4 / GIF hints, or gesture prompts attached to `PolygonalButton` objects.

### Inspector Controls

| Inspector Input | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| **Polygonal Button** | `ScriptComponent` | *Required* | Drag the SceneObject with `PolygonalButton` script here |
| **Video Player** | `ScriptComponent` | *Optional* | Drag optional `VideoPlayerController` here to automatically trigger video playback on fade-in |
| **In Duration** | `number` | `0.5` | Duration in seconds to fade in from opacity 0 to 1 |
| **Out Duration** | `number` | `0.5` | Duration in seconds to fade out from opacity 1 to 0 |
| **Disable On Fade Out** | `boolean` | `true` | Automatically disables the SceneObjects when fade out completes (saves render/CPU cycles) |
| **Target To Disable** | `SceneObject` | *Optional* | Additional parent/root SceneObject to enable/disable alongside `polygonalButton.getSceneObject()` |
| **Auto Trigger On Start** | `boolean` | `true` | Runs automatic `startDelay` $\rightarrow$ `triggerIn` $\rightarrow$ `afterInDelay` $\rightarrow$ `triggerOut` sequence on Lens start |
| **Start Delay** | `number` | `1.0` | Delay in seconds on start before fading in (visible when `autoTriggerOnStart = true`) |
| **After In Delay** | `number` | `3.0` | Duration in seconds to stay visible (`opacity = 1.0`) before fading out (visible when `autoTriggerOnStart = true`) |

### Public Scripting API

Access from another script to trigger hints dynamically:

```typescript
@input("Component.ScriptComponent")
hintController: ScriptComponent;

private hintAPI: any;

onAwake() {
    this.hintAPI = this.hintController as any;
}

// Trigger fade-in (0 -> 1) with optional completion callback
this.hintAPI.triggerIn(() => {
    print("Hint is now fully visible!");
});

// Trigger fade-out (1 -> 0) with optional completion callback
this.hintAPI.triggerOut(() => {
    print("Hint is now hidden!");
});
```

---

## Video Player Controller (`VideoPlayerController.ts`)

Located at `Assets/Futuristic UI v1 Assets/UI Hints Mp4 files/Video Player Controller Script.ts`, this helper script controls video textures (`VideoTextureProvider`) for MP4 animated gesture tutorials, video badges, or UI loops.

### Features
* **Custom Playback Speed**: Change `playbackRate` (e.g. `1.5x`, `2.0x`, `0.5x`) at edit-time or runtime.
* **Speed-Compensated Loop Watcher**: Fixes the Lens Studio bug where native `play(-1)` freezes on the last frame when speed > 1.0 by watching frame timestamps in `UpdateEvent` and instantly looping seamlessly.
* **Public Playback Controls**: Easily triggered from `PolygonalButtonHintController` or custom application scripts.

### Inspector Controls

| Inspector Input | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| **Video Texture** | `Asset.Texture` | *Required* | Drag your Video Texture asset (must use `VideoTextureProvider`) here |
| **Playback Rate** | `float` | `1.0` | Playback speed multiplier (`1.0` = normal, `2.0` = double speed, `0.5` = half speed) |
| **Loop Count** | `int` | `-1` | Number of loops (`-1` = loop forever, `1` = play once) |
| **Play On Start** | `boolean` | `false` | If `true`, video automatically starts playing on Lens launch |

### Public Scripting API

```typescript
import { VideoPlayerController } from "./VideoPlayerController";

@input("Component.ScriptComponent")
videoControllerObj!: ScriptComponent;

private player!: VideoPlayerController;

onStart() {
    this.player = this.videoControllerObj as any;
    
    this.player.play();          // Start from beginning with Inspector loopCount
    this.player.play(1);         // Play once, overriding loopCount
    this.player.pause();         // Freeze at current frame
    this.player.resume();        // Resume playback
    this.player.stop();          // Stop and rewind to 0s
    this.player.seek(2.5);       // Seek to 2.5 seconds
    this.player.setSpeed(1.75);  // Set playback speed multiplier to 1.75x
    
    print("Status: " + this.player.getStatus());       // "Playing" | "Paused" | "Stopped"
    print("Time: " + this.player.getCurrentTime());    // Current time in seconds
    print("Duration: " + this.player.getDuration());   // Total duration in seconds
    print("Ready: " + this.player.isReady());          // Is video asset loaded and ready?
}
```

---

## PolygonalButton as an Inactive UI Container / HUD Plate

`PolygonalButton` is not limited to clickable buttons — it is also designed to serve as a **futuristic procedural container**, **backdrop plate**, or **animated tutorial card**.

### How to Configure as an Inactive Container:
1. **Disable SIK Interactivity**:
   * If you don't want the container to react to pinch/hover raycasts, disable the `Interactable` component on the SceneObject:
   ```typescript
   const interactable = sceneObject.getComponent(Interactable.getTypeName());
   if (interactable) interactable.enabled = false;
   ```
2. **Attach Child Visuals**:
   * Add child `Image` components (for icons, logos, or MP4 video textures) and child `Text` / `Text3D` components.
   * `PolygonalButton` automatically finds all child text and image renderers and synchronizes their alpha whenever `buttonOpacity` changes!
3. **Attach `PolygonalButtonHintController` & `VideoPlayerController`**:
   * Add `PolygonalButtonHintController` to animate the container in and out with smooth fades.
   * Add `VideoPlayerController` to display an animated MP4 video inside the container's child `Image` material!
4. **Use Custom Shape Presets / Colors**:
   * Use presets like `Trapezoid`, `Hexagon`, or custom corner arrays to create futuristic angled frames, dialog boxes, and HUD status plates.


