import {Style} from "./Style"

export type Theme = {
  get styles(): Record<string, Record<string, Style>>
  get name(): string
}

