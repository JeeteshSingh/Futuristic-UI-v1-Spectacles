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
 * ManualCarouselDemoController Component
 * 
 * Demo controller for Manual Carousel setups.
 * Manages 12 target Image components and 1 Text display object.
 * Exposes 12 public callback functions (selectButton0 to selectButton11 & onButton0 to onButton11) to hook into button inspector events.
 * Animates image alphas smoothly: selected image -> 1.0, unselected images -> dimmed alpha.
 * When toggled off or deselecting, all image alphas animate back to their initial starting alphas.
 */
@component
export class ManualCarouselDemoController extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA; font-weight: bold; font-size: 14px;">Manual Carousel Demo Controller</span><br/><span style="color: #94A3B8; font-size: 11px;">Animates 12 target Image alphas and updates display Text on button press.</span>')
  @ui.separator

  @ui.label('<span style="color: #60A5FA; font-weight: bold;">Carousel Reference</span>')
  @input("Component.ScriptComponent")
  @allowUndefined
  @hint("Drag your UnifiedPolygonalCarousel or ManualPolygonalCarousel here (Auto-detected if unassigned)")
  carousel?: ScriptComponent

  @input("bool", false)
  @hint("Allow deselecting active button to return to None Selected. When false, clicking active button keeps it on.")
  allowAllTogglesOff: boolean = false

  @ui.separator
  @ui.label('<span style="color: #F59E0B; font-weight: bold;">Display Target Text</span>')
  @input("Component.Text")
  @allowUndefined
  @hint("Target Text object to display the name of the selected button")
  displayText?: Text

  @input("string", "None Selected")
  @hint("Default text to show when no button is selected")
  defaultText: string = "None Selected"

  @ui.separator
  @ui.label('<span style="color: #38BDF8; font-weight: bold;">12 Target Image Objects</span>')
  @input("Component.Image[]")
  @hint("Array of 12 target Image objects to control alpha")
  images: Image[] = []

  @ui.separator
  @ui.label('<span style="color: #10B981; font-weight: bold;">Alpha Animation Settings</span>')

  @input("float", "0.2")
  @hint("Alpha value for unselected/dimmed images when one button is selected (0.0 to 1.0)")
  dimmedAlpha: number = 0.2

  @input("float", "12.0")
  @hint("Speed of smooth alpha transition animation")
  animationSpeed: number = 12.0

  @ui.separator
  @ui.label('<span style="color: #EC4899; font-weight: bold;">Button Labels (12 Items)</span>')
  @input("string[]")
  @hint("Custom names/labels for the 12 buttons (e.g. Feature 1, Feature 2...)")
  buttonLabels: string[] = [
    "Feature 1", "Feature 2", "Feature 3", "Feature 4",
    "Feature 5", "Feature 6", "Feature 7", "Feature 8",
    "Feature 9", "Feature 10", "Feature 11", "Feature 12"
  ]

  // Internal Tracking
  private selectedIndex: number = -1; // -1 = none selected
  private toggledIndices: Set<number> = new Set<number>();
  private initialAlphas: number[] = [];
  private currentAlphas: number[] = [];
  private targetAlphas: number[] = [];

  private updateEvent = this.createEvent("UpdateEvent");

  onAwake() {
    this.createEvent("OnStartEvent").bind(this.onStart.bind(this));
    this.updateEvent.bind(this.onUpdate.bind(this));
  }

  private onStart() {
    // Capture initial starting alpha for each assigned image safely
    for (let i = 0; i < this.images.length; i++) {
      const img = this.images[i];
      const startAlpha = this.getImageAlpha(img);
      this.initialAlphas.push(startAlpha);
      this.currentAlphas.push(startAlpha);
      this.targetAlphas.push(startAlpha);
    }

    if (this.displayText) {
      this.displayText.text = this.defaultText;
    }

    if (!this.carousel) {
      // Auto-search parent or sibling for carousel component
      const current = this.getSceneObject();
      const parent = current.getParent();
      const candidates = [current, parent, parent ? parent.getParent() : null];
      for (const cand of candidates) {
        if (!cand) continue;
        for (let c = 0; c < cand.getComponents("Component.ScriptComponent").length; c++) {
          const comp = cand.getComponents("Component.ScriptComponent")[c] as any;
          if (comp && (typeof comp.selectCard === 'function' || typeof comp.setItems === 'function')) {
            this.carousel = comp;
            print(`[ManualCarouselDemo] Auto-attached carousel: ${cand.name}`);
            break;
          }
        }
        if (this.carousel) break;
      }
    }

    if (this.carousel) {
      const carouselAPI = this.carousel as any;
      if (carouselAPI) {
        carouselAPI.onItemSelected = (index: number, card?: SceneObject) => {
          this.handleCarouselSelection(index, card);
        };
      }
    }
  }

  public handleCarouselSelection(index: number, card?: SceneObject) {
    const carouselAPI = this.carousel as any;
    const isToggleGroup = carouselAPI ? (carouselAPI.enableToggleGroupBehavior ?? carouselAPI.enableToggleBehavior ?? false) : false;
    const isMultiToggle = carouselAPI ? Boolean(carouselAPI.makeButtonsToggleable) : false;

    if (isToggleGroup) {
      this.selectedIndex = index;
      this.toggledIndices.clear();
      if (index !== -1) {
        this.toggledIndices.add(index);
      }
    } else if (isMultiToggle) {
      if (index >= 0) {
        if (this.toggledIndices.has(index)) {
          this.toggledIndices.delete(index);
        } else {
          this.toggledIndices.add(index);
        }
      }
      this.selectedIndex = index;
    } else {
      this.selectedIndex = index;
    }

    this.updateTargets();
  }

  /**
   * Helper to extract alpha safely from an Image component regardless of material type (baseColor vs color).
   */
  private getImageAlpha(img?: Image): number {
    if (!img) return 1.0;

    if (img.mainPass) {
      const pass = img.mainPass as any;
      if (pass.baseColor && typeof pass.baseColor.a === 'number') {
        return pass.baseColor.a;
      }
      if (pass.color && typeof pass.color.a === 'number') {
        return pass.color.a;
      }
    }

    if (img.mainMaterial && img.mainMaterial.mainPass) {
      const pass = img.mainMaterial.mainPass as any;
      if (pass.baseColor && typeof pass.baseColor.a === 'number') {
        return pass.baseColor.a;
      }
      if (pass.color && typeof pass.color.a === 'number') {
        return pass.color.a;
      }
    }

    return 1.0;
  }

  /**
   * Helper to set alpha safely on an Image component regardless of material type (baseColor vs color).
   */
  private setImageAlpha(img: Image, alpha: number) {
    if (!img) return;

    if (img.mainPass) {
      const pass = img.mainPass as any;
      if (pass.baseColor !== undefined && pass.baseColor !== null) {
        const c = pass.baseColor as vec4;
        pass.baseColor = new vec4(c.r, c.g, c.b, alpha);
        return;
      }
      if (pass.color !== undefined && pass.color !== null) {
        const c = pass.color as vec4;
        pass.color = new vec4(c.r, c.g, c.b, alpha);
        return;
      }
    }

    if (img.mainMaterial && img.mainMaterial.mainPass) {
      const pass = img.mainMaterial.mainPass as any;
      if (pass.baseColor !== undefined && pass.baseColor !== null) {
        const c = pass.baseColor as vec4;
        pass.baseColor = new vec4(c.r, c.g, c.b, alpha);
        return;
      }
      if (pass.color !== undefined && pass.color !== null) {
        const c = pass.color as vec4;
        pass.color = new vec4(c.r, c.g, c.b, alpha);
        return;
      }
    }
  }

  private updateTargets() {
    const carouselAPI = this.carousel as any;
    const isMultiToggle = carouselAPI ? Boolean(carouselAPI.makeButtonsToggleable) : false;

    for (let i = 0; i < this.images.length; i++) {
      if (isMultiToggle) {
        if (this.toggledIndices.size === 0) {
          this.targetAlphas[i] = (this.initialAlphas[i] !== undefined) ? this.initialAlphas[i] : 1.0;
        } else if (this.toggledIndices.has(i)) {
          this.targetAlphas[i] = 1.0;
        } else {
          this.targetAlphas[i] = this.dimmedAlpha;
        }
      } else {
        if (this.selectedIndex === -1) {
          this.targetAlphas[i] = (this.initialAlphas[i] !== undefined) ? this.initialAlphas[i] : 1.0;
        } else if (i === this.selectedIndex) {
          this.targetAlphas[i] = 1.0;
        } else {
          this.targetAlphas[i] = this.dimmedAlpha;
        }
      }
    }

    if (this.displayText) {
      if (isMultiToggle) {
        if (this.toggledIndices.size === 0) {
          this.displayText.text = this.defaultText;
        } else if (this.selectedIndex >= 0 && this.selectedIndex < this.buttonLabels.length) {
          this.displayText.text = this.buttonLabels[this.selectedIndex];
        } else if (this.selectedIndex >= 0) {
          this.displayText.text = "Button " + (this.selectedIndex + 1);
        } else {
          this.displayText.text = this.defaultText;
        }
      } else {
        if (this.selectedIndex >= 0 && this.selectedIndex < this.buttonLabels.length) {
          this.displayText.text = this.buttonLabels[this.selectedIndex];
        } else if (this.selectedIndex >= 0) {
          this.displayText.text = "Button " + (this.selectedIndex + 1);
        } else {
          this.displayText.text = this.defaultText;
        }
      }
    }
  }

  /**
   * Main selection method by index (0 - 11).
   * Respects allowAllTogglesOff setting.
   */
  public selectButton(index: number) {
    if (this.carousel) {
      const carouselAPI = this.carousel as any;
      if (typeof carouselAPI.selectCard === 'function') {
        carouselAPI.selectCard(index);
        return;
      }
    }
    const allowOff = this.carousel ? (this.carousel as any).allowAllTogglesOff ?? this.allowAllTogglesOff : this.allowAllTogglesOff;
    if (this.selectedIndex === index) {
      if (allowOff) {
        this.selectedIndex = -1;
        print("[ManualCarouselDemo] Button " + (index + 1) + " toggled OFF (allowAllTogglesOff=true).");
      } else {
        this.selectedIndex = index;
        print("[ManualCarouselDemo] Button " + (index + 1) + " re-selected (allowAllTogglesOff=false).");
      }
    } else {
      this.selectedIndex = index;
      print("[ManualCarouselDemo] Button " + (index + 1) + " selected!");
    }
    this.updateTargets();
  }

  /**
   * Deselects all buttons and restores initial starting alphas.
   */
  public deselectAll() {
    this.selectedIndex = -1;
    this.toggledIndices.clear();
    this.updateTargets();
  }

  // -------------------------------------------------------------------------
  // 12 INDIVIDUAL PUBLIC CALLBACK FUNCTIONS FOR INSPECTOR EVENT BINDING
  // -------------------------------------------------------------------------
  public selectButton0 = () => this.selectButton(0);
  public selectButton1 = () => this.selectButton(1);
  public selectButton2 = () => this.selectButton(2);
  public selectButton3 = () => this.selectButton(3);
  public selectButton4 = () => this.selectButton(4);
  public selectButton5 = () => this.selectButton(5);
  public selectButton6 = () => this.selectButton(6);
  public selectButton7 = () => this.selectButton(7);
  public selectButton8 = () => this.selectButton(8);
  public selectButton9 = () => this.selectButton(9);
  public selectButton10 = () => this.selectButton(10);
  public selectButton11 = () => this.selectButton(11);

  // Alias names matching onButton0..11 format
  public onButton0 = () => this.selectButton(0);
  public onButton1 = () => this.selectButton(1);
  public onButton2 = () => this.selectButton(2);
  public onButton3 = () => this.selectButton(3);
  public onButton4 = () => this.selectButton(4);
  public onButton5 = () => this.selectButton(5);
  public onButton6 = () => this.selectButton(6);
  public onButton7 = () => this.selectButton(7);
  public onButton8 = () => this.selectButton(8);
  public onButton9 = () => this.selectButton(9);
  public onButton10 = () => this.selectButton(10);
  public onButton11 = () => this.selectButton(11);

  private onUpdate() {
    const dt = getDeltaTime();
    const t = MathUtils.clamp(dt * this.animationSpeed, 0, 1);

    for (let i = 0; i < this.images.length; i++) {
      const img = this.images[i];
      if (!img) continue;

      const current = this.currentAlphas[i] || 1.0;
      const target = this.targetAlphas[i] !== undefined ? this.targetAlphas[i] : 1.0;

      if (Math.abs(current - target) > 0.001) {
        const nextAlpha = MathUtils.lerp(current, target, t);
        this.currentAlphas[i] = nextAlpha;
        this.setImageAlpha(img, nextAlpha);
      }
    }
  }
}
