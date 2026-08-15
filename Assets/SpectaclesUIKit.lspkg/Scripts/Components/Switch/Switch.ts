import {DragInteractorEvent, InteractorEvent} from "SpectaclesInteractionKit.lspkg/Core/Interactor/InteractorEvent"
import {
  DarkerLessGray,
  DarkestGray,
  DarkGray,
  DarkWarmGray,
  MediumDarkGray,
  MediumWarmGray,
  SwitchBorderYellowBright,
  SwitchBorderYellowBrighter,
  SwitchBorderYellowLight,
  SwitchBorderYellowMedium,
  SwitchHoverOrange,
  SwitchHoverYellow,
  SwitchKnobBorderGray,
  SwitchKnobBorderTransparent,
  SwitchKnobBorderTransparentHover,
  SwitchKnobBorderYellow,
  SwitchKnobBorderYellowBright,
  SwitchKnobBorderYellowHover,
  SwitchKnobBorderYellowMedium,
  SwitchKnobGray,
  SwitchTrackBorderGray,
  SwitchTrackBorderTransparent,
  SwitchTrackFillGray,
  SwitchTrackGray,
  SwitchTrackYellowDark,
  SwitchTrackYellowMedium,
  SwitchYellowBright,
  SwitchYellowBrightestHover,
  SwitchYellowBrightHover,
  SwitchYellowDark,
  TriggeredBorderYellow
} from "../../Themes/SnapOS-2.0/Colors"
import {
  RoundedRectangleVisual,
  RoundedRectangleVisualParameters
} from "../../Visuals/RoundedRectangle/RoundedRectangleVisual"
import {Slider} from "../Slider/Slider"
import {Toggleable} from "../Toggle/Toggleable"

// Track visual style
const trackStyle: Partial<RoundedRectangleVisualParameters> = {
  default: {
    baseGradient: {
      type: "Linear",
      start: new vec2(-1, 0),
      end: new vec2(1, 0),
      stop0: {percent: 0, color: SwitchTrackGray},
      stop1: {percent: 0.5, color: SwitchTrackGray},
      stop2: {percent: 1, color: SwitchTrackGray}
    },
    baseType: "Gradient",
    hasBorder: true,
    borderSize: 0.1,
    borderType: "Gradient",
    borderGradient: {
      start: new vec2(-0.8, 1),
      end: new vec2(0.8, -1),
      stop0: {percent: 0, color: SwitchTrackBorderGray},
      stop1: {percent: 0.5, color: SwitchTrackBorderTransparent},
      stop2: {percent: 1, color: SwitchTrackBorderGray}
    }
  },
  hovered: {
    baseGradient: {
      start: new vec2(0, 1.8),
      end: new vec2(0, -1.8),
      stop0: {percent: 0, color: DarkGray},
      stop1: {percent: 0.5, color: DarkGray},
      stop2: {percent: 1, color: MediumDarkGray}
    }
  },
  triggered: {
    baseGradient: {
      start: new vec2(-1, 0),
      end: new vec2(1, 0),
      stop0: {percent: 0, color: SwitchTrackGray},
      stop1: {percent: 0.5, color: SwitchTrackGray},
      stop2: {percent: 1, color: SwitchTrackGray}
    }
  },
  toggledDefault: {
    borderGradient: {
      type: "Linear",
      start: new vec2(-0.9, 1),
      end: new vec2(0.9, -1),
      stop0: {percent: 0, color: SwitchBorderYellowLight},
      stop1: {percent: 0.55, color: SwitchBorderYellowMedium},
      stop2: {percent: 1, color: SwitchBorderYellowLight}
    }
  },
  toggledHovered: {
    borderGradient: {
      type: "Linear",
      start: new vec2(-0.9, 1),
      end: new vec2(0.9, -1),
      stop0: {percent: 0, color: SwitchBorderYellowBright},
      stop1: {percent: 0.55, color: SwitchBorderYellowBrighter},
      stop2: {percent: 1, color: SwitchBorderYellowBright}
    }
  },
  toggledTriggered: {
    borderGradient: {
      type: "Linear",
      start: new vec2(-0.9, 1),
      end: new vec2(0.9, -1),
      stop0: {percent: 0, color: SwitchBorderYellowLight},
      stop1: {percent: 0.55, color: SwitchBorderYellowMedium},
      stop2: {percent: 1, color: SwitchBorderYellowLight}
    }
  }
}

// Track Fill visual style
const trackFillStyle: Partial<RoundedRectangleVisualParameters> = {
  default: {
    baseGradient: {
      type: "Linear",
      start: new vec2(-1, 0),
      end: new vec2(1, 0),
      stop0: {percent: 0, color: SwitchTrackFillGray},
      stop1: {percent: 1, color: SwitchTrackFillGray}
    },
    baseType: "Gradient"
  },
  hovered: {
    baseGradient: {
      type: "Linear",
      start: new vec2(-1, 0),
      end: new vec2(1, 0),
      stop0: {percent: 0, color: SwitchHoverOrange},
      stop1: {percent: 1, color: SwitchHoverYellow}
    }
  },
  toggledDefault: {
    baseGradient: {
      type: "Linear",
      start: new vec2(-1, 0),
      end: new vec2(1, 0),
      stop0: {percent: 0, color: SwitchTrackYellowDark},
      stop1: {percent: 1, color: SwitchTrackYellowDark}
    }
  },
  toggledHovered: {
    baseGradient: {
      type: "Linear",
      start: new vec2(-1, 0),
      end: new vec2(1, 0),
      stop0: {percent: 0, color: SwitchTrackYellowMedium},
      stop1: {percent: 1, color: SwitchTrackYellowMedium}
    }
  },
  toggledTriggered: {
    baseGradient: {
      type: "Linear",
      start: new vec2(-1, 0),
      end: new vec2(1, 0),
      stop0: {percent: 0, color: SwitchTrackYellowDark},
      stop1: {percent: 1, color: SwitchTrackYellowDark}
    }
  }
}

// Knob visual style
const knobStyle: Partial<RoundedRectangleVisualParameters> = {
  default: {
    baseGradient: {
      enabled: true,
      type: "Linear",
      start: new vec2(-1, 1),
      end: new vec2(1, -1),
      stop0: {percent: 0, color: DarkestGray},
      stop1: {percent: 1, color: DarkWarmGray}
    },
    baseType: "Gradient",
    hasBorder: true,
    borderSize: 0.05,
    borderType: "Gradient",
    borderGradient: {
      start: new vec2(-0.8, 1),
      end: new vec2(0.8, -1),
      stop0: {percent: 0, color: SwitchKnobBorderGray},
      stop1: {percent: 1, color: SwitchKnobBorderTransparent}
    }
  },
  hovered: {
    baseGradient: {
      enabled: true,
      type: "Linear",
      start: new vec2(-1, 1),
      end: new vec2(1, -1),
      stop0: {percent: 0, color: DarkerLessGray},
      stop1: {percent: 1, color: SwitchKnobGray}
    },
    borderGradient: {
      start: new vec2(-0.8, 1),
      end: new vec2(0.8, -1),
      stop0: {percent: 0, color: MediumWarmGray},
      stop1: {percent: 1, color: SwitchKnobBorderTransparentHover}
    }
  },
  triggered: {
    baseGradient: {
      enabled: true,
      type: "Linear",
      stop0: {percent: 0, color: SwitchYellowDark},
      stop1: {percent: 1, color: SwitchYellowBright}
    }
  },
  toggledDefault: {
    baseGradient: {
      enabled: true,
      type: "Linear",
      stop0: {percent: 0, color: SwitchYellowDark},
      stop1: {percent: 1, color: SwitchYellowBright}
    },
    borderGradient: {
      type: "Linear",
      start: new vec2(-0.8, 1),
      end: new vec2(0.8, -1),
      stop0: {percent: 0, color: SwitchKnobBorderYellow},
      stop1: {percent: 0.55, color: SwitchKnobBorderYellowMedium},
      stop2: {percent: 1, color: SwitchKnobBorderYellowBright}
    }
  },
  toggledHovered: {
    baseGradient: {
      enabled: true,
      type: "Linear",
      stop0: {percent: 0, color: SwitchYellowBrightHover},
      stop1: {percent: 1, color: SwitchYellowBrightestHover}
    },
    borderGradient: {
      type: "Linear",
      start: new vec2(-0.8, 1),
      end: new vec2(0.8, -1),
      stop0: {percent: 0, color: TriggeredBorderYellow},
      stop1: {percent: 0.55, color: SwitchKnobBorderYellowHover},
      stop2: {percent: 1, color: TriggeredBorderYellow}
    }
  },
  toggledTriggered: {
    baseGradient: {
      enabled: true,
      type: "Linear",
      stop0: {percent: 0, color: SwitchYellowDark},
      stop1: {percent: 1, color: SwitchYellowBright}
    },
    borderGradient: {
      type: "Linear",
      start: new vec2(-0.8, 1),
      end: new vec2(0.8, -1),
      stop0: {percent: 0, color: SwitchKnobBorderYellow},
      stop1: {percent: 0.55, color: SwitchKnobBorderYellowMedium},
      stop2: {percent: 1, color: SwitchKnobBorderYellowBright}
    }
  }
}

/**
 * Represents a Switch component that extends the Slider functionality.
 *
 * @extends VisualElement
 * @implements Toggleable
 */
@component
export class Switch extends Slider implements Toggleable {
  @input("int")
  @hint("The default state of the switch")
  @widget(new ComboBoxWidget([new ComboBoxItem("Off", 0), new ComboBoxItem("On", 1)]))
  protected _defaultValue: number = 0

  // Hidden inputs
  protected segmented: boolean = true
  protected snapToTriggerPosition: boolean = true
  protected numberOfSegments: number = 2
  protected get isToggle(): boolean {
    return true
  }

  private _isExplicit: boolean = true

  /**
   * Gets the current state of the switch.
   *
   * @returns {boolean} - Returns `true` if the switch's current state is not set to 0, otherwise `false`.
   */
  public get isOn(): boolean {
    return this._currentValue !== 0
  }

  /**
   * Sets the state of the switch to either "on" or "off".
   *
   * @param on - A boolean value indicating whether the switch should be turned on (`true`) or off (`false`).
   */
  public set isOn(on: boolean) {
    if (on === undefined) {
      return
    }
    this._isExplicit = false
    this.setOn(on)
  }

  /**
   * Toggles the switch to the on/off state.
   *
   * This method sets the current state of the switch to 1 or 0 and updates the knob position accordingly.
   * @param on - A boolean value indicating the desired toggle state.
   */
  public toggle(on: boolean): void {
    this._isExplicit = true
    this.setOn(on)
  }

  /**
   * Initializes the switch component.
   *
   * This method sets the default state
   */
  public initialize() {
    super.initialize()
    this._interactableStateMachine.toggle = this.currentValue > 0
  }

  protected onTriggerUpHandler(event: InteractorEvent) {
    this._isExplicit = true
    super.onTriggerUpHandler(event)
  }

  protected onInteractableDragEnd(dragEvent: DragInteractorEvent): void {
    this._isExplicit = true
    super.onInteractableDragEnd(dragEvent)
  }

  protected onInteractableDragUpdate(dragEvent: DragInteractorEvent): void {
    super.onInteractableDragUpdate(dragEvent)
    const knobDraggedOn = this.knobValue > 0
    if (this._interactableStateMachine.toggle !== knobDraggedOn) this._interactableStateMachine.toggle = knobDraggedOn
  }

  protected onTriggerRespond(): void {
    if (!this._isDragged) {
      if (this.segmented && this.snapToTriggerPosition) {
        const newValue = this.currentValue === 0 ? 1 : 0
        this.updateCurrentValue(newValue, true)
      }
    }
  }

  private setOn(on: boolean) {
    if ((on && this._currentValue === 1) || (!on && this._currentValue === 0)) {
      return
    }
    this.updateCurrentValue(on ? 1 : 0, true)
  }

  public updateCurrentValue(value: number, shouldAnimate?: boolean): void {
    if (this.initialized) {
      this._interactableStateMachine.toggle = value > 0
    }
    super.updateCurrentValue(value, shouldAnimate)
  }

  protected get isExplicit(): boolean {
    return this._isExplicit
  }

  protected createDefaultVisual(): void {
    if (!this._visual) {
      const defaultVisual: RoundedRectangleVisual = new RoundedRectangleVisual({
        sceneObject: this.sceneObject,
        style: trackStyle
      })
      defaultVisual.cornerRadius = this.size.y * 0.5
      this._visual = defaultVisual
    }

    if (!this._knobVisual) {
      const knobObject = global.scene.createSceneObject("SliderKnob")
      this.managedSceneObjects.add(knobObject)
      const defaultKnobVisual: RoundedRectangleVisual = new RoundedRectangleVisual({
        sceneObject: knobObject,
        style: knobStyle
      })

      defaultKnobVisual.cornerRadius = (this.size.y - defaultKnobVisual.borderSize * 2) * 0.5
      this._knobVisual = defaultKnobVisual
      if (!this.customKnobSize) {
        this._knobSize = new vec2(this.size.y, this.size.y)
      }
      knobObject.setParent(this.sceneObject)
    }

    if (!this._trackFillVisual && this.hasTrackVisual) {
      const trackFillObject = global.scene.createSceneObject("SliderTrackFill")
      this.managedSceneObjects.add(trackFillObject)
      const defaultTrackFillVisual: RoundedRectangleVisual = new RoundedRectangleVisual({
        sceneObject: trackFillObject,
        style: trackFillStyle
      })

      this._trackFillVisual = defaultTrackFillVisual
      trackFillObject.setParent(this.sceneObject)
    }
  }
}
