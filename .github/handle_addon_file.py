import logging
import os
import pathlib
import shutil
import sys
import zipfile
from collections.abc import Iterator
from dataclasses import dataclass
from typing import Self

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


@dataclass(slots=True, frozen=True, kw_only=True, repr=False)
class Version:
    major: int
    minor: int | None = None
    patch: int | None = None
    _path: pathlib.Path | None = None

    @classmethod
    def from_string(cls, version: str) -> Self:
        try:
            parts = [int(part) for part in version.split(".")]
        except ValueError as e:
            msg = f"Invalid version string: {version}"
            raise ValueError(msg) from e
        if not parts:
            msg = f"Invalid version string: {version}"
            raise ValueError(msg)
        major = parts[0]
        minor = parts[1] if len(parts) > 1 else None
        patch = parts[2] if len(parts) > 2 else None
        return cls(major=major, minor=minor, patch=patch)

    @classmethod
    def from_path(cls, path: pathlib.Path) -> Self:
        try:
            parts = list(map(int, path.relative_to(versions_dir).parts))
        except (ValueError, AttributeError) as e:
            msg = f"Invalid version path: {path}"
            raise ValueError(msg) from e
        return cls(
            major=parts[0],
            minor=parts[1] if len(parts) > 1 else None,
            patch=parts[2] if len(parts) > 2 else None,
            _path=path,
        )

    @classmethod
    def from_addon_file(cls, path: pathlib.Path) -> Self:
        name = path.stem
        try:
            version_str = name.split()[-1]
            return cls.from_string(version_str)
        except (IndexError, ValueError) as e:
            msg = f"Invalid addon file name: {name}"
            raise ValueError(msg) from e

    def path(self) -> pathlib.Path:
        if self._path is not None:
            return self._path
        base = versions_dir / str(self.major)
        if self.minor is not None:
            base /= str(self.minor)
        if self.patch is not None:
            base /= str(self.patch)
        return base

    def to_path(self, *, create_if_not_exists: bool = False) -> pathlib.Path:
        path = self.path()
        if create_if_not_exists and not path.exists():
            path.mkdir(parents=True)
            logger.info(f"Created directory: {path}")
        return path

    def __iter__(self) -> Iterator[int | None]:
        yield self.major
        yield self.minor
        yield self.patch

    def __str__(self) -> str:
        parts = [str(self.major)]
        if self.minor is not None:
            parts.append(str(self.minor))
        if self.patch is not None:
            parts.append(str(self.patch))
        return ".".join(parts)

    def __lt__(self, other: Self) -> bool:
        return (self.major, self.minor or 0, self.patch or 0) < (
            other.major,
            other.minor or 0,
            other.patch or 0,
        )

    def __gt__(self, other: Self) -> bool:
        return (self.major, self.minor or 0, self.patch or 0) > (
            other.major,
            other.minor or 0,
            other.patch or 0,
        )


versions_dir = pathlib.Path("versions")
latest_dir = versions_dir / "latest"
mcaddons_dir = pathlib.Path("./mcaddons")
CONFIGS = (
    'git config --local user.email "action@github.com"',
    'git config --local user.name "Billey\'s Mobs Addon Unpacker"',
)


def get_versions() -> list[Version]:
    if not versions_dir.exists() or not versions_dir.is_dir():
        versions_dir.mkdir(parents=True)
        logger.info(f"Created versions directory: {versions_dir}")
    version_objects = []
    for root, dirs, _ in os.walk(versions_dir):
        for dir_name in dirs:
            if dir_name.isdigit():
                dir_path = pathlib.Path(root) / dir_name
                try:
                    version_objects.append(Version.from_path(dir_path))
                except ValueError as e:
                    logger.warning(f"Skipping invalid version path: {dir_path} ({e})")
    return sorted(version_objects)


def update_latest_dir(last_addition: Version, latest_version: Version | None) -> bool:
    if latest_version and last_addition < latest_version:
        logger.info(f"Version {last_addition} is less than the latest version {latest_version}")
        return False
    shutil.rmtree(latest_dir, ignore_errors=True)
    shutil.copytree(last_addition.to_path(), latest_dir)
    logger.info(f"Updated latest version to {last_addition}")
    return True


def move_addon_file(addon_file: pathlib.Path, version: Version) -> None:
    mcaddons_dir.mkdir(exist_ok=True)
    destination = mcaddons_dir / f"Billey's Mobs {version}.mcaddon"
    if not destination.exists():
        shutil.move(str(addon_file), str(destination))
    else:
        addon_file.unlink(missing_ok=True)


def zipmcaddon_to_mcaddon(zipmcaddon: pathlib.Path) -> pathlib.Path:
    mcaddon = mcaddons_dir / zipmcaddon.with_suffix(".mcaddon").name
    with zipfile.ZipFile(zipmcaddon, "w") as zip_ref:
        zip_ref.write(zipmcaddon)
    shutil.move(zipmcaddon, mcaddon)
    return mcaddon


def handle_addon_file(addon_file: pathlib.Path, version: Version) -> tuple[bool, str]:
    logger.info(f"Handling addon file: {addon_file} with version: {version}")
    version_dir = version.to_path(create_if_not_exists=True)
    required_files = ["billbpack", "billrpack"]
    if version_dir.exists() and all((version_dir / file).exists() for file in required_files):
        move_addon_file(addon_file, version)
        return False, f"Version {version} already exists"
    new_file = addon_file.with_suffix(".zip")
    addon_file.rename(new_file)
    try:
        with zipfile.ZipFile(new_file, "r") as zip_ref:
            zip_ref.extractall(version_dir)
    except (zipfile.BadZipFile, FileNotFoundError, PermissionError) as e:
        new_file.unlink(missing_ok=True)
        move_addon_file(addon_file, version)
        return False, f"Error unzipping file: {e}"

    zipmcaddon_to_mcaddon(new_file)
    return True, str(version)


def create_tag(version: str, no_push: bool = False) -> None:
    if not version:
        logger.warning("No version provided")
        return
    commands = [
        *CONFIGS,
        f"git tag -a v{version} -m 'Version {version}'",
    ]
    if not no_push:
        commands.append(f"git push origin v{version}")
    logger.info(f"Running commands: {' && '.join(commands)}")
    os.system(" && ".join(commands))
    action = "created and pushed" if not no_push else "created"
    logger.info(f"Tag {action} for: v{version}")


def commit_and_push(version: str, message: str | None = None, no_push: bool = False) -> None:
    message = message or f"Unpacked addon version {version}"
    commands = [
        *CONFIGS,
        "git add -A -f",
        f'git commit -a -m "{message}"',
    ]
    if not no_push:
        commands.append("git push")
    logger.info(f"Running commands: {' && '.join(commands)}")
    os.system(" && ".join(commands))
    action = "Committed and pushed" if not no_push else "Committed"
    logger.info(f"{action} changes for version {version}")


def commit_changes_to_latest_dir(version: str, no_push: bool = False) -> None:
    commands = [
        *CONFIGS,
        "git add -A -f",
        f'git commit -a -m "Updated latest dirs to version {version}"',
    ]
    if not no_push:
        commands.append("git push")
    logger.info(f"Running commands: {' && '.join(commands)}")
    os.system(" && ".join(commands))
    action = "Committed and pushed" if not no_push else "Committed"
    logger.info(f"{action} changes for latest version {version}")


def process_addon_file(addon_file: pathlib.Path, latest_version: Version | None) -> tuple[bool, str, Version | None]:
    """Process a single addon file and return success status, message, and version."""
    try:
        version = Version.from_addon_file(addon_file)
        logger.info(f"Found version {version} for {addon_file.name}")
        success, version_or_reason = handle_addon_file(addon_file, version)
        if not success:
            logger.warning(f"Skipping {addon_file.name}: {version_or_reason}")
            return False, version_or_reason, None

        # Commit this version (but don't push yet)
        commit_and_push(version_or_reason, no_push=True)

        # Create tag for this version (but don't push yet)
        create_tag(version_or_reason, no_push=True)

        # Update latest directory if this version is newer
        if (latest_version is None or version > latest_version) and update_latest_dir(version, latest_version):
            commit_changes_to_latest_dir(version_or_reason, no_push=True)

    except (ValueError, RuntimeError, zipfile.BadZipFile) as e:
        logger.exception(f"Error processing {addon_file.name}")
        return False, str(e), None
    else:
        return True, version_or_reason, version


def main():
    addon_files = list(pathlib.Path().glob("*.mcaddon"))
    if not addon_files:
        logger.error("No .mcaddon files found in the main directory")
        sys.exit(1)

    logger.info(f"Found {len(addon_files)} .mcaddon file(s) to process")

    sorted_versions = get_versions()
    if not sorted_versions:
        logger.warning("No existing versions found in the versions directory.")
        latest_version = None
    else:
        latest_version = sorted_versions[-1]
        logger.info(f"Current latest version: {latest_version}")

    # Process all addon files sequentially to avoid git conflicts
    processed_versions = []
    failed_files = []

    for addon_file in addon_files:
        success, message, version = process_addon_file(addon_file, latest_version)
        if success and version:
            processed_versions.append((version, message))
            # Update latest_version if this version is newer
            if latest_version is None or version > latest_version:
                latest_version = version
        else:
            failed_files.append((addon_file.name, message))

    if not processed_versions:
        logger.warning("No addon files were successfully processed")
        if failed_files:
            logger.error(f"Failed files: {', '.join(f[0] for f in failed_files)}")
        sys.exit(0)

    # Log summary
    version_strings = [v[1] for v in processed_versions]
    logger.info(f"Successfully processed versions: {', '.join(version_strings)}")

    # Push all commits and tags at once
    logger.info("Pushing all commits and tags to remote...")
    push_commands = [
        *CONFIGS,
        "git push",
        "git push --tags",
    ]
    os.system(" && ".join(push_commands))
    logger.info("All changes pushed successfully")

    if failed_files:
        logger.warning(f"Some files failed to process: {', '.join(f[0] for f in failed_files)}")


if __name__ == "__main__":
    main()
