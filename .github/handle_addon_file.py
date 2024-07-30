from collections import defaultdict
import os
import pathlib
import sys
from typing import final


# versions dir
versions_dir = pathlib.Path("versions")
latest_dir = versions_dir / "latest"

def ensure_necessary_files_exist() -> None:
    # create the versions directory if it doesn't exist
    if not versions_dir.exists():
        versions_dir.mkdir()
        #print(f"Created {versions_dir}")

    if not latest_dir.exists():
        latest_dir.mkdir()
        #print(f"Created {latest_dir}")


def get_version_from_file(file: pathlib.Path) -> str | None:
    *names, version = file.stem.split(" ")
    if not names:
        *names, version = file.stem.split("_")

    if not names or not version:
        return None

    return version

def get_latest_version() -> str | None:
    a = ["billbpack", "billrpack", "latest"]
    final_versions = {}

    # recursively traverse the versions directory and collect all version files
    def traverse_directory(directory: pathlib.Path, version_dict: dict) -> None:
        for file in directory.iterdir():
            if file.name in a:
                continue

            if file.is_dir():
                version_dict[file.name] = {}
                traverse_directory(file, version_dict[file.name])
            else:
                version_dict[file.parent.name] = {}

    traverse_directory(versions_dir, final_versions)
    latest_version = ""
    version_dict = final_versions
    while version_dict.keys() and isinstance(version_dict, dict):
        latest_key = max(version_dict.keys())
        latest_version += f"{latest_key}."
        version_dict = version_dict[latest_key]
    
    return latest_version.rstrip(".") or None

def update_latest_dir(parsed_version: str, latest_version: str) -> None:
    # check if the parsed version is greater than the latest version
    if parsed_version < latest_version:
        print(f"Version {parsed_version} is less than the latest version {latest_version}")
        return

    latest_version_dir = versions_dir / os.sep.join(latest_version.split("."))
    import shutil

    shutil.rmtree(latest_dir, ignore_errors=True)
    if latest_version_dir:
        shutil.copytree(latest_version_dir, latest_dir)


def handle_addon_file(addon_file: pathlib.Path) -> str:
    version = get_version_from_file(addon_file)
    if not version:
        return ""

    versions = version.split(".")

    dirs_to_create = []

    version_dir: pathlib.Path | None = None
    # create a dir in major.patch if the patch exists

    for version in versions:
        if version_dir is None:
            version_dir = versions_dir / version
        else:
            version_dir = version_dir / version

        dirs_to_create.append(version_dir)


    if all(dir_to_create.exists() for dir_to_create in dirs_to_create):
        version = ".".join(versions)
        # delete it
        addon_file.unlink()
        return ""

    for dir_to_create in dirs_to_create:
        if not dir_to_create.exists():
            dir_to_create.mkdir()

    # print(f"version: {version}")

    # change the file ext to .zip
    new_file = addon_file.with_suffix(".zip")
    addon_file.rename(new_file)

    # unzip the file and move the zip and contents to the versions directory per version
    # unzip the file
    import time
    import zipfile
    with zipfile.ZipFile(new_file, "r") as zip_ref:
        zip_ref.extractall(version_dir)

    new_file.unlink()
    # print(f"Deleted {new_file}")

    return ".".join(versions)

# echo "Output: $INPUT_STORE"
# IFS=$' ' read -ra STORE_ARRAY <<< "$INPUT_STORE"
# echo "Array: ${STORE_ARRAY[@]}"
# for store in "${STORE_ARRAY[@]}"; do
#    echo "creating tag for: $store"
#    if [[ -n $store ]]; then
#    # Process each store here
#    git tag -a v$store -m "Version $store"
#    git push origin v$store
#    echo "Tag created for: v$store"
#    fi

# git config --local user.email "action@github.com"
# git config --local user.name "GitHub Action"
# git add -A
# git commit -m "Unpacked latest .mcaddon file"
# git push
def create_tag(version: str) -> None:
    if not version:
        print("No version provided")
        return

    commands = [
        'git config --local user.email "action@github.com"',
        'git config --local user.name "GitHub Action"',
        f"git tag -a v{version} -m 'Version {version}'",
        f"git push origin v{version}",
    ]

    os.system(" && ".join(commands))
    print(f"Tag created for: v{version}")

def push_and_create_tag(version: str) -> None:
    # fmt: off
    commands = [
        'git config --local user.email "action@github.com"',
        'git config --local user.name "GitHub Action"',
        'git add -A',
        f'git commit -m "Unpacked addon version {version}"',
        'git push',
    ]

    # run all commandds on the ubuntu machine at once
    os.system(" && ".join(commands))
    print(f"Pushed version {version}")
    # fmt: on

    create_tag(version)

if __name__ == "__main__":
    ensure_necessary_files_exist()
    # addon file, search for files ending with .mcaddon in the main directory
    addon_files = list(pathlib.Path(".").glob("*.mcaddon"))
    if not addon_files:
        print("No .mcaddon files found in the main directory")
        sys.exit(1)

    for addon_file in addon_files:
        version = handle_addon_file(addon_file)
        if version:
            print(f"Unpacked version {version}")
            latest_version = get_latest_version()
            if latest_version:
                update_latest_dir(version, latest_version)

            push_and_create_tag(version)
