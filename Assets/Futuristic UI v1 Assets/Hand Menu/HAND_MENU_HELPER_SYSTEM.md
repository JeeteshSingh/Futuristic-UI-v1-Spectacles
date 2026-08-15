# HandMenuHelper & HandPreviewSimulator System Guide & Reference

The **HandMenuHelper** system is a specialized, highly-stabilized hand anchoring utility designed for Lens Studio and Spectacles (2024). It allows developers to anchor custom 2D UI panels, 3D menus, or carousels (e.g. `VirtualizedPolygonalCarousel` or `ManualPolygonalCarousel`) relative to hand knuckle joints with customizable position/rotation offsets, camera facing triggers, gesture filters, smooth interpolation, and pop-in entry animations.

---

## Why Hand Menus are Tricky & How HandMenuHelper Solves It

Creating hand menus in Spatial AR is notoriously tricky:
* **The Finger Twitch Problem**: Anchoring UI objects directly to individual finger bones causes severe UI jitter and tilt whenever fingers twitch or flex.
* **The Stabilized Hand Coordinate Frame**: `HandMenuHelper` solves this by computing a **stabilized hand coordinate frame** across multiple knuckle/wrist reference points (Middle Knuckle / Palm Center `mid-0`, Index Knuckle `index-0`, Pinky Knuckle `pinky-0`, and Wrist `wrist`).
* Objects are anchored relative to the palm's overall stable orientation axis rather than glued to individual twitching fingers!

---

## Palm Basis Coordinate System & Joint Anchors

```
      [Index-0]     [Mid-0]     [Pinky-0]
          \            |            /
           +-----------+-----------+
                       |
                       |
                    [Wrist]
```

### Anchor Joint Options (`palmAnchorPoint`):
* `0`: **Palm Center / Middle Knuckle (`mid-0`)** - Default center anchor. Offset `{0,0,0}` sits directly on the middle knuckle.
* `1`: **Index Knuckle (`index-0`)** - Anchored to index finger base.
* `2`: **Pinky Knuckle (`pinky-0`)** - Anchored to pinky finger base.
* `3`: **Wrist (`wrist`)** - Anchored to the wrist joint.

### Local Palm Axis Directions:
* **X-Axis (+ / -)**: Across Palm (Index $\leftrightarrow$ Pinky)
* **Y-Axis (+ / -)**: Along Finger Axis (Wrist $\rightarrow$ Fingertips)
* **Z-Axis (+ / -)**: Normal Vector out of Palm (Popping out toward camera when palm faces user)

---

## The Edge-Origin Pivot Principle (Container Origin Offset)

When anchoring a multi-item menu or carousel to the edge of a hand (e.g. extending out from the pinky finger knuckle), setting the menu container's internal local origin `(0,0,0)` to the **EDGE of the menu** (rather than the center) creates a clean, natural UI attachment without needing huge manual position offsets!

### Scenario 1: Left Hand Target (Menu extends OUTWARD to the RIGHT of Left Pinky)

* **Anchor Joint**: Left Pinky Knuckle (`pinky-0`)
* **Menu Container Pivot Origin**: Set local origin `(0,0,0)` at the **LEFT-MOST EDGE** of your menu object.
* **Result**: The menu clean-spawns starting directly from the left pinky knuckle extending outward to the right!

```
========================================================================================
                                 LEFT HAND MENU LAYOUT
========================================================================================

                  [LEFT HAND PALM]
               (Thumb | Index | Mid | Pinky)
                                        \
                                     [Pinky-0 Joint] 
                                        (0,0,0)
                                           |
                                           v  (Origin at LEFT Edge)
                                           +=====================================+
                                           |  [Card 1]   [Card 2]   [Card 3]     |  ===> (Extends Right)
                                           +=====================================+
```

---

### Scenario 2: Right Hand Target (Menu extends OUTWARD to the LEFT of Right Pinky)

* **Anchor Joint**: Right Pinky Knuckle (`pinky-0`)
* **Menu Container Pivot Origin**: Set local origin `(0,0,0)` at the **RIGHT-MOST EDGE** of your menu object.
* **Result**: The menu clean-spawns starting directly from the right pinky knuckle extending outward to the left!

```
========================================================================================
                                 RIGHT HAND MENU LAYOUT
========================================================================================

                                                                 [RIGHT HAND PALM]
                                                              (Pinky | Mid | Index | Thumb)
                                                             /
                                                     [Pinky-0 Joint]
                                                        (0,0,0)
                                                           |
                                 (Origin at RIGHT Edge)    v
                        +=====================================+
 (Extends Left) <===    |  [Card 3]   [Card 2]   [Card 1]     |
                        +=====================================+
```

---

### Recommended Scene Hierarchy Structure

To easily position a menu's pivot origin at its left or right edge in Lens Studio:

```
Scene Hierarchy:
├── HandMenuHelper (SceneObject with HandMenuHelper script attached)
│   └── MenuRootContainer (Positioned at Anchor Joint by HandMenuHelper)
│       └── MenuPanelPivotOffset (Shifted local X position so origin sits at left/right edge)
│           ├── Button/Card 1
│           ├── Button/Card 2
│           └── Button/Card 3
```

---

## Inspector Inputs vs. Script API Mapping

| Inspector Section | Inspector Input Name | Script API Reference (TypeScript) | Type | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Menu Object** | `menuObject` | *(Inspector Reference)* | `SceneObject` | Target UI Panel or Carousel object to position |
| **Target Hand** | `targetHand` | *(Inspector Only)* | `number` | Right Only (0), Left Only (1), Both Hands (2) |
| **Anchor Point** | `palmAnchorPoint` | *(Inspector Only)* | `number` | Palm Center (0), Index (1), Pinky (2), Wrist (3) |
| **Gesture Filter**| `gestureTrigger` | *(Inspector Only)* | `number` | Palm Open (0), Fist Closed (1), Any Pose (2) |
| **Facing Filter** | `facingTrigger` | *(Inspector Only)* | `number` | Facing Camera (0), Facing Away (1), Any (2) |
| **Facing Threshold**| `facingAngleThreshold` | *(Inspector Only)* | `number` | Facing angle threshold in degrees (default 65°) |
| **Position Offset**| `positionOffset` | *(Inspector Only)* | `vec3` | Position offset relative to selected anchor joint |
| **Rotation Offset**| `rotationOffset` | *(Inspector Only)* | `vec3` | Rotation offset in degrees relative to palm |
| **Target Scale** | `targetScale` | *(Inspector Only)* | `vec3` | Target scale when fully visible |
| **Smooth Speed** | `smoothSpeed` | *(Inspector Only)* | `number` | Position & rotation dampening speed (default 14) |
| **Pop Animation** | `enablePopAnimation` | *(Inspector Only)* | `boolean` | Enables scale pop-in & pop-out entry/exit anim |
| **Pop Duration** | `popDuration` | *(Inspector Only)* | `number` | Pop scaling duration in seconds (default 0.2s) |
| **Debug Preview** | `enablePreviewDebug` | *(Inspector Only)* | `boolean` | **Editor testing only! Disable for device builds** |
| **Preview Simulator**| `previewSimulator` | *(Inspector Reference)* | `ScriptComponent` | Reference to `HandPreviewSimulator` script |

---

## Detailed Usage Guide & Recommended Practices

### 1. Ergonomic Z-Tilt Recommendation
> [!TIP]
> **Ergonomic Z-Tilt Tip**: Simply attaching a menu flat to the palm often causes the menu UI to tilt away from the user's view, making text hard to read.
> **Always apply a subtle Z-axis rotation offset (`rotationOffset.z`)** to tilt the UI interface inward toward the user's eyes:
> * For **Left Hand Target**: Set `rotationOffset.z` to **`-20°`** (e.g. `{0, 0, -20}`).
> * For **Right Hand Target**: Set `rotationOffset.z` to **`+20°`** (e.g. `{0, 0, 20}`).
> Experiment with `positionOffset` and `rotationOffset` relative to your chosen `palmAnchorPoint` to achieve the perfect ergonomic placement.

---

### 2. Debug Preview Mode & `HandPreviewSimulator`
> [!CAUTION]
> **CRITICAL WORKFLOW REQUIREMENT & APPROXIMATION NOTICE**:
> `HandMenuHelper` features an `enablePreviewDebug` boolean toggle to test hand menu placement directly inside the Lens Studio Preview window without wearing Spectacles glasses!
>
> **Setup**:
> 1. Attach `HandPreviewSimulator.ts` to a SceneObject in your hierarchy containing Right and Left 3D Hand Mesh Rigs (`rightHandRig`, `leftHandRig`).
> 2. Drag the `HandPreviewSimulator` script component into the `previewSimulator` input field on `HandMenuHelper`.
> 3. Select override modes in `HandPreviewSimulator` (`Force Facing Camera`, `Force Facing Away`, `Force Palm Open`, `Force Fist Closed`).
> 4. Check `enablePreviewDebug = true` to preview hand tracking, palm facing, and menu placement inside Lens Studio.
>
> **Note on Approximation**:
> The `HandPreviewSimulator` is an **approximation tool** designed for rapid layout testing inside the editor preview. Always test final positioning on physical Spectacles hardware!
>
> **MUST DISABLE BEFORE DEVICE DEPLOYMENT**:
> Once you have finalized your hand menu position and rotation offsets:
> * **Uncheck `enablePreviewDebug = false`** on `HandMenuHelper`.
> * Delete or disable the `HandPreviewSimulator` object from your scene so simulated hand meshes don't interfere with real Spectacles device hand tracking!

---

## Complete Public API Reference (Script Access)

Access `HandMenuHelper` via:
`const helper = sceneObject.getComponent("Component.ScriptComponent") as HandMenuHelper;`

### 1. Developer Event Callbacks

```typescript
// Register callback for when menu becomes visible on hand
helper.onMenuShown.push(() => {
  print("Hand Menu Opened!");
});

// Register callback for when menu hides
helper.onMenuHidden.push(() => {
  print("Hand Menu Closed!");
});
```

---

### 2. `HandPreviewSimulator` API Reference

Access `HandPreviewSimulator` via:
`const simulator = sceneObject.getComponent("Component.ScriptComponent") as HandPreviewSimulator;`

```typescript
// Force simulated facing state in editor (0 = Force Facing Camera, 1 = Force Facing Away)
simulator.simulatedFacing = 0;

// Force simulated gesture state in editor (0 = Force Palm Open, 1 = Force Fist Closed)
simulator.simulatedGesture = 0;
```
