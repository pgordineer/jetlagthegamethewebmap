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
    playlistId: string; // Updated to use playlistId
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
    playlistId?: string; // Updated to use playlistId
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
        playlistId: item.playlistId || "unknown", // Default to "unknown" if missing
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

// Extract all unique playlists from VideoData
const allPlaylists = Array.from(
    new Set(VideoData.map((item) => item.playlistId))
).map((playlistId) => {
    const playlistName = VideoData.find((item) => item.playlistId === playlistId)?.playlistName || playlistId;
    return { id: playlistId, name: playlistName };
});

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
            ret = ret.filter((item) => item.playlistId === playlist); // Filter by playlistId
        }

        if (filter !== "") {
            const lowerFilter = filter.toLowerCase();
            ret = ret.filter(
                (item) =>
                    item.title.toLowerCase().includes(lowerFilter) ||
                    item.playlistName?.toLowerCase().includes(lowerFilter) // Filter by playlist name
            );
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
                        {allPlaylists.map(({ id, name }) => (
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