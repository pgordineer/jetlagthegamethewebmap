import { useState, useEffect, useRef, useMemo } from "react";
import MapComponent from "./MapComponent";
import data from "./data/data.json";
import "./style.css";

export interface VideoInfo {
    publishedAt?: string; // Made optional
    title: string;
    videoId: string;
    location: string;
    geocode: [number, number] | null; // Ensure geocode is parsed into a coordinate pair
    transcript: any; // Updated to match parsed type
    playlist: string; // Updated to string to handle dynamic playlists
    playlistName?: string; // Added to handle playlist names
    marked: boolean;
}

// Define the type of the raw data from the JSON file
interface RawVideoInfo {
    publishedAt?: string;
    title: string;
    videoId: string;
    location: string;
    geocode: {
        features: { geometry: { coordinates: number[] } }[];
    } | null; // Adjusted for new format
    transcript?: string; // Made optional to handle missing data
    playlist?: string; // Made optional to handle missing data
    playlistName?: string; // Made optional to handle missing data
    marked?: boolean; // Made optional to handle missing data
}

// Parse geocode and filter out invalid entries
let VideoData = (data as RawVideoInfo[]).map((item) => {
    let parsedGeocode: [number, number] | null = null;
    try {
        if (item.geocode?.features?.length) {
            const coordinates = item.geocode.features[0].geometry.coordinates;
            // Ensure coordinates are valid and have exactly two elements
            if (coordinates.length === 2 && typeof coordinates[0] === "number" && typeof coordinates[1] === "number") {
                parsedGeocode = [coordinates[1], coordinates[0]] as [number, number]; // Swap to [latitude, longitude]
            }
        }
    } catch {
        parsedGeocode = null;
    }

    return {
        publishedAt: item.publishedAt || "", // Default to an empty string if missing
        title: item.title || "Untitled", // Default to "Untitled" if missing
        videoId: item.videoId || "unknown", // Default to "unknown" if missing
        location: item.location || "Unknown Location", // Default to "Unknown Location" if missing
        geocode: parsedGeocode, // Extract the first valid coordinate
        transcript: item.transcript ? JSON.parse(item.transcript) : null, // Parse transcript if available
        playlist: item.playlist || "unknown", // Default to "unknown" if missing
        playlistName: item.playlistName || "Unknown Playlist", // Default to "Unknown Playlist" if missing
        marked: item.marked ?? false, // Default to false if missing
    };
}).filter((item) => {
    // Log a warning for invalid geocode but include the item
    if (!item.geocode) {
        console.warn("Invalid or missing geocode, item will still be included:", item);
    }
    return true; // Include all items
});

console.log("Parsed VideoData:", VideoData);

// Map playlistId to playlistName for dropdown display
const playlistMapping: { [key: string]: string } = VideoData.reduce((acc, item) => {
    if (item.playlist && item.playlistName) {
        acc[item.playlist] = item.playlistName;
    }
    return acc;
}, {} as { [key: string]: string });

let App = () => {
    // Active video that is highlighted on the screen
    const [activeVideo, setActiveVideo] = useState("");
    // Selector for playlist (updated in sidebar)
    const [playlist, setPlaylist] = useState("");
    // Selector for text filter
    const [filter, setFilter] = useState("");

    const cur_video = useRef<HTMLElement>(null);

    // If active video is updated, scroll the video into view on the sidebar
    useEffect(() => {
        cur_video.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, [activeVideo]);

    // Use a memo here to avoid bad side effects from filtering the data
    const display_data = useMemo(() => {
        // Filter data based on the sidebar selectors
        let ret: VideoInfo[] = VideoData;

        if (playlist !== "") {
            ret = ret.filter((item) => item.playlist === playlist);
        }

        if (filter !== "") {
            ret = ret.filter((item) => item.title.toLowerCase().includes(filter.toLowerCase()));
        }

        return ret;
    }, [playlist, filter]);

    return (
        <div>
            <MapComponent data={display_data} activeVideo={activeVideo} setActiveVideo={setActiveVideo}></MapComponent>
            <div id="sidebar" className="roboto-sidebar">
                <div className="sticky-selectors">
                    <select
                        name="playlist-select"
                        onChange={(changeEvent) => {
                            setPlaylist(changeEvent.target.value);
                        }}
                    >
                        <option value="">All Playlists</option>
                        {Object.entries(playlistMapping).map(([id, name]) => (
                            <option value={id} key={id}>
                                {name}
                            </option>
                        ))}
                    </select>

                    <input
                        type="search"
                        placeholder="filter"
                        name="TextFilter"
                        onChange={(changeEvent) => {
                            setFilter(changeEvent.target.value);
                        }}
                    ></input>
                </div>

                {display_data.map((item) => {
                    return (
                        <div
                            className={"sidebar-item" + (item.videoId === activeVideo ? " active-video" : "")}
                            onClick={() => {
                                setActiveVideo(item.videoId);
                            }}
                            ref={(elem) => {
                                if (item.videoId === activeVideo) {
                                    cur_video.current = elem;
                                }
                            }}
                            key={item.videoId}
                        >
                            Title: {item.title}
                            <br />
                            Location: {item.geocode?.[0]?.toPrecision(4)}, {item.geocode?.[1]?.toPrecision(4)}
                            <br />
                            Playlist: {item.playlistName}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default App;