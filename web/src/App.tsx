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
    handle?: string; // Added to handle the new property
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
    handle?: string; // Added to handle the new property
}

// Parse geocode and filter out invalid entries
let VideoData = (data as RawVideoInfo[]).map((item) => {
    let parsedGeocode: [number, number] | null = null;
    try {
        if (Array.isArray(item.geocode) && item.geocode.length > 0) {
            const location = item.geocode[0]?.geometry?.location;
            // Ensure location contains valid latitude and longitude
            if (location && typeof location.lat === "number" && typeof location.lng === "number") {
                parsedGeocode = [location.lat, location.lng] as [number, number];
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
        handle: item.handle || "Unknown Handle", // Default to "Unknown Handle" if missing
    };
}).filter((item) => {
    // Exclude videos with the title "Private video"
    if (item.title === "Private video") {
        console.warn("Excluding private video:", item);
        return false;
    }
    // Log a warning for invalid geocode but include the item
    if (!item.geocode) {
        console.warn("Invalid or missing geocode, item will still be included:", item);
    }
    return true; // Include all other items
});

console.log("Parsed VideoData:", VideoData);

// Extract all unique playlists from VideoData
const allPlaylists = Array.from(
    new Set(VideoData.map((item) => item.playlistId))
).map((playlistId) => {
    const playlistName = VideoData.find((item) => item.playlistId === playlistId)?.playlistName || playlistId;
    return { id: playlistId, name: playlistName };
});

// Extract all unique handles from VideoData
const allHandles = Array.from(new Set(VideoData.map((item) => item.handle || "Unknown Handle")));

let App = () => {
    // Active video that is highlighted on the screen
    const [activeVideo, setActiveVideo] = useState("");
    // Selector for handle (new dropdown)
    const [handle, setHandle] = useState("");
    // Selector for playlist (updated to depend on handle)
    const [playlist, setPlaylist] = useState("");
    // Selector for text filter
    const [filter, setFilter] = useState("");
    // State to toggle the visibility of lines
    const [showLines, setShowLines] = useState(false); // Default to false
    // State to toggle the visibility of the items overlay
    const [showItemsOverlay, setShowItemsOverlay] = useState(true);
    // State to manage feedback form visibility
    const [showFeedback, setShowFeedback] = useState(false);

    const cur_video = useRef<HTMLDivElement>(null);

    // If active video is updated, scroll the video into view on the sidebar
    useEffect(() => {
        cur_video.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, [activeVideo]);

    // Hide feedback form when clicking on the map background
    useEffect(() => {
        if (!showFeedback) return;
        const handler = (e: MouseEvent) => {
            // Only close if clicking on the map background (not the form or its children)
            const feedbackForm = document.getElementById("feedback-popout");
            if (feedbackForm && !feedbackForm.contains(e.target as Node)) {
                setShowFeedback(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [showFeedback]);

    // Filter playlists based on the selected handle
    const filteredPlaylists = useMemo(() => {
        if (handle === "") {
            return allPlaylists; // Show all playlists if no handle is selected
        }
        return allPlaylists.filter((playlist) =>
            VideoData.some((item) => item.handle === handle && item.playlistId === playlist.id)
        );
    }, [handle]);

    // Use a memo here to avoid bad side effects from filtering the data
    const display_data = useMemo(() => {
        // Filter data based on the sidebar selectors
        let ret: VideoInfo[] = VideoData;

        if (handle !== "") {
            ret = ret.filter((item) => item.handle === handle); // Filter by handle
        }

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
    }, [handle, playlist, filter]);

    return (
        <div>
            <MapComponent
                data={display_data}
                activeVideo={display_data.find((item) => item.videoId === activeVideo) || null}
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
                <select
                    name="handle-select"
                    onChange={(changeEvent) => {
                        setHandle(changeEvent.target.value);
                        setPlaylist(""); // Reset playlist when handle changes
                    }}
                >
                    <option value="">All Channels</option>
                    {allHandles.map((handle) => (
                        <option value={handle} key={handle}>
                            {handle}
                        </option>
                    ))}
                </select>

                <select
                    name="playlist-select"
                    value={playlist}
                    onChange={(changeEvent) => {
                        setPlaylist(changeEvent.target.value);
                    }}
                >
                    <option value="">All Playlists</option>
                    {filteredPlaylists.map(({ id, name }) => (
                        <option value={id} key={id}>
                            {name}
                        </option>
                    ))}
                </select>

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
                <button
                    onClick={() => setShowFeedback(true)}
                    style={{ marginTop: "10px", marginLeft: "10px", padding: "5px", borderRadius: "3px", cursor: "pointer" }}
                >
                    Feedback
                </button>
            </div>
            {showFeedback && (
                <div
                    id="feedback-popout"
                    style={{
                        position: "fixed",
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                        background: "#222",
                        color: "#fff",
                        padding: "20px",
                        borderRadius: "8px",
                        boxShadow: "0 2px 16px rgba(0,0,0,0.4)",
                        zIndex: 2000,
                        minWidth: "300px"
                    }}
                >
                    <form
                        action="https://formspree.io/f/movdoolb"
                        method="POST"
                        onSubmit={() => setShowFeedback(false)}
                        style={{ display: "flex", flexDirection: "column", gap: "10px" }}
                    >
                        <label htmlFor="suggestion" style={{ color: "#fff" }}>Suggest a feature or update:</label>
                        <input
                            type="text"
                            name="suggestion"
                            id="suggestion"
                            required
                            style={{ padding: "5px", borderRadius: "3px", border: "1px solid #ccc", color: "#000" }}
                        />
                        <button
                            type="submit"
                            style={{ padding: "5px", borderRadius: "3px", cursor: "pointer" }}
                        >
                            Submit Idea
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowFeedback(false)}
                            style={{ padding: "5px", borderRadius: "3px", cursor: "pointer", background: "#444", color: "#fff" }}
                        >
                            Cancel
                        </button>
                    </form>
                </div>
            )}
            {showItemsOverlay && (
                <div id="items-overlay">
                    {display_data.map((item) => (
                        <div
                            ref={item.videoId === activeVideo ? cur_video : undefined}
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
                            Location: {item.location}
                            <br />
                            Coords: {item.geocode?.[0]?.toPrecision(4)}, {item.geocode?.[1]?.toPrecision(4)}
                            <br />
                            Playlist: {item.playlistName}
                        </div>
                    ))}
                </div>
            )}
            <button
                onClick={() => setShowItemsOverlay((prev) => !prev)}
                style={{
                    position: "absolute",
                    bottom: "50px", // Move up so it doesn't overlap the GitHub link
                    left: "10px",
                    padding: "5px",
                    borderRadius: "3px",
                    cursor: "pointer",
                    zIndex: 1000
                }}
            >
                {showItemsOverlay ? "Hide List" : "Show List"}
            </button>
        </div>
    );
};

export default App;