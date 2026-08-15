# Spectacles Shader Library

A curated collection of optimized shaders and material presets for Spectacles AR experiences. This package provides performance-optimized effects, utility shaders, and pre-configured materials designed specifically for AR rendering constraints and visual quality requirements.

## Features

- **Performance-Optimized Shaders**: Mobile-first shader implementations for AR devices
- **Material Presets**: Pre-configured materials for common AR use cases
- **Effect Controllers**: Runtime shader parameter animation and control
- **Shader Utilities**: Helper functions for common shader operations
- **PBR Support**: Physically-based rendering materials optimized for Spectacles
- **Custom Effects**: Unique visual effects like rim lighting, fresnel, and holographic materials
- **Dynamic Parameter Control**: Real-time shader property manipulation
- **Blend Mode Support**: Alpha blending, additive, and multiply modes

## Quick Start

Apply a shader library material:

```typescript
@component
export class ShaderExample extends BaseScriptComponent {
  @input renderMesh: RenderMeshVisual;
  @input holographicMaterial: Material;

  onAwake() {
    // Apply holographic shader
    this.renderMesh.mainMaterial = this.holographicMaterial;

    // Animate shader parameters
    const updateEvent = this.createEvent("UpdateEvent");
    let time = 0;
    updateEvent.bind(() => {
      time += getDeltaTime();
      this.holographicMaterial.mainPass.glowIntensity = (Math.sin(time) + 1) * 0.5;
    });
  }
}
```

## Script Highlights

### ShaderManager.ts

Provides comprehensive runtime shader loading and material management system for dynamic material switching across multiple objects. Handles shader compilation process, material instantiation from templates, and parameter binding with type-safe accessors. Includes utilities for querying available shaders from asset library, creating material instances with custom parameters, managing material property updates at runtime, and optimizing shader switching to minimize GPU state changes. Supports material pooling for performance optimization and provides debug logging for shader compilation errors and missing parameter warnings.

### EffectController.ts

Implements sophisticated shader parameter animation and control systems for creating dynamic visual effects with time-based modulation. Supports automated parameter interpolation using linear, ease-in, ease-out, and custom curve-based animations for smooth transitions. Enables event-driven parameter changes triggered by game events, user interactions, or environmental conditions. Provides real-time adjustment of shader properties including color gradients, intensity multipliers, texture coordinate offsets, and blend factors for responsive AR effects that react to scene conditions and user input.

### MaterialPresets.ts

Defines comprehensive library of pre-configured material templates optimized for common AR scenarios including UI overlays with alpha transparency, 3D objects with PBR shading, particle systems with additive blending, and transparent surfaces with depth sorting. Each preset includes optimal render settings for draw order, blend modes for proper compositing, and shader configurations tested for performance on Spectacles hardware. Provides preset categories for different use cases such as holographic effects, glass materials, metallic surfaces, and cartoon shading styles.

## Core API Methods

```typescript
// Material management
loadShader(shaderName: string): Material
applyMaterial(mesh: RenderMeshVisual, material: Material): void
cloneMaterial(source: Material): Material

// Parameter control
setShaderParameter(material: Material, paramName: string, value: any): void
getShaderParameter(material: Material, paramName: string): any
animateParameter(material: Material, paramName: string, from: number, to: number, duration: number): void

// Presets
getMaterialPreset(presetName: string): Material
listAvailablePresets(): string[]

// Pass control
material.mainPass: Pass
pass.baseTex: Texture
pass.baseColor: vec4
```

## Advanced Usage

### Dynamic Material Switcher

Create a system that switches between different shader effects:

```typescript
@component
export class MaterialSwitcher extends BaseScriptComponent {
  @input renderMesh: RenderMeshVisual;
  @input materials: Material[];

  private currentIndex = 0;

  onAwake() {
    // Set initial material
    this.applyMaterial(0);

    // Switch materials on tap
    const tapEvent = this.createEvent("TapEvent");
    tapEvent.bind(() => {
      this.nextMaterial();
    });
  }

  applyMaterial(index: number) {
    if (index < this.materials.length) {
      this.renderMesh.mainMaterial = this.materials[index];
      print(`Applied material: ${index}`);
    }
  }

  nextMaterial() {
    this.currentIndex = (this.currentIndex + 1) % this.materials.length;
    this.applyMaterial(this.currentIndex);
  }
}
```

### Animated Holographic Effect

Create a pulsing holographic material with scanlines:

```typescript
@component
export class HolographicAnimator extends BaseScriptComponent {
  @input renderMesh: RenderMeshVisual;
  @input holographicMat: Material;
  @input pulseSpeed: number = 2.0;
  @input scanlineSpeed: number = 5.0;

  private time: number = 0;

  onAwake() {
    this.renderMesh.mainMaterial = this.holographicMat;

    const updateEvent = this.createEvent("UpdateEvent");
    updateEvent.bind(() => {
      this.updateHologram();
    });
  }

  updateHologram() {
    this.time += getDeltaTime();

    // Pulsing glow effect
    const pulse = (Math.sin(this.time * this.pulseSpeed) + 1) * 0.5;
    const glowIntensity = 0.3 + (pulse * 0.7);

    // Animated scanlines
    const scanlineOffset = (this.time * this.scanlineSpeed) % 1.0;

    // Apply to material
    const mainPass = this.holographicMat.mainPass;
    if (mainPass["glowIntensity"] !== undefined) {
      mainPass["glowIntensity"] = glowIntensity;
    }
    if (mainPass["scanlineOffset"] !== undefined) {
      mainPass["scanlineOffset"] = scanlineOffset;
    }

    // Color shift
    const hue = (this.time * 0.2) % 1.0;
    const color = this.hsvToRgb(hue, 0.8, 1.0);
    mainPass.baseColor = new vec4(color.r, color.g, color.b, 1.0);
  }

  hsvToRgb(h: number, s: number, v: number): {r: number, g: number, b: number} {
    const i = Math.floor(h * 6);
    const f = h * 6 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);

    const rgb = [
      [v, t, p], [q, v, p], [p, v, t],
      [p, q, v], [t, p, v], [v, p, q]
    ][i % 6];

    return {r: rgb[0], g: rgb[1], b: rgb[2]};
  }
}
```

### Material Fade Controller

Smoothly fade materials in and out:

```typescript
@component
export class MaterialFader extends BaseScriptComponent {
  @input renderMesh: RenderMeshVisual;
  @input fadeDuration: number = 1.0;

  private currentAlpha: number = 1.0;
  private targetAlpha: number = 1.0;
  private isFading: boolean = false;

  onAwake() {
    const updateEvent = this.createEvent("UpdateEvent");
    updateEvent.bind(() => {
      if (this.isFading) {
        this.updateFade();
      }
    });
  }

  updateFade() {
    const delta = getDeltaTime() / this.fadeDuration;

    if (this.currentAlpha < this.targetAlpha) {
      this.currentAlpha = Math.min(this.targetAlpha, this.currentAlpha + delta);
    } else {
      this.currentAlpha = Math.max(this.targetAlpha, this.currentAlpha - delta);
    }

    // Apply alpha to material
    const material = this.renderMesh.mainMaterial;
    const baseColor = material.mainPass.baseColor;
    material.mainPass.baseColor = new vec4(baseColor.r, baseColor.g, baseColor.b, this.currentAlpha);

    // Check if fade complete
    if (Math.abs(this.currentAlpha - this.targetAlpha) < 0.01) {
      this.currentAlpha = this.targetAlpha;
      this.isFading = false;
      print(`Fade complete: ${this.currentAlpha}`);
    }
  }

  fadeOut() {
    this.targetAlpha = 0.0;
    this.isFading = true;
    print("Fading out");
  }

  fadeIn() {
    this.targetAlpha = 1.0;
    this.isFading = true;
    print("Fading in");
  }

  setAlpha(alpha: number) {
    this.targetAlpha = Math.max(0, Math.min(1, alpha));
    this.isFading = true;
  }
}
```

### Texture Animation Controller

Animate texture offset for scrolling effects:

```typescript
@component
export class TextureAnimator extends BaseScriptComponent {
  @input renderMesh: RenderMeshVisual;
  @input scrollSpeed: vec2 = new vec2(0.1, 0);
  @input enableAnimation: boolean = true;

  private textureOffset: vec2 = new vec2(0, 0);

  onAwake() {
    const updateEvent = this.createEvent("UpdateEvent");
    updateEvent.bind(() => {
      if (this.enableAnimation) {
        this.animateTexture();
      }
    });
  }

  animateTexture() {
    const deltaTime = getDeltaTime();

    // Update offset
    this.textureOffset.x += this.scrollSpeed.x * deltaTime;
    this.textureOffset.y += this.scrollSpeed.y * deltaTime;

    // Wrap offset to 0-1 range
    this.textureOffset.x = this.textureOffset.x % 1.0;
    this.textureOffset.y = this.textureOffset.y % 1.0;

    // Apply to material
    const material = this.renderMesh.mainMaterial;
    const mainPass = material.mainPass;

    // Set texture transform
    if (mainPass["mainTexOffset"] !== undefined) {
      mainPass["mainTexOffset"] = this.textureOffset;
    }
  }

  setScrollSpeed(speed: vec2) {
    this.scrollSpeed = speed;
  }

  pauseAnimation() {
    this.enableAnimation = false;
  }

  resumeAnimation() {
    this.enableAnimation = true;
  }
}
```

### Color Pulse Effect

Create rhythmic color pulsing on materials:

```typescript
@component
export class ColorPulse extends BaseScriptComponent {
  @input renderMesh: RenderMeshVisual;
  @input color1: vec3 = new vec3(1, 0, 0); // Red
  @input color2: vec3 = new vec3(0, 0, 1); // Blue
  @input pulseFrequency: number = 1.0;

  private time: number = 0;

  onAwake() {
    const updateEvent = this.createEvent("UpdateEvent");
    updateEvent.bind(() => {
      this.updatePulse();
    });
  }

  updatePulse() {
    this.time += getDeltaTime();

    // Calculate pulse value (0 to 1)
    const pulse = (Math.sin(this.time * this.pulseFrequency * Math.PI * 2) + 1) * 0.5;

    // Lerp between colors
    const r = this.color1.x + (this.color2.x - this.color1.x) * pulse;
    const g = this.color1.y + (this.color2.y - this.color1.y) * pulse;
    const b = this.color1.z + (this.color2.z - this.color1.z) * pulse;

    // Apply to material
    const material = this.renderMesh.mainMaterial;
    material.mainPass.baseColor = new vec4(r, g, b, 1.0);
  }

  setColors(c1: vec3, c2: vec3) {
    this.color1 = c1;
    this.color2 = c2;
  }

  setFrequency(freq: number) {
    this.pulseFrequency = freq;
  }
}
```

### Multi-Material Manager

Manage materials across multiple objects:

```typescript
@component
export class MultiMaterialManager extends BaseScriptComponent {
  @input renderMeshes: RenderMeshVisual[];
  @input sharedMaterial: Material;
  @input useInstancing: boolean = true;

  private materialInstances: Material[] = [];

  onAwake() {
    this.setupMaterials();
  }

  setupMaterials() {
    if (this.useInstancing) {
      // Create material instances for each mesh
      this.renderMeshes.forEach((mesh, index) => {
        const instance = this.cloneMaterial(this.sharedMaterial);
        mesh.mainMaterial = instance;
        this.materialInstances.push(instance);
        print(`Created material instance ${index}`);
      });
    } else {
      // Share single material
      this.renderMeshes.forEach(mesh => {
        mesh.mainMaterial = this.sharedMaterial;
      });
      print("Using shared material");
    }
  }

  cloneMaterial(source: Material): Material {
    // Material cloning logic would go here
    // For now, returning source (in real implementation, would create copy)
    return source;
  }

  setColorAll(color: vec4) {
    if (this.useInstancing) {
      this.materialInstances.forEach(mat => {
        mat.mainPass.baseColor = color;
      });
    } else {
      this.sharedMaterial.mainPass.baseColor = color;
    }
  }

  setColorAtIndex(index: number, color: vec4) {
    if (index >= 0 && index < this.materialInstances.length) {
      this.materialInstances[index].mainPass.baseColor = color;
    }
  }

  animateColors() {
    const updateEvent = this.createEvent("UpdateEvent");
    let time = 0;

    updateEvent.bind(() => {
      time += getDeltaTime();

      this.materialInstances.forEach((mat, index) => {
        const offset = index * 0.5;
        const hue = ((time + offset) * 0.2) % 1.0;
        const color = this.hsvToRgb(hue, 1.0, 1.0);
        mat.mainPass.baseColor = new vec4(color.r, color.g, color.b, 1.0);
      });
    });
  }

  hsvToRgb(h: number, s: number, v: number): {r: number, g: number, b: number} {
    const i = Math.floor(h * 6);
    const f = h * 6 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);
    const rgb = [[v, t, p], [q, v, p], [p, v, t], [p, q, v], [t, p, v], [v, p, q]][i % 6];
    return {r: rgb[0], g: rgb[1], b: rgb[2]};
  }
}
```

### Rim Lighting Controller

Add dynamic rim lighting effects:

```typescript
@component
export class RimLightingController extends BaseScriptComponent {
  @input renderMesh: RenderMeshVisual;
  @input rimMaterial: Material;
  @input rimColor: vec3 = new vec3(0, 1, 1); // Cyan
  @input rimPower: number = 3.0;
  @input rimIntensity: number = 1.5;

  onAwake() {
    this.renderMesh.mainMaterial = this.rimMaterial;
    this.updateRimParameters();

    // Animate rim intensity
    const updateEvent = this.createEvent("UpdateEvent");
    let time = 0;

    updateEvent.bind(() => {
      time += getDeltaTime();
      const pulse = (Math.sin(time * 2) + 1) * 0.5;
      const intensity = this.rimIntensity * (0.5 + pulse * 0.5);
      this.setRimIntensity(intensity);
    });
  }

  updateRimParameters() {
    const mainPass = this.rimMaterial.mainPass;

    if (mainPass["rimColor"] !== undefined) {
      mainPass["rimColor"] = new vec4(this.rimColor.x, this.rimColor.y, this.rimColor.z, 1.0);
    }

    if (mainPass["rimPower"] !== undefined) {
      mainPass["rimPower"] = this.rimPower;
    }

    if (mainPass["rimIntensity"] !== undefined) {
      mainPass["rimIntensity"] = this.rimIntensity;
    }
  }

  setRimColor(color: vec3) {
    this.rimColor = color;
    this.updateRimParameters();
  }

  setRimIntensity(intensity: number) {
    const mainPass = this.rimMaterial.mainPass;
    if (mainPass["rimIntensity"] !== undefined) {
      mainPass["rimIntensity"] = intensity;
    }
  }

  setRimPower(power: number) {
    this.rimPower = power;
    this.updateRimParameters();
  }
}
```

## Best Practices

### Shader Performance

Optimize shader usage for best performance:

1. **Material Instancing**: Create material instances when parameters differ per object
2. **Batch Rendering**: Group objects with same material to reduce draw calls
3. **Parameter Updates**: Minimize shader parameter changes per frame
4. **Texture Resolution**: Use appropriate texture sizes for AR viewing distances

### Parameter Animation

Efficient shader animation techniques:

1. **Delta Time**: Always use getDeltaTime() for frame-rate independent animation
2. **Modulo Operations**: Wrap time values to prevent overflow with modulo
3. **Smooth Interpolation**: Use lerp/slerp for smooth parameter transitions
4. **Conditional Updates**: Only update parameters when values actually change

### Material Organization

Best practices for material management:

1. **Naming Conventions**: Use descriptive names for materials and parameters
2. **Preset Library**: Maintain a library of tested material presets
3. **Material Pooling**: Reuse materials instead of creating new ones
4. **Version Control**: Track material changes and shader updates

## Built with 👻 by the Spectacles team

---

[See more packages](https://github.com/specs-devs/packages)




