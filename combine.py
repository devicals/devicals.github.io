import os
from pathlib import Path

def generate_file_structure(directory, ignore_dirs, ignore_files):
    """Generates a text-based tree representing the file structure."""
    lines = [directory.name or str(directory)]
    
    def _build_tree(path, prefix=""):
        try:
            items = sorted(
                [p for p in path.iterdir() if p.name not in ignore_dirs and p.name not in ignore_files],
                key=lambda x: (not x.is_dir(), x.name.lower())
            )
        except PermissionError:
            return
        
        pointers = ["├── "] * (len(items) - 1) + ["└── "] if items else []
        for pointer, item in zip(pointers, items):
            lines.append(f"{prefix}{pointer}{item.name}")
            if item.is_dir():
                extension = "│   " if pointer == "├── " else "    "
                _build_tree(item, prefix + extension)
    
    _build_tree(directory)
    return "\n".join(lines)

def get_all_files(directory, ignore_dirs, ignore_files):
    """Recursively retrieves all files in the directory, skipping ignored ones."""
    file_paths = []
    for root, dirs, files in os.walk(directory):
        dirs[:] = [d for d in dirs if d not in ignore_dirs]
        for file in files:
            if file not in ignore_files:
                file_paths.append(Path(root) / file)
    return sorted(file_paths)

def read_file_content(file_path):
    """Reads file content if it is valid plain text, else returns the fallback string."""
    try:
        if not file_path.is_file() or file_path.is_symlink():
            return "{invalid or not plaintext file content}"
        
        with open(file_path, "rb") as f:
            chunk = f.read(8192)
            if b'\x00' in chunk:
                return "{invalid or not plaintext file content}"
        
        with open(file_path, "r", encoding="utf-8", errors="strict") as f:
            return f.read()
    except (UnicodeDecodeError, PermissionError, IOError):
        return "{invalid or not plaintext file content}"

def main():
    current_dir = Path.cwd()
    output_filename = "combined_contents.txt"
    
    try:
        script_name = Path(__file__).name
    except NameError:
        script_name = "combine_files.py"

    ignore_dirs = {".git", ".github", "__pycache__", "node_modules", ".venv", "venv", ".idea", ".vscode"}
    ignore_files = {script_name, output_filename, ".DS_Store"}

    file_structure = generate_file_structure(current_dir, ignore_dirs, ignore_files)

    all_files = get_all_files(current_dir, ignore_dirs, ignore_files)
    total_files = len(all_files)

    output_path = current_dir / output_filename

    with open(output_path, "w", encoding="utf-8") as out_file:
        out_file.write(f"Total Files: {total_files}\n")
        out_file.write("File Structure:\n")
        out_file.write(f"{file_structure}\n\n")

        for file_path in all_files:
            relative_path = file_path.relative_to(current_dir)
            content = read_file_content(file_path)

            out_file.write("---\n\n")
            out_file.write(f"File: {relative_path}\n")
            out_file.write("Contents:\n")
            out_file.write("(CONTENT START)\n\n")
            out_file.write(f"{content}\n\n")
            out_file.write("(CONTENT END)\n\n")

    print(f"Extraction complete. Combined contents of {total_files} files written to '{output_filename}'")

if __name__ == "__main__":
    main()