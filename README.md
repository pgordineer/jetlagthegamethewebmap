# Map of Tom Scott videos

Testing

### [View the map here](https://pgordineer.github.io/tom-scott-map/)

Interactive map to explore locations documented by creator [Tom Scott](https://www.youtube.com/channel/UCBa659QWEk1AI4Tg--mrJ2A)

Notice anything off? Issues and PRs welcome!

### Data Pipeline
Youtube API: extract video names and descriptions -> GPT-4o-mini: extract place names from video -> Nominatim API: Geocoding -> Leaflet: Display places

All locations were hand-checked after this process

fork of project from sambaumann
