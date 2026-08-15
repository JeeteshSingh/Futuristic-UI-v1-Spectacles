import {GradientParameters} from "../../../Visuals/RoundedRectangle/RoundedRectangle"
import {RoundedRectangleVisual} from "../../../Visuals/RoundedRectangle/RoundedRectangleVisual"
import {RoundButton} from "../../Button/RoundButton"

const Gradients: Record<string, GradientParameters> = {
  borderDefault: {
    enabled: true,
    start: new vec2(-1, 1),
    end: new vec2(1, -1),
    stop0: {
      enabled: true,
      color: new vec4(0.1, 0.1, 0.1, 1),
      percent: 0
    },
    stop1: {
      enabled: true,
      color: new vec4(0.2, 0.2, 0.2, 1),
      percent: 0.4
    },
    stop2: {
      enabled: true,
      color: new vec4(0.3, 0.3, 0.3, 1),
      percent: 0.6
    },
    stop3: {
      enabled: true,
      color: new vec4(0.4, 0.4, 0.4, 1),
      percent: 1
    }
  },
  borderTriggered: {
    enabled: true,
    start: new vec2(-1, 1),
    end: new vec2(1, -1),
    stop0: {
      enabled: true,
      color: new vec4(0.1, 0.1, 0.1, 1),
      percent: 0
    },
    stop1: {
      enabled: true,
      color: new vec4(0.2, 0.2, 0.2, 1),
      percent: 0.4
    },
    stop2: {
      enabled: true,
      color: new vec4(0.68, 0.57, 0.25, 0.8),
      percent: 0.6
    },
    stop3: {
      enabled: true,
      color: new vec4(0.68, 0.57, 0.25, 0.8),
      percent: 1
    }
  },
  backgroundDefault: {
    enabled: true,
    type: "Rectangle",
    stop0: {
      enabled: true,
      color: new vec4(0.3, 0.3, 0.3, 0.8),
      percent: 0.5
    },
    stop1: {
      enabled: true,
      color: new vec4(0.25, 0.25, 0.25, 0.8),
      percent: 1
    }
  },
  backgroundHover: {
    enabled: true,
    type: "Radial",
    start: new vec2(0, 0.5),
    end: new vec2(0, 1),
    stop0: {
      enabled: true,
      color: new vec4(0.3, 0.3, 0.3, 0.8),
      percent: 0.5
    },
    stop1: {
      enabled: true,
      color: new vec4(0.68, 0.57, 0.25, 0.8),
      percent: 2
    }
  },
  backgroundTriggered: {
    enabled: true,
    type: "Radial",
    start: new vec2(0, -0.5),
    end: new vec2(0, 0),
    stop0: {
      enabled: true,
      color: new vec4(0.3, 0.3, 0.3, 0.8),
      percent: 0.25
    },
    stop1: {
      enabled: true,
      color: new vec4(0.68, 0.57, 0.25, 0.8),
      percent: 1.75
    }
  }
}

@component
export class FrameButton extends BaseScriptComponent {
  @input
  public image: Image

  /**
   * Initializes the button
   */
  public initialize(texture: Texture = null) {
    const thisButton = this.sceneObject.getComponent(RoundButton.getTypeName())
    const rr = thisButton.visual as RoundedRectangleVisual
    rr.renderMeshVisual.mainPass.colorMask = new vec4b(true, true, true, true)
    rr.renderMeshVisual.mainPass.blendMode = BlendMode.PremultipliedAlphaAuto

    rr.initialize()
    rr.defaultGradient = Gradients.backgroundDefault
    rr.hoveredGradient = Gradients.backgroundHover
    rr.triggeredGradient = Gradients.backgroundTriggered
    rr.toggledDefaultGradient = Gradients.backgroundTriggered
    rr.borderDefaultGradient = Gradients.borderDefault
    rr.borderHoveredGradient = Gradients.borderDefault
    rr.borderTriggeredGradient = Gradients.borderTriggered
    rr.defaultShouldPosition = false
    rr.hoveredShouldPosition = false
    rr.triggeredShouldPosition = false
    rr.toggledTriggeredShouldPosition = false
    rr.toggledHoveredShouldPosition = false
    rr.renderMeshVisual.mainPass.twoSided = false
    this.image.mainMaterial = this.image.mainMaterial.clone()
    this.image.mainPass.baseTex = texture
  }
}
