#!/usr/bin/env python3
"""Draw the Latent launcher icons (legacy + adaptive foreground).

Standard library only: the APK build runs inside a plain Android SDK image,
so the icons are rendered here instead of being committed as binaries.

Usage: make_icons.py <res-directory>
"""

import os
import struct
import sys
import zlib

BACKGROUND = (14, 14, 15)
ACCENT = (231, 180, 76)
INK = (244, 242, 238)

LEGACY_SIZES = {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}
FOREGROUND_SIZES = {"mdpi": 108, "hdpi": 162, "xhdpi": 216, "xxhdpi": 324, "xxxhdpi": 432}

SUPERSAMPLE = 3


def write_png(path, width, height, rows):
    raw = bytearray()
    for row in rows:
        raw.append(0)
        for pixel in row:
            raw.extend(pixel)

    def chunk(tag, data):
        return (
            struct.pack(">I", len(data))
            + tag
            + data
            + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
        )

    png = (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0))
        + chunk(b"IDAT", zlib.compress(bytes(raw), 9))
        + chunk(b"IEND", b"")
    )
    with open(path, "wb") as handle:
        handle.write(png)


def sample(x, y, size, tile, ring_scale):
    """Colour of one sub-pixel: dark tile, amber lens ring, warm centre dot."""
    center = size / 2.0
    dx = x - center
    dy = y - center
    distance = (dx * dx + dy * dy) ** 0.5

    outer = size * 0.315 * ring_scale
    inner = outer - size * 0.062 * ring_scale
    if inner <= distance <= outer:
        return ACCENT + (255,)
    if distance <= size * 0.085 * ring_scale:
        return INK + (255,)

    if tile:
        half = size / 2.0
        radius = size * 0.22
        ax = abs(dx)
        ay = abs(dy)
        inside = ax <= half and ay <= half
        if inside and ax > half - radius and ay > half - radius:
            corner = (ax - (half - radius)) ** 2 + (ay - (half - radius)) ** 2
            inside = corner <= radius * radius
        return BACKGROUND + (255,) if inside else BACKGROUND + (0,)

    return (0, 0, 0, 0)


def render(size, tile, ring_scale):
    step = 1.0 / SUPERSAMPLE
    samples = SUPERSAMPLE * SUPERSAMPLE
    rows = []
    for py in range(size):
        row = []
        for px in range(size):
            red = green = blue = alpha = 0
            for sy in range(SUPERSAMPLE):
                for sx in range(SUPERSAMPLE):
                    r, g, b, a = sample(px + (sx + 0.5) * step, py + (sy + 0.5) * step, size, tile, ring_scale)
                    red += r * a
                    green += g * a
                    blue += b * a
                    alpha += a
            if alpha == 0:
                row.append((0, 0, 0, 0))
            else:
                row.append(
                    (
                        int(round(red / alpha)),
                        int(round(green / alpha)),
                        int(round(blue / alpha)),
                        int(round(alpha / samples)),
                    )
                )
        rows.append(row)
    return rows


def main():
    if len(sys.argv) != 2:
        print("usage: make_icons.py <res-directory>", file=sys.stderr)
        return 2
    res = sys.argv[1]

    for density, size in LEGACY_SIZES.items():
        folder = os.path.join(res, "mipmap-" + density)
        os.makedirs(folder, exist_ok=True)
        write_png(os.path.join(folder, "ic_launcher.png"), size, size, render(size, True, 1.0))

    for density, size in FOREGROUND_SIZES.items():
        folder = os.path.join(res, "mipmap-" + density)
        os.makedirs(folder, exist_ok=True)
        write_png(
            os.path.join(folder, "ic_launcher_foreground.png"),
            size,
            size,
            render(size, False, 0.72),
        )

    return 0


if __name__ == "__main__":
    sys.exit(main())
