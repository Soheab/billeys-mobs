import os

"""
A script to create .mcaddon files from Minecraft Bedrock behavior and resource packs.
This script searches for version directories containing both behavior ('billbpack') 
and resource ('billrpack') packs, and combines them into .mcaddon files. The script 
maintains the following directory structure:
- Source packs are read from './versions/{version_number}/'
- Generated .mcaddon files are saved to './mcaddons/'
Functions:
    get_versions() -> list[str]: 
        Gets a sorted list of version directory paths containing numeric directory names.
    get_files_with_packs(version_dirs: list[str]) -> list[str]:
        Filters version directories to only those containing both behavior and resource packs.
    create_mcaddon(pack_dir: str, destination_dir: str) -> None:
        Creates a .mcaddon file from the packs in the given directory.
    main() -> None:
        Main execution function that orchestrates the .mcaddon creation process.

The script will:
1. Create necessary directories if they don't exist
2. Find all version directories containing both pack types
3. Create .mcaddon files for each valid version
4. Skip existing .mcaddon files to prevent duplication
"""
import zipfile  # noqa: E402

source_dir = "./versions"
destination_dir = "./mcaddons"


def get_versions() -> list[str]:
    if not os.path.exists(source_dir):
        os.makedirs(source_dir)
        print(f"Created source directory: {source_dir}")
        return []

    return sorted(
        os.path.join(root, dir_name)
        for root, dirs, _ in os.walk(source_dir)
        for dir_name in dirs
        if dir_name.isdigit()
    )


def get_files_with_packs(version_dirs: list[str]) -> list[str]:
    return [
        version_dir
        for version_dir in version_dirs
        if all(
            any(pack_type in file for file in os.listdir(version_dir))
            for pack_type in ("billbpack", "billrpack")
        )
    ]


def create_mcaddon(pack_dir: str, destination_dir: str) -> None:
    version_path = os.path.relpath(pack_dir, source_dir)
    zip_name = f"Billey's Mobs {version_path.replace(os.sep, '.')}.mcaddon"
    zip_path = os.path.join(destination_dir, zip_name)

    if os.path.exists(zip_path):
        print(f"Skipping {zip_name} - already exists")
        return

    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zipf:
        for file in os.listdir(pack_dir):
            if "billbpack" in file or "billrpack" in file:
                file_path = os.path.join(pack_dir, file)
                zipf.write(file_path, file)

    print(f"Created {zip_name}")


def main() -> None:
    versions = get_versions()
    pack_files = get_files_with_packs(versions)

    os.makedirs(destination_dir, exist_ok=True)

    print(f"Found {len(pack_files)} files with packs:")
    for pack_dir in pack_files:
        create_mcaddon(pack_dir, destination_dir)

    print("All files processed.")


if __name__ == "__main__":
    main()
