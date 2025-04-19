declare module "leaflet.markercluster" {
    import * as L from "leaflet";

    namespace MarkerClusterGroup {
        interface Options extends L.LayerOptions {
            showCoverageOnHover?: boolean;
            zoomToBoundsOnClick?: boolean;
            spiderfyOnMaxZoom?: boolean;
            removeOutsideVisibleBounds?: boolean;
            animate?: boolean;
            animateAddingMarkers?: boolean;
            disableClusteringAtZoom?: number;
            maxClusterRadius?: number | ((zoom: number) => number);
            polygonOptions?: L.PolylineOptions;
            singleMarkerMode?: boolean;
            spiderLegPolylineOptions?: L.PolylineOptions;
            spiderfyDistanceMultiplier?: number;
            iconCreateFunction?: (cluster: MarkerCluster) => L.Icon;
            chunkedLoading?: boolean;
            chunkDelay?: number;
            chunkInterval?: number;
        }

        interface MarkerCluster extends L.Marker {
            getAllChildMarkers(): L.Marker[];
            getChildCount(): number;
            getClusterBounds(): L.LatLngBounds;
        }
    }

    class MarkerClusterGroup extends L.FeatureGroup {
        constructor(options?: MarkerClusterGroup.Options);
        addLayer(layer: L.Layer): this;
        removeLayer(layer: L.Layer): this;
        clearLayers(): this;
        getVisibleParent(marker: L.Marker): L.Marker;
        refreshClusters(): this;
    }

    export function markerClusterGroup(options?: MarkerClusterGroup.Options): MarkerClusterGroup;
}
