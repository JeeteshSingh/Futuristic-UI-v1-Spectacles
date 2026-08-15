import {GradientParameters} from "../../../Visuals/RoundedRectangle/RoundedRectangle"
import {DarkerGray, DarkGray, DarkWarmGray, MediumDarkGray, MediumGray, MediumWarmGray} from "../Colors"

export const SecondaryGradients: Record<string, GradientParameters> = {
  defaultBackground: {
    type: "Linear",
    start: new vec2(-2, 1),
    end: new vec2(2, -1),
    stop0: {
      percent: 0,
      color: DarkWarmGray
    },
    stop1: {
      percent: 1,
      color: DarkWarmGray
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
      color: DarkerGray
    }
  },
  hoverBackground: {
    type: "Linear",
    start: new vec2(-2, 1),
    end: new vec2(2, -1),
    stop0: {
      percent: 0,
      color: MediumWarmGray
    },
    stop1: {
      percent: 1,
      color: MediumWarmGray
    }
  },
  hoverBorder: {
    type: "Linear",
    start: new vec2(-1, 0.8),
    end: new vec2(1, -0.8),
    stop0: {
      percent: 0,
      color: MediumGray
    },
    stop1: {
      percent: 1,
      color: DarkGray
    }
  },
  triggeredBackground: {
    type: "Linear",
    start: new vec2(-2, 1),
    end: new vec2(2, -1),
    stop0: {
      percent: 0,
      color: MediumWarmGray
    },
    stop1: {
      percent: 1,
      color: MediumWarmGray
    }
  },
  triggeredBorder: {
    type: "Linear",
    start: new vec2(-1, 0.8),
    end: new vec2(1, -0.8),
    stop0: {
      percent: 0,
      color: MediumGray
    },
    stop1: {
      percent: 1,
      color: DarkGray
    }
  }
}
