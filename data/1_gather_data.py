import sys
print("Python executable:", sys.executable)

from dotenv import load_dotenv
from os import getenv
import requests
import pandas as pd
from youtube_transcript_api import YouTubeTranscriptApi, TranscriptsDisabled, NoTranscriptFound
import csv
import os

def load_api_key():
    load_dotenv("./data/.env")
    api_key = getenv("API_KEY")
    if not api_key:
        raise ValueError("API_KEY not found in environment variables.")
    print("API key loaded successfully.")
    return api_key

def get_uploads_playlist_id(api_key, handle):
    print(f"Fetching uploads playlist ID for handle: {handle}...")
    url = "https://www.googleapis.com/youtube/v3/channels"
    params = {"key": api_key, "forHandle": handle, "part": "contentDetails"}
    resp = requests.get(url, params=params)
    if resp.status_code != 200:
        raise Exception(f"Error fetching playlist ID: {resp.status_code}, {resp.json()}")
    print(f"Uploads playlist ID fetched: {resp.json()['items'][0]['contentDetails']['relatedPlaylists']['uploads']}")
    return resp.json()["items"][0]["contentDetails"]["relatedPlaylists"]["uploads"]

def fetch_videos(api_key, playlist_id):
    print(f"Fetching videos from playlist ID: {playlist_id}...")
    url = "https://www.googleapis.com/youtube/v3/playlistItems"
    params = {
        "key": api_key,
        "playlistId": playlist_id,
        "part": "snippet",
        "maxResults": 50
    }
    key_items = ["publishedAt", "title", "description", "videoId"]
    rows = []

    while True:
        resp = requests.get(url, params=params)
        if resp.status_code != 200:
            raise Exception(f"Error fetching videos: {resp.status_code}, {resp.json()}")
        data = resp.json()

        for item in data["items"]:
            item["snippet"]["videoId"] = item["snippet"]["resourceId"]["videoId"]
            rows.append({x: item["snippet"][x] for x in key_items})

        if "nextPageToken" in data:
            params["pageToken"] = data["nextPageToken"]
        else:
            break
        print(f"Number of videos gathered: {len(rows)}")
    print(f"Total videos fetched: {len(rows)}")
    return rows

def fetch_transcript(video_id):
    print(f"Fetching transcript for video ID: {video_id}...")
    try:
        transcript = YouTubeTranscriptApi.get_transcript(video_id, languages=['en'])
        print(f"Transcript fetched successfully for video ID: {video_id}")
        return " ".join([entry["text"].replace(",", " ") for entry in transcript])  # Replace commas to avoid CSV issues
    except (TranscriptsDisabled, NoTranscriptFound):
        print(f"Transcript not available for video ID: {video_id}")
        return "Transcript not available"
    except Exception as e:
        print(f"Error fetching transcript for video {video_id}: {e}")
        return "Error fetching transcript"

def load_cached_data(filepath):
    print(f"Loading cached data from {filepath}...")
    if os.path.exists(filepath):
        try:
            cached_data = pd.read_csv(filepath).to_dict(orient="records")
            print(f"Cached data loaded successfully. Total cached videos: {len(cached_data)}")
            return cached_data
        except Exception as e:
            print(f"Error loading cached data: {e}")
            return []
    print("No cached data found.")
    return []

def save_to_csv(data, filepath):
    print(f"Saving data to {filepath}...")
    try:
        # Ensure proper CSV format with all fields quoted
        with open(filepath, mode="w", newline="", encoding="utf-8") as file:
            writer = csv.DictWriter(
                file, 
                fieldnames=["publishedAt", "title", "description", "videoId", "transcript"], 
                quoting=csv.QUOTE_ALL  # Quote all fields to handle special characters
            )
            writer.writeheader()
            for row in data:
                # Ensure transcript field is always present
                row["transcript"] = row.get("transcript", "Transcript not available")
                writer.writerow(row)
        print(f"Data saved successfully to {filepath}. Total videos saved: {len(data)}")
    except Exception as e:
        print(f"Error saving to CSV: {e}")

def main():
    try:
        print("Starting data gathering process...")
        api_key = load_api_key()
        handle = "@jetlagthegame"
        playlist_id = get_uploads_playlist_id(api_key, handle)
        print(f"Playlist ID: {playlist_id}")
        videos = fetch_videos(api_key, playlist_id)

        # Load cached data
        cache_filepath = "./data/data.csv"
        cached_data = load_cached_data(cache_filepath)
        cached_video_ids = {video["videoId"] for video in cached_data}

        # Fetch transcripts only for new videos
        for idx, video in enumerate(videos, start=1):
            print(f"Processing video {idx}/{len(videos)}: {video['title']} (ID: {video['videoId']})")
            if video["videoId"] not in cached_video_ids:
                video["transcript"] = fetch_transcript(video["videoId"])
                print(f"Transcript fetched for video ID: {video['videoId']}")
            else:
                # Use cached transcript
                cached_video = next((v for v in cached_data if v["videoId"] == video["videoId"]), {})
                video["transcript"] = cached_video.get("transcript", "Transcript not available")
                print(f"Transcript loaded from cache for video ID: {video['videoId']}")

        save_to_csv(videos, cache_filepath)
        print("Data gathering process completed successfully.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()