import { useState, useEffect, useRef, useMemo } from "react";
import MapComponent from "./MapComponent";
import data from "./data/data.json";
import "./style.css";
import Select from "react-select"; // Import react-select for better multi-select dropdown

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
    const [selectedPlaylists, setSelectedPlaylists] = useState<string[]>([]);
    // Selector for text filter
    const [filter, setFilter] = useState("");
    // State to toggle the visibility of lines
    const [showLines, setShowLines] = useState(true);
    // State to toggle the visibility of the items overlay
    const [showItemsOverlay, setShowItemsOverlay] = useState(true);

    const cur_video = useRef<HTMLElement>(null);

    // If active video is updated, scroll the video into view on the sidebar
    useEffect(() => {
        cur_video.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, [activeVideo]);

    // Use a memo here to avoid bad side effects from filtering the data
    const display_data = useMemo(() => {
        let ret: VideoInfo[] = VideoData;

        if (selectedPlaylists.length > 0) {
            ret = ret.filter((item) => selectedPlaylists.includes(item.playlistId)); // Filter by selected playlists
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
    }, [selectedPlaylists, filter]);

    return (
        <div>
            <MapComponent
                data={display_data}
                activeVideo={activeVideo}
                setActiveVideo={(videoId) => {
                    if (activeVideo === videoId) {
                        setActiveVideo(""); // Deselect the video if clicked again
                    } else {
                        setActiveVideo(videoId);
                    }
                }}
                showLines={showLines} // Pass the state to MapComponent
            ></MapComponent>
            <div id="filter-overlay">
                <Select
                    isMulti
                    options={allPlaylists.map(({ id, name }) => ({ value: id, label: name }))}
                    onChange={(selectedOptions) => {
                        const selectedValues = selectedOptions.map((option) => option.value);
                        setSelectedPlaylists(selectedValues);
                    }}
                    placeholder="Select Playlists"
                    className="multi-select"
                />

                <input
                    type="search"
                    placeholder="Filter videos"
                    name="TextFilter"
                    onChange={(changeEvent) => {
                        setFilter(changeEvent.target.value);
                    }}
                ></input>

                <button
                    onClick={() => setShowLines((prev) => !prev)}
                    style={{ marginTop: "10px", padding: "5px", borderRadius: "3px", cursor: "pointer" }}
                >
                    {showLines ? "Hide Lines" : "Show Lines"}
                </button>
            </div>
            {showItemsOverlay && (
                <div id="items-overlay">
                    {display_data.map((item) => (
                        <div
                            className={"sidebar-item" + (item.videoId === activeVideo ? " active-video" : "")}
                            onClick={() => {
                                if (activeVideo === item.videoId) {
                                    setActiveVideo(""); // Deselect the video if clicked again
                                } else {
                                    setActiveVideo(item.videoId);
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
                    ))}
                </div>
            )}
            <button
                onClick={() => setShowItemsOverlay((prev) => !prev)}
                style={{ position: "absolute", bottom: "10px", left: "10px", padding: "5px", borderRadius: "3px", cursor: "pointer", zIndex: 1000 }}
            >
                {showItemsOverlay ? "Hide List" : "Show List"}
            </button>
        </div>
    );
};

export default App;