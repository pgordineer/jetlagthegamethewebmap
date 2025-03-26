# %%
import pandas as pd

# %%
df = pd.read_csv("./data.csv", index_col=0)
df

# %%
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()
client = OpenAI()

# %%
def get_location(row):
    completion = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": "given a video description and title, give the location that the video was filmed.\
              If it's not extremely clear, really try your best to guess. Also, absolutely never place videos at the same location, if they are just name a location nearby so they are not duplicates. \
             get as specific of a location as possible with the given inputs even if you have to guess. \
                Especially if there is a bulilding named in the description, this should be the response.\
             Output must be formatted 'location, city, state, country' if applicable. If not applicable, really try your best to get a location that can be geocoded"},
            {
                "role": "user",
                "content": f'title: "{row["title"]}", description:"{row["description"]}"'
            }
        ]
    )

    return completion.choices[0].message.content

responses = df.apply(get_location, axis=1)

# %%
df["location"] = responses

# %%
df.to_csv("./data_with_loc.csv")


