import { useState, useEffect, useRef, useMemo } from "react"
import MapComponent from "./MapComponent"
import data from "./data/data.json"
import "./style.css"

export interface VideoInfo {
    publishedAt?: string; // Made optional
    title: string;
    videoId: string;
    location: string;
    geocode: [number, number] | null; // Ensure geocode is parsed into a coordinate pair
    transcript: any; // Updated to match parsed type
    playlist: "ap" | "tymnk" | "bfs";
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
        playlist: (item.playlist || "ap") as "ap" | "tymnk" | "bfs", // Default to "ap" if missing
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

const playlistMapping: { [key: string]: "ap" | "tymnk" | "bfs" } = {
    "s1": "ap",
    "s2": "tymnk",
    "s3": "bfs",
    // Add other mappings as needed
};

let App = () => {
    //active video that is highlighted on the screen
    const [activeVideo, setActiveVideo] = useState("")
    //selector for playlist (updated in sidebar)
    const [playlist, setPlaylist] = useState("")
    //selector for text filter
    const [filter, setFilter] = useState("")

    const cur_video = useRef<HTMLElement>(null)

    //if active video is updateed, scroll the video into view on the sidebar
    useEffect(() => {
        cur_video.current?.scrollIntoView({ behavior: "smooth", block: "nearest" })
    }, [activeVideo])

    //need to use a memo here, otherwise filtering the data creates bad side effects down the line
    const display_data = useMemo(() => {
        // Filter data based on the sidebar selectors
        let ret: VideoInfo[] = [];
        if (playlist !== "") {
            const mappedPlaylist = playlistMapping[playlist];
            ret = VideoData.filter((item) => item.playlist === mappedPlaylist);
        } else {
            ret = VideoData;
        }

        if (filter !== "") {
            ret = ret.filter((item) => {
                return item.title.toLowerCase().includes(filter.toLowerCase());
            });
        }
        return ret;
    }, [playlist, filter])


    return <div>
        <MapComponent data={display_data} activeVideo={activeVideo} setActiveVideo={setActiveVideo}></MapComponent>
        <div id="sidebar" className='roboto-sidebar'>
            <div className='sticky-selectors'>
                <select name='playlist-select' onChange={(changeEvent) => {
                    setPlaylist(changeEvent.target.value)
                }
                }>
                    <option value="">All Playlists</option>
                    <option value="s1">Connect 4</option>
                    <option value="s2">Circumnavigation</option>
                    <option value="s3">Tag EUR It</option>
                    <option value="s4">Battle 4 America</option>
                    <option value="s5">Race to the End of the World</option>
                    <option value="s6">Capture the Flag</option>
                    <option value="s7">Tag EUR It 2</option>
                    <option value="s8">Arctic Escape</option>
                    <option value="s9">Hide + Seek: Switzerland</option>
                    <option value="s10">Au$tralia</option>
                    <option value="s11">Tag EUR It 3</option>
                    <option value="s12">Hide + Seek: Japan</option>
                    <option value="s13">Schengen Showdown</option>
                </select>

                <input type="search" placeholder="filter" name="TextFilter" onChange={(changeEvent) => {
                    setFilter(changeEvent.target.value)
                }}></input>
            </div>

            {
                display_data.map((item) => {
                    return <div className={"sidebar-item" + (item.videoId == activeVideo ? " active-video" : "")}
                        onClick={() => {
                            setActiveVideo(item.videoId);
                        }}
                        ref={(elem) => {
                            if (item.videoId == activeVideo) {
                                cur_video.current = elem;
                            }
                        }}
                        key={item.videoId}>
                        Title: {item.title}
                        <br />
                        Location: {item.geocode?.[0]?.toPrecision(4)}, {item.geocode?.[1]?.toPrecision(4)}
                    </div>
                })
            }
        </div>
    </div>
}

export default App