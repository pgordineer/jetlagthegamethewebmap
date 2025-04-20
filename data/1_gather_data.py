import sys
print("Python executable:", sys.executable)

from dotenv import load_dotenv
from os import getenv
import requests
import pandas as pd
from youtube_transcript_api import YouTubeTranscriptApi, TranscriptsDisabled, NoTranscriptFound
import json  # Add JSON module for handling JSON files
import os

def load_api_key():
    load_dotenv("./data/.env")
    api_key = getenv("API_KEY")
    if not api_key:
        raise ValueError("API_KEY not found in environment variables.")
    print("API key loaded successfully.")
    return api_key

def get_channel_playlists(api_key, channel_id):
    print(f"Fetching all playlists for channel ID: {channel_id}...")
    api_url = "https://www.googleapis.com/youtube/v3/playlists"
    params = {
        "key": api_key,
        "channelId": channel_id,
        "part": "snippet",
        "maxResults": 50
    }
    playlists = {}

    while True:
        resp = requests.get(api_url, params=params)
        if resp.status_code != 200:
            print(f"Error fetching playlists! Response code: {resp.status_code}, content: {resp.json()}")
            raise Exception("Failed to retrieve playlists.")
        
        data = resp.json()
        for item in data["items"]:
            playlist_id = item["id"]
            playlist_title = item["snippet"]["title"]
            playlists[playlist_title] = playlist_id

        if "nextPageToken" in data:
            params["pageToken"] = data["nextPageToken"]
        else:
            break

    print(f"Playlists fetched successfully: {list(playlists.keys())}")
    return playlists

def fetch_videos_from_playlist(api_key, playlist_id, playlist_name):
    print(f"Fetching videos from playlist: {playlist_name} (ID: {playlist_id})...")
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
            video_data = {x: item["snippet"][x] for x in key_items}
            video_data["playlistId"] = playlist_id
            video_data["playlistName"] = playlist_name  # Add playlist name to each video
            rows.append(video_data)

        if "nextPageToken" in data:
            params["pageToken"] = data["nextPageToken"]
        else:
            break

        print(f"Number of videos gathered so far: {len(rows)}")

    print(f"Total videos fetched from playlist {playlist_name} (ID: {playlist_id}): {len(rows)}")
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
            with open(filepath, "r", encoding="utf-8") as file:
                cached_data = json.load(file)
            print(f"Cached data loaded successfully. Total cached videos: {len(cached_data)}")
            return cached_data
        except Exception as e:
            print(f"Error loading cached data: {e}")
            return []
    print("No cached data found.")
    return []

def validate_cached_data(cached_data):
    print("Validating cached data...")
    valid_data = []
    for video in cached_data:
        # Ensure all required fields are present and properly formatted
        if all(key in video for key in ["publishedAt", "title", "description", "videoId", "transcript"]):
            valid_data.append(video)
        else:
            print(f"Invalid entry found and skipped: {video}")
    print(f"Validation complete. Valid entries: {len(valid_data)} / {len(cached_data)}")
    return valid_data

def save_to_json(data, filepath):
    print(f"Saving data to {filepath}...")
    try:
        with open(filepath, "w", encoding="utf-8") as file:
            json.dump(data, file, ensure_ascii=False, indent=4)  # Save JSON with proper formatting
        print(f"Data saved successfully to {filepath}. Total videos saved: {len(data)}")
    except Exception as e:
        print(f"Error saving to JSON: {e}")

def save_to_combined_json(data, filepath):
    """Save combined data to a single JSON file."""
    print(f"Saving combined data to {filepath}...")
    try:
        with open(filepath, "w", encoding="utf-8") as file:
            json.dump(data, file, ensure_ascii=False, indent=4)
        print(f"Combined data saved successfully to {filepath}.")
    except Exception as e:
        print(f"Error saving combined data: {e}")

def load_additional_data(filepath):
    print(f"Loading additional data (descriptions and transcripts) from {filepath}...")
    if os.path.exists(filepath):
        try:
            with open(filepath, "r", encoding="utf-8") as file:
                additional_data = json.load(file)
            print(f"Additional data loaded successfully. Total entries: {len(additional_data)}")
            return additional_data
        except Exception as e:
            print(f"Error loading additional data: {e}")
            return {}
    print("No additional data found.")
    return {}

def save_additional_data(data, filepath):
    print(f"Saving additional data (descriptions and transcripts) to {filepath}...")
    try:
        with open(filepath, "w", encoding="utf-8") as file:
            json.dump(data, file, ensure_ascii=False, indent=4)
        print(f"Additional data saved successfully to {filepath}. Total entries: {len(data)}")
    except Exception as e:
        print(f"Error saving additional data: {e}")

# Remove duplicate video entries based on videoId
def remove_duplicates(data):
    """Remove duplicate entries from the data based on videoId."""
    seen_video_ids = set()
    unique_data = []
    for entry in data:
        if entry["videoId"] not in seen_video_ids:
            unique_data.append(entry)
            seen_video_ids.add(entry["videoId"])
    return unique_data

# Update main to save combined JSON with handle

def main():
    try:
        print("Starting data gathering process...")
        api_key = load_api_key()
        handles = ["@jetlagthegame", "@Beardmeatsfood", "@KaraandNate"]  # List of YouTube channel handles

        combined_data = []  # List to store all data with handles

        for handle in handles:
            print(f"Processing handle: {handle}")

            # Fetch channel details to get the channel ID
            channel_api_url = "https://www.googleapis.com/youtube/v3/channels"
            channel_params = {"key": api_key, "forHandle": handle, "part": "id"}
            channel_resp = requests.get(channel_api_url, params=channel_params)
            if channel_resp.status_code != 200:
                print(f"Error fetching channel ID for {handle}! Response code: {channel_resp.status_code}, content: {channel_resp.json()}")
                raise Exception("Failed to retrieve channel ID.")
            channel_id = channel_resp.json()["items"][0]["id"]

            # Fetch all playlists for the channel
            playlists = get_channel_playlists(api_key, channel_id)

            all_videos = []
            additional_data = load_additional_data("./data/additional_data.json")  # Load existing additional data

            for playlist_name, playlist_id in playlists.items():
                print(f"Processing playlist: {playlist_name} (ID: {playlist_id})")
                videos = fetch_videos_from_playlist(api_key, playlist_id, playlist_name)

                for video in videos:
                    video_id = video["videoId"]

                    # Skip processing if the title is "Private video"
                    if video["title"] == "Private video":
                        print(f"Skipping private video with ID: {video_id}")
                        continue

                    if video_id not in additional_data:
                        # Fetch transcript and add description
                        transcript = fetch_transcript(video_id)
                        additional_data[video_id] = {
                            "description": video["description"],
                            "transcript": transcript
                        }
                    else:
                        print(f"Transcript and description already cached for video ID: {video_id}")

                    # Remove description and transcript from the main video data
                    video.pop("description", None)

                    # Add handle to video data
                    video["handle"] = handle

                all_videos.extend(videos)

            combined_data.extend(all_videos)

            # Save additional data (descriptions and transcripts) to JSON
            additional_data_filepath = "./data/additional_data.json"
            save_additional_data(additional_data, additional_data_filepath)

        # Remove duplicates before saving combined data
        combined_data = remove_duplicates(combined_data)

        # Save combined data to a single JSON file
        combined_data_filepath = "./data/combined_data.json"
        save_to_combined_json(combined_data, combined_data_filepath)

        print("Data gathering process completed successfully.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()