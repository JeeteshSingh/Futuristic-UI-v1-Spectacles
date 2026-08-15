import {GradientParameters} from "../../../Visuals/RoundedRectangle/RoundedRectangle"
import {
  TriggeredBorderYellow,
  TriggeredBorderYellowDim,
  DarkerLessGray,
  DarkestGray,
  DarkGray,
  MediumDarkGray,
  MediumGray
} from "../Colors"

export const PrimaryNeutralGradients: Record<string, GradientParameters> = {
  defaultBackground: {
    type: "Linear",
    start: new vec2(-2, 1),
    end: new vec2(2, -1),
    stop0: {
      percent: 0,
      color: DarkestGray
    },
    stop1: {
      percent: 1,
      color: DarkGray
    }
  },
  defaultBorder: {
    type: "Linear",
    start: new vec2(-1, 0.8),
    end: new vec2(1, -0.8),
    stop0: {
      percent: 0,
      color: MediumDarkGray
    },
    stop1: {
      percent: 1,
      color: DarkerLessGray
    }
  },
  hoverBackground: {
    type: "Linear",
    start: new vec2(-2, 1),
    end: new vec2(2, -1),
    stop0: {
      percent: 0,
      color: DarkestGray
    },
    stop1: {
      percent: 1,
      color: MediumDarkGray
    }
  },
  triggeredBackground: {
    type: "Linear",
    start: new vec2(-2, 1),
    end: new vec2(2, -1),
    stop0: {
      percent: 0,
      color: DarkestGray
    },
    stop1: {
      percent: 0.5,
      color: DarkGray
    },
    stop2: {
      percent: 1,
      color: MediumGray
    }
  },
  triggeredBorder: {
    type: "Linear",
    start: new vec2(-1, 0.8),
    end: new vec2(1, -0.8),
    stop0: {
      percent: 0,
      color: TriggeredBorderYellow
    },
    stop1: {
      percent: 0.5,
      color: DarkGray
    },
    stop2: {
      percent: 1,
      color: TriggeredBorderYellowDim
    }
  }
}
