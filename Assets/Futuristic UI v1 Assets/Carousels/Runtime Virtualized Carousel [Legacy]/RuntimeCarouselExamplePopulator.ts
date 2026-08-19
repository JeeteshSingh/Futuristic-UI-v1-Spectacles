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
import { CarouselItemData } from "./VirtualizedPolygonalCarousel";

/**
 * CarouselExamplePopulator Component
 * 
 * Dynamically populates a UnifiedPolygonalCarousel or VirtualizedPolygonalCarousel with items,
 * assigns unique titles and textures to each button, and updates target Image & Text objects on selection.
 * Fully supports toggle group behavior (restoring default texture & text when all toggles are turned OFF).
 */
@component
export class CarouselExamplePopulator extends BaseScriptComponent {
    @ui.label('<span style="color: #60A5FA; font-weight: bold; font-size: 14px;">Carousel Demo Populator</span><br/><span style="color: #94A3B8; font-size: 11px;">Populates carousel buttons with custom textures and titles, updating an external Image & Text display on selection.</span>')
    @ui.separator

    @ui.label('<span style="color: #F59E0B; font-weight: bold;">Carousel Reference</span>')
    @input("Component.ScriptComponent")
    @hint("Drag your UnifiedPolygonalCarousel or VirtualizedPolygonalCarousel here")
    carousel!: ScriptComponent;

    @ui.separator
    @ui.label('<span style="color: #38BDF8; font-weight: bold;">Display Target Objects</span>')

    @input("Component.Image")
    @allowUndefined
    @hint("Target Image object in scene to display the selected button's texture")
    displayImage?: Image;

    @input("Component.Text")
    @allowUndefined
    @hint("Target Text object in scene to display the selected button's title")
    displayText?: Text;

    @ui.separator
    @ui.label('<span style="color: #EC4899; font-weight: bold;">Default Reset (When All Toggles Off)</span>')

    @input("Asset.Texture")
    @allowUndefined
    @hint("Default texture to reset to when all toggles are turned OFF (Auto-captured from displayImage if unassigned)")
    defaultTexture?: Texture;

    @input("string", "None Selected")
    @hint("Default text to show when all toggles are turned OFF")
    defaultText: string = "None Selected";

    @ui.separator
    @ui.label('<span style="color: #10B981; font-weight: bold;">Textures & Populator Settings</span>')

    @input("Asset.Texture[]")
    @hint("Array of textures to assign to the populated buttons")
    textures: Texture[] = [];

    @input("int", "39")
    @hint("Number of buttons to populate (Default: 39)")
    totalItems: number = 39;

    @input("string", "App ")
    @hint("Title prefix for each button (e.g. 'App 1', 'App 2')")
    titlePrefix: string = "App ";

    onAwake() {
        if (!this.defaultTexture && this.displayImage && this.displayImage.mainPass.baseTexture) {
            this.defaultTexture = this.displayImage.mainPass.baseTexture;
        }
        this.createEvent("OnStartEvent").bind(() => {
            this.populateCarousel();
        });
    }

    public populateCarousel() {
        const carouselAPI = this.carousel as any;
        if (!carouselAPI || typeof carouselAPI.setItems !== "function") {
            print("[CarouselPopulator] Error: Please assign a valid carousel component (UnifiedPolygonalCarousel or VirtualizedPolygonalCarousel) in the Inspector.");
            return;
        }

        const customItems: CarouselItemData[] = [];
        
        for (let i = 0; i < this.totalItems; i++) {
            const itemNumber = i + 1;
            const itemTitle = this.titlePrefix + itemNumber;
            const itemTexture = (this.textures && this.textures.length > 0) 
                ? this.textures[i % this.textures.length] 
                : undefined;

            customItems.push({
                title: itemTitle,
                subtitle: "Tap to select",
                texture: itemTexture,
                onTap: (isSelected?: boolean) => {
                    // print(`[CarouselPopulator] onTap fired for '${itemTitle}' with isSelected=${isSelected}`)
                    if (isSelected === false) {
                        // print(`[CarouselPopulator] Resetting display to default: '${this.defaultText}'`);
                        
                        if (this.displayText) {
                            this.displayText.text = this.defaultText;
                        }
                        if (this.displayImage) {
                            this.displayImage.mainPass.baseTex = this.defaultTexture || null;
                        }
                    } else {
                        // print(`[CarouselPopulator] Setting display to: '${itemTitle}' (texture assigned: ${Boolean(itemTexture)})`);
                        
                        if (this.displayText) {
                            this.displayText.text = itemTitle;
                        }
                        if (this.displayImage && itemTexture) {
                            this.displayImage.mainPass.baseTex = itemTexture;
                        }
                    }
                }
            });
        }

        // Pass the items to the carousel to render them!
        carouselAPI.setItems(customItems);

        const isToggleGroup = carouselAPI.enableToggleGroupBehavior ?? carouselAPI.enableToggleBehavior ?? false;
        const allowAllOff = carouselAPI.allowAllTogglesOff ?? false;

        // print(`[CarouselPopulator] populateCarousel done. isToggleGroup: ${isToggleGroup}, allowAllOff: ${allowAllOff}`)

        // Auto-select initial item if toggles off isn't the starting state
        if (isToggleGroup && !allowAllOff) {
            // print(`[CarouselPopulator] Auto-selecting initial item 0 ('${customItems[0]?.title}')`)
            if (typeof carouselAPI.selectItem === "function") {
                carouselAPI.selectItem(0);
            }
            if (customItems.length > 0 && customItems[0].onTap) {
                customItems[0].onTap(true);
            }
        } else if (allowAllOff) {
            // print(`[CarouselPopulator] allowAllOff is true -> starting in default None Selected state`)
            if (this.displayText) this.displayText.text = this.defaultText;
            if (this.displayImage) this.displayImage.mainPass.baseTex = this.defaultTexture;
        }
    }
}
