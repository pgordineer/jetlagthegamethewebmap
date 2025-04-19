import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import L, { Marker, LatLngExpression, LayerGroup } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIconUrl from "leaflet/dist/images/marker-icon.png";
import markerIconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import markerShadowUrl from "leaflet/dist/images/marker-shadow.png";
import './MapComponent.css';
import { VideoInfo } from './App';

// Configure Leaflet marker icons
L.Icon.Default.prototype.options.iconUrl = markerIconUrl;
L.Icon.Default.prototype.options.iconRetinaUrl = markerIconRetinaUrl;
L.Icon.Default.prototype.options.shadowUrl = markerShadowUrl;

const MapComponent = forwardRef(({ data, activeVideo, setActiveVideo }: { data: VideoInfo[], activeVideo: string, setActiveVideo: (video: string) => void }, ref) => {
    const mapRef = useRef<L.Map | null>(null);
    const layerGroupRef = useRef<LayerGroup | null>(null);

    useImperativeHandle(ref, () => ({
        panToMarker: (geocode: [number, number]) => {
            if (mapRef.current) {
                mapRef.current.setView(geocode, 8); // Pan to the marker with a fixed zoom level
            }
        },
    }));

    useEffect(() => {
        if (!mapRef.current) {
            const map = L.map('map', {
                zoomControl: true,
                maxBounds: [
                    [-85, -180], // Southwest corner
                    [85, 180],   // Northeast corner
                ],
                maxBoundsViscosity: 1.0, // Prevent panning outside bounds
                minZoom: 2, // Prevent zooming out too far
                maxZoom: 19,
            }).setView([51.1358, 1.3621], 3);
            mapRef.current = map;

            L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
                subdomains: 'abcd',
            }).addTo(map);

            const layerGroup = L.layerGroup();
            layerGroupRef.current = layerGroup;
            layerGroup.addTo(map);
        }

        return () => {
            mapRef.current?.remove();
            mapRef.current = null;
        };
    }, []);

    useEffect(() => {
        if (layerGroupRef.current) {
            layerGroupRef.current.clearLayers();

            data.forEach((item) => {
                if (item.geocode) {
                    const marker = L.marker(item.geocode, {
                        icon: L.divIcon({
                            className: 'custom-marker',
                            html: `<div style="background-color: ${getRandomColor()}; width: 10px; height: 10px; border-radius: 50%;"></div>`,
                        }),
                    }).bindPopup(
                        `<iframe class="video-player" src="https://www.youtube.com/embed/${item.videoId}" allowfullscreen></iframe>`,
                        { maxWidth: undefined }
                    );

                    marker.on("click", () => {
                        setActiveVideo(item.videoId);
                    });

                    layerGroupRef.current.addLayer(marker);
                }
            });
        }
    }, [data]);

    return <div id="map" style={{ width: "100%", height: "100%" }}></div>;
});

const getRandomColor = (): string => {
    const colors = ["#FF4500", "#FFA500", "#FFD700", "#FF6347", "#FF8C00"];
    return colors[Math.floor(Math.random() * colors.length)];
};

export default MapComponent;
