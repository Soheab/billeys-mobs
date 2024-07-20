import pathlib
import sys

# versions dir
versions_dir = pathlib.Path("versions")
latest_dir = versions_dir / "latest"
# create the versions directory if it doesn't exist
if not versions_dir.exists():
    versions_dir.mkdir()
    print(f"Created {versions_dir}")

if not latest_dir.exists():
    latest_dir.mkdir()
    print(f"Created {latest_dir}")

# addon file, search for files ending with .mcaddon in the main directory
addon_file = next(pathlib.Path(".").glob("*.mcaddon"), None)
if addon_file is None:
    print("No .mcaddon file found in the main directory")
    sys.exit(1)

print(f"Found {addon_file.name}, {addon_file}")
*names, version = addon_file.stem.split(" ")
print(
    "names:", names,
    "version:", version
)
major, minor, *patch = version.split(".")
# create a dir in major.patch if the patch exists
if patch:
    version = f"{major}.{minor}"
    # a dir for the patch versions
    version_dir = versions_dir / version / patch[0]
    if not version_dir.exists():
        version_dir.mkdir()
        print(f"Created {version_dir}")
else:
    version_dir = versions_dir / version
    if not version_dir.exists():
        version_dir.mkdir()
        print(f"Created {version_dir}")

print(f"version: {version}")

# change the file ext to .zip
new_file = addon_file.with_suffix(".zip")
addon_file.rename(new_file)

# unzip the file and move the zip and contents to the versions directory per version
# unzip the file
import time
import zipfile
with zipfile.ZipFile(new_file, "r") as zip_ref:
    new_dir = new_dir = versions_dir / version
    zip_ref.extractall(version_dir)

new_file.unlink()
print(f"Deleted {new_file}")

# copy the files to the latest directory as well
import shutil
shutil.rmtree(latest_dir, ignore_errors=True)
shutil.copytree(new_dir, latest_dir)

print(f"Copied {new_dir} to {latest_dir}")


print(f"Done, handled {addon_file.name}")
