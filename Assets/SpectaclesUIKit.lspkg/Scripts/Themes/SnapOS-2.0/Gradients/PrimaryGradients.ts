import {GradientParameters} from "../../../Visuals/RoundedRectangle/RoundedRectangle"
import {
  TriggeredBorderYellow,
  TriggeredBorderYellowDim,
  BrightWarmYellow,
  BrightYellow,
  DarkerYellow,
  DarkestYellow,
  DarkMediumYellow,
  DarkYellow,
  MediumYellow
} from "../Colors"

export const PrimaryGradients: Record<string, GradientParameters> = {
  defaultBackground: {
    type: "Linear",
    start: new vec2(-2, 1),
    end: new vec2(2, -1),
    stop0: {
      percent: 0,
      color: DarkestYellow
    },
    stop1: {
      percent: 0.5,
      color: DarkYellow
    },
    stop2: {
      percent: 1,
      color: DarkMediumYellow
    }
  },
  defaultBorder: {
    type: "Linear",
    start: new vec2(-1, 0.8),
    end: new vec2(1, -0.8),
    stop0: {
      percent: 0,
      color: MediumYellow
    },
    stop1: {
      percent: 1,
      color: DarkerYellow
    }
  },
  hoverBackground: {
    type: "Linear",
    start: new vec2(-2, 1),
    end: new vec2(2, -1),
    stop0: {
      percent: 0,
      color: DarkerYellow
    },
    stop1: {
      percent: 1,
      color: MediumYellow
    }
  },
  triggeredBackground: {
    type: "Linear",
    start: new vec2(-2, 1),
    end: new vec2(2, -1),
    stop0: {
      percent: 0,
      color: DarkYellow
    },
    stop1: {
      percent: 0.5,
      color: BrightWarmYellow
    },
    stop2: {
      percent: 1,
      color: BrightYellow
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
      color: DarkYellow
    },
    stop2: {
      percent: 1,
      color: TriggeredBorderYellowDim
    }
  }
}
