from collections.abc import Iterator
from dataclasses import dataclass
import pathlib
import sys
import logging
import os
import shutil
from typing import Self
import zipfile
from concurrent.futures import ThreadPoolExecutor, as_completed

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)
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
        except ValueError:
            raise ValueError(f"Invalid version string: {version}")
        if not parts:
            raise ValueError(f"Invalid version string: {version}")
        major = parts[0]
        minor = parts[1] if len(parts) > 1 else None
        patch = parts[2] if len(parts) > 2 else None
        return cls(major=major, minor=minor, patch=patch)

    @classmethod
    def from_path(cls, path: pathlib.Path) -> Self:
        try:
            parts = list(map(int, path.relative_to(versions_dir).parts))
        except (ValueError, AttributeError):
            raise ValueError(f"Invalid version path: {path}")
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
        except (IndexError, ValueError):
            raise ValueError(f"Invalid addon file name: {name}")

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


def update_latest_dir(last_addition: Version) -> bool:
    if last_addition < latest_version:
        logger.info(
            f"Version {last_addition} is less than the latest version {latest_version}"
        )
        return False
    shutil.rmtree(latest_dir, ignore_errors=True)
    if latest_version:
        shutil.copytree(last_addition.to_path(), latest_dir)
    logger.info(f"Updated latest version to {last_addition}")
    return True


def move_addon_file(addon_file: pathlib.Path, version: Version) -> None:
    mcaddons_dir.mkdir(exist_ok=True)
    destination = mcaddons_dir / f"{version}.mcaddon"
    if not destination.exists():
        shutil.move(str(addon_file), str(destination))
    else:
        addon_file.unlink(missing_ok=True)


def handle_addon_file(addon_file: pathlib.Path, version: Version) -> tuple[bool, str]:
    logger.info(f"Handling addon file: {addon_file} with version: {version}")
    version_dir = version.to_path(create_if_not_exists=True)
    required_files = ["billbpack", "billrpack"]
    if version_dir.exists() and all(
        (version_dir / file).exists() for file in required_files
    ):
        move_addon_file(addon_file, version)
        return False, f"Version {version} already exists"
    new_file = addon_file.with_suffix(".zip")
    addon_file.rename(new_file)
    try:
        with zipfile.ZipFile(new_file, "r") as zip_ref:
            zip_ref.extractall(version_dir)
    except Exception as e:
        new_file.unlink(missing_ok=True)
        move_addon_file(addon_file, version)
        return False, f"Error unzipping file: {e}"
    new_file.unlink()
    return True, str(version)


def create_tag(version: str) -> None:
    if not version:
        logger.warning("No version provided")
        return
    commands = [
        *CONFIGS,
        f"git tag -a v{version} -m 'Version {version}'",
        f"git push origin v{version}",
    ]
    logger.info(f"Running commands: {' && '.join(commands)}")
    os.system(" && ".join(commands))
    logger.info(f"Tag created for: v{version}")


def commit_and_push(version: str, message: str | None = None) -> None:
    message = message or f"Unpacked addon version {version}"
    commands = [
        *CONFIGS,
        "git add -A -f",
        f'git commit -a -m "{message}"',
        "git push",
    ]
    logger.info(f"Running commands: {' && '.join(commands)}")
    os.system(" && ".join(commands))
    logger.info(f"Committed and pushed changes for version {version}")


def commit_changes_to_latest_dir(version: str) -> None:
    commands = [
        *CONFIGS,
        "git add -A -f",
        f'git commit -a -m "Updated latest dirs to version {version}"',
        "git push",
    ]
    logger.info(f"Running commands: {' && '.join(commands)}")
    os.system(" && ".join(commands))
    logger.info(f"Committed and pushed changes for latest version {version}")


def process_addon_file(addon_file: pathlib.Path) -> None:
    try:
        version = Version.from_addon_file(addon_file)
        logger.info(f"Found version {version}")
        success, version_or_reason = handle_addon_file(addon_file, version)
        if not success:
            logger.error(version_or_reason)
            raise RuntimeError(version_or_reason)
        commit_and_push(version_or_reason)
        create_tag(version_or_reason)
        if update_latest_dir(version):
            commit_changes_to_latest_dir(version_or_reason)
    except Exception as e:
        logger.error(f"Error processing {addon_file}: {e}")
        raise


def main():
    addon_files = list(pathlib.Path(".").glob("*.mcaddon"))
    if not addon_files:
        logger.error("No .mcaddon files found in the main directory")
        sys.exit(1)
    sorted_versions = get_versions()
    if not sorted_versions:
        logger.error("No versions found in the versions directory.")
        sys.exit(1)
    global latest_version
    latest_version = sorted_versions[-1]
    with ThreadPoolExecutor() as executor:
        futures = [executor.submit(process_addon_file, file) for file in addon_files]
        for future in as_completed(futures):
            try:
                future.result()
            except Exception as e:
                logger.error(f"Error processing addon file: {e}")
    commit_and_push("misc", "Committing all changes.")


if __name__ == "__main__":
    main()
