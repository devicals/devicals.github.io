import json

def transform_json_to_txt(input_filename, output_filename):
    try:
        with open(input_filename, 'r', encoding='utf-8') as f:
            data = json.load(f)

        tracks = data[0]['tracks']
        
        lines = []
        for track in tracks:
            title = track.get('title', 'Unknown Title')
            artists = ", ".join(track.get('artists', ['Unknown Artist']))
            
            entry = f"{title} @ {artists}"
            
            if any(symbol in entry for symbol in [":", "[", "]", "{", "}"]):
                entry = f'"{entry}"'
            
            lines.append(f"- {entry}")

        with open(output_filename, 'w', encoding='utf-8') as f:
            f.write("\n".join(lines))

        print(f"Successfully created {output_filename} with {len(lines)} tracks.")

    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    transform_json_to_txt('input.json', 'playlist.txt')