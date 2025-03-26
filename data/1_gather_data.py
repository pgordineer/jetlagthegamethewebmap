from dotenv import load_dotenv
from os import getenv
import requests
import pandas as pd

load_dotenv("./data/.env")

API_KEY = getenv("API_KEY")

handle = "@jetlagthegame"

API = "https://www.googleapis.com/youtube/v3"

# get 'uploads' playlist ID
resp = requests.get(API + "/channels", params={"key": API_KEY, "forHandle": handle, "part": "contentDetails"})
if resp.status_code != 200:
    print(f'Something went wrong! Response code {resp.status_code}, check content: {resp.json()}')
    exit()

playlist_id = resp.json()["items"][0]["contentDetails"]["relatedPlaylists"]["uploads"]
print(f"Playlist ID: {playlist_id}")

params = {
    "key": API_KEY,
    "playlistId": playlist_id,
    "part": "snippet",
    "maxResults": 50  # Maximum number of results per page
}

keyItems = ["publishedAt", "title", "description", "videoId"]

rows = []

while True:
    resp = requests.get(API + "/playlistItems", params=params)
    if resp.status_code != 200:
        print(f'Check response: {resp.status_code}, {resp.json()}')
        exit()

    resp = resp.json()

    for item in resp["items"]:
        item["snippet"]["videoId"] = item["snippet"]["resourceId"]["videoId"]
        rows.append({x: item["snippet"][x] for x in keyItems})

    if "nextPageToken" in resp:
        params["pageToken"] = resp["nextPageToken"]
    else:
        break
    print(f"Number of videos gathered: {len(rows)}")

# Save data to CSV file
export = pd.DataFrame(rows, columns=keyItems)
export.to_csv("./data/data.csv", index=False)
print("Data saved to data.csv")