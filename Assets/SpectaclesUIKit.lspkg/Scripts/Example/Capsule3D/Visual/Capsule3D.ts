/**
 * The `Capsule` class represents a 3D capsule component in the scene. It extends the `BaseScriptComponent`
 * and provides functionality for rendering and customizing the capsule's appearance.
 *
 * @decorator `@component`
 */
@component
export class Capsule3D extends BaseScriptComponent {
  @input("number", "0")
  private _renderOrder: number = 0

  @input("vec2", "{1,1}")
  @hint("Size of Capsule In Local Space Centimeters")
  private _size: vec2

  @input
  @hint("Depth of Capsule In Local Space Centimeters")
  private _depth: number = 1

  @input("vec4", "{.8,.8,.8,1.}")
  @widget(new ColorWidget())
  private _backgroundColor: vec4

  private _initialized: boolean = false

  private static _mesh: RenderMesh = requireAsset("../../../../Meshes/DefaultCapsule.mesh") as RenderMesh
  private static _materialAsset: Material = requireAsset("../../../../Materials/DefaultCapsule.mat") as Material
  private _material: Material
  private _rmv: RenderMeshVisual

  /**
   * Gets the `RenderMeshVisual` instance associated with this capsule.
   *
   * @returns {RenderMeshVisual} The `RenderMeshVisual` instance.
   */
  public get renderMeshVisual(): RenderMeshVisual {
    return this._rmv
  }

  /**
   * The render order of the Capsule 3D.
   */
  public get renderOrder(): number {
    return this._renderOrder
  }

  /**
   * The render order of the Capsule 3D.
   */
  public set renderOrder(value: number) {
    if (value === undefined) {
      return
    }
    this._renderOrder = value
    if (this._initialized) {
      this._rmv.renderOrder = value
    }
  }

  /**
   * Sets the depth of the capsule and updates its local scale accordingly.
   *
   * @param value - The new depth value to set for the capsule.
   */
  public set depth(value: number) {
    if (value === undefined) {
      return
    }
    this._depth = value
    if (this._initialized) {
      const scaleVec = new vec3(this._size.x, this._size.y, this._depth)
      this._material.mainPass.size = scaleVec
    }
  }

  /**
   * get the depth of the capsule and updates its local scale accordingly.
   *
   * @returns value - The new depth value to set for the capsule.
   */
  public get depth() {
    return this._depth
  }

  /**
   * Gets the size of the capsule as a 2D vector.
   *
   * @returns {vec2} The size of the capsule.
   */
  public get size(): vec2 {
    return this._size
  }

  /**
   * Sets the size of the capsule by updating its width and height.
   * Adjusts the local scale of the capsule's transform to reflect the new size.
   *
   * @param value - A `vec2` object representing the new size of the capsule,
   *                where `x` is the width and `y` is the height.
   */
  public set size(value: vec2) {
    if (value === undefined) {
      return
    }
    this._size = value
    if (this._initialized) {
      const scaleVec = new vec3(this._size.x, this._size.y, this._depth)
      this._material.mainPass.size = scaleVec
      if (this.renderMeshVisual.mainPass) {
        this.renderMeshVisual.mainPass.frustumCullMin = scaleVec.add(new vec3(1, 0, 0)).uniformScale(-0.5)
        this.renderMeshVisual.mainPass.frustumCullMax = scaleVec.add(new vec3(1, 0, 0)).uniformScale(0.5)
      }
    }
  }

  /**
   * Gets the background color of the capsule.
   *
   * @returns {vec4} The current background color as a vec4.
   */
  public get backgroundColor(): vec4 {
    return this._backgroundColor
  }

  /**
   * Sets the background color of the capsule.
   *
   * @param value - A `vec4` representing the RGBA color to set as the background color.
   */
  public set backgroundColor(value: vec4) {
    if (value === undefined) {
      return
    }
    this._backgroundColor = value
    if (this._initialized) {
      this._material.mainPass.baseColor = value
    }
  }

  public onAwake() {
    this.createEvent("OnStartEvent").bind(() => {
      this.initialize()
    })
    this.createEvent("OnEnableEvent").bind(() => {
      if (this._initialized) {
        if (!isNull(this._rmv) && this._rmv) {
          this._rmv.enabled = true
        }
      }
    })
    this.createEvent("OnDisableEvent").bind(() => {
      if (this._initialized) {
        if (!isNull(this._rmv) && this._rmv) {
          this._rmv.enabled = false
        }
      }
    })
    this.createEvent("OnDestroyEvent").bind(() => {
      if (!isNull(this._rmv) && this._rmv) {
        this._rmv.destroy()
      }
      this._rmv = null
    })
  }

  /**
   * Initializes the capsule component. This method sets up the mesh, material, size, and background color
   * for the capsule. It ensures that the initialization process is only performed once.
   */
  public initialize(): void {
    if (this._initialized) {
      return
    }

    // setup mesh
    this._rmv = this.sceneObject.createComponent("RenderMeshVisual")
    this._rmv.mesh = Capsule3D._mesh
    if (!this._material) this._material = Capsule3D._materialAsset
    this._material = this._material.clone()
    this._rmv.mainMaterial = this._material
    this._rmv.mainPass.frustumCullMode = FrustumCullMode.UserDefinedAABB

    this._rmv.renderOrder = this._renderOrder

    // Initializing Size and Depth
    const scaleVec = new vec3(this._size.x, this._size.y, this._depth)
    this._material.mainPass.size = scaleVec
    this._rmv.mainPass.frustumCullMin = scaleVec.add(new vec3(1, 0, 0)).uniformScale(-0.5)
    this._rmv.mainPass.frustumCullMax = scaleVec.add(new vec3(1, 0, 0)).uniformScale(0.5)

    // Initializing Background Color
    this._material.mainPass.baseColor = this._backgroundColor
    this._initialized = true
  }

  private resetTargetMaterials() {
    this._rmv.clearMaterials()
    this._rmv.addMaterial(this._material)
  }
}
