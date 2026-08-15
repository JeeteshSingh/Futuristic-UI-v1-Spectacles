export enum Distance {
  "Near" = "near",
  "Far" = "far"
}

export enum Ranking {
  "Title1" = "Title 1",
  "Title2" = "Title 2",
  "HeadlineXL" = "Headline XL",
  "Headline1" = "Headline 1",
  "Headline2" = "Headline 2",
  "Subheadline" = "Subheadline",
  "Button" = "Button",
  "Callout" = "Callout",
  "Body" = "Body",
  "Caption" = "Caption"
}

export enum FontWeight {
  "Thin" = 100,
  "ExtraLight" = 200,
  "Light" = 300,
  "Normal" = 400,
  "Medium" = 500,
  "SemiBold" = 600,
  "Bold" = 700,
  "ExtraBold" = 800,
  "Black" = 900
}

type FontSettings = {
  size: number
  weight?: FontWeight // see chart below
}

type DistanceSettings = Record<Distance, FontSettings>

// sizes predefined for Objectiv, by design
const RankingDistanceToSettings: Record<Ranking, DistanceSettings> = {
  [Ranking.Title1]: {[Distance.Near]: {size: 76}, [Distance.Far]: {size: 105}},
  [Ranking.Title2]: {[Distance.Near]: {size: 62}, [Distance.Far]: {size: 93}},
  [Ranking.HeadlineXL]: {[Distance.Near]: {size: 55}, [Distance.Far]: {size: 62}},
  [Ranking.Headline1]: {[Distance.Near]: {size: 48}, [Distance.Far]: {size: 54}},
  [Ranking.Headline2]: {[Distance.Near]: {size: 41}, [Distance.Far]: {size: 48}},
  [Ranking.Subheadline]: {[Distance.Near]: {size: 36}, [Distance.Far]: {size: 41}},
  [Ranking.Button]: {[Distance.Near]: {size: 34}, [Distance.Far]: {size: 39}},
  [Ranking.Callout]: {
    [Distance.Near]: {size: 32, weight: FontWeight.Bold},
    [Distance.Far]: {size: 39, weight: FontWeight.Bold}
  },
  [Ranking.Body]: {[Distance.Near]: {size: 32}, [Distance.Far]: {size: 39}},
  [Ranking.Caption]: {[Distance.Near]: {size: 29}, [Distance.Far]: {size: 36}}
}

/**
 * TextStylePresets is a utility component designed to standardize and easily apply consistent text styles
 * (including font size and optionally font weight) to a Text component based on a selected "ranking" (such as Title1, Headline, Body, etc.)
 * and a preset "distance" (Near or Far) that accounts for different viewing contexts in AR experiences.
 *
 * The component uses a predefined mapping from ranking and distance to font settings,
 * ensuring design consistency throughout the UI.
 *
 * Intended usage: Attach to a SceneObject that already contains a Text component above this component. Select the desired ranking
 * and distance using the inspector properties to instantly update styling to match design guidelines.
 */
@component
export class TextStylePresets extends BaseScriptComponent {
  @input
  @hint("Viewing distance preset (affects text size). 'Near' for objects at 55cm, 'Far' at 110cm.")
  @widget(new ComboBoxWidget([new ComboBoxItem("Near", "near"), new ComboBoxItem("Far", "far")]))
  private _distance: string = "far"

  @input
  @hint(
    "Preset text style ranking (e.g. Title, Headline, Caption). Applies a consistent font size and weight by design."
  )
  @widget(
    new ComboBoxWidget([
      new ComboBoxItem("Title 1", "Title1"),
      new ComboBoxItem("Title 2", "Title2"),
      new ComboBoxItem("Headline XL", "HeadlineXL"),
      new ComboBoxItem("Headline 1", "Headline1"),
      new ComboBoxItem("Headline 2", "Headline2"),
      new ComboBoxItem("Subheadline", "Subheadline"),
      new ComboBoxItem("Button", "Button"),
      new ComboBoxItem("Callout", "Callout"),
      new ComboBoxItem("Body", "Body"),
      new ComboBoxItem("Caption", "Caption")
    ])
  )
  private _ranking: string = Ranking.Title1

  private textComponent: Text
  private initialized: boolean = false

  /**
   * get current viewing distance
   */
  public get distance(): Distance {
    return this._distance as Distance
  }
  /**
   * set current viewing distance
   */
  public set distance(value: Distance) {
    if (value === undefined || value === this._distance) return
    this._distance = value
    if (this.initialized) {
      this.updateTextStyle()
    }
  }
  /**
   * get current text ranking
   */
  public get ranking(): Ranking {
    return this._ranking as Ranking
  }
  /**
   * set current text ranking
   */
  public set ranking(value: Ranking) {
    if (value === undefined || value === this._ranking) return
    this._ranking = value
    if (this.initialized) {
      this.updateTextStyle()
    }
  }

  public onAwake() {
    this.textComponent = this.sceneObject.getComponent("Text")
    if (!this.textComponent) {
      throw "TextStylePresets requires an existing Text component on the same SceneObject"
    }
    this.updateTextStyle()
  }

  /** Returns the current distance style ("near" or "far") selected for the text. */
  public updateTextStyle() {
    const thisSettings = RankingDistanceToSettings[Ranking[this._ranking]][this._distance]
    this.textComponent.size = thisSettings.size
    // if this is 5.16 and above
    if (!isNull((this.textComponent as any).weight)) {
      ;(this.textComponent as any).weight = thisSettings.weight
      this.textComponent.size = this.convert516Size(thisSettings)
    }
  }

  // text sizing works different ls version >5.15
  // here is math for conversion to match glyph height for the specs system font
  // for 5.15
  // line height in cm = sizeA / 32.0
  // for 5.16
  // em square height in cm = sizeB / 43.88571429
  // objektiv em square 0.69492703
  // so sizeB = (0.69492703 * sizeA * 43.8851329) / 32
  private convert516Size(size: number) {
    const lineHeightDivisor = 32
    const emSquareDivisor = 43.88571429
    const objektivEmSquare = 0.69492703
    return (objektivEmSquare * size * emSquareDivisor) / lineHeightDivisor
  }
}
