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
import { BaseButton } from "SpectaclesUIKit.lspkg/Scripts/Components/Button/BaseButton"
import { Visual, VisualArgs, VisualState } from "SpectaclesUIKit.lspkg/Scripts/Visuals/Visual"
import { StateName } from "SpectaclesUIKit.lspkg/Scripts/Components/Element"
import { TargetingMode } from "SpectaclesInteractionKit.lspkg/Core/Interactor/Interactor"
import { Interactable } from "SpectaclesInteractionKit.lspkg/Components/Interaction/Interactable/Interactable"

const DEFAULT_UI_MATERIAL: Material = requireAsset("../../SpectaclesUIKit.lspkg/Materials/Image.mat") as Material

/**
 * Interface defining 2D vertex positions for an arbitrary polygon (in local space).
 */
export interface PolygonVertex {
  x: number
  y: number
}

export enum ShapePreset {
  DefaultIrregularPentagon = 0,
  SciFiChevron = 1,
  FuturisticTrapezoid = 2,
  AsymmetricQuad = 3,
  Hexagon = 4,
  Custom = 5,
}

export enum AnimationType {
  Scale = 0,
  Position = 1,
  Both = 2,
  None = 3,
}

export type PolygonalVisualArgs = VisualArgs & {
  vertices?: PolygonVertex[]
  cornerRadius?: number
  cornerSegments?: number
  borderWidth?: number
  fitToSize?: boolean
  polygonScale?: vec2
  targetSize?: vec3
  customMaterial?: Material
  defaultColor?: vec4
  hoveredColor?: vec4
  triggeredColor?: vec4
  toggledColor?: vec4
  toggledHoveredColor?: vec4
  disabledColor?: vec4
  borderColor?: vec4
  borderHoveredColor?: vec4
  borderTriggeredColor?: vec4
  borderToggledColor?: vec4
  borderToggledHoveredColor?: vec4
  borderDisabledColor?: vec4
  useTextures?: boolean
  buttonTexture?: Texture
  borderTexture?: Texture
  opacity?: number
  animationType?: AnimationType
  popDistance?: number
}

/**
 * PolygonalButtonVisual
 * Extends SpectaclesUIKit Visual base class to generate 2D polygon mesh geometry
 * with corner filleting, auto-normalization to button dimensions, border ribbons,
 * and robust SIK state color animations.
 */
export class PolygonalButtonVisual extends Visual {
  private _rawCorners: PolygonVertex[] = []
  private _filletedVertices: PolygonVertex[] = []
  private _cornerRadius: number = 0.25
  private _cornerSegments: number = 6
  private _borderSize: number = 0.15
  private _fitToSize: boolean = true
  private _polygonScale: vec2 = new vec2(1.0, 1.0)
  private _targetSize: vec3 = new vec3(4.0, 4.0, 4.0)

  private _rmv: RenderMeshVisual = null
  private _borderRmv: RenderMeshVisual = null
  private _material: Material = null
  private _borderMaterial: Material = null
  private _mesh: RenderMesh = null
  private _borderMesh: RenderMesh = null
  private _baseColor: vec4 = new vec4(0.12, 0.14, 0.20, 0.95)
  private _borderColor: vec4 = new vec4(0.35, 0.55, 0.85, 1.0)
  private _borderHoveredColor: vec4 = new vec4(0.45, 0.65, 0.95, 1.0)
  private _borderTriggeredColor: vec4 = new vec4(1.0, 0.5, 0.2, 1.0)
  
  private _targetBorderColor: vec4 = null
  private _currentBorderColor: vec4 = null
  private _updateEvent: UpdateEvent = null

  private _opacity: number = 1.0
  private _animationType: AnimationType = AnimationType.Scale
  private _popDistance: number = 1.0
  private _targetZOffset: number = 0.0

  private _hasBorder: boolean = true
  private _statesMap: Map<StateName, VisualState> = new Map<StateName, VisualState>()
  private _currentStateName: StateName = StateName.default

  protected override _defaultColor: vec4 = new vec4(0.12, 0.14, 0.20, 0.95)
  protected override _hoveredColor: vec4 = new vec4(0.18, 0.50, 0.90, 0.98)
  protected override _triggeredColor: vec4 = new vec4(0.95, 0.35, 0.15, 1.0)
  protected _disabledColor: vec4 = new vec4(0.3, 0.3, 0.3, 0.5)
  protected override _toggledDefaultColor: vec4 = new vec4(0.10, 0.85, 0.45, 1.0)
  protected override _toggledHoveredColor: vec4 = new vec4(0.25, 0.95, 0.65, 1.0)

  private _borderDisabledColor: vec4 = new vec4(0.3, 0.3, 0.3, 0.5)
  private _borderToggledColor: vec4 = new vec4(0.20, 1.0, 0.60, 1.0)
  private _borderToggledHoveredColor: vec4 = new vec4(0.35, 1.0, 0.75, 1.0)

  constructor(args: PolygonalVisualArgs) {
    super(args)

    this._sceneObject = args.sceneObject
    this._transform = args.sceneObject.getTransform()

    if (args.cornerRadius !== undefined) this._cornerRadius = args.cornerRadius
    if (args.cornerSegments !== undefined) this._cornerSegments = args.cornerSegments
    if (args.borderWidth !== undefined) this._borderSize = args.borderWidth
    if (args.fitToSize !== undefined) this._fitToSize = args.fitToSize
    if (args.polygonScale !== undefined) this._polygonScale = args.polygonScale
    if (args.targetSize !== undefined) this._targetSize = args.targetSize

    if (args.defaultColor) this._defaultColor = args.defaultColor
    if (args.hoveredColor) this._hoveredColor = args.hoveredColor
    if (args.triggeredColor) this._triggeredColor = args.triggeredColor
    if (args.toggledColor) this._toggledDefaultColor = args.toggledColor
    if (args.toggledHoveredColor) this._toggledHoveredColor = args.toggledHoveredColor
    if (args.disabledColor) this._disabledColor = args.disabledColor
    
    if (args.borderColor) this._borderColor = args.borderColor
    if (args.borderHoveredColor) this._borderHoveredColor = args.borderHoveredColor
    if (args.borderTriggeredColor) this._borderTriggeredColor = args.borderTriggeredColor
    if (args.borderToggledColor) this._borderToggledColor = args.borderToggledColor
    if (args.borderToggledHoveredColor) this._borderToggledHoveredColor = args.borderToggledHoveredColor
    if (args.borderDisabledColor) this._borderDisabledColor = args.borderDisabledColor

    if (args.opacity !== undefined) this._opacity = args.opacity
    if (args.animationType !== undefined) this._animationType = args.animationType
    if (args.popDistance !== undefined) this._popDistance = args.popDistance

    this._currentBorderColor = this._borderColor
    this._targetBorderColor = this._borderColor

    // Visual container for Z-pop animation (keeps root SceneObject transform untouched)
    const containerName = this._sceneObject.name + "_VisualContainer"
    let visualContainer: SceneObject = null
    const childCount = this._sceneObject.getChildrenCount()
    for (let i = 0; i < childCount; i++) {
      const child = this._sceneObject.getChild(i)
      if (child && child.name === containerName) {
        visualContainer = child
        break
      }
    }

    if (!visualContainer) {
      visualContainer = global.scene.createSceneObject(containerName)
      visualContainer.setParent(this._sceneObject)
      visualContainer.getTransform().setLocalPosition(vec3.zero())
      visualContainer.getTransform().setLocalRotation(quat.quatIdentity())
      visualContainer.getTransform().setLocalScale(vec3.one())
    }
    this._visualContainer = visualContainer

    // Reparent user child objects (Text, Images, Icons) to _visualContainer so they pop together on Z-hover
    const rootChildrenCount = this._sceneObject.getChildrenCount()
    const childrenToMove: SceneObject[] = []
    for (let i = 0; i < rootChildrenCount; i++) {
      const child = this._sceneObject.getChild(i)
      if (child && child !== visualContainer) {
        childrenToMove.push(child)
      }
    }
    for (const child of childrenToMove) {
      child.setParent(visualContainer)
    }

    // Main RenderMeshVisual for polygon fill on visual container
    this._rmv = visualContainer.getComponent("RenderMeshVisual") as RenderMeshVisual
    if (!this._rmv) {
      this._rmv = visualContainer.createComponent("RenderMeshVisual")
    }

    if (args.customMaterial) {
      this._material = args.customMaterial.clone()
    } else if (DEFAULT_UI_MATERIAL) {
      this._material = DEFAULT_UI_MATERIAL.clone()
    } else if (this._rmv.mainMaterial) {
      this._material = this._rmv.mainMaterial.clone()
    }

    if (this._material) {
      const pass = this._material.mainPass as any
      pass.cullMode = 0
      if (args.useTextures && args.buttonTexture) {
        pass.ENABLE_BASE_TEX = true
        pass.baseTex = args.buttonTexture
      }
      this._rmv.mainMaterial = this._material
    }

    // Border child SceneObject under visual container
    const borderObjName = this._sceneObject.name + "_Border"
    let borderObj: SceneObject = null
    const containerChildren = visualContainer.getChildrenCount()
    for (let i = 0; i < containerChildren; i++) {
      const child = visualContainer.getChild(i)
      if (child && child.name === borderObjName) {
        borderObj = child
        break
      }
    }

    if (!borderObj) {
      borderObj = global.scene.createSceneObject(borderObjName)
      borderObj.setParent(visualContainer)
    }

    this._borderRmv = borderObj.getComponent("RenderMeshVisual") as RenderMeshVisual
    if (!this._borderRmv) {
      this._borderRmv = borderObj.createComponent("RenderMeshVisual")
    }

    if (this._material) {
      this._borderMaterial = this._material.clone()
      const bPass = this._borderMaterial.mainPass as any
      bPass.cullMode = 0
      if (args.useTextures && args.borderTexture) {
        bPass.ENABLE_BASE_TEX = true
        bPass.baseTex = args.borderTexture
      }
      this._borderRmv.mainMaterial = this._borderMaterial
    }

    if (args.vertices && args.vertices.length >= 3) {
      this._rawCorners = args.vertices
    } else {
      this._rawCorners = [
        { x: -2.0, y: -1.2 },
        { x: 2.2, y: -0.9 },
        { x: 1.8, y: 0.8 },
        { x: 0.8, y: 1.8 },
        { x: -1.4, y: 1.4 },
      ]
    }

    this.rebuildGeometry()
    this.applyColorToMaterial(this._material, this._defaultColor)
    this.applyColorToMaterial(this._borderMaterial, this._borderColor)
    
    // Apply opacity to children immediately upon initialization
    if (this._sceneObject) {
        this.updateChildOpacities(this._opacity)
    }
  }

  private _visualContainer: SceneObject = null

  public syncChildrenToContainer(): void {
    if (!this._visualContainer || !this._sceneObject) return

    const rootChildrenCount = this._sceneObject.getChildrenCount()
    const childrenToMove: SceneObject[] = []
    for (let i = 0; i < rootChildrenCount; i++) {
      const child = this._sceneObject.getChild(i)
      if (
        child &&
        child !== this._visualContainer &&
        child.name !== "Collider" &&
        child.name !== "InteractableStateMachine"
      ) {
        childrenToMove.push(child)
      }
    }
    for (const child of childrenToMove) {
      if ((child as any).setParentPreserveWorldTransform) {
        (child as any).setParentPreserveWorldTransform(this._visualContainer)
      } else {
        child.setParent(this._visualContainer)
      }
    }
  }

  public override initialize(): void {
    if (this.initialized) return
    this.syncChildrenToContainer()

    if (!this._updateEvent) {
      const script = this.sceneObject.getComponent("Component.ScriptComponent")
      if (script) {
        this._updateEvent = script.createEvent("UpdateEvent")
        this._updateEvent.bind(() => {
          const dt = getDeltaTime() * 15.0

          // Continuously catch and reparent any children added to root SceneObject at runtime
          if (this._sceneObject && this._sceneObject.getChildrenCount() > 1) {
              this.syncChildrenToContainer()
          }

          if (this._currentBorderColor && this._targetBorderColor) {
             this._currentBorderColor = vec4.lerp(this._currentBorderColor, this._targetBorderColor, dt)
             const bc = this._currentBorderColor
             this.applyColorToMaterial(this._borderMaterial, new vec4(bc.r, bc.g, bc.b, bc.a * this._opacity))
          }

          if (this._visualContainer) {
             const t = this._visualContainer.getTransform()
             const lp = t.getLocalPosition()
             const targetZ = (this._animationType === AnimationType.Position || this._animationType === AnimationType.Both)
                 ? this._targetZOffset
                 : 0.0

             if (Math.abs(lp.z - targetZ) > 0.001) {
                lp.z = MathUtils.lerp(lp.z, targetZ, dt)
                t.setLocalPosition(lp)
             }
          }
        })
      }
    }

    this.updateVisualStates()
    this.initialized = true
    this.setState(StateName.default)
  }

  public override setState(stateName: StateName) {
    super.setState(stateName)
    this._currentStateName = stateName
    switch (stateName) {
      case StateName.default:
        this._targetBorderColor = this._borderColor
        this._targetZOffset = 0.0
        break
      case StateName.toggledDefault:
        this._targetBorderColor = this._borderToggledColor
        this._targetZOffset = 0.0
        break
      case StateName.inactive:
        this._targetBorderColor = this._borderDisabledColor
        this._targetZOffset = 0.0
        break
      case StateName.hovered:
        this._targetBorderColor = this._borderHoveredColor
        this._targetZOffset = this._popDistance
        break
      case StateName.toggledHovered:
        this._targetBorderColor = this._borderToggledHoveredColor
        this._targetZOffset = this._popDistance
        break
      case StateName.triggered:
      case StateName.toggledTriggered:
        this._targetBorderColor = this._borderTriggeredColor
        this._targetZOffset = -this._popDistance
        break
    }
  }

  protected override get visualStates(): Map<StateName, VisualState> {
    const scale = this._animationType === AnimationType.Scale || this._animationType === AnimationType.Both
    const s1 = scale ? 1.04 : 1.0
    const s2 = scale ? 0.96 : 1.0

    this._statesMap.set(StateName.default, { baseColor: this._defaultColor, localScale: vec3.one(), shouldScale: scale })
    this._statesMap.set(StateName.hovered, { baseColor: this._hoveredColor, localScale: new vec3(s1, s1, s1), shouldScale: scale })
    this._statesMap.set(StateName.triggered, { baseColor: this._triggeredColor, localScale: new vec3(s2, s2, s2), shouldScale: scale })
    this._statesMap.set(StateName.toggledDefault, { baseColor: this._toggledDefaultColor, localScale: vec3.one(), shouldScale: scale })
    this._statesMap.set(StateName.toggledHovered, { baseColor: this._toggledHoveredColor, localScale: new vec3(s1, s1, s1), shouldScale: scale })
    this._statesMap.set(StateName.toggledTriggered, { baseColor: this._triggeredColor, localScale: new vec3(s2, s2, s2), shouldScale: scale })
    this._statesMap.set(StateName.inactive, { baseColor: this._disabledColor, localScale: vec3.one(), shouldScale: scale })
    return this._statesMap
  }

  private updateChildOpacities(value: number): void {
      const traverse = (obj: SceneObject) => {
          // Image
          const img = obj.getComponent("Component.Image") as any;
          if (img) {
              if (img.mainPass && img.mainPass.baseColor !== undefined) {
                  const c = img.mainPass.baseColor as vec4;
                  img.mainPass.baseColor = new vec4(c.r, c.g, c.b, value);
              } else if (img.mainMaterial && img.mainMaterial.mainPass && img.mainMaterial.mainPass.baseColor !== undefined) {
                  const c = img.mainMaterial.mainPass.baseColor as vec4;
                  img.mainMaterial.mainPass.baseColor = new vec4(c.r, c.g, c.b, value);
              } else if (img.baseColor !== undefined) {
                  const c = img.baseColor as vec4;
                  img.baseColor = new vec4(c.r, c.g, c.b, value);
              }
          }

          // Text
          const txt = obj.getComponent("Component.Text") as any;
          if (txt) {
              if (txt.textFill && txt.textFill.color !== undefined) {
                  const c = txt.textFill.color as vec4;
                  txt.textFill.color = new vec4(c.r, c.g, c.b, value);
              }
              if (txt.outlineSettings && txt.outlineSettings.fill && txt.outlineSettings.fill.color !== undefined) {
                  const oc = txt.outlineSettings.fill.color as vec4;
                  txt.outlineSettings.fill.color = new vec4(oc.r, oc.g, oc.b, value);
              }
              if (txt.dropShadowSettings && txt.dropShadowSettings.fill && txt.dropShadowSettings.fill.color !== undefined) {
                  const dc = txt.dropShadowSettings.fill.color as vec4;
                  txt.dropShadowSettings.fill.color = new vec4(dc.r, dc.g, dc.b, value);
              }
          }

          // Text3D
          const txt3d = obj.getComponent("Component.Text3D") as any;
          if (txt3d) {
              if (txt3d.textFill && txt3d.textFill.color !== undefined) {
                  const c = txt3d.textFill.color as vec4;
                  txt3d.textFill.color = new vec4(c.r, c.g, c.b, value);
              }
              if (txt3d.mainPass && txt3d.mainPass.baseColor !== undefined) {
                  const c = txt3d.mainPass.baseColor as vec4;
                  txt3d.mainPass.baseColor = new vec4(c.r, c.g, c.b, value);
              } else if (txt3d.mainMaterial && txt3d.mainMaterial.mainPass && txt3d.mainMaterial.mainPass.baseColor !== undefined) {
                  const c = txt3d.mainMaterial.mainPass.baseColor as vec4;
                  txt3d.mainMaterial.mainPass.baseColor = new vec4(c.r, c.g, c.b, value);
              }
          }
          
          for (let i = 0; i < obj.getChildrenCount(); i++) {
              traverse(obj.getChild(i));
          }
      };
      
      traverse(this._sceneObject);
  }

  // Visual Getters and Setters
  public get opacity(): number { return this._opacity }
  public set opacity(value: number) { 
    this._opacity = value 
    const activeState = this._statesMap.get(this._currentStateName)
    const baseCol = activeState && activeState.baseColor ? activeState.baseColor : this._defaultColor
    this.applyColorToMaterial(this._material, new vec4(baseCol.r, baseCol.g, baseCol.b, baseCol.a * this._opacity))
    if (this._currentBorderColor) {
      this.applyColorToMaterial(this._borderMaterial, new vec4(this._currentBorderColor.r, this._currentBorderColor.g, this._currentBorderColor.b, this._currentBorderColor.a * this._opacity))
    }
    this.updateChildOpacities(value);
  }

  public get animationType(): AnimationType { return this._animationType }
  public set animationType(value: AnimationType) { 
    this._animationType = value
    this.updateVisualStates()
  }

  public get popDistance(): number { return this._popDistance }
  public set popDistance(value: number) { this._popDistance = value }

  public get renderMeshVisual(): RenderMeshVisual {
    return this._rmv
  }

  public get hasBorder(): boolean {
    return this._hasBorder
  }

  public get borderSize(): number {
    return this._borderSize
  }

  public override get baseColor(): vec4 {
    return this._baseColor
  }

  public override set baseColor(value: vec4) {
    this._baseColor = value
    this.applyColorToMaterial(this._material, new vec4(value.r, value.g, value.b, value.a * this._opacity))
  }

  public set defaultColor(value: vec4) {
    this._defaultColor = value
    this.updateVisualStates()
  }

  public set borderColor(value: vec4) {
    this._borderColor = value
    this._targetBorderColor = value
  }

  public get borderColor(): vec4 {
    return this._borderColor
  }

  public set polygonScale(scale: vec2) {
    this._polygonScale = scale
    this.rebuildGeometry()
  }

  public get polygonScale(): vec2 {
    return this._polygonScale
  }

  public set targetSize(sz: vec3) {
    this._targetSize = sz
    if (this._fitToSize) {
      this.rebuildGeometry()
    }
  }

  public get targetSize(): vec3 {
    return this._targetSize
  }

  public set fitToSize(fit: boolean) {
    this._fitToSize = fit
    this.rebuildGeometry()
  }

  public get fitToSize(): boolean {
    return this._fitToSize
  }

  private applyColorToMaterial(mat: Material, col: vec4): void {
    if (!mat || !mat.mainPass || !col) return
    const pass = mat.mainPass as any
    pass.baseColor = col
    pass.color = col
  }

  /**
   * Reconfigures raw corner points and regenerates geometry.
   */
  public setCorners(
    corners: PolygonVertex[],
    cornerRadius?: number,
    cornerSegments?: number,
    borderWidth?: number,
    polygonScale?: vec2
  ): void {
    if (corners.length < 3) return
    this._rawCorners = corners
    if (cornerRadius !== undefined) this._cornerRadius = cornerRadius
    if (cornerSegments !== undefined) this._cornerSegments = cornerSegments
    if (borderWidth !== undefined) this._borderSize = borderWidth
    if (polygonScale !== undefined) this._polygonScale = polygonScale
    this.rebuildGeometry()
  }

  public rebuildGeometry(): void {
    let processedCorners: PolygonVertex[] = []

    if (this._fitToSize) {
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
      for (const p of this._rawCorners) {
        minX = Math.min(minX, p.x)
        maxX = Math.max(maxX, p.x)
        minY = Math.min(minY, p.y)
        maxY = Math.max(maxY, p.y)
      }

      const rawW = maxX - minX || 1
      const rawH = maxY - minY || 1
      const midX = (minX + maxX) / 2
      const midY = (minY + maxY) / 2

      const targetW = (this._targetSize ? this._targetSize.x : 4.0) * this._polygonScale.x
      const targetH = (this._targetSize ? this._targetSize.y : 4.0) * this._polygonScale.y

      for (const p of this._rawCorners) {
        const nx = ((p.x - midX) / rawW) * targetW
        const ny = ((p.y - midY) / rawH) * targetH
        processedCorners.push({ x: nx, y: ny })
      }
    } else {
      for (const p of this._rawCorners) {
        processedCorners.push({
          x: p.x * this._polygonScale.x,
          y: p.y * this._polygonScale.y,
        })
      }
    }

    this._filletedVertices = this.generateFilletedOutline(processedCorners, this._cornerRadius, this._cornerSegments)
    this.buildPolygonMesh()
    this.buildBorderMesh(this._borderSize)
  }

  private generateFilletedOutline(corners: PolygonVertex[], radius: number, segments: number): PolygonVertex[] {
    const n = corners.length
    if (n < 3) return corners
    if (radius <= 0.001 || segments < 1) return [...corners]

    const result: PolygonVertex[] = []

    for (let i = 0; i < n; i++) {
      const prev = corners[(i - 1 + n) % n]
      const curr = corners[i]
      const next = corners[(i + 1) % n]

      const vPrevX = prev.x - curr.x
      const vPrevY = prev.y - curr.y
      const lenPrev = Math.sqrt(vPrevX * vPrevX + vPrevY * vPrevY) || 1
      const uPrevX = vPrevX / lenPrev
      const uPrevY = vPrevY / lenPrev

      const vNextX = next.x - curr.x
      const vNextY = next.y - curr.y
      const lenNext = Math.sqrt(vNextX * vNextX + vNextY * vNextY) || 1
      const uNextX = vNextX / lenNext
      const uNextY = vNextY / lenNext

      const dot = Math.max(-1, Math.min(1, uPrevX * uNextX + uPrevY * uNextY))
      const interiorAngle = Math.acos(dot)

      if (interiorAngle < 0.05 || interiorAngle > Math.PI - 0.05) {
        result.push(curr)
        continue
      }

      const maxTangentDist = Math.min(lenPrev, lenNext) * 0.48
      const halfAngle = interiorAngle / 2
      const idealTangentDist = radius / Math.tan(halfAngle)
      const tangentDist = Math.min(idealTangentDist, maxTangentDist)
      const effectiveRadius = tangentDist * Math.tan(halfAngle)

      const t1x = curr.x + uPrevX * tangentDist
      const t1y = curr.y + uPrevY * tangentDist
      const t2x = curr.x + uNextX * tangentDist
      const t2y = curr.y + uNextY * tangentDist

      const bisectorX = uPrevX + uNextX
      const bisectorY = uPrevY + uNextY
      const bisectorLen = Math.sqrt(bisectorX * bisectorX + bisectorY * bisectorY) || 1
      const uBisectorX = bisectorX / bisectorLen
      const uBisectorY = bisectorY / bisectorLen

      const centerDist = effectiveRadius / Math.sin(halfAngle)
      const centerX = curr.x + uBisectorX * centerDist
      const centerY = curr.y + uBisectorY * centerDist

      const startAngle = Math.atan2(t1y - centerY, t1x - centerX)
      let endAngle = Math.atan2(t2y - centerY, t2x - centerX)

      const cross = uPrevX * uNextY - uPrevY * uNextX
      if (cross > 0) {
        if (endAngle > startAngle) endAngle -= 2 * Math.PI
      } else {
        if (endAngle < startAngle) endAngle += 2 * Math.PI
      }

      for (let s = 0; s <= segments; s++) {
        const t = s / segments
        const angle = startAngle + (endAngle - startAngle) * t
        result.push({
          x: centerX + Math.cos(angle) * effectiveRadius,
          y: centerY + Math.sin(angle) * effectiveRadius,
        })
      }
    }

    return result
  }

  private buildPolygonMesh(): void {
    const builder = new MeshBuilder([
      { name: "position", components: 3 },
      { name: "normal", components: 3 },
      { name: "texture0", components: 2 },
    ])

    builder.topology = MeshTopology.Triangles
    builder.indexType = MeshIndexType.UInt16

    const numVerts = this._filletedVertices.length
    if (numVerts < 3) return

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
    let centerX = 0, centerY = 0

    for (const v of this._filletedVertices) {
      minX = Math.min(minX, v.x)
      maxX = Math.max(maxX, v.x)
      minY = Math.min(minY, v.y)
      maxY = Math.max(maxY, v.y)
      centerX += v.x
      centerY += v.y
    }
    centerX /= numVerts
    centerY /= numVerts

    const width = maxX - minX || 1
    const height = maxY - minY || 1

    const vertexData: number[] = []
    const centerU = (centerX - minX) / width
    const centerV = (centerY - minY) / height
    vertexData.push(centerX, centerY, 0, 0, 0, 1, centerU, centerV)

    for (let i = 0; i < numVerts; i++) {
      const v = this._filletedVertices[i]
      const u = (v.x - minX) / width
      const vUV = (v.y - minY) / height
      vertexData.push(v.x, v.y, 0, 0, 0, 1, u, vUV)
    }

    const indices: number[] = []
    for (let i = 0; i < numVerts; i++) {
      const currIdx = i + 1
      const nextIdx = (i + 1) % numVerts + 1

      indices.push(0, currIdx, nextIdx)
      indices.push(0, nextIdx, currIdx)
    }

    builder.appendIndices(indices)
    builder.appendVerticesInterleaved(vertexData)

    if (builder.isValid()) {
      builder.updateMesh()
      this._mesh = builder.getMesh()
      this._rmv.mesh = this._mesh

      const minBounds = new vec3(minX, minY, -0.1)
      const maxBounds = new vec3(maxX, maxY, 0.1)
      if (this._rmv.mainPass) {
        this._rmv.mainPass.frustumCullMin = minBounds
        this._rmv.mainPass.frustumCullMax = maxBounds
      }
    }
  }

  private buildBorderMesh(borderWidth: number): void {
    const builder = new MeshBuilder([
      { name: "position", components: 3 },
      { name: "normal", components: 3 },
      { name: "texture0", components: 2 },
    ])

    builder.topology = MeshTopology.Triangles
    builder.indexType = MeshIndexType.UInt16

    const numVerts = this._filletedVertices.length
    if (numVerts < 3) return

    let centerX = 0, centerY = 0
    for (const v of this._filletedVertices) {
      centerX += v.x
      centerY += v.y
    }
    centerX /= numVerts
    centerY /= numVerts

    const outerVerts: PolygonVertex[] = []
    const innerVerts: PolygonVertex[] = []

    for (let i = 0; i < numVerts; i++) {
      const prev = this._filletedVertices[(i - 1 + numVerts) % numVerts]
      const curr = this._filletedVertices[i]
      const next = this._filletedVertices[(i + 1) % numVerts]

      const e1x = curr.x - prev.x
      const e1y = curr.y - prev.y
      const e2x = next.x - curr.x
      const e2y = next.y - curr.y

      const n1x = -e1y, n1y = e1x
      const n2x = -e2y, n2y = e2x

      let nx = n1x + n2x
      let ny = n1y + n2y
      const len = Math.sqrt(nx * nx + ny * ny) || 1
      nx /= len
      ny /= len

      const toCenterX = curr.x - centerX
      const toCenterY = curr.y - centerY
      if (nx * toCenterX + ny * toCenterY < 0) {
        nx = -nx
        ny = -ny
      }

      outerVerts.push({ x: curr.x + nx * (borderWidth * 0.5), y: curr.y + ny * (borderWidth * 0.5) })
      innerVerts.push({ x: curr.x - nx * (borderWidth * 0.5), y: curr.y - ny * (borderWidth * 0.5) })
    }

    const borderVertexData: number[] = []
    for (let i = 0; i < numVerts; i++) {
      const u = i / numVerts
      borderVertexData.push(outerVerts[i].x, outerVerts[i].y, 0.01, 0, 0, 1, u, 0)
      borderVertexData.push(innerVerts[i].x, innerVerts[i].y, 0.01, 0, 0, 1, u, 1)
    }

    const indices: number[] = []
    for (let i = 0; i < numVerts; i++) {
      const nextIdx = (i + 1) % numVerts

      const oCurr = i * 2
      const iCurr = i * 2 + 1
      const oNext = nextIdx * 2
      const iNext = nextIdx * 2 + 1

      indices.push(oCurr, iCurr, oNext)
      indices.push(iCurr, iNext, oNext)
      indices.push(oCurr, oNext, iCurr)
      indices.push(iCurr, oNext, iNext)
    }

    builder.appendIndices(indices)
    builder.appendVerticesInterleaved(borderVertexData)

    if (builder.isValid()) {
      builder.updateMesh()
      this._borderMesh = builder.getMesh()
      this._borderRmv.mesh = this._borderMesh
    }
  }
}

/**
 * PolygonalButton Component
 * Extends SpectaclesUIKit BaseButton for irregular polygonal buttons with customizable edge lengths,
 * interior angles, corner rounding (filleting), highlight/select colors, and SIK pinch integration.
 */
@component
export class PolygonalButton extends BaseButton {
  @ui.label('<span style="color: #60A5FA; font-weight: bold; font-size: 13px;">PolygonalButton (SIK / UIKit)</span><br/><span style="color: #94A3B8; font-size: 11px;">Custom edge geometry, angles, corner roundness, and state colors.</span>')
  @ui.separator

  @ui.separator

  @input("int", "0")
  @widget(
    new ComboBoxWidget([
      new ComboBoxItem("Default Irregular Pentagon", 0),
      new ComboBoxItem("Sci-Fi Chevron / Arrow", 1),
      new ComboBoxItem("Futuristic Trapezoid", 2),
      new ComboBoxItem("Asymmetric Quad", 3),
      new ComboBoxItem("Hexagon", 4),
      new ComboBoxItem("Custom Corner Points Array", 5),
    ])
  )
  @hint("Choose a pre-built geometry or use custom coordinates")
  shapePreset: number = 0

  /**
   * Custom Corner Points (X, Y)
   * 
   * Coordinate System:
   * (0,0) represents the center of the button.
   * X and Y values determine the shape's proportions in 2D space.
   * 
   * Mapping & Normalization:
   * - When 'Fit To Size' is TRUE (Default), these coordinates only define the RELATIVE SHAPE. 
   *   The final mesh is automatically scaled and stretched to perfectly fit the Button's target Size (e.g., 4x4 cm).
   * - When 'Fit To Size' is FALSE, these act as EXACT absolute measurements in local space, ignoring the button bounds.
   * 
   * Order: Provide points in a counter-clockwise sequence around the center.
   */
  @input("vec2[]")
  @showIf("shapePreset", 5)
  @hint("Defines polygon shape (X, Y). Auto-scales to Button Size if 'Fit To Size' is checked.")
  customCorners: vec2[] = [
    new vec2(-2.0, -1.2),
    new vec2(2.2, -0.9),
    new vec2(1.8, 0.8),
    new vec2(0.8, 1.8),
    new vec2(-1.4, 1.4),
  ]

  @ui.separator
  @ui.label('<span style="color: #38BDF8; font-weight: bold;">Geometry & Scaling Controls</span>')

  @input("int", "0")
  @widget(
    new ComboBoxWidget([
      new ComboBoxItem("Scale Pop (Size)", 0),
      new ComboBoxItem("Position Pop (Z-Axis)", 1),
      new ComboBoxItem("Both (Scale & Position)", 2),
      new ComboBoxItem("None", 3),
    ])
  )
  @hint("Determines how the button visually responds to hover and triggers")
  animationType: AnimationType = AnimationType.Scale

  @input("float", "1.0")
  @hint("How far the button translates on the local Z-axis on hover/trigger (cm)")
  popDistance: number = 1.0

  @input("boolean", "true")
  @hint("When true, normalizes polygon outline to match the Button's Size and Polygon Scale")
  fitToSize: boolean = true

  @input("vec2", "{1.0, 1.0}")
  @hint("Scale multiplier (X, Y) for the polygon outline")
  polygonScale: vec2 = new vec2(1.0, 1.0)

  @input("float", "0.25")
  @hint("Radius in cm for rounded corners (0 = sharp corners)")
  cornerRadius: number = 0.25

  @input("int", "6")
  @hint("Subdivision smoothness per rounded corner arc")
  cornerSegments: number = 6

  @input("float", "0.15")
  @hint("Border stroke ribbon width in cm")
  borderWidth: number = 0.15

  @ui.separator
  @ui.label('<span style="color: #34D399; font-weight: bold;">Interactive State Colors</span>')

  @input("vec4", "{0.12, 0.14, 0.20, 0.95}")
  @widget(new ColorWidget())
  defaultColor: vec4 = new vec4(0.12, 0.14, 0.20, 0.95)

  @input("vec4", "{0.35, 0.55, 0.85, 1.0}")
  @widget(new ColorWidget())
  borderColor: vec4 = new vec4(0.35, 0.55, 0.85, 1.0)

  @ui.separator
  @input("vec4", "{0.18, 0.50, 0.90, 0.98}")
  @widget(new ColorWidget())
  highlightColor: vec4 = new vec4(0.18, 0.50, 0.90, 0.98)

  @input("vec4", "{0.45, 0.65, 0.95, 1.0}")
  @widget(new ColorWidget())
  borderHighlightColor: vec4 = new vec4(0.45, 0.65, 0.95, 1.0)

  @ui.separator
  @input("vec4", "{0.95, 0.35, 0.15, 1.0}")
  @widget(new ColorWidget())
  selectColor: vec4 = new vec4(0.95, 0.35, 0.15, 1.0)

  @input("vec4", "{1.0, 0.5, 0.2, 1.0}")
  @widget(new ColorWidget())
  borderSelectColor: vec4 = new vec4(1.0, 0.5, 0.2, 1.0)

  @ui.separator
  @input("vec4", "{0.10, 0.85, 0.45, 1.0}")
  @widget(new ColorWidget())
  @hint("Color when the button is in a toggled (active) state")
  toggledColor: vec4 = new vec4(0.10, 0.85, 0.45, 1.0)

  @input("vec4", "{0.20, 1.0, 0.60, 1.0}")
  @widget(new ColorWidget())
  @hint("Border color when the button is in a toggled (active) state")
  borderToggledColor: vec4 = new vec4(0.20, 1.0, 0.60, 1.0)

  @ui.separator
  @input("vec4", "{0.25, 0.95, 0.65, 1.0}")
  @widget(new ColorWidget())
  @hint("Color when the button is toggled AND hovered")
  toggledHighlightColor: vec4 = new vec4(0.25, 0.95, 0.65, 1.0)

  @input("vec4", "{0.35, 1.0, 0.75, 1.0}")
  @widget(new ColorWidget())
  @hint("Border color when the button is toggled AND hovered")
  borderToggledHighlightColor: vec4 = new vec4(0.35, 1.0, 0.75, 1.0)

  @ui.separator
  @input("vec4", "{0.3, 0.3, 0.3, 0.5}")
  @widget(new ColorWidget())
  disabledColor: vec4 = new vec4(0.3, 0.3, 0.3, 0.5)

  @input("vec4", "{0.3, 0.3, 0.3, 0.5}")
  @widget(new ColorWidget())
  borderDisabledColor: vec4 = new vec4(0.3, 0.3, 0.3, 0.5)

  @ui.separator
  @ui.label('<span style="color: #F472B6; font-weight: bold;">Textures & Materials</span>')

  @input
  @allowUndefined
  @hint("Optional custom material asset for polygon rendering")
  customMaterial: Material

  @input("float", "1.0")
  @widget(new SliderWidget(0.0, 1.0, 0.01))
  @hint("Global Opacity (Alpha) multiplier for the button and all child text/images")
  buttonOpacity: number = 1.0

  @input("boolean", "false")
  useTextures: boolean = false

  @input
  @showIf("useTextures")
  @allowUndefined
  @hint("Optional texture for the main button body")
  buttonTexture: Texture

  @input
  @showIf("useTextures")
  @allowUndefined
  @hint("Optional texture for the border ribbon")
  borderTexture: Texture

  @ui.separator
  @ui.label('<span style="color: #60A5FA; font-weight: bold;">Configure Interactable</span>')
  
  @input
  @hint(
    "Defines how Interactors can target and interact with this Interactable. Options include:\n\
- Direct: Only allows close pinch interactions where a hand directly touches the Interactable.\n\
- Indirect: Allows interactions from a distance with raycasting.\n\
- Direct/Indirect: Supports both direct and indirect interaction methods.\n\
- Poke: Enables finger poking interactions.\n\
- All: Supports all targeting modes (Direct, Indirect, and Poke)."
  )
  @widget(
    new ComboBoxWidget([
      new ComboBoxItem("Direct", 1),
      new ComboBoxItem("Indirect", 2),
      new ComboBoxItem("Direct/Indirect", 3),
      new ComboBoxItem("Poke", 4),
      new ComboBoxItem("All", 7)
    ])
  )
  targetingMode: number = 7;

  @input
  @hint(
    "Sets the preferred targeting visual. (Requires the V2 Cursor to be enabled on InteractorCursors).\n\n\
- 0: None\n\
- 1: Cursor (default)\n\
- 2: Ray"
  )
  @widget(new ComboBoxWidget([new ComboBoxItem("None", 0), new ComboBoxItem("Cursor", 1), new ComboBoxItem("Ray", 2)]))
  targetingVisual: number = 1;

  @input
  @hint(
    "When enabled, this Interactable ignores any parent InteractionPlane and factors into the cursor's position and \
targetingVisual. Use when the Interactable is parented for organization but not spatially within that plane."
  )
  ignoreInteractionPlane: boolean = false;

  @input
  @hint(
    "Defines the singular source of truth for feedback + UI + cursor components to poll to check \
if the Interactable should exhibit sticky behavior during trigger \
(cursor locks on Interactable, remains in active visual state even after de-hovering)."
  )
  keepHoverOnTrigger: boolean = false;

  @input
  @hint(
    "Enable this to allow the Interactable to instantly be dragged on trigger rather than obeying the Interactor's \
drag threshold."
  )
  enableInstantDrag: boolean = false;

  @input
  @hint(
    "A flag that enables scroll interactions when this element is interacted with. When true, interactions with this \
element can scroll a parent ScrollView that has content extending beyond its visible bounds."
  )
  isScrollable: boolean = false;

  @input
  @hint(
    "Determines whether this Interactable can be simultaneously controlled by multiple Interactors. When false, only \
one Interactor type (e.g., left hand or right hand) can interact with this Interactable at a time, and subsequent \
interaction attempts from different Interactors will be blocked. Set to true to enable interactions from multiple \
sources simultaneously, such as allowing both hands to manipulate the Interactable at once."
  )
  allowMultipleInteractors: boolean = true;

  @input
  @hint("Enable Poke Directionality to help prevent accidental interactions when users approach from unwanted angles.")
  enablePokeDirectionality: boolean = false;

  @input
  @label("X")
  @showIf("enablePokeDirectionality")
  @hint(
    "Controls from which directions a poke interaction can trigger this Interactable along the X-axis:\n\
- Left: Finger must approach from -X direction.\n\
- Right: Finger must approach from +X direction.\n\
- All: Accepts both directions.\n\
- None: Disables X-axis poke detection."
  )
  @widget(
    new ComboBoxWidget([
      new ComboBoxItem("None", 0),
      new ComboBoxItem("Right", 1),
      new ComboBoxItem("Left", 2),
      new ComboBoxItem("All", 3)
    ])
  )
  acceptableXDirections: number = 0

  @input
  @label("Y")
  @showIf("enablePokeDirectionality")
  @hint(
    "Controls from which directions a poke interaction can trigger this Interactable along the Y-axis:\n\
- Top: Finger must approach from +Y direction.\n\
- Bottom: Finger must approach from -Y direction.\n\
- All: Accepts both directions.\n\
- None: Disables Y-axis poke detection."
  )
  @widget(
    new ComboBoxWidget([
      new ComboBoxItem("None", 0),
      new ComboBoxItem("Top", 1),
      new ComboBoxItem("Bottom", 2),
      new ComboBoxItem("All", 3)
    ])
  )
  acceptableYDirections: number = 0

  @input
  @label("Z")
  @showIf("enablePokeDirectionality")
  @hint(
    "Controls from which directions a poke interaction can trigger this Interactable along the Z-axis:\n\
- Front: Finger must approach from +Z direction.\n\
- Back: Finger must approach from -Z direction.\n\
- All: Accepts both directions.\n\
- None: Disables Z-axis poke detection."
  )
  @widget(
    new ComboBoxWidget([
      new ComboBoxItem("None", 0),
      new ComboBoxItem("Front", 1),
      new ComboBoxItem("Back", 2),
      new ComboBoxItem("All", 3)
    ])
  )
  acceptableZDirections: number = 1

  @input
  @hint(
    "Determines if the Interactable should listen to filtered pinch events when targeted by a HandInteractor. \
Filtered pinch events are more stable when the hand is quickly moving but may add latency in non-moving cases. \
Most interactions should use raw pinch events by default. \
Spatial interactions with large hand movement (such as dragging, scrolling) should use filtered pinch events. \
If an Interactable has a parent Interactable that uses filtered pinch events, \
the Interactable will also use filtered pinch events."
  )
  useFilteredPinch: boolean = false



  private _polyVisual: PolygonalButtonVisual = null

  public getCornersForPreset(): PolygonVertex[] {
    switch (this.shapePreset) {
      case ShapePreset.SciFiChevron:
        return [
          { x: -2.5, y: -1.2 },
          { x: 1.2, y: -1.2 },
          { x: 2.6, y: 0.0 },
          { x: 1.2, y: 1.2 },
          { x: -2.5, y: 1.2 },
          { x: -1.5, y: 0.0 },
        ]

      case ShapePreset.FuturisticTrapezoid:
        return [
          { x: -2.5, y: -1.2 },
          { x: 2.5, y: -1.2 },
          { x: 1.7, y: 1.2 },
          { x: -1.7, y: 1.2 },
        ]

      case ShapePreset.AsymmetricQuad:
        return [
          { x: -2.4, y: -1.3 },
          { x: 2.5, y: -0.8 },
          { x: 1.6, y: 1.4 },
          { x: -2.0, y: 0.9 },
        ]

      case ShapePreset.Hexagon:
        return [
          { x: -2.4, y: 0.0 },
          { x: -1.4, y: -1.3 },
          { x: 1.4, y: -1.3 },
          { x: 2.4, y: 0.0 },
          { x: 1.4, y: 1.3 },
          { x: -1.4, y: 1.3 },
        ]

      case ShapePreset.Custom:
        if (this.customCorners && this.customCorners.length >= 3) {
          return this.customCorners.map((v) => ({ x: v.x, y: v.y }))
        }
        return [
          { x: -2.0, y: -1.2 },
          { x: 2.2, y: -0.9 },
          { x: 1.8, y: 0.8 },
          { x: 0.8, y: 1.8 },
          { x: -1.4, y: 1.4 },
        ]

      case ShapePreset.DefaultIrregularPentagon:
      default:
        return [
          { x: -2.0, y: -1.2 },
          { x: 2.2, y: -0.9 },
          { x: 1.8, y: 0.8 },
          { x: 0.8, y: 1.8 },
          { x: -1.4, y: 1.4 },
        ]
    }
  }

  protected createDefaultVisual(): void {
    if (!this._visual) {
      const corners = this.getCornersForPreset()

      this._polyVisual = new PolygonalButtonVisual({
        sceneObject: this.sceneObject,
        vertices: corners,
        cornerRadius: this.cornerRadius,
        cornerSegments: this.cornerSegments,
        borderWidth: this.borderWidth,
        fitToSize: this.fitToSize,
        polygonScale: this.polygonScale,
        targetSize: this.size || new vec3(4.0, 4.0, 4.0),
        customMaterial: this.customMaterial,
        defaultColor: this.defaultColor,
        hoveredColor: this.highlightColor,
        triggeredColor: this.selectColor,
        toggledColor: this.toggledColor,
        toggledHoveredColor: this.toggledHighlightColor,
        disabledColor: this.disabledColor,
        borderColor: this.borderColor,
        borderHoveredColor: this.borderHighlightColor,
        borderTriggeredColor: this.borderSelectColor,
        borderToggledColor: this.borderToggledColor,
        borderToggledHoveredColor: this.borderToggledHighlightColor,
        borderDisabledColor: this.borderDisabledColor,
        useTextures: this.useTextures,
        buttonTexture: this.buttonTexture,
        borderTexture: this.borderTexture,
        opacity: this.buttonOpacity,
        animationType: this.animationType,
        popDistance: this.popDistance,
      })

      this._visual = this._polyVisual
    }
  }

  onAwake() {
      super.onAwake()
      this.createEvent("LateUpdateEvent").bind(() => {
          if (this.opacity !== this.buttonOpacity) {
              this.opacity = this.buttonOpacity
          }
      })
      
      // Delay interaction config slightly to ensure Element.ts finishes its initialize() first
      this.createEvent("OnStartEvent").bind(() => {
          if (this._polyVisual) {
              this._polyVisual.syncChildrenToContainer()
          }
          const interactable = this.sceneObject.getComponent(Interactable.getTypeName()) as Interactable;
          if (interactable) {
              interactable.targetingMode = this.targetingMode;
              interactable.targetingVisual = this.targetingVisual;
              interactable.ignoreInteractionPlane = this.ignoreInteractionPlane;
              interactable.keepHoverOnTrigger = this.keepHoverOnTrigger;
              interactable.enableInstantDrag = this.enableInstantDrag;
              interactable.isScrollable = this.isScrollable;
              interactable.allowMultipleInteractors = this.allowMultipleInteractors;
              interactable.enablePokeDirectionality = this.enablePokeDirectionality;
              interactable.acceptableXDirections = this.acceptableXDirections;
              interactable.acceptableYDirections = this.acceptableYDirections;
              interactable.acceptableZDirections = this.acceptableZDirections;
              interactable.useFilteredPinch = this.useFilteredPinch;
          }
      })
  }

  private _isSettingToggleState: boolean = false

  public override setState(stateName: StateName): void {
    print(`[PolygonalButton: ${this.getSceneObject().name}] setState -> '${stateName}' (current isOn: ${this._isOn})`)
    super.setState(stateName)
  }

  protected override setOn(on: boolean, explicit: boolean): void {
    print(`[PolygonalButton: ${this.getSceneObject().name}] setOn -> on: ${on}, explicit: ${explicit}`)
    super.setOn(on, explicit)
    if (this.initialized && !this._isSettingToggleState) {
      this._isSettingToggleState = true
      try {
        this.setState(on ? StateName.toggledDefault : StateName.default)
      } finally {
        this._isSettingToggleState = false
      }
    }
  }

  // ==========================================
  // PUBLIC API FOR SCRIPTS
  // ==========================================

  /** Gets or sets the overall opacity (alpha) of the button body and border. Range 0 to 1. */
  public get opacity(): number { return this._polyVisual ? this._polyVisual.opacity : this.buttonOpacity }
  public set opacity(value: number) { 
    this.buttonOpacity = value
    if (this._polyVisual) this._polyVisual.opacity = value 
  }

  /** Alias for opacity getter/setter matching the Inspector input name. */
  public get getButtonOpacity(): number { return this.opacity }
  public set setButtonOpacity(value: number) { this.opacity = value }

  /** Gets or sets the animation style (Scale, Position, Both, None). */
  public get getAnimationType(): AnimationType { return this.animationType }
  public set setAnimationType(value: AnimationType) { 
    this.animationType = value
    if (this._polyVisual) this._polyVisual.animationType = value 
  }

  /** Gets or sets the distance in cm the button pops on the Z axis during hover/trigger. */
  public get getPopDistance(): number { return this.popDistance }
  public set setPopDistance(value: number) {
    this.popDistance = value
    if (this._polyVisual) this._polyVisual.popDistance = value
  }

  /** Gets or sets the base background color for the Default state. */
  public get getDefaultColor(): vec4 { return this.defaultColor }
  public set setDefaultColor(value: vec4) { 
    this.defaultColor = value
    if (this._polyVisual) this._polyVisual.defaultColor = value 
  }

  /** Gets or sets the border color for the Default state. */
  public get getBorderColor(): vec4 { return this.borderColor }
  public set setBorderColor(value: vec4) {
    this.borderColor = value
    if (this._polyVisual) this._polyVisual.borderColor = value
  }

  // ----- Hover State -----

  /** Gets or sets the body background color for the Hover (highlighted) state. */
  public get getHighlightColor(): vec4 { return this.highlightColor }
  public set setHighlightColor(value: vec4) {
    this.highlightColor = value
    if (this._polyVisual) (this._polyVisual as any)._hoveredColor = value
  }

  /** Gets or sets the border color for the Hover state. */
  public get getBorderHighlightColor(): vec4 { return this.borderHighlightColor }
  public set setBorderHighlightColor(value: vec4) {
    this.borderHighlightColor = value
    if (this._polyVisual) (this._polyVisual as any)._borderHoveredColor = value
  }

  // ----- Select / Triggered State -----

  /** Gets or sets the body background color for the Select (triggered/pushed) state. */
  public get getSelectColor(): vec4 { return this.selectColor }
  public set setSelectColor(value: vec4) {
    this.selectColor = value
    if (this._polyVisual) (this._polyVisual as any)._triggeredColor = value
  }

  /** Gets or sets the border color for the Select (triggered) state. */
  public get getBorderSelectColor(): vec4 { return this.borderSelectColor }
  public set setBorderSelectColor(value: vec4) {
    this.borderSelectColor = value
    if (this._polyVisual) (this._polyVisual as any)._borderTriggeredColor = value
  }

  // ----- Toggled State -----

  /** Gets or sets the body background color for the Toggled (active) state. */
  public get getToggledColor(): vec4 { return this.toggledColor }
  public set setToggledColor(value: vec4) {
    this.toggledColor = value
    if (this._polyVisual) (this._polyVisual as any)._toggledDefaultColor = value
  }

  /** Gets or sets the border color for the Toggled state. */
  public get getBorderToggledColor(): vec4 { return this.borderToggledColor }
  public set setBorderToggledColor(value: vec4) {
    this.borderToggledColor = value
    if (this._polyVisual) (this._polyVisual as any)._borderToggledColor = value
  }

  // ----- Toggled Hover State -----

  /** Gets or sets the body background color for the Toggled + Hover state. */
  public get getToggledHighlightColor(): vec4 { return this.toggledHighlightColor }
  public set setToggledHighlightColor(value: vec4) {
    this.toggledHighlightColor = value
    if (this._polyVisual) (this._polyVisual as any)._toggledHoveredColor = value
  }

  /** Gets or sets the border color for the Toggled + Hover state. */
  public get getBorderToggledHighlightColor(): vec4 { return this.borderToggledHighlightColor }
  public set setBorderToggledHighlightColor(value: vec4) {
    this.borderToggledHighlightColor = value
    if (this._polyVisual) (this._polyVisual as any)._borderToggledHoveredColor = value
  }

  // ----- Disabled State -----

  /** Gets or sets the body background color for the Disabled (inactive) state. */
  public get getDisabledColor(): vec4 { return this.disabledColor }
  public set setDisabledColor(value: vec4) {
    this.disabledColor = value
    if (this._polyVisual) (this._polyVisual as any)._disabledColor = value
  }

  /** Gets or sets the border color for the Disabled state. */
  public get getBorderDisabledColor(): vec4 { return this.borderDisabledColor }
  public set setBorderDisabledColor(value: vec4) {
    this.borderDisabledColor = value
    if (this._polyVisual) (this._polyVisual as any)._borderDisabledColor = value
  }

  /**
   * Runtime Scripting API: Scale the polygonal button geometry
   */
  public setPolygonScale(scale: vec2 | number): void {
    if (typeof scale === "number") {
      this.polygonScale = new vec2(scale, scale)
    } else {
      this.polygonScale = scale
    }
    if (this._polyVisual) {
      this._polyVisual.polygonScale = this.polygonScale
    }
  }

  /**
   * Runtime Scripting API: Set custom polygon corners and rebuild
   */
  public setCustomCorners(corners: (PolygonVertex | vec2)[]): void {
    this.customCorners = corners.map((c) => (c instanceof vec2 ? c : new vec2(c.x, c.y)))
    this.shapePreset = ShapePreset.Custom
    if (this._polyVisual) {
      this._polyVisual.setCorners(
        this.customCorners.map((v) => ({ x: v.x, y: v.y })),
        this.cornerRadius,
        this.cornerSegments,
        this.borderWidth,
        this.polygonScale
      )
    }
  }

  /**
   * Runtime Scripting API: Switch preset
   */
  public setShapePreset(preset: ShapePreset): void {
    this.shapePreset = preset
    if (this._polyVisual) {
      const corners = this.getCornersForPreset()
      this._polyVisual.setCorners(corners, this.cornerRadius, this.cornerSegments, this.borderWidth, this.polygonScale)
    }
  }
}
