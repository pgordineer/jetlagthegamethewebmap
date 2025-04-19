import pandas as pd
import json
from dotenv import load_dotenv
from os import getenv
import requests

# Define column names explicitly
column_names = ["title", "description", "videoId", "location", "geocode", "transcript"]

# Load the data with explicit column names and encoding handling
print("Loading data from './data/3_geocoded.csv'...")
df = pd.read_csv("./data/3_geocoded.csv", names=column_names, header=0, encoding='utf-8-sig')

# Debug: Print raw content of the CSV for verification
print("Raw Data (First 5 Rows):")
print(df.head())

# Strip any extra whitespace from column names
df.columns = df.columns.str.strip()

# Debug: Print the column names for verification
print("Columns after reading CSV:", df.columns)

# Check if required columns exist
missing_columns = [col for col in ["title", "videoId", "location", "geocode", "transcript"] if col not in df.columns]
if missing_columns:
    raise ValueError(f"ERROR: Missing required columns in the input CSV: {missing_columns}")

# Drop description safely if it exists
df = df.drop(columns=["description"], errors='ignore')

# Debug: Check for missing or empty rows
print("Checking for missing data...")
print(df.isnull().sum())

# Drop rows with missing required data
df = df.dropna(subset=["title", "videoId", "location", "geocode", "transcript"], how="any")
if df.empty:
    raise ValueError("ERROR: DataFrame is empty after dropping rows with missing required data.")

# Debug: Print DataFrame after dropping missing data
print("DataFrame after dropping missing data (First 5 Rows):")
print(df.head())

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

# Debug: Check for unmatched videos
print("Unmatched videos (no playlist):")
print(df[df["playlist"].isnull()])

# Remove rows not in selected playlists
df = df.dropna(subset=["playlist"])
if df.empty:
    raise ValueError("ERROR: DataFrame is empty after filtering for playlists.")

# Debug: Print DataFrame after playlist matching
print("DataFrame after playlist matching (First 5 Rows):")
print(df.head())

# Ensure geocode formatting
def get_coords(geojson):
    try:
        geojson = json.loads(geojson)
        coords = geojson["features"][0]["geometry"]["coordinates"]
        return [coords[1], coords[0]]  # Swap lat/lng
    except:
        return None

df["geocode"] = df["geocode"].apply(get_coords)

# Debug: Check for invalid geocodes
print("Rows with invalid geocodes:")
print(df[df["geocode"].isnull()])

# Add a 'marked' field
df["marked"] = False

# Forcefully include required columns, including transcript
required_columns = ["title", "videoId", "location", "geocode", "transcript", "playlist", "marked"]

# Ensure that all required columns exist before exporting
df = df[[col for col in required_columns if col in df.columns]]

# Debug: Check final DataFrame before saving
print("Final DataFrame (First 5 Rows):")
print(df.head())
print("DataFrame Shape:", df.shape)

# Save JSON
if not df.empty:
    print("Saving data to './web/src/data/data.json'...")
    df.to_json("./web/src/data/data.json", orient="records")
else:
    print("ERROR: DataFrame is empty. JSON export skipped.")

# Save CSV
if not df.empty:
    print("Saving data to './data/4_refined.csv'...")
    df.to_csv("./data/4_refined.csv", index=False)
else:
    print("ERROR: DataFrame is empty. CSV export skipped.")

print("Refinement process completed successfully.")
