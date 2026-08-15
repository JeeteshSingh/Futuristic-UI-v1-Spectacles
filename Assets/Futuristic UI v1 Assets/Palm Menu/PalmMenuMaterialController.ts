/**
 * ============================================================================
 * Futuristic UI v1 | Spatial Interface & Carousel Framework
 * Designed for Snapdragon-powered Spectacles (2024) & Lens Studio 5.15+
 * 
 * Open-Source Release under the MIT License.
 * Copyright (c) 2026 Futuristic UI v1 Contributors
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files to deal in the Software
 * without restriction, including commercial use, modification, and distribution.
 * ============================================================================
 */
import {HandInputData} from "SpectaclesInteractionKit.lspkg/Providers/HandInputData/HandInputData"
import TrackedHand from "SpectaclesInteractionKit.lspkg/Providers/HandInputData/TrackedHand"

/**
 * PalmMenuMaterialController Component
 * 
 * Extended controller script that connects to PalmMenuGestureApp.
 * Features:
 * 1. Per-finger button availability toggles.
 * 2. Swaps materials on a target RenderMeshVisual based on finger button presses.
 * 3. Restores target mesh material to defaultMaterial when all toggles are turned OFF.
 * 4. Dynamically and smoothly tracks the target mesh's SceneObject transform to the palm center (middleKnuckle) with offsets.
 */
@component
export class PalmMenuMaterialController extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA; font-weight: bold; font-size: 13px;">PalmMenuMaterialController</span><br/><span style="color: #94A3B8; font-size: 11px;">Swaps materials on a mesh and anchors it smoothly to the palm center.</span>')
  @ui.separator

  @input("Component.ScriptComponent")
  @allowUndefined
  @hint("Drag the SceneObject containing PalmMenuGestureApp here")
  palmMenuApp?: ScriptComponent

  @ui.separator
  @ui.label('<span style="color: #38BDF8; font-weight: bold;">Finger Button Configuration</span>')

  @input("boolean", "true")
  enableIndex: boolean = true

  @input("boolean", "true")
  enableMiddle: boolean = true

  @input("boolean", "true")
  enableRing: boolean = true

  @input("boolean", "true")
  enablePinky: boolean = true

  @ui.separator
  @ui.label('<span style="color: #F59E0B; font-weight: bold;">Target Mesh & Material Switcher</span>')

  @input("Component.RenderMeshVisual")
  @allowUndefined
  @hint("Drag the RenderMeshVisual component of the object to place on the palm")
  targetMeshVisual?: RenderMeshVisual

  @input("Asset.Material")
  @allowUndefined
  @hint("Default material restored when all toggles are turned OFF (auto-captured if unassigned)")
  defaultMaterial?: Material

  @input("Asset.Material")
  @allowUndefined
  @hint("Material applied when Index button is pressed")
  indexMaterial?: Material

  @input("Asset.Material")
  @allowUndefined
  @hint("Material applied when Middle button is pressed")
  middleMaterial?: Material

  @input("Asset.Material")
  @allowUndefined
  @hint("Material applied when Ring button is pressed")
  ringMaterial?: Material

  @input("Asset.Material")
  @allowUndefined
  @hint("Material applied when Pinky button is pressed")
  pinkyMaterial?: Material

  @ui.separator
  @ui.label('<span style="color: #10B981; font-weight: bold;">Palm Object Tracking Settings</span>')

  @input("int", "0")
  @widget(new ComboBoxWidget([
    new ComboBoxItem("Right Hand", 0),
    new ComboBoxItem("Left Hand", 1),
    new ComboBoxItem("Both Hands (Follow Active)", 2)
  ]))
  meshTargetHand: number = 0

  @input("vec3")
  meshPositionOffset: vec3 = new vec3(0, 0, 0)

  @input("vec3")
  meshRotationOffset: vec3 = new vec3(0, 0, 0)

  @input("vec3")
  meshScale: vec3 = new vec3(1, 1, 1)

  @input("float", "12")
  smoothSpeed: number = 12.0

  @input("float", "65")
  palmFacingThreshold: number = 65.0

  @ui.separator
  @ui.label('<span style="color: #34D399; font-weight: bold;">Developer Feedback</span>')

  @input("Component.Text")
  @allowUndefined
  controllerDebugText?: Text

  private handProvider = HandInputData.getInstance();
  private lateUpdateEvent = this.createEvent("LateUpdateEvent");

  onAwake() {
    this.createEvent("OnStartEvent").bind(this.onStart.bind(this));
    this.lateUpdateEvent.bind(this.onLateUpdate.bind(this));
  }

  private onStart() {
    // Auto-capture defaultMaterial if unassigned
    if (!this.defaultMaterial && this.targetMeshVisual && this.targetMeshVisual.mainMaterial) {
        this.defaultMaterial = this.targetMeshVisual.mainMaterial;
        print("[PalmMenuMaterialController] Auto-captured default material from target mesh.");
    }

    if (!this.palmMenuApp) {
        print("[PalmMenuMaterialController] WARNING: 'palmMenuApp' input is unassigned. Please drag your PalmMenuGestureApp component into the inspector slot.");
        return;
    }

    // 1. Sync initial finger button availability to the menu app
    this.applyFingerConfiguration();

    // 2. Subscribe to button selection & toggle state events dispatched by PalmMenuGestureApp
    const app = this.palmMenuApp as any;
    if (app) {
        if (app.onButtonSelected && Array.isArray(app.onButtonSelected)) {
            app.onButtonSelected.push(this.handleButtonSelected.bind(this));
        }
        if (app.onSelectionChanged && Array.isArray(app.onSelectionChanged)) {
            app.onSelectionChanged.push(this.handleSelectionChanged.bind(this));
        }
        print("[PalmMenuMaterialController] Successfully registered callbacks with PalmMenuGestureApp.");
    }
  }

  public applyFingerConfiguration() {
    if (!this.palmMenuApp) return;
    const app = this.palmMenuApp as any;
    app.enableIndexFinger = this.enableIndex;
    app.enableMiddleFinger = this.enableMiddle;
    app.enableRingFinger = this.enableRing;
    app.enablePinkyFinger = this.enablePinky;
  }

  private handleSelectionChanged(selectedIndex: number, fingerName: string, isToggledOn: boolean) {
    if (selectedIndex === -1 || !isToggledOn) {
        // Reset to default material when all toggles are turned OFF
        this.applyMaterial(this.defaultMaterial, "Default (All Off)");
        if (this.controllerDebugText) {
            this.controllerDebugText.text = "State: All Toggles Off";
        }
    }
  }

  private handleButtonSelected(fingerIndex: number, fingerName: string, button?: ScriptComponent) {
    print("[PalmMenuMaterialController] Event received for " + fingerName + " finger (Index: " + fingerIndex + ")");

    switch (fingerIndex) {
        case 0:
            this.applyMaterial(this.indexMaterial, "Index");
            break;
        case 1:
            this.applyMaterial(this.middleMaterial, "Middle");
            break;
        case 2:
            this.applyMaterial(this.ringMaterial, "Ring");
            break;
        case 3:
            this.applyMaterial(this.pinkyMaterial, "Pinky");
            break;
        default:
            break;
    }
  }

  /**
   * Safely applies a material to targetMeshVisual without causing crashes if unassigned.
   */
  private applyMaterial(mat?: Material, fingerName: string = "") {
    if (!this.targetMeshVisual) {
        print("[PalmMenuMaterialController] Warning: 'targetMeshVisual' is unassigned in Inspector.");
        return;
    }

    if (mat) {
        this.targetMeshVisual.mainMaterial = mat;
        print("[PalmMenuMaterialController] Applied " + fingerName + " material to target mesh.");
        if (this.controllerDebugText) {
            this.controllerDebugText.text = "Material: " + fingerName + " Applied";
        }
    } else {
        print("[PalmMenuMaterialController] Info: " + fingerName + " material input is unassigned. Skipping material swap.");
    }
  }

  /**
   * Smoothly tracks the target mesh's SceneObject transform to the palm center (middle knuckle).
   */
  private onLateUpdate() {
    if (!this.targetMeshVisual) return;

    const meshObj = this.targetMeshVisual.getSceneObject();
    if (!meshObj) return;

    const rightHand = this.handProvider.getHand("right");
    const leftHand = this.handProvider.getHand("left");

    let activeHand: TrackedHand | null = null;
    if (this.meshTargetHand !== 1 && rightHand && rightHand.isTracked()) {
        activeHand = rightHand;
    } else if (this.meshTargetHand !== 0 && leftHand && leftHand.isTracked()) {
        activeHand = leftHand;
    }

    let showMesh = false;
    if (activeHand) {
        const angle = activeHand.getFacingCameraAngle();
        if (angle !== null && angle < this.palmFacingThreshold) {
            showMesh = true;
        }
    }

    if (showMesh && activeHand) {
        const wristPos = activeHand.wrist.position;
        const middleKnucklePos = activeHand.middleKnuckle.position; // Palm center is roughly middle knuckle!
        const indexKnucklePos = activeHand.indexKnuckle.position;

        const handForward = middleKnucklePos.sub(wristPos).normalize();
        const handRight = indexKnucklePos.sub(middleKnucklePos).normalize();
        const handUp = activeHand.handType === "right" 
            ? handRight.cross(handForward).normalize() 
            : handForward.cross(handRight).normalize();

        const palmRotation = quat.lookAt(handForward, handUp);

        // Position offset calculated relative to palm orientation
        const worldPosOffset = palmRotation.multiplyVec3(this.meshPositionOffset);
        const targetWorldPos = middleKnucklePos.add(worldPosOffset);

        // Rotation offset
        const radOffset = this.meshRotationOffset.uniformScale(MathUtils.DegToRad);
        const rotOffset = quat.fromEulerVec(radOffset);
        const targetWorldRot = palmRotation.multiply(rotOffset);

        const meshTransform = meshObj.getTransform();
        const dt = getDeltaTime();
        const t = MathUtils.clamp(dt * this.smoothSpeed, 0, 1);

        // Smooth position lerp & rotation slerp
        meshTransform.setWorldPosition(vec3.lerp(meshTransform.getWorldPosition(), targetWorldPos, t));
        meshTransform.setWorldRotation(quat.slerp(meshTransform.getWorldRotation(), targetWorldRot, t));
        meshTransform.setWorldScale(this.meshScale);

        meshObj.enabled = true;
    } else {
        meshObj.enabled = false;
    }
  }
}
