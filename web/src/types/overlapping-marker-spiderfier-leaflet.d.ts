declare module 'overlapping-marker-spiderfier-leaflet' {
    import * as L from 'leaflet';

    interface SpiderfierOptions {
        keepSpiderfied?: boolean;
        nearbyDistance?: number;
        circleFootSeparation?: number;
        spiralFootSeparation?: number;
        spiralLengthStart?: number;
        spiralLengthFactor?: number;
        legWeight?: number;
        legColors?: {
            usual: string;
            highlighted: string;
        };
    }

    export default class OverlappingMarkerSpiderfier {
        constructor(map: L.Map, options?: SpiderfierOptions);
        addMarker(marker: L.Marker): void;
        removeMarker(marker: L.Marker): void;
        clearMarkers(): void;
    }
}
