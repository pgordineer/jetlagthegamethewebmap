import pandas as pd
import json
from dotenv import load_dotenv
from os import getenv
import requests

# Define column names explicitly
column_names = ["publishedAt", "title", "description", "videoId", "transcript", "location", "geocode"]

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

# Ensure geocode formatting
def get_coords(geojson):
    try:
        geojson = json.loads(geojson)
        if "features" in geojson and len(geojson["features"]) > 0:
            coords = geojson["features"][0]["geometry"]["coordinates"]
            return [coords[1], coords[0]]  # Swap lat/lng
    except Exception as e:
        print(f"Error parsing geocode: {e}, geojson: {geojson}")
    return None

# Process geocode and log invalid entries
df["geocode"] = df["geocode"].apply(get_coords)

# Debug: Log invalid geocodes
invalid_geocodes = df[df["geocode"].isnull()]
if not invalid_geocodes.empty:
    print("Rows with invalid geocodes (will be excluded):")
    print(invalid_geocodes)

# Exclude rows with null geocode
df = df[df["geocode"].notnull()]
if df.empty:
    print("WARNING: No rows with valid geocodes. Proceeding with all rows for debugging purposes.")
    df = invalid_geocodes  # Keep invalid rows for debugging

# Debug: Print DataFrame after excluding invalid geocodes
print("DataFrame after excluding invalid geocodes (First 5 Rows):")
print(df.head())

# Drop rows with missing required data
df = df.dropna(subset=["publishedAt", "title", "videoId", "location", "transcript"], how="any")
if df.empty:
    raise ValueError("ERROR: DataFrame is empty after dropping rows with missing required data.")

# Debug: Print DataFrame after dropping missing data
print("DataFrame after dropping missing data (First 5 Rows):")
print(df.head())

# Ensure column order matches the expected structure
required_columns = ["publishedAt", "title", "description", "videoId", "transcript", "location", "geocode"]
df = df[required_columns]

# Debug: Check final DataFrame before saving
print("Final DataFrame (First 5 Rows):")
print(df.head())
print("DataFrame Shape:", df.shape)

# Save JSON
if not df.empty:
    print("Saving data to './web/src/data/data.json'...")
    df.to_json("./web/src/data/data.json", orient="records", lines=False)  # Ensure proper JSON formatting
else:
    print("ERROR: DataFrame is empty. JSON export skipped.")

# Save CSV
if not df.empty:
    print("Saving data to './data/4_refined.csv'...")
    df.to_csv("./data/4_refined.csv", index=False)
else:
    print("ERROR: DataFrame is empty. CSV export skipped.")

print("Refinement process completed successfully.")
