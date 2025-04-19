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

// Map titles to playlist categoriest categories
const titleToPlaylistMapping: { [key: string]: string } = {
    "Connect 4": "s1",
    "Circumnavigation": "s2",
    "Tag EUR It": "s3",: "s3",
    "Battle 4 America": "s4",
    "Race to the End of the World": "s5","s5",
    "Capture the Flag": "s6",
    "Tag EUR It 2": "s7",
    "Arctic Escape": "s8",
    "Hide + Seek: Switzerland": "s9",": "s9",
    "Au$tralia": "s10",
    "Tag EUR It 3": "s11",
    "Hide + Seek: Japan": "s12",: "s12",
    "Schengen Showdown": "s13",
};  "New Zealand Into a Real-Life Board Game": "s14"
};
// Reverse mapping for dropdown display
const playlistToTitleMapping: { [key: string]: string } = Object.entries(titleToPlaylistMapping).reduce(
    (acc, [title, playlist]) => {key: string]: string } = Object.entries(titleToPlaylistMapping).reduce(
        acc[playlist] = title;> {
        return acc;t] = title;
    },  return acc;
    {} as { [key: string]: string }
);  {} as { [key: string]: string }
);
let App = () => {
    //active video that is highlighted on the screen
    const [activeVideo, setActiveVideo] = useState("")
    //selector for playlist (updated in sidebar)te("")
    const [playlist, setPlaylist] = useState("")
    //selector for text filterst] = useState("")
    const [filter, setFilter] = useState("")
    const [filter, setFilter] = useState("")
    const cur_video = useRef<HTMLElement>(null)
    const cur_video = useRef<HTMLElement>(null)
    //if active video is updateed, scroll the video into view on the sidebar
    useEffect(() => { is updateed, scroll the video into view on the sidebar
        cur_video.current?.scrollIntoView({ behavior: "smooth", block: "nearest" })
    }, [activeVideo])rent?.scrollIntoView({ behavior: "smooth", block: "nearest" })
    }, [activeVideo])
    //need to use a memo here, otherwise filtering the data creates bad side effects down the line
    const display_data = useMemo(() => { filtering the data creates bad side effects down the line
        // Filter data based on the sidebar selectors
        let ret: VideoInfo[] = [];e sidebar selectors
        if (playlist !== "") { [];
            const mappedTitle = playlistToTitleMapping[playlist];
            ret = VideoData.filter((item) => item.title.includes(mappedTitle));
        } else {= VideoData.filter((item) => item.title.includes(mappedTitle));
            ret = VideoData;
        }   ret = VideoData;
        }
        if (filter !== "") {
            ret = ret.filter((item) => {
                return item.title.toLowerCase().includes(filter.toLowerCase());
            }); return item.title.toLowerCase().includes(filter.toLowerCase());
        }   });
        return ret;
    }, [playlist, filter]);
    }, [playlist, filter])
    return <div>
        <MapComponent data={display_data} activeVideo={activeVideo} setActiveVideo={setActiveVideo}></MapComponent>
        <div id="sidebar" className='roboto-sidebar'>={activeVideo} setActiveVideo={setActiveVideo}></MapComponent>
            <div className='sticky-selectors'>debar'>
                <select name='playlist-select' onChange={(changeEvent) => {
                    setPlaylist(changeEvent.target.value)(changeEvent) => {
                }}> setPlaylist(changeEvent.target.value)
                    <option value="">All Playlists</option>
                    {Object.entries(playlistToTitleMapping).map(([playlist, title]) => (
                        <option value={playlist} key={playlist}>{title}</option>e]) => (
                    ))} <option value={playlist} key={playlist}>{title}</option>
                </select>
                </select>
                <input type="search" placeholder="filter" name="TextFilter" onChange={(changeEvent) => {
                    setFilter(changeEvent.target.value)r" name="TextFilter" onChange={(changeEvent) => {
                }}></input>er(changeEvent.target.value)
            </div>></input>
            </div>
            {
                display_data.map((item) => {
                    return <div className={"sidebar-item" + (item.videoId == activeVideo ? " active-video" : "")}
                        onClick={() => {e={"sidebar-item" + (item.videoId == activeVideo ? " active-video" : "")}
                            setActiveVideo(item.videoId);
                        }}  setActiveVideo(item.videoId);
                        ref={(elem) => {
                            if (item.videoId == activeVideo) {
                                cur_video.current = elem;eo) {
                            }   cur_video.current = elem;
                        }}  }
                        key={item.videoId}>
                        Title: {item.title}
                        <br /> {item.title}
                        Location: {item.geocode?.[0]?.toPrecision(4)}, {item.geocode?.[1]?.toPrecision(4)}
                    </div>cation: {item.geocode?.[0]?.toPrecision(4)}, {item.geocode?.[1]?.toPrecision(4)}
                })  </div>
            }   })
        </div>
    </div>div>
}   </div>
}
export default App
export default App