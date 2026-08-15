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
import {StateName} from "SpectaclesUIKit.lspkg/Scripts/Components/Element"

const mockEvent = {
    interactor: {
        inputType: "PalmGesture"
    }
};

/**
 * PalmMenuGestureApp Component
 * 
 * Arranges 4 finger buttons (Index, Middle, Ring, Pinky) anchored to live hand finger joints.
 * Computes thumb-to-fingertip proximity for hover and selection triggering,
 * with dynamic Z displacement, billboarding, toggle group management, and staggered entry animations.
 */
@component
export class PalmMenuGestureApp extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA; font-weight: bold; font-size: 14px;">PalmMenuGestureApp</span><br/><span style="color: #94A3B8; font-size: 11px;">Thumb-to-fingertip proximity gesture menu controller.</span>')
  @ui.separator

  @ui.label('<span style="color: #F59E0B; font-weight: bold;">Finger Button Objects (4 Items)</span>')

  @input("Component.ScriptComponent")
  @allowUndefined
  @hint("Drag PolygonalButton script for Index Finger button here")
  indexButton?: ScriptComponent

  @input("Component.ScriptComponent")
  @allowUndefined
  @hint("Drag PolygonalButton script for Middle Finger button here")
  middleButton?: ScriptComponent

  @input("Component.ScriptComponent")
  @allowUndefined
  @hint("Drag PolygonalButton script for Ring Finger button here")
  ringButton?: ScriptComponent

  @input("Component.ScriptComponent")
  @allowUndefined
  @hint("Drag PolygonalButton script for Pinky Finger button here")
  pinkyButton?: ScriptComponent

  @ui.separator
  @ui.label('<span style="color: #38BDF8; font-weight: bold;">SIK Hand Visuals & Camera</span>')

  @input("Component.ScriptComponent")
  @allowUndefined
  @hint("Drag Right HandVisual component from SIK HandVisuals in scene hierarchy here")
  rightHandVisual?: ScriptComponent

  @input("Component.ScriptComponent")
  @allowUndefined
  @hint("Drag Left HandVisual component from SIK HandVisuals in scene hierarchy here")
  leftHandVisual?: ScriptComponent

  @input("Component.Camera")
  @allowUndefined
  @hint("Drag Main Camera for billboarding calculation (defaults to scene camera)")
  worldCamera?: Camera

  @ui.separator
  @ui.label('<span style="color: #10B981; font-weight: bold;">Hand Selection & Facing Trigger</span>')

  @input("int", "2")
  @widget(new ComboBoxWidget([
    new ComboBoxItem("Right Hand Only", 0),
    new ComboBoxItem("Left Hand Only", 1),
    new ComboBoxItem("Both Hands (Follow Active)", 2)
  ]))
  targetHand: number = 2

  @input("float", "65.0")
  @hint("Camera facing angle threshold in degrees to show palm menu")
  palmFacingThreshold: number = 65.0

  @ui.separator
  @ui.label('<span style="color: #8B5CF6; font-weight: bold;">Active Finger Enables</span>')

  @input("boolean", "true")
  enableIndexFinger: boolean = true

  @input("boolean", "true")
  enableMiddleFinger: boolean = true

  @input("boolean", "true")
  enableRingFinger: boolean = true

  @input("boolean", "true")
  enablePinkyFinger: boolean = true

  @ui.separator
  @ui.label('<span style="color: #EC4899; font-weight: bold;">Button Offsets & Billboarding</span>')

  @input("vec3")
  @hint("Position offset relative to each finger joint")
  positionOffset: vec3 = new vec3(0, 0, 0)

  @input("vec3")
  @hint("Rotation offset in degrees")
  rotationOffset: vec3 = new vec3(0, 0, 0)

  @input("vec3", "{0, 0, 1}")
  @hint("Local front-facing vector on your button that should look directly at the camera (e.g. {0,0,1} for flat 2D buttons or {0,1,0})")
  cameraFacingAxis: vec3 = new vec3(0, 0, 1)

  @input("vec3", "{0, 1, 0}")
  @hint("Local top/up vector on your button that should point along the fingers toward fingertips (e.g. {0,1,0} or {1,0,0})")
  buttonUpAxis: vec3 = new vec3(0, 1, 0)

  @input("vec3", "{1, 1, 1}")
  @hint("Scale multiplier applied to finger buttons")
  buttonScale: vec3 = new vec3(1, 1, 1)

  @ui.separator
  @ui.label('<span style="color: #F59E0B; font-weight: bold;">Thumb Proximity & Press Thresholds</span>')

  @input("float", "5.0")
  @hint("Distance in cm from thumb tip to fingertip to enter Hover state")
  hoverDistance: number = 5.0

  @input("float", "2.0")
  @hint("Distance in cm from thumb tip to fingertip to trigger Select press")
  selectDistance: number = 2.0

  @input("float", "0.8")
  @hint("Upward displacement on hand normal axis when hovered/pressed")
  pressZOffset: number = 0.8

  @input("float", "0.4")
  @hint("Cooldown delay in seconds between successive selections")
  selectCooldown: number = 0.4

  @ui.separator
  @ui.label('<span style="color: #3B82F6; font-weight: bold;">Toggle Group Behavior</span>')

  @input("boolean", "false")
  @hint("If true, buttons act as an exclusive radio-button group (only 1 button active at a time)")
  enableToggleBehavior: boolean = false

  @input("boolean", "false")
  @showIf("enableToggleBehavior")
  @hint("Allows deselecting active button on second tap, leaving no buttons toggled")
  allowAllTogglesOff: boolean = false

  @ui.separator
  @ui.label('<span style="color: #EF4444; font-weight: bold;">Entry Animations</span>')

  @input("boolean", "true")
  enableEntryAnimation: boolean = true

  @input("float", "0.35")
  @showIf("enableEntryAnimation")
  @hint("Scale pop-in animation duration per button in seconds")
  entryDuration: number = 0.35

  @input("float", "0.05")
  @showIf("enableEntryAnimation")
  @hint("Delay offset between successive finger buttons")
  entryStaggerTime: number = 0.05

  @ui.separator
  @ui.label('<span style="color: #6B7280; font-weight: bold;">Debug Panel</span>')

  @input
  @allowUndefined
  @hint("Optional Text component to view live tracking & finger selection status")
  debugText?: Text

  // Developer Event Callback Arrays
  public onButtonSelected: ((fingerIndex: number, fingerName: string, button?: ScriptComponent) => void)[] = [];
  public onButtonHovered: ((fingerIndex: number, fingerName: string, button?: ScriptComponent) => void)[] = [];
  public onSelectionChanged: ((selectedIndex: number, fingerName: string, isToggledOn: boolean) => void)[] = [];

  private handProvider = HandInputData.getInstance();
  private updateEvent = this.createEvent("LateUpdateEvent");
  private buttons: ScriptComponent[] = [];

  // Toggle & select state tracking
  private selectedIndex: number = -1;
  private wasSelected: boolean[] = [false, false, false, false];
  private wasHovered: boolean[] = [false, false, false, false];
  private lastSelectTime: number = -1;

  // Entry animation tracking
  private isMenuShowing: boolean = false;
  private animationStartTime: number = -1;

  public getSelectedIndex(): number {
      return this.selectedIndex;
  }

  public getSelectedFingerName(): string {
      const FINGER_NAMES = ["Index", "Middle", "Ring", "Pinky"];
      return (this.selectedIndex >= 0 && this.selectedIndex < 4) ? FINGER_NAMES[this.selectedIndex] : "None";
  }

  onAwake() {
    if (this.indexButton) this.buttons.push(this.indexButton);
    if (this.middleButton) this.buttons.push(this.middleButton);
    if (this.ringButton) this.buttons.push(this.ringButton);
    if (this.pinkyButton) this.buttons.push(this.pinkyButton);

    // Initial state: hide assigned buttons and configure them to not pop/displace Z natively
    for (let i = 0; i < this.buttons.length; i++) {
        const btn = this.buttons[i] as any;
        if (btn) {
            if (btn.getSceneObject()) {
                btn.getSceneObject().enabled = false;
            }
            // Disable native pop-displacement (we handle custom UP displacement)
            if (typeof btn.setPopDistance === 'function') {
                btn.setPopDistance(0);
            }
            // Disable button's internal scale/position animations
            if (typeof btn.setAnimationType === 'function') {
                btn.setAnimationType(3); // AnimationType.None
            }
            // Sync toggleable settings
            btn._toggleable = this.enableToggleBehavior;
        }
    }

    this.createEvent("OnStartEvent").bind(this.validateInputs.bind(this));
    this.updateEvent.bind(this.onLateUpdate.bind(this));
  }

  private validateInputs() {
      if ((this.targetHand === 0 || this.targetHand === 2) && !this.rightHandVisual) {
          print("[PalmMenuGestureApp] ERROR: 'rightHandVisual' input is missing!\n" +
                "  To fix this: Drag the Right HandVisual component from your SIK HandVisuals in the scene hierarchy into the 'rightHandVisual' field on PalmMenuGestureApp.");
      }
      if ((this.targetHand === 1 || this.targetHand === 2) && !this.leftHandVisual) {
          print("[PalmMenuGestureApp] ERROR: 'leftHandVisual' input is missing!\n" +
                "  To fix this: Drag the Left HandVisual component from your SIK HandVisuals in the scene hierarchy into the 'leftHandVisual' field on PalmMenuGestureApp.");
      }
  }

  private getCameraPosition(): vec3 | null {
      if (this.worldCamera) {
          return this.worldCamera.getTransform().getWorldPosition();
      }
      const sceneCamera = (global as any).scene ? (global as any).scene.getCamera() : null;
      if (sceneCamera) {
          return sceneCamera.getTransform().getWorldPosition();
      }
      return null;
  }

  private getMidJoints(handVisual: any) {
      return [
          handVisual.indexMidJoint,  // index-1
          handVisual.middleMidJoint, // mid-1
          handVisual.ringMidJoint,   // ring-1
          handVisual.pinkyMidJoint   // pinky-1
      ];
  }

  private onLateUpdate() {
      const rightHand = this.handProvider.getHand("right");
      const leftHand = this.handProvider.getHand("left");
  
      let activeHand: TrackedHand | null = null;
      let activeVisual: any = null;

      if (this.targetHand !== 1 && rightHand && rightHand.isTracked() && this.rightHandVisual) {
          activeHand = rightHand;
          activeVisual = this.rightHandVisual;
      } else if (this.targetHand !== 0 && leftHand && leftHand.isTracked() && this.leftHandVisual) {
          activeHand = leftHand;
          activeVisual = this.leftHandVisual;
      }
  
      let showMenu = false;
      if (activeHand && activeVisual) {
          const angle = activeHand.getFacingCameraAngle();
          // Apply hysteresis (+25 degrees) when menu is already active to prevent palm flexing / index pinch from collapsing the menu
          const effectiveThreshold = this.isMenuShowing 
              ? Math.min(95.0, this.palmFacingThreshold + 25.0) 
              : this.palmFacingThreshold;

          if (angle !== null && angle < effectiveThreshold) {
              showMenu = true;
          }
      }

      // Track menu entry animation trigger
      if (showMenu && activeHand && activeVisual) {
          if (!this.isMenuShowing) {
              this.isMenuShowing = true;
              this.animationStartTime = getTime();
          }
      } else {
          this.isMenuShowing = false;
          this.animationStartTime = -1;
      }

      if (showMenu && activeHand && activeVisual) {
          const wristPos = activeHand.wrist.position;
          const middleKnucklePos = activeHand.middleKnuckle.position;
          const indexKnucklePos = activeHand.indexKnuckle.position;
          
          const handForward = middleKnucklePos.sub(wristPos).normalize();
          const handRight = indexKnucklePos.sub(middleKnucklePos).normalize();
          const handUp = activeHand.handType === "right" 
              ? handRight.cross(handForward).normalize() 
              : handForward.cross(handRight).normalize();
          
          const palmRotation = quat.lookAt(handForward, handUp);
          
          // Rotation offset
          const radOffset = this.rotationOffset.uniformScale(MathUtils.DegToRad);
          const rotOffset = quat.fromEulerVec(radOffset);

          // Get camera position for billboarding
          const cameraPos = this.getCameraPosition();

          // Get the thumb tip position
          const thumbTipPos = activeHand.thumbTip.position;

          const fingerEnabled = [
              this.enableIndexFinger,
              this.enableMiddleFinger,
              this.enableRingFinger,
              this.enablePinkyFinger
          ];

          // Calculate distances to all 4 fingertips (ignore disabled fingers)
          const distances = [
              fingerEnabled[0] ? thumbTipPos.distance(activeHand.indexTip.position) : Infinity,
              fingerEnabled[1] ? thumbTipPos.distance(activeHand.middleTip.position) : Infinity,
              fingerEnabled[2] ? thumbTipPos.distance(activeHand.ringTip.position) : Infinity,
              fingerEnabled[3] ? thumbTipPos.distance(activeHand.pinkyTip.position) : Infinity
          ];

          // Find the finger with the minimum distance to the thumb tip
          let minDistance = Infinity;
          let activeFingerIndex = -1;
          for (let i = 0; i < distances.length; i++) {
              if (distances[i] < minDistance) {
                  minDistance = distances[i];
                  activeFingerIndex = i;
              }
          }
          
          const FINGER_NAMES = ["Index", "Middle", "Ring", "Pinky"];
          let debugStatus = "None Selected";
          if (this.enableToggleBehavior && this.selectedIndex !== -1) {
              debugStatus = "Toggled: " + FINGER_NAMES[this.selectedIndex];
          }
          
          const midJoints = this.getMidJoints(activeVisual);
          for (let i = 0; i < this.buttons.length; i++) {
              if (i < midJoints.length && midJoints[i]) {
                  const btn = this.buttons[i] as any;
                  if (!btn) continue;

                  const btnObj = btn.getSceneObject ? btn.getSceneObject() : null;
                  if (!btnObj) continue;
                  
                  if (!fingerEnabled[i]) {
                      btnObj.enabled = false;
                      continue;
                  }

                  const boneTransform = midJoints[i].getTransform();
                  const btnTransform = btnObj.getTransform();
                  
                  // Calculate upward Z displacement (towards user) when hovered or pressed
                  let zOffset = 0;
                  if (i === activeFingerIndex) {
                      if (minDistance < this.selectDistance) {
                          zOffset = this.pressZOffset;
                      } else if (minDistance < this.hoverDistance) {
                          const progress = 1.0 - (minDistance - this.selectDistance) / (this.hoverDistance - this.selectDistance);
                          zOffset = this.pressZOffset * progress;
                      }
                  }

                  // Rotate position offset by this bone's rotation and add upward displacement
                  const individualWorldOffset = boneTransform.getWorldRotation().multiplyVec3(this.positionOffset);
                  const upDisplacement = handUp.uniformScale(zOffset);
                  const btnWorldPos = boneTransform.getWorldPosition().add(individualWorldOffset).add(upDisplacement);
                  
                  // Compute Look-At-Camera rotation (billboarding facing the camera, aligned with palm's finger direction)
                  let baseRotation = palmRotation;
                  if (cameraPos) {
                      const worldForward = cameraPos.sub(btnWorldPos).normalize();
                      const palmFingerUp = handForward.normalize(); // wrist -> middle knuckle direction
                      const worldRight = palmFingerUp.cross(worldForward).normalize();
                      const worldUp = worldForward.cross(worldRight).normalize();
                      const targetWorldRot = quat.lookAt(worldForward, worldUp);

                      // Local mesh basis
                      const localForward = (this.cameraFacingAxis.lengthSquared > 0.001) 
                          ? this.cameraFacingAxis.normalize() 
                          : new vec3(0, 0, 1);
                      
                      let localUp = (this.buttonUpAxis && this.buttonUpAxis.lengthSquared > 0.001)
                          ? this.buttonUpAxis.normalize()
                          : new vec3(0, 1, 0);

                      if (Math.abs(localForward.dot(localUp)) > 0.9) {
                          localUp = Math.abs(localForward.x) < 0.8 ? new vec3(1, 0, 0) : new vec3(0, 1, 0);
                      }
                      const localRight = localUp.cross(localForward).normalize();
                      localUp = localForward.cross(localRight).normalize();
                      const localSourceRot = quat.lookAt(localForward, localUp);

                      // R_base = R_world * (R_local)^-1
                      baseRotation = targetWorldRot.multiply(localSourceRot.invert());
                  }

                  const finalRotation = baseRotation.multiply(rotOffset);
                  
                  btnTransform.setWorldPosition(btnWorldPos);
                  btnTransform.setWorldRotation(finalRotation);
                  
                  let scaleFactor = 1.0;
                  
                  if (i === activeFingerIndex) {
                      if (minDistance < this.selectDistance) {
                          // ----------------------------------------------------
                          // SELECT STATE
                          // ----------------------------------------------------
                          const currentTime = getTime();
                          const canSelect = (this.lastSelectTime === -1 || (currentTime - this.lastSelectTime) >= this.selectCooldown);

                          if (!this.wasSelected[i] && canSelect) {
                              this.wasSelected[i] = true;
                              this.lastSelectTime = currentTime;
                              let isToggledOn = true;
                              
                              if (this.enableToggleBehavior) {
                                  // Toggle logic (exclusive/radio style)
                                  if (this.selectedIndex === i) {
                                      if (this.allowAllTogglesOff) {
                                          this.selectedIndex = -1;
                                          isToggledOn = false;
                                      }
                                  } else {
                                      this.selectedIndex = i;
                                      isToggledOn = true;
                                  }
                                  
                                  // Sync state value to buttons
                                  for (let j = 0; j < this.buttons.length; j++) {
                                      const b = this.buttons[j] as any;
                                      if (b) b.isOn = (this.selectedIndex === j);
                                  }
                              }
                              
                              // Trigger click event handlers to play sound & call actions
                              if (typeof btn.onTriggerDownHandler === 'function') {
                                  btn.onTriggerDownHandler(mockEvent);
                              }
                              if (typeof btn.onTriggerUpHandler === 'function') {
                                  btn.onTriggerUpHandler(mockEvent);
                              }

                              // Dispatch developer button selected callbacks
                              for (let k = 0; k < this.onButtonSelected.length; k++) {
                                  if (typeof this.onButtonSelected[k] === 'function') {
                                      this.onButtonSelected[k](i, FINGER_NAMES[i], btn);
                                  }
                              }

                              // Dispatch developer selection state changed callbacks
                              const currentName = (this.selectedIndex >= 0 && this.selectedIndex < 4) ? FINGER_NAMES[this.selectedIndex] : "None";
                              for (let k = 0; k < this.onSelectionChanged.length; k++) {
                                  if (typeof this.onSelectionChanged[k] === 'function') {
                                      this.onSelectionChanged[k](this.selectedIndex, currentName, isToggledOn);
                                  }
                              }
                          }
                          
                          const state = (this.enableToggleBehavior && btn.isOn) ? StateName.toggledTriggered : StateName.triggered;
                          if (typeof btn.setState === 'function') btn.setState(state);
                          scaleFactor = 1.3;
                          debugStatus = (this.enableToggleBehavior && this.selectedIndex === -1) ? "None Selected" : "Selected: " + FINGER_NAMES[i];
                          
                      } else if (minDistance < this.hoverDistance) {
                          // ----------------------------------------------------
                          // HOVER STATE
                          // ----------------------------------------------------
                          if (this.wasSelected[i]) {
                              this.wasSelected[i] = false;
                          }
                          
                          if (!this.wasHovered[i]) {
                              this.wasHovered[i] = true;
                              if (typeof btn.onHoverEnterHandler === 'function') {
                                  btn.onHoverEnterHandler(mockEvent);
                              }
                              // Dispatch developer hover callbacks
                              for (let k = 0; k < this.onButtonHovered.length; k++) {
                                  if (typeof this.onButtonHovered[k] === 'function') {
                                      this.onButtonHovered[k](i, FINGER_NAMES[i], btn);
                                  }
                              }
                          }
                          
                          const state = (this.enableToggleBehavior && btn.isOn) ? StateName.toggledHovered : StateName.hovered;
                          if (typeof btn.setState === 'function') btn.setState(state);
                          
                          // Interpolate smoothly from 1.0 to 1.2 based on proximity progress
                          const progress = 1.0 - (minDistance - this.selectDistance) / (this.hoverDistance - this.selectDistance);
                          scaleFactor = 1.0 + progress * 0.2;
                          debugStatus = "Hover: " + FINGER_NAMES[i] + " (" + minDistance.toFixed(1) + " cm)";
                          
                      } else {
                          // ----------------------------------------------------
                          // IDLE STATE (ACTIVE FINGER BUT OUT OF HOVER)
                          // ----------------------------------------------------
                          if (this.wasSelected[i]) this.wasSelected[i] = false;
                          if (this.wasHovered[i]) {
                              this.wasHovered[i] = false;
                              if (typeof btn.onHoverExitHandler === 'function') {
                                  btn.onHoverExitHandler(mockEvent);
                              }
                          }
                          
                          const state = (this.enableToggleBehavior && btn.isOn) ? StateName.toggledDefault : StateName.default;
                          if (typeof btn.setState === 'function') btn.setState(state);
                          scaleFactor = 1.0;
                      }
                  } else {
                      // --------------------------------------------------------
                      // IDLE STATE (INACTIVE FINGERS)
                      // --------------------------------------------------------
                      if (this.wasSelected[i]) this.wasSelected[i] = false;
                      if (this.wasHovered[i]) {
                          this.wasHovered[i] = false;
                          if (typeof btn.onHoverExitHandler === 'function') {
                              btn.onHoverExitHandler(mockEvent);
                          }
                      }
                      
                      const state = (this.enableToggleBehavior && btn.isOn) ? StateName.toggledDefault : StateName.default;
                      if (typeof btn.setState === 'function') btn.setState(state);
                      scaleFactor = 1.0;
                  }
                  
                  // Entry animation scaling & opacity
                  let entryAlphaMult = 1.0;
                  let entryScaleMult = 1.0;
                  if (this.enableEntryAnimation && this.animationStartTime !== -1) {
                      const timeSinceStart = getTime() - this.animationStartTime;
                      const cardDelay = i * this.entryStaggerTime;
                      const cardTime = timeSinceStart - cardDelay;
                      
                      if (cardTime <= 0) {
                          entryAlphaMult = 0.0;
                          entryScaleMult = 0.0;
                      } else if (cardTime < this.entryDuration) {
                          const t = cardTime / this.entryDuration;
                          entryAlphaMult = MathUtils.clamp(t, 0, 1);
                          const popScale = 1.0 + 0.3 * Math.sin(t * Math.PI) * (1.0 - t);
                          entryScaleMult = t < 0.2 ? (t / 0.2) * popScale : popScale;
                      } else {
                          entryAlphaMult = 1.0;
                          entryScaleMult = 1.0;
                      }
                  }

                  if (typeof btn.opacity !== 'undefined') {
                      btn.opacity = entryAlphaMult;
                  }

                  scaleFactor *= entryScaleMult;

                  const baseScale = boneTransform.getWorldScale().scale(this.buttonScale);
                  btnTransform.setWorldScale(baseScale.uniformScale(scaleFactor));
                  btnObj.enabled = entryAlphaMult > 0.01;
              }
          }

          if (this.debugText) {
              this.debugText.text = debugStatus;
          }
      } else {
          // Hide buttons when tracking is lost or palm is not facing user
          for (let i = 0; i < this.buttons.length; i++) {
              const btn = this.buttons[i] as any;
              if (btn && btn.getSceneObject && btn.getSceneObject()) {
                  btn.getSceneObject().enabled = false;
              }
              
              // Reset triggers when hand is lost
              this.wasSelected[i] = false;
              if (this.wasHovered[i]) {
                  this.wasHovered[i] = false;
                  if (btn && typeof btn.onHoverExitHandler === 'function') {
                      btn.onHoverExitHandler(mockEvent);
                  }
              }
              if (btn && typeof btn.setState === 'function') {
                  const state = (this.enableToggleBehavior && btn.isOn) ? StateName.toggledDefault : StateName.default;
                  btn.setState(state);
              }
          }

          const status = activeHand ? "Palm turned away" : "No Hand Tracked";
          if (this.debugText) {
              this.debugText.text = status;
          }
      }
  }
}
