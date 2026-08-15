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
/**
 * HandPreviewSimulator Component
 * 
 * Standalone Editor Preview testing simulator component.
 * Implements the exact Spectacles SIK `HandVisual.ts` joint mapping architecture (getJointSceneObject),
 * resolving joint hierarchies for static hand rigs and calculating palm basis and camera facing.
 */
@component
export class HandPreviewSimulator extends BaseScriptComponent {
  @ui.label('<span style="color: #EC4899; font-weight: bold; font-size: 14px;">HandPreviewSimulator</span><br/><span style="color: #94A3B8; font-size: 11px;">Simulates hand joint tracking & camera facing using official SIK HandVisual joint mapping.</span>')
  @ui.separator

  @ui.label('<span style="color: #F59E0B; font-weight: bold;">Static Hand Rig Objects</span>')

  @input("SceneObject")
  @allowUndefined
  @hint("Drag SceneObject representing the static Right Hand rig (e.g. RightHandVisual)")
  rightHandRig?: SceneObject

  @input("SceneObject")
  @allowUndefined
  @hint("Drag SceneObject representing the static Left Hand rig (e.g. LeftHandVisual)")
  leftHandRig?: SceneObject

  @input("boolean", "true")
  @hint("Enable automatic SIK joint mapping traversal (same as SIK HandVisual)")
  autoJointMapping: boolean = true

  @ui.separator
  @ui.label('<span style="color: #38BDF8; font-weight: bold;">Camera & Simulation Overrides</span>')

  @input("Component.Camera")
  @allowUndefined
  @hint("World Camera for calculating distance & facing direction")
  worldCamera?: Camera

  @input("int", "0")
  @widget(new ComboBoxWidget([
    new ComboBoxItem("Force Facing Camera", 0),
    new ComboBoxItem("Force Facing Away From Camera", 1)
  ]))
  simulatedFacing: number = 0

  @input("int", "0")
  @widget(new ComboBoxWidget([
    new ComboBoxItem("Force Palm Open", 0),
    new ComboBoxItem("Force Fist Closed", 1)
  ]))
  simulatedGesture: number = 0

  @ui.separator
  @ui.label('<span style="color: #34D399; font-weight: bold;">Developer Preview Feedback</span>')

  @input("Component.Text")
  @allowUndefined
  debugStatusText?: Text

  // Internal Private SIK Joint Mappings (Mirroring SIK HandVisual.ts)
  private rightWrist: SceneObject | null = null;
  private rightMiddleKnuckle: SceneObject | null = null;  // mid-0 (middle knuckle / palm center)
  private rightMiddleMidJoint: SceneObject | null = null; // mid-1
  private rightIndexKnuckle: SceneObject | null = null;   // index-0
  private rightIndexTip: SceneObject | null = null;       // index-3
  private rightPinkyKnuckle: SceneObject | null = null;   // pinky-0
  private rightPinkyTip: SceneObject | null = null;       // pinky-3

  private leftWrist: SceneObject | null = null;
  private leftMiddleKnuckle: SceneObject | null = null;   // mid-0 (middle knuckle / palm center)
  private leftMiddleMidJoint: SceneObject | null = null;  // mid-1
  private leftIndexKnuckle: SceneObject | null = null;    // index-0
  private leftIndexTip: SceneObject | null = null;        // index-3
  private leftPinkyKnuckle: SceneObject | null = null;   // pinky-0
  private leftPinkyTip: SceneObject | null = null;       // pinky-3

  private lateUpdateEvent = this.createEvent("LateUpdateEvent");

  onAwake() {
    this.createEvent("OnStartEvent").bind(this.onStart.bind(this));
    this.lateUpdateEvent.bind(this.onLateUpdate.bind(this));
  }

  private onStart() {
    this.initializeJointMapping();
  }

  /**
   * Official SIK HandVisual `getJointSceneObject` implementation.
   * Traverses joint hierarchy recursively searching for SIK joint identifiers.
   */
  private getJointSceneObject(jointName: string, root?: SceneObject): SceneObject | null {
    if (!root) return null;

    const rootName = root.name.toLowerCase();
    const target = jointName.toLowerCase();
    const targetSpaced = target.replace(/-/g, ' ');
    const targetUnderscored = target.replace(/-/g, '_');

    if (rootName === target || rootName === targetSpaced || rootName === targetUnderscored) {
        return root;
    }

    const count = root.getChildrenCount();
    for (let i = 0; i < count; i++) {
        const found = this.getJointSceneObject(jointName, root.getChild(i));
        if (found) return found;
    }

    return null;
  }

  private initializeJointMapping() {
    if (this.rightHandRig) {
        this.rightWrist = this.getJointSceneObject("wrist", this.rightHandRig);
        this.rightMiddleKnuckle = this.getJointSceneObject("mid-0", this.rightHandRig);
        this.rightMiddleMidJoint = this.getJointSceneObject("mid-1", this.rightHandRig);
        this.rightIndexKnuckle = this.getJointSceneObject("index-0", this.rightHandRig);
        this.rightIndexTip = this.getJointSceneObject("index-3", this.rightHandRig);
        this.rightPinkyKnuckle = this.getJointSceneObject("pinky-0", this.rightHandRig);
        this.rightPinkyTip = this.getJointSceneObject("pinky-3", this.rightHandRig);
    }

    if (this.leftHandRig) {
        this.leftWrist = this.getJointSceneObject("wrist", this.leftHandRig);
        this.leftMiddleKnuckle = this.getJointSceneObject("mid-0", this.leftHandRig);
        this.leftMiddleMidJoint = this.getJointSceneObject("mid-1", this.leftHandRig);
        this.leftIndexKnuckle = this.getJointSceneObject("index-0", this.leftHandRig);
        this.leftIndexTip = this.getJointSceneObject("index-3", this.leftHandRig);
        this.leftPinkyKnuckle = this.getJointSceneObject("pinky-0", this.leftHandRig);
        this.leftPinkyTip = this.getJointSceneObject("pinky-3", this.leftHandRig);
    }
  }

  /**
   * Calculates hand transform basis (center position and rotation) for preview simulation.
   */
  public getPalmBasis(handType: string = "right", anchorPointIndex: number = 0): { centerPos: vec3, rotation: quat } | null {
    const isRight = (handType === "right" || handType === "0" || (!this.leftHandRig && !!this.rightHandRig));
    const rig = isRight ? this.rightHandRig : this.leftHandRig;

    if (!rig) return null;

    const wrist = isRight ? this.rightWrist : this.leftWrist;
    const middleKnuckle = isRight ? (this.rightMiddleKnuckle || this.rightMiddleMidJoint) : (this.leftMiddleKnuckle || this.leftMiddleMidJoint);
    const indexKnuckle = isRight ? this.rightIndexKnuckle : this.leftIndexKnuckle;
    const pinkyKnuckle = isRight ? this.rightPinkyKnuckle : this.leftPinkyKnuckle;

    if (!wrist || !middleKnuckle || !indexKnuckle) {
        return {
            centerPos: rig.getTransform().getWorldPosition(),
            rotation: rig.getTransform().getWorldRotation()
        };
    }

    const middleKnucklePos = middleKnuckle.getTransform().getWorldPosition();
    const wristPos = wrist.getTransform().getWorldPosition();
    const indexKnucklePos = indexKnuckle.getTransform().getWorldPosition();

    let anchorPos = middleKnucklePos;
    if (anchorPointIndex === 1 && indexKnuckle) {
        anchorPos = indexKnucklePos;
    } else if (anchorPointIndex === 2 && pinkyKnuckle) {
        anchorPos = pinkyKnuckle.getTransform().getWorldPosition();
    } else if (anchorPointIndex === 3 && wrist) {
        anchorPos = wristPos;
    }

    const handForward = middleKnucklePos.sub(wristPos).normalize();
    const handRight = indexKnucklePos.sub(middleKnucklePos).normalize();
    const handUp = isRight 
        ? handRight.cross(handForward).normalize() 
        : handForward.cross(handRight).normalize();

    return {
        centerPos: anchorPos,
        rotation: quat.lookAt(handForward, handUp)
    };
  }

  /**
   * Calculates or returns the simulated camera facing angle in degrees.
   */
  public getFacingCameraAngle(handType: string = "right"): number {
    if (this.simulatedFacing === 0) return 0.0;   // Force Facing Camera
    if (this.simulatedFacing === 1) return 180.0; // Force Facing Away
    return 0.0;
  }

  /**
   * Evaluates if the gesture condition (Palm Open, Fist Closed, Any) is met.
   */
  public isGestureTriggerMet(handType: string, triggerIndex: number): boolean {
    if (triggerIndex === 2) return true; // Any Pose

    if (this.simulatedGesture === 0) {
        return triggerIndex === 0; // Force Palm Open
    }
    if (this.simulatedGesture === 1) {
        return triggerIndex === 1; // Force Fist Closed
    }
    return true;
  }

  private onLateUpdate() {
    if (this.debugStatusText) {
        const facingStr = this.simulatedFacing === 0 ? "Facing Camera" : "Facing Away";
        const gestureStr = this.simulatedGesture === 0 ? "Palm Open" : "Fist Closed";
        this.debugStatusText.text = `[Preview Sim] ${facingStr} | ${gestureStr}`;
    }
  }
}
