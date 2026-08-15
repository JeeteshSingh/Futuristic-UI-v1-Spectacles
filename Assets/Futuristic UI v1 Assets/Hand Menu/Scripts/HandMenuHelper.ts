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
 * HandMenuHelper Component
 * 
 * A clean, highly-educational helper script to easily anchor custom UI Panels,
 * button layouts, or 3D designs to hand joints (Palm center, Index knuckle, Pinky knuckle, Wrist).
 * 
 * Key Takeaways & Hand Basis:
 * - X-Axis (+ / -): Across Palm (Index <-> Pinky)
 * - Y-Axis (+ / -): Along Finger Axis (Wrist -> Fingertips)
 * - Z-Axis (+ / -): Normal Vector out of Palm (Popping out toward camera when palm is facing user)
 */
@component
export class HandMenuHelper extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA; font-weight: bold; font-size: 14px;">HandMenuHelper</span><br/><span style="color: #94A3B8; font-size: 11px;">Multifunctional helper script to anchor custom UI panels & 3D content to the hand.</span>')
  @ui.separator

  @ui.label('<span style="color: #F59E0B; font-weight: bold;">UI Panel / Target Object</span>')

  @input("SceneObject")
  @allowUndefined
  @hint("Drag your custom UI Panel or 3D menu SceneObject here")
  menuObject?: SceneObject

  @ui.separator
  @ui.label('<span style="color: #38BDF8; font-weight: bold;">Hand Selection & Triggers</span>')

  @input("int", "2")
  @widget(new ComboBoxWidget([
    new ComboBoxItem("Right Hand Only", 0),
    new ComboBoxItem("Left Hand Only", 1),
    new ComboBoxItem("Both Hands (Follow Active)", 2)
  ]))
  targetHand: number = 2

  @input("int", "0")
  @widget(new ComboBoxWidget([
    new ComboBoxItem("Palm Center / Middle Knuckle (mid-0)", 0),
    new ComboBoxItem("Index Knuckle (index-0)", 1),
    new ComboBoxItem("Pinky Knuckle (pinky-0)", 2),
    new ComboBoxItem("Wrist (wrist)", 3)
  ]))
  palmAnchorPoint: number = 0

  @input("int", "0")
  @widget(new ComboBoxWidget([
    new ComboBoxItem("Palm Open", 0),
    new ComboBoxItem("Fist Closed", 1),
    new ComboBoxItem("Any Tracked Pose", 2)
  ]))
  gestureTrigger: number = 0

  @input("int", "0")
  @widget(new ComboBoxWidget([
    new ComboBoxItem("Facing Camera", 0),
    new ComboBoxItem("Facing Away From Camera", 1),
    new ComboBoxItem("Any Direction", 2)
  ]))
  facingTrigger: number = 0

  @input("float", "65.0")
  @hint("Camera facing angle threshold in degrees")
  facingAngleThreshold: number = 65.0

  @ui.separator
  @ui.label('<span style="color: #10B981; font-weight: bold;">Palm Coordinate Guide & Offsets</span><br/><span style="color: #94A3B8; font-size: 11px;">• X: Across Palm (Index <-> Pinky)<br/>• Y: Finger Axis (Wrist -> Fingertips)<br/>• Z: Normal Vector (Out of Palm towards camera)</span>')

  @input("vec3")
  @hint("XYZ position offset relative to selected anchor joint. X=Across palm, Y=Finger axis, Z=Normal towards camera.")
  positionOffset: vec3 = new vec3(0, 0, 5.0)

  @input("vec3")
  @hint("Rotation offset in degrees relative to palm orientation")
  rotationOffset: vec3 = new vec3(0, 0, 0)

  @input("vec3")
  @hint("Target scale of the menu object when fully visible")
  targetScale: vec3 = new vec3(1, 1, 1)

  @input("float", "14.0")
  @hint("Position and rotation smoothing dampening speed")
  smoothSpeed: number = 14.0

  @ui.separator
  @ui.label('<span style="color: #EC4899; font-weight: bold;">Entry / Exit Pop Animation</span>')

  @input("boolean", "true")
  enablePopAnimation: boolean = true

  @input("float", "0.2")
  @hint("Entry & exit scaling pop animation duration in seconds")
  popDuration: number = 0.2

  @ui.separator
  @ui.label('<span style="color: #EF4444; font-weight: bold;">⚠️ Debug Preview Mode (Editor Testing Only)</span><br/><span style="color: #F87171; font-size: 11px;">Allows testing UI panel placement on static scene hand models directly inside the Lens Studio Preview window without needing a physical device.<br/><b>REMINDER: DISABLE THIS CHECKBOX BEFORE TESTING ON DEVICE!</b></span>')

  @input("boolean", "false")
  @hint("Enable Preview Mode testing using scene hand objects. MUST BE DISABLED BEFORE DEVICE DEPLOYMENT!")
  enablePreviewDebug: boolean = false

  @input("Component.ScriptComponent")
  @allowUndefined
  @showIf("enablePreviewDebug")
  @hint("Drag SceneObject containing your HandPreviewSimulator component here")
  previewSimulator?: ScriptComponent

  // Developer Callback Arrays
  public onMenuShown: (() => void)[] = [];
  public onMenuHidden: (() => void)[] = [];

  private handProvider = HandInputData.getInstance();
  private lateUpdateEvent = this.createEvent("LateUpdateEvent");

  // State Tracking
  private isCurrentlyShown: boolean = false;
  private animStartTime: number = -1;
  private currentScaleMult: number = 0.0;
  private activeHandType: "right" | "left" | null = null;

  // Smoothing buffers
  private currentPos: vec3 | null = null;
  private currentRot: quat | null = null;

  onAwake() {
    if (this.menuObject) {
        this.menuObject.enabled = false;
    }
    this.createEvent("OnStartEvent").bind(this.validateInputs.bind(this));
    this.lateUpdateEvent.bind(this.onLateUpdate.bind(this));
  }

  private validateInputs() {
    if (this.enablePreviewDebug) {
        print("[HandMenuHelper] ⚠️ PREVIEW DEBUG MODE IS ACTIVE! Remember to uncheck 'enablePreviewDebug' before building or testing on Spectacles device.");
    }
  }

  private isGestureTriggerMet(hand: TrackedHand): boolean {
    if (this.gestureTrigger === 2) return true;

    const midKnuckle = hand.middleKnuckle.position;
    const indexDist = hand.indexTip.position.distance(midKnuckle);
    const middleDist = hand.middleTip.position.distance(midKnuckle);
    const ringDist = hand.ringTip.position.distance(midKnuckle);
    const pinkyDist = hand.pinkyTip.position.distance(midKnuckle);

    const avgDist = (indexDist + middleDist + ringDist + pinkyDist) / 4.0;

    if (this.gestureTrigger === 0) return avgDist >= 7.0; // Open
    if (this.gestureTrigger === 1) return avgDist < 6.5;  // Fist
    return false;
  }

  private isFacingTriggerMet(hand: TrackedHand): boolean {
    if (this.facingTrigger === 2) return true;

    const angle = hand.getFacingCameraAngle();
    if (angle === null) return false;

    if (this.facingTrigger === 0) return angle < this.facingAngleThreshold;
    if (this.facingTrigger === 1) return (180.0 - angle) < this.facingAngleThreshold;
    return false;
  }

  private getActiveTrackedHand(): TrackedHand | null {
    const rightHand = this.handProvider.getHand("right");
    const leftHand = this.handProvider.getHand("left");

    if (this.targetHand === 0) return (rightHand && rightHand.isTracked()) ? rightHand : null;
    if (this.targetHand === 1) return (leftHand && leftHand.isTracked()) ? leftHand : null;

    if (this.activeHandType === "right" && rightHand && rightHand.isTracked()) return rightHand;
    if (this.activeHandType === "left" && leftHand && leftHand.isTracked()) return leftHand;

    if (rightHand && rightHand.isTracked()) {
        this.activeHandType = "right";
        return rightHand;
    }
    if (leftHand && leftHand.isTracked()) {
        this.activeHandType = "left";
        return leftHand;
    }

    this.activeHandType = null;
    return null;
  }

  /**
   * Resolves the world position of the selected anchor joint on a live SIK TrackedHand.
   */
  private getLiveAnchorPosition(hand: TrackedHand): vec3 {
    switch (this.palmAnchorPoint) {
        case 1: // Index Knuckle (index-0)
            return hand.indexKnuckle.position;
        case 2: // Pinky Knuckle (pinky-0)
            return hand.pinkyKnuckle.position;
        case 3: // Wrist
            return hand.wrist.position;
        case 0: // Palm Center / Middle Knuckle (mid-0)
        default:
            return hand.middleKnuckle.position;
    }
  }

  private onLateUpdate() {
    if (!this.menuObject) return;

    let shouldShowMenu = false;
    let anchorWorldPos: vec3 | null = null;
    let palmRotation: quat | null = null;

    if (this.enablePreviewDebug) {
        // -------------------------------------------------------------------
        // DEBUG PREVIEW MODE (DELEGATED TO HandPreviewSimulator)
        // -------------------------------------------------------------------
        if (this.previewSimulator) {
            const sim = this.previewSimulator as any;
            const targetHandStr = (this.targetHand === 1) ? "left" : "right";

            if (sim.isGestureTriggerMet && sim.getFacingCameraAngle && sim.getPalmBasis) {
                const gestureOk = sim.isGestureTriggerMet(targetHandStr, this.gestureTrigger);

                // Inline facing evaluation (HandPreviewSimulator exposes getFacingCameraAngle, not isFacingTriggerMet)
                let facingOk = false;
                if (this.facingTrigger === 2) {
                    facingOk = true;
                } else {
                    const angle: number = sim.getFacingCameraAngle(targetHandStr);
                    if (this.facingTrigger === 0) facingOk = angle < this.facingAngleThreshold;
                    else if (this.facingTrigger === 1) facingOk = (180.0 - angle) < this.facingAngleThreshold;
                }

                if (gestureOk && facingOk) {
                    const basis = sim.getPalmBasis(targetHandStr, this.palmAnchorPoint);
                    if (basis) {
                        shouldShowMenu = true;
                        anchorWorldPos = basis.centerPos;
                        palmRotation = basis.rotation;
                    }
                }
            }
        }
    } else {
        // -------------------------------------------------------------------
        // LIVE DEVICE TRACKING MODE
        // -------------------------------------------------------------------
        const activeHand = this.getActiveTrackedHand();
        if (activeHand) {
            if (this.isGestureTriggerMet(activeHand) && this.isFacingTriggerMet(activeHand)) {
                shouldShowMenu = true;

                const wristPos = activeHand.wrist.position;
                const middleKnucklePos = activeHand.middleKnuckle.position;
                const indexKnucklePos = activeHand.indexKnuckle.position;

                const handForward = middleKnucklePos.sub(wristPos).normalize();
                const handRight = indexKnucklePos.sub(middleKnucklePos).normalize();
                const handUp = activeHand.handType === "right" 
                    ? handRight.cross(handForward).normalize() 
                    : handForward.cross(handRight).normalize();

                anchorWorldPos = this.getLiveAnchorPosition(activeHand);
                palmRotation = quat.lookAt(handForward, handUp);
            }
        }
    }

    const dt = getDeltaTime();
    const curTime = getTime();

    if (shouldShowMenu && anchorWorldPos && palmRotation) {
        // -------------------------------------------------------------------
        // MENU ACTIVATED & SHOWING
        // -------------------------------------------------------------------
        // Compute Palm Basis Vectors for intuitive offsets:
        // X = Across Palm (Right), Y = Finger Axis (Forward), Z = Normal out of Palm (Up/Camera)
        const handForward = palmRotation.multiplyVec3(new vec3(0, 0, 1));
        const handUp = palmRotation.multiplyVec3(new vec3(0, 1, 0));
        const handRight = handUp.cross(handForward).normalize();

        const worldPosOffset = handRight.uniformScale(this.positionOffset.x)
            .add(handForward.uniformScale(this.positionOffset.y))
            .add(handUp.uniformScale(this.positionOffset.z));

        const targetWorldPos = anchorWorldPos.add(worldPosOffset);

        const radOffset = this.rotationOffset.uniformScale(MathUtils.DegToRad);
        const rotOffset = quat.fromEulerVec(radOffset);
        const targetWorldRot = palmRotation.multiply(rotOffset);

        if (!this.isCurrentlyShown) {
            this.isCurrentlyShown = true;
            this.animStartTime = curTime;

            // FIX ISSUE 2: INSTANTLY SNAP TO HAND POSITION ON FIRST FRAME (No sliding from old stale position)
            this.currentPos = targetWorldPos;
            this.currentRot = targetWorldRot;

            for (let i = 0; i < this.onMenuShown.length; i++) {
                if (typeof this.onMenuShown[i] === 'function') {
                    this.onMenuShown[i]();
                }
            }
        } else {
            // Smoothly damp position & rotation while menu is visible
            const t = MathUtils.clamp(dt * this.smoothSpeed, 0, 1);
            this.currentPos = this.currentPos ? vec3.lerp(this.currentPos, targetWorldPos, t) : targetWorldPos;
            this.currentRot = this.currentRot ? quat.slerp(this.currentRot, targetWorldRot, t) : targetWorldRot;
        }

        // Compute Snappy Pop-In Scale Animation
        if (this.enablePopAnimation && this.popDuration > 0.001) {
            const timeSinceStart = curTime - this.animStartTime;
            const progress = MathUtils.clamp(timeSinceStart / this.popDuration, 0, 1);

            if (progress < 1.0) {
                const bouncyPop = 1.0 + 0.25 * Math.sin(progress * Math.PI) * (1.0 - progress);
                this.currentScaleMult = progress < 0.2 ? (progress / 0.2) * bouncyPop : bouncyPop;
            } else {
                this.currentScaleMult = 1.0;
            }
        } else {
            this.currentScaleMult = 1.0;
        }

        const menuTransform = this.menuObject.getTransform();
        menuTransform.setWorldPosition(this.currentPos);
        menuTransform.setWorldRotation(this.currentRot);
        menuTransform.setWorldScale(this.targetScale.uniformScale(this.currentScaleMult));

        this.menuObject.enabled = true;

    } else {
        // -------------------------------------------------------------------
        // MENU DEACTIVATED & HIDING
        // -------------------------------------------------------------------
        if (this.isCurrentlyShown) {
            this.isCurrentlyShown = false;
            this.animStartTime = curTime;

            for (let i = 0; i < this.onMenuHidden.length; i++) {
                if (typeof this.onMenuHidden[i] === 'function') {
                    this.onMenuHidden[i]();
                }
            }
        }

        if (this.enablePopAnimation && this.popDuration > 0.001) {
            const timeSinceHide = curTime - this.animStartTime;
            // FIX ISSUE 1: SNAPPY QUICK POP-OUT (Quadratic Ease-Out over exact popDuration)
            const exitProgress = MathUtils.clamp(timeSinceHide / this.popDuration, 0, 1);
            const remaining = 1.0 - exitProgress;
            this.currentScaleMult = remaining * remaining; // Fast snappy pop-down

            if (exitProgress < 1.0 && this.currentScaleMult > 0.001) {
                const menuTransform = this.menuObject.getTransform();
                if (this.currentPos) menuTransform.setWorldPosition(this.currentPos);
                if (this.currentRot) menuTransform.setWorldRotation(this.currentRot);
                menuTransform.setWorldScale(this.targetScale.uniformScale(this.currentScaleMult));
                this.menuObject.enabled = true;
            } else {
                this.currentScaleMult = 0.0;
                this.menuObject.enabled = false;
                this.currentPos = null;
                this.currentRot = null;
            }
        } else {
            // Immediate compliance when enablePopAnimation is false (0 delay)
            this.currentScaleMult = 0.0;
            this.menuObject.enabled = false;
            this.currentPos = null;
            this.currentRot = null;
        }
    }
  }
}
