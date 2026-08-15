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
/**
 * UniversalCameraFollowerTS.ts
 * Best of Three Worlds: CameraFollower + TetherTS + TetherBetweenAngleRangeTS
 * 
 * Combines:
 * 1. CameraFollower.js: Local XYZ position offsets, Euler rotation offsets, lockY, alignToWorldUp.
 * 2. TetherTS.ts: Linear horizontal/vertical distance thresholds & smooth lerping.
 * 3. TetherBetweenAngleRangeTS.ts: Angular deadzone cone (angleThreshold) for natural AR viewing.
 */

import { bindStartEvent, bindUpdateEvent } from "SnapDecorators.lspkg/decorators"
import { Logger } from "Utilities.lspkg/Scripts/Utils/Logger"

export enum FollowMode {
    AngleAndDistanceDeadzone = "Angle & Distance Deadzone",
    ContinuousLerp = "Continuous Lerp",
    AngleThresholdOnly = "Angle Threshold Only",
    DistanceThresholdOnly = "Distance Threshold Only"
}

@component
export class UniversalCameraFollowerTS extends BaseScriptComponent {
    @ui.label('<span style="color: #38BDF8; font-weight: bold; font-size: 13px;">Universal Camera Follower</span><br/><span style="color: #94A3B8; font-size: 11px;">Multipurpose spatial follower combining CameraFollower + Tether + Angle Range.</span>')
    @ui.separator

    @ui.label('<span style="color: #38BDF8;">Target & Mode</span>')
    @ui.group_start("Target & Mode")
    @input
    @allowUndefined
    @hint("Target camera or SceneObject to follow (defaults to World Camera)")
    targetCamera: Camera

    @input
    @hint("Follow mode trigger behavior")
    @widget(
        new ComboBoxWidget([
            new ComboBoxItem("Angle & Distance Deadzone", "Angle & Distance Deadzone"),
            new ComboBoxItem("Continuous Lerp", "Continuous Lerp"),
            new ComboBoxItem("Angle Threshold Only", "Angle Threshold Only"),
            new ComboBoxItem("Distance Threshold Only", "Distance Threshold Only")
        ])
    )
    followMode: string = "Angle & Distance Deadzone"
    @ui.group_end

    @ui.separator
    @ui.label('<span style="color: #38BDF8;">Position & Rotation Offsets</span>')
    @ui.group_start("Offsets")
    @input
    @hint("Distance in cm directly in front of target view (default: 80 cm)")
    offsetDistance: number = 80.0

    @input
    @hint("Local XYZ position shift relative to camera view (in cm)")
    positionOffset: vec3 = new vec3(0, 0, 0)

    @input
    @hint("Rotation offset in Euler degrees (Pitch, Yaw, Roll)")
    rotationOffset: vec3 = new vec3(0, 0, 0)
    @ui.group_end

    @ui.separator
    @ui.label('<span style="color: #38BDF8;">Reposition Deadzone Thresholds</span>')
    @ui.group_start("Deadzone Thresholds")
    @input
    @hint("Angular threshold cone in degrees to trigger catch-up (e.g. 35°)")
    angleThresholdDegrees: number = 35.0

    @input
    @hint("Horizontal distance threshold in cm to trigger catch-up")
    horizontalDistanceThresholdCm: number = 40.0

    @input
    @hint("Vertical distance threshold in cm to trigger catch-up")
    verticalDistanceThresholdCm: number = 30.0
    @ui.group_end

    @ui.separator
    @ui.label('<span style="color: #38BDF8;">Constraints & Orientation</span>')
    @ui.group_start("Constraints")
    @input
    @hint("Keeps object upright aligned to world gravity (prevents tilting on head roll)")
    alignToWorldUp: boolean = true

    @input
    @hint("Flatten Y-axis pitch angle (keeps UI level on horizontal plane)")
    flattenRotation: boolean = true

    @input
    @hint("Lock world Y height to a fixed elevation")
    lockY: boolean = false

    @input
    @hint("Fixed Y elevation position in world space when lockY is enabled")
    lockedY: number = 0.0
    @ui.group_end

    @ui.separator
    @ui.label('<span style="color: #38BDF8;">Motion Smoothing</span>')
    @ui.group_start("Motion Smoothing")
    @input
    @widget(new SliderWidget(0.01, 1.0, 0.01))
    @hint("Position interpolation speed (higher = faster catch-up)")
    positionLerpSpeed: number = 0.12

    @input
    @widget(new SliderWidget(0.01, 1.0, 0.01))
    @hint("Rotation interpolation speed")
    rotationLerpSpeed: number = 0.15

    @input
    enableLogging: boolean = false
    @ui.group_end

    private logger: Logger
    private targetTransform: Transform = null
    private targetDesiredPos: vec3 = new vec3(0, 0, 0)
    private targetDesiredRot: quat = quat.quatIdentity()
    private isRepositioningNeeded: boolean = true

    onAwake(): void {
        this.logger = new Logger("UniversalCameraFollowerTS", this.enableLogging, true)
    }

    @bindStartEvent
    private onStart(): void {
        if (!this.targetCamera) {
            const camComponent = this.getSceneObject().getComponent("Component.Camera") as Camera
            if (camComponent) {
                this.targetCamera = camComponent
            }
        }

        this.snapToDesiredPosition()
    }

    @bindUpdateEvent
    private onUpdate(): void {
        if (!this.targetCamera) return

        const camObj = this.targetCamera.getSceneObject()
        this.targetTransform = camObj.getTransform()

        const computed = this.calculateDesiredPose()
        const currentPos = this.getTransform().getWorldPosition()
        const currentRot = this.getTransform().getWorldRotation()

        if (this.followMode === FollowMode.ContinuousLerp) {
            this.isRepositioningNeeded = true
        } else {
            const angleExceeded = this.checkAngleThreshold(computed.position, computed.rotation)
            const distExceeded = this.checkDistanceThreshold(computed.position)

            if (this.followMode === FollowMode.AngleAndDistanceDeadzone) {
                if (angleExceeded || distExceeded) this.isRepositioningNeeded = true
            } else if (this.followMode === FollowMode.AngleThresholdOnly) {
                if (angleExceeded) this.isRepositioningNeeded = true
            } else if (this.followMode === FollowMode.DistanceThresholdOnly) {
                if (distExceeded) this.isRepositioningNeeded = true
            }

            if (currentPos.distance(this.targetDesiredPos) < 1.0) {
                this.isRepositioningNeeded = false
            }
        }

        if (this.isRepositioningNeeded) {
            this.targetDesiredPos = computed.position
            this.targetDesiredRot = computed.rotation

            const newPos = vec3.lerp(currentPos, this.targetDesiredPos, this.positionLerpSpeed)
            const newRot = quat.slerp(currentRot, this.targetDesiredRot, this.rotationLerpSpeed)

            this.getTransform().setWorldPosition(newPos)
            this.getTransform().setWorldRotation(newRot)
        }
    }

    private calculateDesiredPose(): { position: vec3; rotation: quat } {
        const camPos = this.targetTransform.getWorldPosition()
        const camForward = this.targetTransform.forward.normalize()
        const camUp = this.targetTransform.up.normalize()
        const camRight = this.targetTransform.right.normalize()

        let desiredPos = camPos.add(camForward.uniformScale(this.offsetDistance))

        desiredPos = desiredPos.add(camRight.uniformScale(this.positionOffset.x))
        desiredPos = desiredPos.add(camUp.uniformScale(this.positionOffset.y))
        desiredPos = desiredPos.add(camForward.uniformScale(this.positionOffset.z))

        if (this.lockY) {
            desiredPos.y = this.lockedY
        }

        let lookDir = desiredPos.sub(camPos).normalize()

        if (this.flattenRotation) {
            lookDir.y = 0
            if (lookDir.lengthSquared > 0.0001) {
                lookDir = lookDir.normalize()
            } else {
                lookDir = new vec3(0, 0, -1)
            }
        }

        let upVec = this.alignToWorldUp ? vec3.up() : camUp
        let baseRot = quat.lookAt(lookDir, upVec)

        const radX = (this.rotationOffset.x * Math.PI) / 180.0
        const radY = (this.rotationOffset.y * Math.PI) / 180.0
        const radZ = (this.rotationOffset.z * Math.PI) / 180.0
        const offsetQuat = quat.fromEulerAngles(radX, radY, radZ)

        const finalRot = baseRot.multiply(offsetQuat)

        return { position: desiredPos, rotation: finalRot }
    }

    private checkAngleThreshold(desiredPos: vec3, desiredRot: quat): boolean {
        const currentPos = this.getTransform().getWorldPosition()
        const camPos = this.targetTransform.getWorldPosition()

        const currentDir = currentPos.sub(camPos).normalize()
        const desiredDir = desiredPos.sub(camPos).normalize()

        const dot = Math.max(-1.0, Math.min(1.0, currentDir.dot(desiredDir)))
        const angleRad = Math.acos(dot)
        const angleDeg = (angleRad * 180.0) / Math.PI

        return angleDeg >= this.angleThresholdDegrees
    }

    private checkDistanceThreshold(desiredPos: vec3): boolean {
        const currentPos = this.getTransform().getWorldPosition()
        const dx = Math.abs(currentPos.x - desiredPos.x)
        const dy = Math.abs(currentPos.y - desiredPos.y)
        const dz = Math.abs(currentPos.z - desiredPos.z)
        const horizDist = Math.sqrt(dx * dx + dz * dz)

        return horizDist >= this.horizontalDistanceThresholdCm || dy >= this.verticalDistanceThresholdCm
    }

    public snapToDesiredPosition(): void {
        if (!this.targetCamera) return
        this.targetTransform = this.targetCamera.getSceneObject().getTransform()
        const pose = this.calculateDesiredPose()
        this.getTransform().setWorldPosition(pose.position)
        this.getTransform().setWorldRotation(pose.rotation)
        this.targetDesiredPos = pose.position
        this.targetDesiredRot = pose.rotation
        this.isRepositioningNeeded = false
    }
}
