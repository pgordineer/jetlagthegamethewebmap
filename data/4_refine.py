import pandas as pd
import json
from dotenv import load_dotenv
from os import getenv
import requests

#get the data
df = pd.read_csv("./data/3_geocoded.csv", index_col=0)

#first, remove the description column, not needed for web display
df = df.drop(columns=["description"])

#pull the selected playlists, add a column to describe 
playlists = {
    "s1": "PLB7ZcpBcwdC7z1fCZetTI8TPeLlgagF9v", #Connect 4
    "s2": "PLB7ZcpBcwdC7rGYl6StHarkLlgeZX66oL", #Circumnavigation
    "s3": "PLB7ZcpBcwdC5B-l2FQNOPJVFpqF0QVxfG", #Tag EUR It
    "s4": "PLB7ZcpBcwdC7ogXbMvwuBSfj3LHVRCqLc", #Battle 4 America
    "s5": "PLB7ZcpBcwdC4SeH7qNw05wgU03HlRGiiS", #Race to the End of the World
    "s6": "PLB7ZcpBcwdC6OjHpxnkSL2RzbmC2moNt1", #Capture the Flag
    "s7": "PLB7ZcpBcwdC6wkQRczVE4Fz-4kUOIc3d1", #Tag EUR It 2
    "s8": "PLB7ZcpBcwdC6zyXJyImHgVdrC4Vl8SNG9", #Arctic Escape
    "s9": "PLB7ZcpBcwdC7gTO_IVdiBv8nVPLKbqNa4", #Hide + Seek: Switzerland
    "s10": "PLB7ZcpBcwdC4dhXkpNzUVsGFZp72v0UqL", #Au$tralia
    "s11": "PLB7ZcpBcwdC56V3DHxfFVTMDzera__IFi", #Tag EUR It 3
    "s12": "PLB7ZcpBcwdC79KvPUh76PhFZ8x7q18hOW", #Hide + Seek: Japan
    "s13": "PLB7ZcpBcwdC64gYhvs3PyyM_fRKpjq1l0", #Schengen Showdown
}


load_dotenv("./data/.env")

API_KEY = getenv("API_KEY")

URL = "https://www.googleapis.com/youtube/v3/playlistItems"

params = {
    "key": API_KEY,
    "part": "snippet",
    "maxResults": 50
}

playlist_matches = {}

for playlist in playlists.items():
    next_token = None
    playlist_name = playlist[0]
    playlist_id = playlist[1]
    while(True):
        this_request_params = params | {"playlistId": playlist_id}
        if next_token is not None:
            this_request_params |= {"pageToken": next_token}

        resp = requests.get(URL, this_request_params)
    
        if resp.status_code != 200:
            print(resp.text)
            print(f"ERROR, status code: {resp.status_code}")
            exit()

        resp = resp.json()

        next_token = resp.get("nextPageToken", None)

        for video in resp["items"]:
            playlist_matches[video["snippet"]["resourceId"]["videoId"]] = playlist_name
            
        
        if next_token is None:
            break
    
#match all videos found in playlists with their 
df["playlist"] = df["videoId"].apply(lambda x: playlist_matches.get(x, None))

#remove all videos not in these playlists
df = df.dropna(subset=["playlist"])

#now, take all the geoJson elements and just extract the x and y to reduce json payload size
def get_coords(geojson):
    try:
        geojson = json.loads(geojson)
        geojson = geojson["features"][0]["geometry"]["coordinates"]
        #geojson stores lng,lat, while leaflet expects lat,lng
        geojson[0], geojson[1] = geojson[1], geojson[0]
        return geojson
    except:
        pass

df["geocode"] = df["geocode"].apply(get_coords)

#add a 'marked' field to show when the data has been hand checked
df["marked"] = False

df.to_json("./web/src/data/data.json", orient="records")
#the exported CSV does not automatically format csv correctly so convert it to string first
df["geocode"] = df["geocode"].apply(json.dumps)
df.to_csv("./data/4_refined.csv")