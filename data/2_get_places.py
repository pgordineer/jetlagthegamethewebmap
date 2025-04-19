import pandas as pd
import json
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()
client = OpenAI()

def truncate_text(text, max_length):
    """Truncate text to a specified maximum length."""
    return text[:max_length] + "..." if len(text) > max_length else text

def get_location(row, additional_data):
    """Fetch the specific filming location based on the transcript, title, and description."""
    video_id = row["videoId"]
    transcript = additional_data.get(video_id, {}).get("transcript", "").strip()
    if transcript:
        transcript = truncate_text(transcript, 3000)  # Limit transcript to ~4 minutes of video
        input_content = f'Transcript: "{transcript}"'
    else:
        title = row.get("title", "No title provided")
        description = row.get("description", "No description provided")
        input_content = f'Title: "{title}", Description: "{description}"'

    completion = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {
                "role": "system",
                "content": (
                    "You are a location assignment assistant for a travel competition race game show. "
                    "Your task is to determine the **specific filming location** based on the provided information.\n\n"
                    "**RULES:**\n"
                    "1. ALWAYS provide a specific location (e.g., 'Landmark, City, (State), Country').\n"
                    "2. PRIORITIZE the transcript if available.\n"
                    "3. Use the title and description only as a fallback.\n"
                    "4. DO NOT respond with vague or unhelpful statements like 'I cannot determine a location' or 'more details are needed.'\n"
                    "5. If the transcript or fallback information mentions a landmark, city, or region, use that directly.\n"
                    "6. If uncertain, make an educated guess based on the context, but guesses must be highly specific.\n"
                    "7. Your response must ONLY contain the specific location (e.g., 'Eiffel Tower, Paris, France')."
                )
            },
            {
                "role": "user",
                "content": input_content
            }
        ]
    )
    return completion.choices[0].message.content.strip()

def process_locations(df, additional_data, data_with_loc):
    """Process locations for videos, skipping already processed ones."""
    new_data_with_loc = []
    total_videos = len(df)  # Remove the 10-item limit
    for idx, (_, row) in enumerate(df.iterrows(), start=1):
        video_id = row["videoId"]

        # Skip processing if the title is "Private video" or if description/transcript indicates private content
        if row.get("title") == "Private video" or \
           row.get("description") == "This video is private." or \
           additional_data.get(video_id, {}).get("transcript") == "Error fetching transcript":
            print(f"[{idx}/{total_videos}] Skipping video ID {video_id} due to private content.")
            row["location"] = "no location found"
        elif video_id in data_with_loc and "location" in data_with_loc[video_id]:
            print(f"[{idx}/{total_videos}] Skipping video ID {video_id}, location already processed.")
            row["location"] = data_with_loc[video_id]["location"]
        else:
            print(f"[{idx}/{total_videos}] Processing location for video ID {video_id}.")
            row["location"] = get_location(row, additional_data)  # Pass additional_data for transcript
        new_data_with_loc.append(row.to_dict())
    print(f"Finished processing {total_videos} videos.")
    return new_data_with_loc

def main():
    # Load dataset and additional data
    with open("./data/combined_data.json", "r", encoding="utf-8") as file:
        data = json.load(file)
    df = pd.DataFrame(data)
    print(f"Loaded {len(df)} videos from the dataset.")

    # Temporary limit to 10 items for testing
    #df = df.head(10)

    with open("./data/additional_data.json", "r", encoding="utf-8") as file:
        additional_data = json.load(file)

    # Load existing data_with_loc.json to avoid reprocessing
    try:
        with open("./data/data_with_loc.json", "r", encoding="utf-8") as file:
            data_with_loc = {entry["videoId"]: entry for entry in json.load(file)}
        print("Loaded existing data_with_loc.json to avoid reprocessing.")
    except FileNotFoundError:
        data_with_loc = {}
        print("No existing data_with_loc.json found. Starting fresh.")

    # Merge truncated descriptions into the DataFrame
    df["description"] = df["videoId"].apply(lambda vid: truncate_text(additional_data.get(vid, {}).get("description", "Description not available"), 100))

    # Process locations
    print("Starting location processing...")
    new_data_with_loc = process_locations(df, additional_data, data_with_loc)

    # Save results back to JSON
    print("Location processing complete. Saving results...")
    with open("./data/data_with_loc.json", "w", encoding="utf-8") as file:
        json.dump(new_data_with_loc, file, ensure_ascii=False, indent=4)
    print("Results saved to data_with_loc.json.")

if __name__ == "__main__":
    main()
