# THIS SCRIPTS REQUIRES pyjson5
# pip install pyjson5
# https://github.com/Kijewski/pyjson5
# ------------------------------
from __future__ import annotations
import logging
import os
from typing import TYPE_CHECKING, Any, Literal, NamedTuple, TypedDict
import re

import pathlib
from collections import defaultdict

import pyjson5 as json


if TYPE_CHECKING:
    from typing_extensions import NotRequired


class MobsDescription(TypedDict):
    short: str | None
    long: str | None


class MobsData(TypedDict):
    file_path: str
    tame_items: list[str]
    identifier: NotRequired[str]
    image_path: NotRequired[str | None]
    descriptions: NotRequired[MobsDescription]


class MobsRecord(TypedDict):
    file_path: str
    tame_items: list[str]
    identifier: str
    image_path: str | None
    short: str | None
    long: str | None


class ParsedData(NamedTuple):
    mobs: dict[str, MobsData]
    tips: dict[int, str]


TAME_ITEMS_KEY: str = "tame_items"


def billeyinfo_to_discord(info: str, is_shortinfo: bool) -> str:
    """
    Turns billeyinfos from en_US.lang to Discord markdown text.

    Parameters:
    info (str): The text from en_US.lang (the part after the =).
    is_shortinfo (bool): Set to true if info is billeyshortinfo, false if it's billeyinfo.
    """
    if is_shortinfo:
        return _process_shortinfo(info)
    else:
        return _process_longinfo(info)


def _process_shortinfo(info: str) -> str:
    """
    Processes shortinfo text into Discord markdown.
    """
    # Remove leading §f if present
    if info.startswith("§f"):
        info = info[2:]

    # Use regex to handle §a (italic) and §f (bold + italic)
    def replace_formatting(match):
        code = match.group(1)
        if code == "7":
            return "*"
        elif code == "f":
            return "**"
        else:
            return ""  # Remove other formatting codes

    # Apply regex to replace formatting codes
    info = re.sub(r"§([0-9a-f])", replace_formatting, info)

    # Check for bold formatting
    info = re.sub(r"§a(.*?)§9", r"***\1***", info)

    return info


def _process_longinfo(info: str) -> str:
    """
    Processes longinfo text into Discord markdown.
    """
    # Clean up the input by replacing specific formatting codes
    info = info.replace("§r", "").replace("%1%1", "%1").replace("§d", "§6")

    result = []
    for line in info.split("%1"):
        if line.startswith("§e§l="):  # Title of the mob
            # Remove all formatting codes and format as a title
            title = re.sub(r"§[0-9a-f]", "", line[4:])  # Remove all formatting codes
            result.append(f"# {title.strip('=').title()}")
        elif line.startswith("§l§6-"):  # Title of a section
            # Handle §l (bold) and §6 (color code) for section headers
            section_title = re.sub(
                r"§[0-9a-f]", "", line[5:]
            )  # Remove all formatting codes
            result.append(f"\n - **__{section_title.strip()}__**")
        else:  # Regular text
            # Check for bold formatting
            line = re.sub(r"§a(.*?)§9", r"**\1**", line)
            # Remove other formatting codes
            line = re.sub(r"§[0-9a-f]", "", line)
            result.append(f"\n   - {line.strip()}")

    return "".join(result)


def find_identifier_key(data: Any) -> Any:  # type: ignore
    if isinstance(data, dict):
        if "identifier" in data:
            return data["identifier"]  # type: ignore

        v: Any
        for v in data.values():
            result = find_identifier_key(v)
            if result:
                return result


def get_tame_items(data: dict[str, Any]) -> set[str]:
    tame_items: list[str] = []
    try:
        component_group = data["minecraft:entity"]["component_groups"]
    except KeyError:
        print(f"KeyError: {data}")
        return set()

    for key, value in component_group.items():
        if "minecraft:tameable" in value:
            if key == "untamed":
                continue

            try:
                tame_items.extend(value["minecraft:tameable"]["tame_items"])
            except KeyError:
                pass

    return set(tame_items)


def get_descriptions(
    descriptions_path: pathlib.Path | None,
) -> dict[str, MobsDescription]:
    if not descriptions_path:
        return {}

    per_mob_descriptions: dict[str, MobsDescription] = defaultdict(
        lambda: {"short": None, "long": None}
    )

    formore_detected: bool = False

    lines = descriptions_path.read_text(encoding="utf8").splitlines()
    for line in lines:
        if not line.startswith(
            ("chat.billeys_mobs.info", "chat.billeys_mobs.short_info")
        ):
            continue

        base: str
        description: str
        base, description = line.split("=", 1)

        info_type: Literal["info", "short_info"]
        _chat, _name, info_type, mob = base.split(".")  # type: ignore

        if mob.strip() == "rideable_duck":
            continue

        # all mobs are after formore
        if mob == "formore":
            formore_detected = True
            continue

        if not formore_detected:
            continue

        # leveling and others are after all mobs
        if mob == "leveling":
            return per_mob_descriptions

        per_mob_descriptions[mob]["long" if info_type == "info" else "short"] = (
            billeyinfo_to_discord(description.strip(), info_type == "billeyshortinfo")
        )

    return per_mob_descriptions


def get_tips(
    tips_path: pathlib.Path | None,
) -> dict[int, str]:
    if not tips_path:
        return {}

    tips: dict[int, str] = {}

    lines: list[str] = tips_path.read_text(encoding="utf8").splitlines()
    idx: int = 1
    for line in lines:
        if not line.startswith("chat.billeys_mobs.info.tip"):
            continue

        tips[idx] = billeyinfo_to_discord(
            line.split("=", 1)[1].split(":", 1)[1].strip().removeprefix("\n"), True
        )
        idx += 1

    return tips


def parse_billeysaddon_files(
    mobs_path: pathlib.Path,
    texts_path: pathlib.Path,
) -> ParsedData:
    # search ALL json files in the mobs_path directory and subdirectories
    mob_files = mobs_path.rglob("*.json")
    # exclude the dirs: other and othermob
    excluded_dirs = ["other", "othermob", "other2"]
    mob_files = [
        file
        for file in mob_files
        if not any([dir in file.parts for dir in excluded_dirs])
    ]
    # inject the amogus file for funnies
    # src\assets\bill\mobs\othermob\amogus.behavior.json
    amogus_path: pathlib.Path = mobs_path / "othermob" / "amogus.behavior.json"
    mob_files.append(amogus_path)

    # format: {identifier: {file_path: str, items: list[str]}}
    mobs_data: dict[str, MobsData] = defaultdict(  # type: ignore
        lambda: {
            "file_path": "",
            "tame_items": [],
            "descriptions": {"short": None, "long": None},
        }
    )

    for file in mob_files:
        # print(f"Processing {file}")
        data: dict[str, Any] = json.loads(file.read_text(encoding="utf8"))

        identifier = find_identifier_key(data)
        if identifier:
            identifier = identifier.strip()

        mobs_data[identifier]["file_path"] = str(file)

        # recursively search for tame_items key but only if one of parent key is not "untamed"
        tame_items = get_tame_items(data)
        if not tame_items:
            logging.info(f"tame_items not found in {file}")
        else:
            mobs_data[identifier]["tame_items"] = list(tame_items)

    per_mob_descriptions = get_descriptions(texts_path)
    for mob, descriptions in per_mob_descriptions.items():
        mob_id = f"billey:{mob}"
        if not descriptions:
            logging.info(f"{mob_id} has no descriptions, skipping...")
            continue

        if mob_id in mobs_data:
            mobs_data[mob_id]["descriptions"] = descriptions  # type: ignore
        else:
            logging.info(f"Dropping descriptions for {mob_id} as it has no data")

    return ParsedData(
        mobs=mobs_data,
        tips=get_tips(texts_path),
    )


def main():
    mobs_path = pathlib.Path(r".\versions\latest\billbpack\entities\billeysmobs")
    # src\assets\bill\texts
    texts_path = pathlib.Path(r".\versions\latest\billrpack\texts\en_US.lang")

    parsed_data = parse_billeysaddon_files(mobs_path, texts_path)

    for mob, data in parsed_data.mobs.items():
        print(mob, data)

    for idx, tip in parsed_data.tips.items():
        print(idx, tip)


if __name__ == "__main__":
    main()
