import { useEffect, useRef } from 'react';
import L, { Marker, LatLngExpression, LayerGroup } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIconUrl from "leaflet/dist/images/marker-icon.png";
import markerIconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import markerShadowUrl from "leaflet/dist/images/marker-shadow.png";
import './MapComponent.css'; // Add a CSS file for custom styles
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
        if (Array.isArray(position)) {
            const key = `${position[0].toFixed(4)},${position[1].toFixed(4)}`;
            const count = seenPositions.get(key) || 0;

            if (count > 0) {
                const offsetLat = count * offsetDistance;
                const offsetLng = count * offsetDistance;
                marker.setLatLng([position[0] + offsetLat, position[1] + offsetLng]);
            }

            seenPositions.set(key, count + 1);
        }
    });
};

const getRandomColor = (): string => {
    const colors = ["#FF4500", "#FFA500", "#FFD700", "#FF6347", "#FF8C00"]; // Colors inspired by the image
    return colors[Math.floor(Math.random() * colors.length)];
};

const MapComponent = ({ data, activeVideo, setActiveVideo }: { data: VideoInfo[], activeVideo: string, setActiveVideo: (video: string) => void }) => {
    const markersRef = useRef<Map<string, Marker>>(new Map());
    const mapRef = useRef<L.Map>(null);
    const layerGroupRef = useRef<LayerGroup | null>(null);

    useEffect(() => {
        const map = L.map('map', {
            zoomControl: false,
            maxBounds: [
                [-85, -180], // Southwest corner
                [85, 180],   // Northeast corner
            ],
            maxBoundsViscosity: 1.0, // Prevent panning outside bounds
        }).setView([51.1358, 1.3621], 3); // Adjusted zoom level
        mapRef.current = map;

        // Use a dark-themed tile layer
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 19,
        }).addTo(map);

        const layerGroup = L.layerGroup();
        layerGroupRef.current = layerGroup;
        layerGroup.addTo(map);

        // Add custom controls
        const GitHubControl = L.Control.extend({
            options: { position: 'bottomleft' },
            onAdd: () => {
                const ret = document.createElement("div");
                ret.innerHTML = "<a href=\"https://github.com/pgordineer/jetlagthegamethewebmap\"> GitHub </a>";
                ret.className = "custom-control";
                return ret;
            },
        });

        map.addControl(new GitHubControl());

        return () => {
            map.remove();
        };
    }, []);

    useEffect(() => {
        const currentPopup = markersRef.current.get(activeVideo);
        if (currentPopup) {
            currentPopup.openPopup();
            mapRef.current?.panTo(currentPopup.getLatLng());
        }
    }, [activeVideo]);

    useEffect(() => {
        markersRef.current = new Map<string, Marker>();

        // Clear existing markers and lines from the LayerGroup
        layerGroupRef.current?.clearLayers();

        const markers: { position: LatLngExpression; marker: Marker }[] = [];
        const playlistLines: { [key: string]: LatLngExpression[] } = {};

        data.forEach(element => {
            if (element.geocode) {
                const position: LatLngExpression = element.geocode;
                const markerColor = getRandomColor();

                const marker = L.marker(position, {
                    icon: L.divIcon({
                        className: 'custom-marker',
                        html: `<div style="background-color: ${markerColor}; width: 10px; height: 10px; border-radius: 50%;"></div>`,
                    }),
                }).bindPopup(
                    `<iframe class="video-player" src="https://www.youtube.com/embed/${element.videoId}" allowfullscreen></iframe>`,
                    { maxWidth: undefined }
                );

                marker.on("click", () => {
                    setActiveVideo(element.videoId);
                });

                markers.push({ position, marker });
                markersRef.current.set(element.videoId, marker);

                // Add position to the playlist line
                if (!playlistLines[element.playlistId]) {
                    playlistLines[element.playlistId] = [];
                }
                playlistLines[element.playlistId].push(position);
            } else {
                console.warn("Skipping marker creation for video with invalid geocode:", element.videoId, element.geocode);
            }
        });

        resolveOverlaps(markers);

        // Add markers to the LayerGroup
        markers.forEach(({ marker }) => {
            layerGroupRef.current?.addLayer(marker);
        });

        // Draw lines for each playlist
        Object.entries(playlistLines).forEach(([_, positions]) => { // Replace 'playlistId' with '_'
            const lineColor = getRandomColor();
            const polyline = L.polyline(positions, { color: lineColor, weight: 3 }).addTo(mapRef.current!);
            layerGroupRef.current?.addLayer(polyline);
        });
    }, [data]);

    return (
        <div id="map-container">
            <div id="map"></div>
            <div id="overlay-panel">
                <h3>Running Totals</h3>
                <p>Fares: $168.50</p>
                <p>Surcharge: $6.00</p>
                <p>MTA Tax: $6.00</p>
                <p>Tips: $17.25</p>
                <p>Tolls: $0.00</p>
                <p>Total: $197.75</p>
                <p>Passengers: 12</p>
            </div>
        </div>
    );
};

export default MapComponent;
