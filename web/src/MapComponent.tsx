import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import L, { Marker, LatLngExpression, LayerGroup } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIconUrl from "leaflet/dist/images/marker-icon.png";
import markerIconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import markerShadowUrl from "leaflet/dist/images/marker-shadow.png";
import { VideoInfo } from './App';

// Configure Leaflet marker icons
L.Icon.Default.prototype.options.iconUrl = markerIconUrl;
L.Icon.Default.prototype.options.iconRetinaUrl = markerIconRetinaUrl;
L.Icon.Default.prototype.options.shadowUrl = markerShadowUrl;
L.Icon.Default.imagePath = "";

// Helper function to resolve overlapping markers
const resolveOverlaps = (markers: { position: LatLngExpression; marker: Marker }[]) => {
    const offsetDistance = 0.0001; // Small offset in degrees
    const seenPositions = new Map<string, number>();

    markers.forEach(({ position, marker }) => {
        // Ensure position is treated as an array of [latitude, longitude]
        if (Array.isArray(position)) {
            const key = `${position[0].toFixed(4)},${position[1].toFixed(4)}`; // Round to 4 decimal places
            const count = seenPositions.get(key) || 0;

            if (count > 0) {
                // Apply an offset based on the count
                const offsetLat = count * offsetDistance;
                const offsetLng = count * offsetDistance;
                marker.setLatLng([position[0] + offsetLat, position[1] + offsetLng]);
            }

            seenPositions.set(key, count + 1);
        }
    });
};

const useInitializeMap = (mapRef: React.MutableRefObject<L.Map | null>, layerGroupRef: React.MutableRefObject<LayerGroup | null>) => {
    useEffect(() => {
        const map = L.map('map').setView([51.1358, 1.3621], 5);
        mapRef.current = map;

        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        }).addTo(map);

        const layerGroup = L.layerGroup(); // Create a LayerGroup for markers
        layerGroupRef.current = layerGroup;
        layerGroup.addTo(map);

        // Define custom control for displaying coordinates
        const CoordsControl = L.Control.extend({
            options: { position: 'bottomleft' },
            onAdd: (map: L.Map) => {
                const ret = document.createElement("div");
                map.on("mousemove", (event) => {
                    ret.innerHTML = `<div class="control">${event.latlng.lat.toFixed(4)}, ${event.latlng.lng.toFixed(4)}</div>`;
                });
                return ret;
            },
        });

        // Define custom control for GitHub link
        const GitHubControl = L.Control.extend({
            options: { position: 'bottomleft' },
            onAdd: () => {
                const ret = document.createElement("div");
                ret.innerHTML = "<a href=\"https://github.com/pgordineer/jetlagthegamethewebmap\"> GitHub </a>";
                return ret;
            },
        });

        // Add custom controls to the map
        map.addControl(new CoordsControl());
        map.addControl(new GitHubControl());

        return () => {
            map.remove();
        };
    }, []);
};

const MapComponent = forwardRef(({ data, activeVideo, setActiveVideo }: { data: VideoInfo[], activeVideo: string, setActiveVideo: (video: string) => void }, ref) => {
    const markersRef = useRef<Map<string, Marker>>(new Map());
    const mapRef = useRef<L.Map>(null);
    const layerGroupRef = useRef<LayerGroup | null>(null); // Use LayerGroup for marker management

    useInitializeMap(mapRef, layerGroupRef);

    useImperativeHandle(ref, () => ({
        fitBounds: (bounds: [number, number][]) => {
            if (mapRef.current && bounds.length > 0) {
                const latLngBounds = bounds.reduce(
                    (acc, [lat, lng]) => acc.extend([lat, lng]),
                    new L.LatLngBounds()
                );
                mapRef.current.fitBounds(latLngBounds);
            }
        },
    }));

    useEffect(() => {
        const currentPopup = markersRef.current.get(activeVideo);
        if (currentPopup) {
            currentPopup.openPopup();
            mapRef.current?.panTo(currentPopup.getLatLng());
        }
    }, [activeVideo]);

    useEffect(() => {
        markersRef.current = new Map<string, Marker>();

        // Clear existing markers from the LayerGroup
        layerGroupRef.current?.clearLayers();

        const markers: { position: LatLngExpression; marker: Marker }[] = [];

        data.forEach(element => {
            if (element.geocode) {
                const position: LatLngExpression = element.geocode; // Use parsed geocode
                const marker = L.marker(position)
                    .bindPopup(
                        `<iframe class="video-player" src="https://www.youtube.com/embed/${element.videoId}" allowfullscreen></iframe>`,
                        { maxWidth: undefined }
                    );

                marker.on("click", () => {
                    setActiveVideo(element.videoId);
                });

                markers.push({ position, marker });
                markersRef.current.set(element.videoId, marker);
            } else {
                console.warn("Skipping marker creation for video with invalid geocode:", element.videoId, element.geocode);
            }
        });

        // Resolve overlapping markers
        resolveOverlaps(markers);

        // Add markers to the LayerGroup
        markers.forEach(({ marker }) => {
            layerGroupRef.current?.addLayer(marker);
        });
    }, [data]);

    return <div id="map"></div>;
});

export default MapComponent;
