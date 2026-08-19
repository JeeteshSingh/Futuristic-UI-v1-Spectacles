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

/**
 * SwordSwipeScroller Component
 * 
 * Tracks the index and middle fingertips (Sword gesture) to fluidly scroll carousels.
 * Multipurpose controller supporting:
 * - Circular / Arc Angular scrolling (XY, XZ, YZ planes)
 * - Linear Horizontal scrolling (X-Axis)
 * - Linear Vertical scrolling (Y-Axis)
 * - Linear Depth scrolling (Z-Axis)
 */
@component
export class SwordSwipeScroller extends BaseScriptComponent {
    @ui.label('<span style="color: #60A5FA; font-weight: bold; font-size: 14px;">Sword Swipe Scroller</span><br/><span style="color: #94A3B8; font-size: 11px;">Track index & middle fingertips to scroll circular or straight linear carousels.</span>')
    @ui.separator

    @ui.label('<span style="color: #F59E0B; font-weight: bold;">Target Carousel</span>')
    @input
    @hint("Drag your UnifiedPolygonalCarousel, VirtualizedPolygonalCarousel, or ManualPolygonalCarousel script component here")
    carousel: ScriptComponent;

    @ui.separator
    @ui.label('<span style="color: #10B981; font-weight: bold;">Tracking & Motion Mode</span>')

    @input("string", "right")
    @widget(new ComboBoxWidget([
        new ComboBoxItem("Right Hand", "right"),
        new ComboBoxItem("Left Hand", "left")
    ]))
    handType: string = "right";

    @input("string", "circular")
    @widget(new ComboBoxWidget([
        new ComboBoxItem("Circular / Arc (Angular)", "circular"),
        new ComboBoxItem("Linear Horizontal (X-Axis)", "linearX"),
        new ComboBoxItem("Linear Vertical (Y-Axis)", "linearY"),
        new ComboBoxItem("Linear Depth (Z-Axis)", "linearZ")
    ]))
    @hint("Select Circular for round/arc carousels or Linear X/Y/Z for straight linear carousels")
    scrollMode: string = "circular";

    @ui.separator
    @ui.label('<span style="color: #EC4899; font-weight: bold;">Sensitivity & Limits</span>')

    @input("float", "1.0")
    @hint("Multiplier for circular/angular scroll speed")
    angularSensitivity: number = 1.0;

    @input("float", "0.1")
    @hint("Multiplier for linear scroll speed (slots per cm of sword tip movement)")
    linearSensitivity: number = 0.1;

    @input("boolean", "false")
    @hint("Invert the scrolling direction")
    invertScroll: boolean = false;

    @input("float", "15.0")
    @hint("How close (in cm) the hand must be to the carousel radius or axis to engage")
    engageMargin: number = 15.0;

    @input("float", "10.0")
    @hint("Maximum depth (in cm) from the carousel plane before considering sword 'lifted off'")
    depthMargin: number = 10.0;

    @ui.separator
    @ui.label('<span style="color: #38BDF8; font-weight: bold;">Diagnostics</span>')

    @input
    @allowUndefined
    @hint("Optional Text component for debugging tracking state")
    debugText: Text;

    private handProvider: HandInputData = HandInputData.getInstance();
    private trackedHand: TrackedHand | null = null;
    
    private isSwiping: boolean = false;
    private lastAngle: number = 0;
    private lastLocalPos: vec3 = vec3.zero();
    
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

        const indexTip = this.trackedHand.indexTip?.position;
        const middleTip = this.trackedHand.middleTip?.position;
        if (!indexTip || !middleTip) {
            this.setDebug("No Fingertips");
            this.cancelSwipe();
            return;
        }

        // Track the midpoint between index and middle fingertips (Sword Tip)
        const trackPoint = indexTip.add(middleTip).uniformScale(0.5);

        const isSword = this.checkSwordFingers(this.trackedHand);

        // Proximity check in carousel local space
        const carouselRoot = (this.carousel as any).carouselRoot || this.carousel.getSceneObject();
        const radius = (this.carousel as any).radius || 30.0;
        const layoutAxis = (this.carousel as any).layoutAxis || "XY";
        
        const localPos = carouselRoot.getTransform().getInvertedWorldTransform().multiplyPoint(trackPoint);
        
        let radialDist = 0;
        let depthDist = 0;
        let isNearEdge = true;
        let isNotLifted = true;

        const rMargin = this.isSwiping ? this.engageMargin * 1.5 : this.engageMargin;
        const dMargin = this.isSwiping ? this.depthMargin * 1.5 : this.depthMargin;

        if (this.scrollMode === "circular") {
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
            isNearEdge = Math.abs(radialDist - radius) < rMargin;
            isNotLifted = depthDist < dMargin;
        } else if (this.scrollMode === "linearX") {
            depthDist = Math.abs(localPos.z);
            isNearEdge = Math.abs(localPos.y) < rMargin;
            isNotLifted = depthDist < dMargin;
        } else if (this.scrollMode === "linearY") {
            depthDist = Math.abs(localPos.z);
            isNearEdge = Math.abs(localPos.x) < rMargin;
            isNotLifted = depthDist < dMargin;
        } else {
            // Linear Z
            depthDist = Math.abs(localPos.x);
            isNearEdge = Math.abs(localPos.y) < rMargin;
            isNotLifted = depthDist < dMargin;
        }

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
            else if (!isNearEdge) this.setDebug("Too Far from Track");
            else if (!isNotLifted) this.setDebug("Lifted Off");
            
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

        // Tightened curl threshold so extended pinky/ring breaks sword gesture
        const curlThreshold = this.isSwiping ? 14.0 : 12.0; 
        
        const ringDist = ringTip.distance(wrist);
        const pinkyDist = pinkyTip.distance(wrist);

        if (ringDist > curlThreshold || pinkyDist > curlThreshold) {
            return false;
        }

        // Extended fingers should be far from wrist (straight)
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
        const invertDrag = (this.carousel as any).invertDrag ? -1 : 1;

        // 1. Calculate Angle (for circular mode)
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
            this.lastLocalPos = localPos;
            
            if ((this.carousel as any).externalDragStart) {
                (this.carousel as any).externalDragStart();
            }
            return;
        }

        let scrollDelta = 0;

        if (this.scrollMode === "circular") {
            // Calculate Delta Angle (shortest path)
            let deltaAngle = currentAngle - this.lastAngle;
            
            if (deltaAngle > Math.PI) {
                deltaAngle -= Math.PI * 2;
            } else if (deltaAngle < -Math.PI) {
                deltaAngle += Math.PI * 2;
            }

            this.lastAngle = currentAngle;

            const slotCount = Math.max(1, (this.carousel as any).slotCount || 5);
            scrollDelta = (deltaAngle / (Math.PI * 2)) * slotCount * this.angularSensitivity * invertDrag;
        } else if (this.scrollMode === "linearX") {
            const dx = localPos.x - this.lastLocalPos.x;
            scrollDelta = dx * this.linearSensitivity * invertDrag;
        } else if (this.scrollMode === "linearY") {
            const dy = localPos.y - this.lastLocalPos.y;
            scrollDelta = dy * this.linearSensitivity * invertDrag;
        } else if (this.scrollMode === "linearZ") {
            const dz = localPos.z - this.lastLocalPos.z;
            scrollDelta = dz * this.linearSensitivity * invertDrag;
        }

        this.lastLocalPos = localPos;

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
