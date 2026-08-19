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
import { HandInputData } from "SpectaclesInteractionKit.lspkg/Providers/HandInputData/HandInputData"
import TrackedHand from "SpectaclesInteractionKit.lspkg/Providers/HandInputData/TrackedHand"

@component
export class SwordSwipeScroller extends BaseScriptComponent {
    @input
    @hint("Drag the UnifiedPolygonalCarousel, VirtualizedPolygonalCarousel, or ManualPolygonalCarousel script component here")
    carousel: ScriptComponent;

    @input("string", "right")
    @widget(new ComboBoxWidget([
        new ComboBoxItem("Right", "right"),
        new ComboBoxItem("Left", "left")
    ]))
    handType: string = "right";

    @input("float", "15.0")
    @hint("How close (in cm) the hand must be to the carousel radius to engage")
    engageMargin: number = 15.0;

    @input("float", "10.0")
    @hint("Maximum depth (in cm) from the carousel plane before it considers finger 'lifted off'")
    depthMargin: number = 10.0;

    @input("float", "1.0")
    @hint("Multiplier for scroll speed")
    angularSensitivity: number = 1.0;

    @input("boolean", "false")
    @hint("Invert the scrolling direction")
    invertScroll: boolean = false;

    @input
    @allowUndefined
    @hint("Optional Text component for debugging tracking state")
    debugText: Text;

    private handProvider: HandInputData = HandInputData.getInstance();
    private trackedHand: TrackedHand | null = null;
    
    private isSwiping: boolean = false;
    private lastAngle: number = 0;
    
    // Hysteresis parameters
    private swipeHoldTimer: number = 0;
    
    onAwake() {
        this.createEvent("UpdateEvent").bind(() => this.onUpdate());
    }

    private onUpdate() {
        this.trackedHand = this.handType === "right" ? this.handProvider.getHand("right") : this.handProvider.getHand("left");
        
        if (!this.trackedHand || !this.trackedHand.enabled || !this.carousel) {
            this.setDebug("Tracking Lost");
            this.cancelSwipe();
            return;
        }

        const trackPoint = this.trackedHand.indexKnuckle?.position;
        if (!trackPoint) {
            this.setDebug("No Knuckle");
            this.cancelSwipe();
            return;
        }

        const isSword = this.checkSwordFingers(this.trackedHand);

        // Proximity check
        const carouselRoot = (this.carousel as any).carouselRoot || this.carousel.getSceneObject();
        const radius = (this.carousel as any).radius || 30.0;
        const layoutAxis = (this.carousel as any).layoutAxis || "XY";
        
        // Convert world point to Carousel's local space for precise cylindrical math
        const localPos = carouselRoot.getTransform().getInvertedWorldTransform().multiplyPoint(trackPoint);
        
        let radialDist = 0;
        let depthDist = 0;

        if (layoutAxis === "XZ") {
            radialDist = Math.sqrt(localPos.x * localPos.x + localPos.z * localPos.z);
            depthDist = Math.abs(localPos.y);
        } else if (layoutAxis === "YZ") {
            radialDist = Math.sqrt(localPos.y * localPos.y + localPos.z * localPos.z);
            depthDist = Math.abs(localPos.x);
        } else {
            // Default XY
            radialDist = Math.sqrt(localPos.x * localPos.x + localPos.y * localPos.y);
            depthDist = Math.abs(localPos.z);
        }

        // Hysteresis for distance limits
        const rMargin = this.isSwiping ? this.engageMargin * 1.5 : this.engageMargin;
        const dMargin = this.isSwiping ? this.depthMargin * 1.5 : this.depthMargin;
        
        const isNearEdge = Math.abs(radialDist - radius) < rMargin;
        const isNotLifted = depthDist < dMargin;

        if (isSword && isNearEdge && isNotLifted) {
            this.swipeHoldTimer += getDeltaTime();
            if (this.swipeHoldTimer > 0.05) {
                this.setDebug("Swiping!");
                this.updateSwipe(localPos, layoutAxis);
            } else {
                this.setDebug("Holding Sword...");
            }
        } else {
            this.swipeHoldTimer = 0;
            if (!isSword) this.setDebug("No Sword Gesture");
            else if (!isNearEdge) this.setDebug("Too Far from Radius");
            else if (!isNotLifted) this.setDebug("Lifted Off (Z Axis)");
            
            this.cancelSwipe();
        }
    }

    private setDebug(msg: string) {
        if (this.debugText) {
            this.debugText.text = "Sword Swipe: " + msg;
        }
    }

    private checkSwordFingers(hand: TrackedHand): boolean {
        const wrist = hand.wrist?.position;
        const indexTip = hand.indexTip?.position;
        const middleTip = hand.middleTip?.position;
        const ringTip = hand.ringTip?.position;
        const pinkyTip = hand.pinkyTip?.position;
        
        if (!wrist || !indexTip || !middleTip || !ringTip || !pinkyTip) return false;

        // We don't care much about curling, so thresholds are huge
        // When palm faces you, camera can't see the curled fingers well, so it guesses they are further out.
        // We've tightened this from 22.0 so that fully extending the fingers *will* break the gesture.
        const curlThreshold = this.isSwiping ? 14.0 : 12.0; 
        
        const ringDist = ringTip.distance(wrist);
        const pinkyDist = pinkyTip.distance(wrist);

        if (ringDist > curlThreshold || pinkyDist > curlThreshold) {
            return false;
        }

        // Extended fingers should be far from wrist (straight)
        // Lowered threshold because perspective foreshortening can make fingers seem shorter
        const extendThreshold = this.isSwiping ? 7.0 : 9.0;
        const indexDist = indexTip.distance(wrist);
        const middleDist = middleTip.distance(wrist);

        if (indexDist < extendThreshold || middleDist < extendThreshold) {
            return false;
        }

        // Index and middle tips close together
        const tipsDist = indexTip.distance(middleTip);
        if (tipsDist > (this.isSwiping ? 8.0 : 5.0)) {
            return false;
        }

        return true;
    }

    private updateSwipe(localPos: vec3, layoutAxis: string) {
        // 1. Convert world point to Carousel's local space to account for any parent rotations!
        // (Already done in Update, passed down)
        
        // 2. Read inversions
        const invertDrag = (this.carousel as any).invertDrag ? -1 : 1;
        const faceInward = (this.carousel as any).faceInward ? -1 : 1;

        // 3. Calculate Angle
        let currentAngle = 0;
        if (layoutAxis === "XZ") {
            currentAngle = Math.atan2(localPos.z, localPos.x);
        } else if (layoutAxis === "YZ") {
            currentAngle = Math.atan2(localPos.z, localPos.y);
        } else {
            // Default XY
            currentAngle = Math.atan2(localPos.y, localPos.x);
        }

        if (!this.isSwiping) {
            this.isSwiping = true;
            this.lastAngle = currentAngle;
            
            if ((this.carousel as any).externalDragStart) {
                (this.carousel as any).externalDragStart();
            }
            return;
        }

        // 4. Calculate Delta Angle (shortest path)
        let deltaAngle = currentAngle - this.lastAngle;
        
        // Wrap around logic (-PI to PI)
        if (deltaAngle > Math.PI) {
            deltaAngle -= Math.PI * 2;
        } else if (deltaAngle < -Math.PI) {
            deltaAngle += Math.PI * 2;
        }

        this.lastAngle = currentAngle;

        // 5. Convert angular delta to scroll slots
        // Total slots around the 360 circle
        const slotCount = Math.max(1, (this.carousel as any).slotCount || 5);
        
        // A full circle (2PI) is exactly slotCount slots.
        // deltaAngle is in radians.
        let scrollDelta = (deltaAngle / (Math.PI * 2)) * slotCount;

        // Apply sensitivities and inversions
        scrollDelta *= this.angularSensitivity * invertDrag;
        if (this.invertScroll) {
            scrollDelta *= -1;
        }

        if ((this.carousel as any).externalScrollBy) {
            (this.carousel as any).externalScrollBy(scrollDelta);
        }
    }

    private cancelSwipe() {
        if (this.isSwiping) {
            this.isSwiping = false;
            if (this.carousel && (this.carousel as any).externalDragEnd) {
                (this.carousel as any).externalDragEnd();
            }
        }
    }
}
