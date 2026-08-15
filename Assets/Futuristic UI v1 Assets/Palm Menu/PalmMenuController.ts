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
 * PalmMenuController Component
 * 
 * Production-ready controller template for developers building custom features
 * with the PalmMenuGestureApp component.
 * 
 * Features:
 * 1. Per-finger button availability toggles (Index, Middle, Ring, Pinky).
 * 2. Event listener subscription (`onButtonSelected` and `onSelectionChanged`) connecting menu touches and toggle states directly to custom code.
 * 3. Handles 'All Toggles Off' state when `allowAllTogglesOff` is enabled in PalmMenuGestureApp.
 * 4. Dedicated per-finger action handler methods (onIndexSelected, onMiddleSelected, etc.) for easy developer expansion.
 */
@component
export class PalmMenuController extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA; font-weight: bold; font-size: 13px;">PalmMenuController</span><br/><span style="color: #94A3B8; font-size: 11px;">Controls per-finger button availability and executes custom developer actions on selection.</span>')
  @ui.separator

  @input("Component.ScriptComponent")
  @allowUndefined
  @hint("Drag the SceneObject containing PalmMenuGestureApp here")
  palmMenuApp?: ScriptComponent

  @ui.separator
  @ui.label('<span style="color: #38BDF8; font-weight: bold;">Finger Button Configuration</span>')

  @input("boolean", "true")
  @hint("Enable or disable the Index finger button")
  enableIndex: boolean = true

  @input("boolean", "true")
  @hint("Enable or disable the Middle finger button")
  enableMiddle: boolean = true

  @input("boolean", "true")
  @hint("Enable or disable the Ring finger button")
  enableRing: boolean = true

  @input("boolean", "true")
  @hint("Enable or disable the Pinky finger button")
  enablePinky: boolean = true

  @ui.separator
  @ui.label('<span style="color: #34D399; font-weight: bold;">Developer Action Feedback</span>')

  @input("Component.Text")
  @allowUndefined
  @hint("Optional Text component to display which custom finger action was triggered")
  controllerDebugText?: Text

  onAwake() {
    this.createEvent("OnStartEvent").bind(this.onStart.bind(this));
  }

  private onStart() {
    if (!this.palmMenuApp) {
        print("[PalmMenuController] WARNING: 'palmMenuApp' input is unassigned. Please drag your PalmMenuGestureApp component into the inspector slot.");
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
        print("[PalmMenuController] Successfully registered callbacks with PalmMenuGestureApp.");
    }
  }

  /**
   * Syncs the controller's per-finger checkboxes to the PalmMenuGestureApp component.
   */
  public applyFingerConfiguration() {
    if (!this.palmMenuApp) return;

    const app = this.palmMenuApp as any;
    app.enableIndexFinger = this.enableIndex;
    app.enableMiddleFinger = this.enableMiddle;
    app.enableRingFinger = this.enableRing;
    app.enablePinkyFinger = this.enablePinky;
  }

  /**
   * Internal event handler triggered when selection/toggle state changes in PalmMenuGestureApp.
   */
  private handleSelectionChanged(selectedIndex: number, fingerName: string, isToggledOn: boolean) {
    if (selectedIndex === -1 || !isToggledOn) {
        this.onAllDeselected();
    } else {
        print("[PalmMenuController] Selection changed: " + fingerName + " finger is active.");
    }
  }

  /**
   * Internal event handler triggered when ANY finger button is touched/selected.
   */
  private handleButtonSelected(fingerIndex: number, fingerName: string, button?: ScriptComponent) {
    print("[PalmMenuController] Event received for " + fingerName + " finger (Index: " + fingerIndex + ")");

    switch (fingerIndex) {
        case 0:
            this.onIndexSelected(button);
            break;
        case 1:
            this.onMiddleSelected(button);
            break;
        case 2:
            this.onRingSelected(button);
            break;
        case 3:
            this.onPinkySelected(button);
            break;
        default:
            print("[PalmMenuController] Unknown finger index: " + fingerIndex);
            break;
    }
  }

  // =========================================================================
  // CUSTOM DEVELOPER ACTION METHODS
  // Replace or extend the code below with your application's custom features!
  // =========================================================================

  /**
   * Action triggered when all toggles are turned OFF (nothing selected).
   */
  private onAllDeselected() {
    print("[PalmMenuController] -> ACTION TRIGGERED: All Toggles Turned OFF (None Selected)");
    if (this.controllerDebugText) {
        this.controllerDebugText.text = "State: All Toggles Off";
    }

    // -----------------------------------------------------------------------
    // DEVELOPER CODE GOES HERE:
    // e.g. Deactivate all active tools, hide active panel, return to idle
    // -----------------------------------------------------------------------
  }

  /**
   * Action triggered when the INDEX finger button is tapped.
   */
  private onIndexSelected(button?: ScriptComponent) {
    print("[PalmMenuController] -> ACTION TRIGGERED: Index Finger Button Selected!");
    if (this.controllerDebugText) {
        this.controllerDebugText.text = "Action: Index Finger Triggered";
    }

    // -----------------------------------------------------------------------
    // DEVELOPER CODE GOES HERE:
    // e.g. Spawn 3D prop, open menu panel 1, or play SFX
    // -----------------------------------------------------------------------
  }

  /**
   * Action triggered when the MIDDLE finger button is tapped.
   */
  private onMiddleSelected(button?: ScriptComponent) {
    print("[PalmMenuController] -> ACTION TRIGGERED: Middle Finger Button Selected!");
    if (this.controllerDebugText) {
        this.controllerDebugText.text = "Action: Middle Finger Triggered";
    }

    // -----------------------------------------------------------------------
    // DEVELOPER CODE GOES HERE:
    // e.g. Toggle tool mode, open settings, or send network RPC
    // -----------------------------------------------------------------------
  }

  /**
   * Action triggered when the RING finger button is tapped.
   */
  private onRingSelected(button?: ScriptComponent) {
    print("[PalmMenuController] -> ACTION TRIGGERED: Ring Finger Button Selected!");
    if (this.controllerDebugText) {
        this.controllerDebugText.text = "Action: Ring Finger Triggered";
    }

    // -----------------------------------------------------------------------
    // DEVELOPER CODE GOES HERE:
    // e.g. Perform secondary action, trigger particle VFX
    // -----------------------------------------------------------------------
  }

  /**
   * Action triggered when the PINKY finger button is tapped.
   */
  private onPinkySelected(button?: ScriptComponent) {
    print("[PalmMenuController] -> ACTION TRIGGERED: Pinky Finger Button Selected!");
    if (this.controllerDebugText) {
        this.controllerDebugText.text = "Action: Pinky Finger Triggered";
    }

    // -----------------------------------------------------------------------
    // DEVELOPER CODE GOES HERE:
    // e.g. Reset menu state, close UI overlay
    // -----------------------------------------------------------------------
  }
}
