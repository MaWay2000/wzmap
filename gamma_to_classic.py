#!/usr/bin/env python3
"""Convert Warzone 2100 "Gamma" maps to classic WZ format.

This script takes a modern map archive that uses JSON metadata and
produces a classic WZ map archive with a binary ``game.map`` file using
chunks.  It loosely follows the structure of the ``convert_gamma_to_classic``
function provided by the user.
"""

import os
import json
import shutil
import struct
import tempfile
import zipfile
from typing import List


TILESET_MAP = {
    "ARIZONA": 0,
    "URBAN": 1,
    "ROCKIES": 2,
    "WINTER": 3,
    "LAVA": 4,
}


def convert_gamma_to_classic(input_wz: str, output_wz: str) -> None:
    """Convert a Gamma style map archive into the classic format.

    Parameters
    ----------
    input_wz: str
        Path to the source Gamma style map archive (.wz).
    output_wz: str
        Path where the converted classic map should be written.
    """

    tempdir = tempfile.mkdtemp()
    try:
        # Extract contents of the archive.
        with zipfile.ZipFile(input_wz, "r") as z:
            z.extractall(tempdir)

        # --- Step 1: read metadata from map.json or level.json
        map_json = None
        for candidate in ("map.json", "level.json"):
            path = os.path.join(tempdir, candidate)
            if os.path.exists(path):
                with open(path, "r", encoding="utf-8") as f:
                    map_json = json.load(f)
                break

        # --- Step 2: load Gamma game.map
        game_map_path = os.path.join(tempdir, "game.map")
        with open(game_map_path, "rb") as f:
            data = f.read()

        if not data.startswith(b"map ("):
            raise ValueError("Not a Gamma-style map")

        # width/height
        width = struct.unpack("<i", data[4:8])[0]
        height = struct.unpack("<i", data[8:12])[0]
        tiles = width * height

        # --- Step 3: split 32-bit values into heights + tiles
        raw = struct.unpack("<" + "I" * tiles, data[12:12 + tiles * 4])
        heights16: List[int] = [(val & 0xFFFF) for val in raw]
        tiles16: List[int] = [(val >> 16) & 0xFFFF for val in raw]

        heights8 = bytes([h // 256 for h in heights16])
        tile_bytes = struct.pack("<" + "H" * len(tiles16), *tiles16)

        # --- Step 4: build header (GAME chunk)
        players = map_json.get("players", 4) if map_json else 4
        tileset_name = (map_json.get("tileset", "ARIZONA") if map_json else "ARIZONA").upper()
        tileset = TILESET_MAP.get(tileset_name, 0)

        game_data = struct.pack("<iiiii", 8, width, height, tileset, players)

        def pack_chunk(tag: str, data: bytes) -> bytes:
            return tag.encode("ascii") + struct.pack("<I", len(data)) + data

        chunks: List[bytes] = []
        chunks.append(pack_chunk("GAME", game_data))
        chunks.append(pack_chunk("TTYP", tile_bytes))
        chunks.append(pack_chunk("MIST", heights8))

        # --- Step 5: objects
        def load_json(name: str, key: str):
            path = os.path.join(tempdir, name)
            if os.path.exists(path):
                with open(path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    if isinstance(data, dict):
                        lst = data.get(key)
                        if isinstance(lst, list):
                            return lst
                    elif isinstance(data, list):
                        return data
            return []

        structs = load_json("struct.json", "structures")
        feats = load_json("feature.json", "features")
        droids = load_json("droid.json", "droids")

        stru_bytes = b""
        feat_bytes = b""
        unit_bytes = b""

        for s in structs:
            name = s.get("name", s.get("id", "Unknown"))
            sid = str(name).encode("ascii", "ignore")[:32].ljust(32, b"\0")
            player = s.get("player", s.get("startpos", 255))
            try:
                player = int(player)
            except (ValueError, TypeError):
                player = 255
            x, y = s.get("position", [s.get("x", 0), s.get("y", 0)])
            rot = s.get("rotation", 0)
            stru_bytes += sid + struct.pack("<i f f f", player, float(x), float(y), float(rot))
        if stru_bytes:
            chunks.append(pack_chunk("STRU", stru_bytes))

        for f in feats:
            name = f.get("name", f.get("id", "Unknown"))
            fid = str(name).encode("ascii", "ignore")[:32].ljust(32, b"\0")
            x, y = f.get("position", [f.get("x", 0), f.get("y", 0)])
            feat_bytes += fid + struct.pack("<f f", float(x), float(y))
        if feat_bytes:
            chunks.append(pack_chunk("FEAT", feat_bytes))

        for d in droids:
            name = d.get("template", d.get("name", d.get("id", "Unknown")))
            did = str(name).encode("ascii", "ignore")[:32].ljust(32, b"\0")
            player = d.get("player", d.get("startpos", 255))
            try:
                player = int(player)
            except (ValueError, TypeError):
                player = 255
            x, y = d.get("position", [d.get("x", 0), d.get("y", 0)])
            rot = d.get("rotation", 0)
            unit_bytes += did + struct.pack("<i f f f", player, float(x), float(y), float(rot))
        if unit_bytes:
            chunks.append(pack_chunk("UNIT", unit_bytes))

        # --- Step 6: write Classic game.map
        classic_map = b"".join(chunks)
        with open(game_map_path, "wb") as f:
            f.write(classic_map)

        # --- Step 7: repack into output archive
        with zipfile.ZipFile(output_wz, "w") as out:
            for root, _, files in os.walk(tempdir):
                for file in files:
                    rel = os.path.relpath(os.path.join(root, file), tempdir)
                    out.write(os.path.join(root, file), rel)
    finally:
        shutil.rmtree(tempdir)


def convert_all_gamma(input_dir: str, output_dir: str) -> None:
    """Convert every ``.wz`` file in ``input_dir``.

    Parameters
    ----------
    input_dir:
        Directory containing Gamma style ``.wz`` maps.
    output_dir:
        Directory where converted maps should be written. It will be
        created if it does not already exist.
    """

    os.makedirs(output_dir, exist_ok=True)
    for name in os.listdir(input_dir):
        if not name.lower().endswith(".wz"):
            continue
        src = os.path.join(input_dir, name)
        dest = os.path.join(output_dir, name)
        try:
            convert_gamma_to_classic(src, dest)
            print(f"Converted {src} -> {dest}")
        except Exception as exc:  # pragma: no cover - defensive
            print(f"Skipping {src}: {exc}")


def main() -> None:
    import argparse

    parser = argparse.ArgumentParser(
        description="Convert Gamma style WZ map to classic format"
    )
    parser.add_argument(
        "input",
        help="Path to input Gamma .wz map or directory containing maps",
    )
    parser.add_argument(
        "output",
        help="Path to output classic .wz map or directory",
    )
    args = parser.parse_args()

    if os.path.isdir(args.input):
        convert_all_gamma(args.input, args.output)
    else:
        convert_gamma_to_classic(args.input, args.output)
        print(f"Converted map written to {args.output}")


if __name__ == "__main__":
    main()
