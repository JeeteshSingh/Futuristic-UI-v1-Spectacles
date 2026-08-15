import {GradientParameters} from "../../../Visuals/RoundedRectangle/RoundedRectangle"
import {BrightYellow, MediumGray, Transparent} from "../Colors"

export const GhostGradients: Record<string, GradientParameters> = {
  defaultBackground: {
    type: "Linear",
    start: new vec2(-0.6, 1),
    end: new vec2(0.6, -1),
    stop0: {
      percent: 0,
      color: Transparent
    },
    stop1: {
      percent: 1,
      color: Transparent
    }
  },
  defaultBorder: {
    type: "Linear",
    start: new vec2(-0.8, 1),
    end: new vec2(0.8, -1),
    stop0: {
      percent: 0,
      color: Transparent
    },
    stop1: {
      percent: 1,
      color: Transparent
    }
  },
  hoverBackground: {
    type: "Linear",
    start: new vec2(-0.6, 1),
    end: new vec2(0.6, -1),
    stop0: {
      percent: 0,
      color: Transparent
    },
    stop1: {
      percent: 1,
      color: Transparent
    }
  },
  hoverBorder: {
    type: "Linear",
    start: new vec2(-0.8, 1),
    end: new vec2(0.8, -1),
    stop0: {
      percent: 0,
      color: MediumGray
    },
    stop1: {
      percent: 1,
      color: MediumGray
    }
  },
  triggeredBackground: {
    type: "Linear",
    start: new vec2(-0.6, 1),
    end: new vec2(0.6, -1),
    stop0: {
      percent: 0,
      color: Transparent
    },
    stop1: {
      percent: 1,
      color: Transparent
    }
  },
  triggeredBorder: {
    type: "Linear",
    start: new vec2(-0.8, 1),
    end: new vec2(0.8, -1),
    stop0: {
      percent: 0,
      color: BrightYellow
    },
    stop1: {
      percent: 1,
      color: BrightYellow
    }
  }
}
