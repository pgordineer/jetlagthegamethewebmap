import pandas as pd 
import json
from dotenv import load_dotenv
from os import getenv
import requests

# Define column names explicitly
column_names = ["title", "description", "videoId", "location", "geocode"]

# Load the data with explicit column names and encoding handling
df = pd.read_csv("./data/3_geocoded.csv", names=column_names, header=0, encoding='utf-8-sig')

# Print raw content of the CSV for debugging purposes
print("Raw Data (First 5 Rows):")
print(df.head())

# Strip any extra whitespace from column names
df.columns = df.columns.str.strip()

# Print the column names for debugging
print("Columns after reading CSV:", df.columns)

# Check if 'title' exists
if "title" not in df.columns:
    raise ValueError("ERROR: 'title' column is missing from the input CSV!")

# Drop description safely if it exists
df = df.drop(columns=["description"], errors='ignore')

# Playlists dictionary
playlists = {
    "s1": "PLB7ZcpBcwdC7z1fCZetTI8TPeLlgagF9v",
    "s2": "PLB7ZcpBcwdC7rGYl6StHarkLlgeZX66oL",
    "s3": "PLB7ZcpBcwdC5B-l2FQNOPJVFpqF0QVxfG",
    "s4": "PLB7ZcpBcwdC7ogXbMvwuBSfj3LHVRCqLc",
    "s5": "PLB7ZcpBcwdC4SeH7qNw05wgU03HlRGiiS",
    "s6": "PLB7ZcpBcwdC6OjHpxnkSL2RzbmC2moNt1",
    "s7": "PLB7ZcpBcwdC6wkQRczVE4Fz-4kUOIc3d1",
    "s8": "PLB7ZcpBcwdC6zyXJyImHgVdrC4Vl8SNG9",
    "s9": "PLB7ZcpBcwdC7gTO_IVdiBv8nVPLKbqNa4",
    "s10": "PLB7ZcpBcwdC4dhXkpNzUVsGFZp72v0UqL",
    "s11": "PLB7ZcpBcwdC56V3DHxfFVTMDzera__IFi",
    "s12": "PLB7ZcpBcwdC79KvPUh76PhFZ8x7q18hOW",
    "s13": "PLB7ZcpBcwdC64gYhvs3PyyM_fRKpjq1l0",
}

load_dotenv("./data/.env")
API_KEY = getenv("API_KEY")
URL = "https://www.googleapis.com/youtube/v3/playlistItems"

params = {"key": API_KEY, "part": "snippet", "maxResults": 50}
playlist_matches = {}

# Fetch videos from YouTube playlists
for playlist_name, playlist_id in playlists.items():
    next_token = None
    while True:
        this_request_params = params | {"playlistId": playlist_id}
        if next_token:
            this_request_params["pageToken"] = next_token

        resp = requests.get(URL, this_request_params)
        if resp.status_code != 200:
            print(resp.text)
            raise RuntimeError(f"ERROR: YouTube API returned {resp.status_code}")

        resp = resp.json()
        next_token = resp.get("nextPageToken", None)

        for video in resp["items"]:
            playlist_matches[video["snippet"]["resourceId"]["videoId"]] = playlist_name

        if not next_token:
            break

# Match playlist info
df["playlist"] = df["videoId"].map(playlist_matches)

# Remove rows not in selected playlists
df = df.dropna(subset=["playlist"])

# Ensure geocode formatting
def get_coords(geojson):
    try:
        geojson = json.loads(geojson)
        coords = geojson["features"][0]["geometry"]["coordinates"]
        return [coords[1], coords[0]]  # Swap lat/lng
    except:
        return None

df["geocode"] = df["geocode"].apply(get_coords)

# Add a 'marked' field
df["marked"] = False

# Forcefully include required columns, including title if available
required_columns = ["title", "videoId", "location", "geocode", "playlist", "marked"]

# Ensure that all required columns exist before exporting
df = df[[col for col in required_columns if col in df.columns]]

# Save JSON
df.to_json("./web/src/data/data.json", orient="records")

# Convert geocode to string for CSV output
df["geocode"] = df["geocode"].apply(json.dumps)

# Save CSV
df.to_csv("./data/4_refined.csv", index=False)

print("Export completed successfully!")
