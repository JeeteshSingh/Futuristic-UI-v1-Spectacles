import {GradientParameters} from "../../../Visuals/RoundedRectangle/RoundedRectangle"
import {DarkestRed, DarkRed, DarkWarmRed, LightRed, MediumDarkRed, MediumLightRed, MediumRed} from "../Colors"

export const SpecialGradients: Record<string, GradientParameters> = {
  defaultBackground: {
    type: "Linear",
    start: new vec2(-2, 1),
    end: new vec2(2, -1),
    stop0: {
      percent: 0,
      color: DarkRed
    },
    stop1: {
      percent: 1,
      color: DarkRed
    }
  },
  defaultBorder: {
    type: "Linear",
    start: new vec2(-0.8, 1),
    end: new vec2(0.8, -1),
    stop0: {
      percent: 0,
      color: MediumDarkRed
    },
    stop1: {
      percent: 1,
      color: DarkestRed
    }
  },
  hoverBackground: {
    type: "Linear",
    start: new vec2(-2, 1),
    end: new vec2(2, -1),
    stop0: {
      percent: 0,
      color: DarkWarmRed
    },
    stop1: {
      percent: 1,
      color: DarkWarmRed
    }
  },
  hoverBorder: {
    type: "Linear",
    start: new vec2(-0.8, 1),
    end: new vec2(0.8, -1),
    stop0: {
      percent: 0,
      color: MediumLightRed
    },
    stop1: {
      percent: 1,
      color: DarkRed
    }
  },
  triggeredBackground: {
    type: "Linear",
    start: new vec2(-2, 1),
    end: new vec2(2, -1),
    stop0: {
      percent: 0,
      color: MediumRed
    },
    stop1: {
      percent: 1,
      color: MediumRed
    }
  },
  triggeredBorder: {
    type: "Linear",
    start: new vec2(-0.8, 1),
    end: new vec2(0.8, -1),
    stop0: {
      percent: 0,
      color: LightRed
    },
    stop1: {
      percent: 1,
      color: DarkWarmRed
    }
  }
}
