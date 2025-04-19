import { useEffect, useRef } from 'react';
import L, { Marker, LatLngExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet.markercluster';
import markerIconUrl from "leaflet/dist/images/marker-icon.png";
import markerIconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import markerShadowUrl from "leaflet/dist/images/marker-shadow.png";
import { VideoInfo } from './App';

// Import MarkerClusterGroup type
import "leaflet.markercluster"; // Import the marker cluster library
import { markerClusterGroup } from "leaflet.markercluster";

// Configure Leaflet marker icons
L.Icon.Default.prototype.options.iconUrl = markerIconUrl;
L.Icon.Default.prototype.options.iconRetinaUrl = markerIconRetinaUrl;
L.Icon.Default.prototype.options.shadowUrl = markerShadowUrl;
L.Icon.Default.imagePath = "";

// Custom hook for initializing the map
const useInitializeMap = (mapRef: React.MutableRefObject<L.Map | null>, markerClusterRef: React.MutableRefObject<L.MarkerClusterGroup | null>) => {
    useEffect(() => {
        const map = L.map('map').setView([51.1358, 1.3621], 5);
        mapRef.current = map;

        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        }).addTo(map);

        const markerCluster = markerClusterGroup(); // Use the imported function
        markerClusterRef.current = markerCluster;
        map.addLayer(markerCluster);

        const coordsControl = new L.Control({ position: 'bottomleft' });
        coordsControl.onAdd = (map: L.Map) => {
            const ret = document.createElement("div");
            map.on("mousemove", (event) => {
                ret.innerHTML = `<div class="control">${event.latlng.lat.toFixed(4)}, ${event.latlng.lng.toFixed(4)}</div>`;
            });
            return ret;
        };

        const gitHubControl = new L.Control({ position: 'bottomleft' });
        gitHubControl.onAdd = () => {
            const ret = document.createElement("div");
            ret.innerHTML = "<a href=\"https://github.com/pgordineer/jetlagthegamethewebmap\"> GitHub </a>";
            return ret;
        };

        gitHubControl.addTo(map);
        coordsControl.addTo(map);

        return () => {
            map.remove();
        };
    }, []);
};

const MapComponent = ({ data, activeVideo, setActiveVideo }: { data: VideoInfo[], activeVideo: string, setActiveVideo: (video: string) => void }) => {
    const markersRef = useRef<Map<string, Marker>>(new Map());
    const mapRef = useRef<L.Map>(null);
    const markerClusterRef = useRef<L.MarkerClusterGroup>(null);

    useInitializeMap(mapRef, markerClusterRef);

    useEffect(() => {
        const currentPopup = markersRef.current.get(activeVideo);
        if (currentPopup) {
            currentPopup.openPopup();
            mapRef.current?.panTo(currentPopup.getLatLng());
        }
    }, [activeVideo]);

    useEffect(() => {
        markerClusterRef.current?.clearLayers();
        markersRef.current = new Map<string, Marker>();

        data.forEach(element => {
            if (element.geocode) {
                const position: LatLngExpression = element.geocode; // Use parsed geocode
                const marker = L.marker(position)
                    .bindPopup(
                        `<iframe class="video-player" src="https://www.youtube.com/embed/${element.videoId}" allowfullscreen></iframe>`,
                        { maxWidth: undefined }
                    );

                markerClusterRef.current?.addLayer(marker);

                marker.on("click", () => {
                    setActiveVideo(element.videoId);
                });

                markersRef.current.set(element.videoId, marker);
                console.log("Added marker for video:", element.videoId, "at position:", position);
            } else {
                console.warn("Skipping marker creation for video with invalid geocode:", element.videoId, element.geocode);
            }
        });
    }, [data]);

    return <div id="map"></div>;
};

export default MapComponent;
