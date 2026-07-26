#!/usr/bin/env python3
"""Generate the MiniTrack diagram set.

Every diagram is declared once as a Python spec (see specs.py) and rendered
twice from the same layout pass:

  drawio/<name>.drawio   mxGraph XML -- the editable source, opens in draw.io
  svg/<name>.svg         a rendering in the 'MiniTrack Precision' house style,
                         which is what the markdown files embed (.drawio renders
                         in no markdown viewer)

Because one layout pass feeds both writers, the two formats cannot drift.
Layout is fully deterministic -- no timestamps, no randomness -- so re-running
this script is a no-op unless a spec changed. That makes `git diff` after a
rebuild the check for "did someone hand-edit a generated file?".

Standard library only, per the repo's no-new-dependencies rule (see CLAUDE.md).

Usage:
    python docs/diagrams/build_diagrams.py           # write both formats
    python docs/diagrams/build_diagrams.py --check   # fail if output is stale
"""
from __future__ import annotations

import argparse
import sys
from dataclasses import dataclass, field
from pathlib import Path
from xml.sax.saxutils import escape as _xml_escape


def escape(text: str) -> str:
    """XML-escape for use inside a double-quoted attribute.

    saxutils.escape covers & < > but leaves quotes alone, which corrupts any
    label containing " or ' -- and several specs legitimately do.
    """
    return _xml_escape(text, {'"': "&quot;", "'": "&apos;"})

HERE = Path(__file__).resolve().parent
DRAWIO_DIR = HERE / "drawio"
SVG_DIR = HERE / "svg"

# ---- palette (MiniTrack Precision) ---------------------------------------
# The same palette DESIGN.md declares and frontend/src/styles/tokens.css ships,
# so the diagrams read as part of the product rather than beside it.
GROUND = "#F8FAFC"
SURFACE = "#FFFFFF"
BORDER = "#E2E8F0"
INK = "#0F172A"
TITLE_INK = "#172033"
MUTED = "#475569"
SUBTLE = "#94A3B8"

ACCENT = "#4F46E5"      # indigo-600 -- frontend
ACCENT_SOFT = "#EEF2FF"
ACCENT_INK = "#312E81"

TEAL = "#0D9488"        # backend HTTP edge
TEAL_SOFT = "#CCFBF1"
TEAL_INK = "#115E59"

VIOLET = "#7C3AED"      # services
VIOLET_SOFT = "#F3E8FF"
VIOLET_INK = "#5B21B6"

AMBER = "#B45309"       # data / persistence
AMBER_SOFT = "#FEF3C7"
AMBER_INK = "#92400E"

GOOD = "#16A34A"
GOOD_SOFT = "#DCFCE7"
GOOD_INK = "#166534"

DANGER = "#DC2626"
DANGER_SOFT = "#FEE2E2"
DANGER_INK = "#991B1B"

SLATE = "#475569"       # browser / external
SLATE_SOFT = "#F1F5F9"
SLATE_INK = "#1E293B"

FONT = "Inter, Arial, sans-serif"

# Role -> (stroke, fill, text). One colour per layer, reused everywhere.
ROLES: dict[str, tuple[str, str, str]] = {
    "ext": (SLATE, SLATE_SOFT, SLATE_INK),
    "fe": (ACCENT, ACCENT_SOFT, ACCENT_INK),
    "http": (TEAL, TEAL_SOFT, TEAL_INK),
    "svc": (VIOLET, VIOLET_SOFT, VIOLET_INK),
    "data": (AMBER, AMBER_SOFT, AMBER_INK),
    "good": (GOOD, GOOD_SOFT, GOOD_INK),
    "bad": (DANGER, DANGER_SOFT, DANGER_INK),
    "core": (SUBTLE, SLATE_SOFT, SLATE_INK),
}

CANVAS_W = 1920
CANVAS_H = 1080


# ---- spec model ----------------------------------------------------------
@dataclass(frozen=True)
class P:
    """A sequence-diagram participant (lifeline)."""
    key: str
    label: str
    role: str = "fe"
    sub: str = ""


@dataclass(frozen=True)
class M:
    """A message between two participants.

    kind: "call" (solid), "return" (dashed), "self" (loop back to sender).
    tone: None | "good" | "bad" -- colours the arrow for success/error paths.
    """
    frm: str
    to: str
    label: str
    kind: str = "call"
    tone: str | None = None
    note: str = ""


@dataclass(frozen=True)
class Frag:
    """A labelled band across the diagram (alt / opt / loop)."""
    after: int          # index of the message this band starts before
    span: int           # how many messages it covers
    label: str
    tone: str | None = None


@dataclass
class Sequence:
    name: str
    title: str
    subtitle: str
    participants: list[P]
    messages: list[M]
    fragments: list[Frag] = field(default_factory=list)
    footnote: str = ""


@dataclass(frozen=True)
class Box:
    """A node in a component diagram."""
    key: str
    label: str
    x: int
    y: int
    w: int
    h: int
    role: str = "fe"
    sub: str = ""


@dataclass(frozen=True)
class Group:
    """A titled container drawn behind boxes."""
    label: str
    x: int
    y: int
    w: int
    h: int
    role: str = "core"


@dataclass(frozen=True)
class Edge:
    frm: str
    to: str
    label: str = ""
    style: str = "solid"     # solid | dashed
    tone: str | None = None
    exit_side: str = "auto"  # auto | bottom | right | left | top


@dataclass(frozen=True)
class Note:
    text: str
    x: int
    y: int
    w: int
    h: int = 96
    role: str = "core"


@dataclass
class Component:
    name: str
    title: str
    subtitle: str
    groups: list[Group] = field(default_factory=list)
    boxes: list[Box] = field(default_factory=list)
    edges: list[Edge] = field(default_factory=list)
    notes: list[Note] = field(default_factory=list)
    footnote: str = ""


# ---- sequence layout -----------------------------------------------------
SEQ_TOP = 172           # y of the participant header boxes
SEQ_HEAD_H = 76
SEQ_FIRST_MSG = 300     # y of the first message arrow
SEQ_ROW = 52            # preferred vertical pitch between messages
SEQ_ROW_MIN = 36        # floor -- below this, labels start touching
SEQ_MAX_BOTTOM = 950    # last arrow must clear the footnote band
SEQ_FRAG_GAP = 26       # extra headroom so a band label clears its first message
SEQ_NOTE_GAP = 14       # extra row height when a message carries a sub-label
SEQ_LEFT = 90
SEQ_RIGHT_PAD = 90
SEQ_MAX_MESSAGES = 16   # editorial cap: past this a flow wants splitting


def seq_geometry(spec: Sequence) -> dict:
    """Compute every coordinate once; both writers consume this.

    Row pitch shrinks toward SEQ_ROW_MIN as a flow gets longer, and each
    fragment start gets extra headroom so its band label cannot collide with
    the first message inside the band.
    """
    n = len(spec.participants)
    usable = CANVAS_W - SEQ_LEFT - SEQ_RIGHT_PAD
    lane = usable / n
    head_w = min(int(lane) - 26, 260)
    centres = {
        p.key: int(SEQ_LEFT + lane * i + lane / 2)
        for i, p in enumerate(spec.participants)
    }

    count = len(spec.messages)
    if count > SEQ_MAX_MESSAGES:
        raise ValueError(
            f"{spec.name}: {count} messages exceeds the {SEQ_MAX_MESSAGES} cap -- "
            "split the flow or fold steps together rather than shrinking the pitch"
        )

    # A message carrying a note needs a taller row, or its sub-label collides
    # with the next message's label. Reserve that space before setting pitch.
    gap_at = {f.after for f in spec.fragments}
    noted = sum(1 for m in spec.messages if m.note)
    extras = SEQ_FRAG_GAP * len(gap_at) + SEQ_NOTE_GAP * noted
    budget = SEQ_MAX_BOTTOM - SEQ_FIRST_MSG - extras
    if count > 1:
        pitch = min(SEQ_ROW, budget / (count - 1))
        if pitch < SEQ_ROW_MIN:
            raise ValueError(
                f"{spec.name}: {count} messages, {len(gap_at)} fragments and "
                f"{noted} notes do not fit one canvas (pitch {pitch:.1f} < "
                f"{SEQ_ROW_MIN}). Drop a note or fold two steps together."
            )
    else:
        pitch = SEQ_ROW

    rows, y = [], float(SEQ_FIRST_MSG)
    for i, msg in enumerate(spec.messages):
        if i in gap_at and i > 0:
            y += SEQ_FRAG_GAP
        rows.append(int(y))
        y += pitch + (SEQ_NOTE_GAP if msg.note else 0)

    bottom = (rows[-1] if rows else SEQ_FIRST_MSG) + 50
    return {
        "centres": centres,
        "head_w": head_w,
        "head_h": SEQ_HEAD_H,
        "rows": rows,
        "pitch": pitch,
        "lane": lane,
        "bottom": bottom,
    }


# ---- SVG writing ---------------------------------------------------------
SVG_DEFS = (
    '<defs>'
    '<marker id="arrow" markerWidth="12" markerHeight="12" refX="10" refY="5"'
    ' orient="auto" markerUnits="strokeWidth">'
    '<path d="M0,0 L0,10 L10,5 z" fill="context-stroke"/></marker>'
    '<marker id="arrow-open" markerWidth="12" markerHeight="12" refX="10" refY="5"'
    ' orient="auto" markerUnits="strokeWidth">'
    '<path d="M0,0 L10,5 L0,10" fill="none" stroke="context-stroke"'
    ' stroke-width="1.6"/></marker>'
    '<filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">'
    '<feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#0F172A"'
    ' flood-opacity="0.10"/></filter>'
    '</defs>'
)


def _svg_open(title: str, subtitle: str) -> list[str]:
    out = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{CANVAS_W}"'
        f' height="{CANVAS_H}" viewBox="0 0 {CANVAS_W} {CANVAS_H}">',
        SVG_DEFS,
        f'<rect width="100%" height="100%" fill="{GROUND}"/>',
        f'<text x="80" y="78" font-family="{FONT}" font-size="44" font-weight="800"'
        f' fill="{TITLE_INK}">{escape(title)}</text>',
    ]
    if subtitle:
        out.append(
            f'<text x="80" y="118" font-family="{FONT}" font-size="22"'
            f' font-weight="500" fill="{MUTED}">{escape(subtitle)}</text>'
        )
    return out


def _svg_wrap(text: str, width_chars: int) -> list[str]:
    """Greedy word wrap -- deterministic, no font metrics needed."""
    words, lines, cur = text.split(), [], ""
    for word in words:
        cand = f"{cur} {word}".strip()
        if len(cand) > width_chars and cur:
            lines.append(cur)
            cur = word
        else:
            cur = cand
    if cur:
        lines.append(cur)
    return lines


def _svg_box(x, y, w, h, label, sub, role, rx=14, size=20) -> list[str]:
    stroke, fill, ink = ROLES[role]
    out = [
        f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{fill}"'
        f' stroke="{stroke}" stroke-width="2" filter="url(#shadow)"/>'
    ]
    lines = _svg_wrap(label, max(12, w // 10))
    cy = y + h / 2 - (len(lines) - 1) * 11 - (9 if sub else 0)
    for i, line in enumerate(lines):
        out.append(
            f'<text x="{x + w / 2:.0f}" y="{cy + i * 22:.0f}" text-anchor="middle"'
            f' font-family="{FONT}" font-size="{size}" font-weight="700"'
            f' fill="{ink}">{escape(line)}</text>'
        )
    if sub:
        out.append(
            f'<text x="{x + w / 2:.0f}" y="{cy + len(lines) * 22 + 2:.0f}"'
            f' text-anchor="middle" font-family="{FONT}" font-size="15"'
            f' font-weight="500" fill="{MUTED}">{escape(sub)}</text>'
        )
    return out


def sequence_to_svg(spec: Sequence) -> str:
    g = seq_geometry(spec)
    centres, head_w, rows = g["centres"], g["head_w"], g["rows"]
    out = _svg_open(spec.title, spec.subtitle)

    # fragment bands first, so they sit behind everything
    for frag in spec.fragments:
        if frag.after >= len(rows):
            continue
        top = rows[frag.after] - 46
        last = min(frag.after + frag.span - 1, len(rows) - 1)
        height = rows[last] - top + 28
        stroke, fill, ink = ROLES[frag.tone or "core"]
        out.append(
            f'<rect x="{SEQ_LEFT - 20}" y="{top}" width="{CANVAS_W - SEQ_LEFT * 2 + 40}"'
            f' height="{height}" rx="12" fill="{fill}" fill-opacity="0.40"'
            f' stroke="{stroke}" stroke-width="1.5" stroke-dasharray="7 5"/>'
        )
        out.append(
            f'<text x="{SEQ_LEFT - 6}" y="{top + 21}" font-family="{FONT}"'
            f' font-size="16" font-weight="800" fill="{ink}">{escape(frag.label)}</text>'
        )

    # lifelines + heads
    for p in spec.participants:
        cx = centres[p.key]
        stroke, _, _ = ROLES[p.role]
        out.append(
            f'<line x1="{cx}" y1="{SEQ_TOP + SEQ_HEAD_H}" x2="{cx}" y2="{g["bottom"]}"'
            f' stroke="{stroke}" stroke-width="1.6" stroke-dasharray="6 6"'
            f' stroke-opacity="0.55"/>'
        )
        out += _svg_box(cx - head_w // 2, SEQ_TOP, head_w, SEQ_HEAD_H,
                        p.label, p.sub, p.role, rx=12, size=17)

    # messages
    lane = g["lane"]
    for i, msg in enumerate(spec.messages):
        y = rows[i]
        role = msg.tone or "core"
        stroke, _, ink = ROLES[role]
        dash = ' stroke-dasharray="8 5"' if msg.kind == "return" else ""
        marker = "arrow-open" if msg.kind == "return" else "arrow"

        if msg.kind == "self":
            cx = centres[msg.frm]
            # Flat loop: the label sits on the same line, so the callout never
            # reaches down into the next message row.
            out.append(
                f'<path d="M{cx} {y - 9} h44 v18 h-44" fill="none" stroke="{stroke}"'
                f' stroke-width="2" marker-end="url(#{marker})"/>'
            )
            out.append(
                f'<text x="{cx + 56}" y="{y + 6}" font-family="{FONT}"'
                f' font-size="15" font-weight="600" fill="{ink}">'
                f'{escape(msg.label)}</text>'
            )
            continue

        x1, x2 = centres[msg.frm], centres[msg.to]
        direction = 1 if x2 > x1 else -1
        sx, ex = x1 + direction * 6, x2 - direction * 12
        out.append(
            f'<line x1="{sx}" y1="{y}" x2="{ex}" y2="{y}" stroke="{stroke}"'
            f' stroke-width="2.2"{dash} marker-end="url(#{marker})"/>'
        )
        # Long labels get a smaller face so they stay inside the span they
        # annotate instead of running under a neighbouring lifeline.
        span = max(abs(x2 - x1), lane)
        size = 17
        for limit, candidate in ((span / 8.2, 17), (span / 7.2, 15), (span / 6.4, 14)):
            size = candidate
            if len(msg.label) <= limit:
                break
        mid = (x1 + x2) / 2
        out.append(
            f'<text x="{mid:.0f}" y="{y - 9}" text-anchor="middle"'
            f' font-family="{FONT}" font-size="{size}" font-weight="600"'
            f' fill="{ink}">{escape(msg.label)}</text>'
        )
        if msg.note:
            out.append(
                f'<text x="{mid:.0f}" y="{y + 17}" text-anchor="middle"'
                f' font-family="{FONT}" font-size="12" font-weight="500"'
                f' fill="{MUTED}">{escape(msg.note)}</text>'
            )

    if spec.footnote:
        for i, line in enumerate(_svg_wrap(spec.footnote, 150)):
            out.append(
                f'<text x="80" y="{CANVAS_H - 56 + i * 24}" font-family="{FONT}"'
                f' font-size="17" font-weight="500" fill="{MUTED}">'
                f'{escape(line)}</text>'
            )
    out.append("</svg>")
    return "".join(out) + "\n"


def component_to_svg(spec: Component) -> str:
    out = _svg_open(spec.title, spec.subtitle)

    for grp in spec.groups:
        stroke, fill, ink = ROLES[grp.role]
        out.append(
            f'<rect x="{grp.x}" y="{grp.y}" width="{grp.w}" height="{grp.h}" rx="18"'
            f' fill="{fill}" fill-opacity="0.35" stroke="{stroke}" stroke-width="1.8"'
            f' stroke-dasharray="8 6"/>'
        )
        # Shrink a long group title rather than let it run into the next group.
        gsize = 19
        while gsize > 12 and len(grp.label) * gsize * 0.52 > grp.w - 34:
            gsize -= 1
        out.append(
            f'<text x="{grp.x + 18}" y="{grp.y + 29}" font-family="{FONT}"'
            f' font-size="{gsize}" font-weight="800" fill="{ink}">'
            f'{escape(grp.label)}</text>'
        )

    pos = {b.key: b for b in spec.boxes}
    for edge in spec.edges:
        a, b = pos[edge.frm], pos[edge.to]
        stroke, _, ink = ROLES[edge.tone or "core"]
        dash = ' stroke-dasharray="8 5"' if edge.style == "dashed" else ""
        ax, ay = a.x + a.w / 2, a.y + a.h / 2
        bx, by = b.x + b.w / 2, b.y + b.h / 2
        side = edge.exit_side
        if side == "auto":
            side = "bottom" if abs(by - ay) >= abs(bx - ax) else "right"
        if side in ("bottom", "top"):
            sx, sy = ax, (a.y + a.h + 4) if by > ay else (a.y - 4)
            ex, ey = bx, (b.y - 10) if by > ay else (b.y + b.h + 10)
        else:
            sx, sy = (a.x + a.w + 4) if bx > ax else (a.x - 4), ay
            ex, ey = (b.x - 10) if bx > ax else (b.x + b.w + 10), by
        out.append(
            f'<line x1="{sx:.0f}" y1="{sy:.0f}" x2="{ex:.0f}" y2="{ey:.0f}"'
            f' stroke="{stroke}" stroke-width="2.2"{dash} marker-end="url(#arrow)"/>'
        )
        if edge.label:
            # paint-order=stroke knocks the ground colour out behind the text,
            # so a label crossing a box or group border stays readable.
            out.append(
                f'<text x="{(sx + ex) / 2:.0f}" y="{(sy + ey) / 2 - 8:.0f}"'
                f' text-anchor="middle" font-family="{FONT}" font-size="15"'
                f' font-weight="600" fill="{ink}" paint-order="stroke"'
                f' stroke="{GROUND}" stroke-width="7" stroke-linejoin="round">'
                f'{escape(edge.label)}</text>'
            )

    for box in spec.boxes:
        out += _svg_box(box.x, box.y, box.w, box.h, box.label, box.sub, box.role)

    for note in spec.notes:
        stroke, fill, ink = ROLES[note.role]
        out.append(
            f'<rect x="{note.x}" y="{note.y}" width="{note.w}" height="{note.h}"'
            f' rx="10" fill="{fill}" stroke="{stroke}" stroke-width="1.5"'
            f' stroke-dasharray="6 4"/>'
        )
        for i, line in enumerate(_svg_wrap(note.text, max(18, note.w // 8))):
            out.append(
                f'<text x="{note.x + 14}" y="{note.y + 28 + i * 21}"'
                f' font-family="{FONT}" font-size="15" font-weight="500"'
                f' fill="{ink}">{escape(line)}</text>'
            )

    if spec.footnote:
        for i, line in enumerate(_svg_wrap(spec.footnote, 150)):
            out.append(
                f'<text x="80" y="{CANVAS_H - 56 + i * 24}" font-family="{FONT}"'
                f' font-size="17" font-weight="500" fill="{MUTED}">'
                f'{escape(line)}</text>'
            )
    out.append("</svg>")
    return "".join(out) + "\n"


# ---- draw.io (mxGraph) writing -------------------------------------------
def _mx_open(name: str) -> list[str]:
    return [
        '<mxfile host="minitrack-build-diagrams" type="device">',
        f'  <diagram id="{escape(name)}" name="{escape(name)}">',
        '    <mxGraphModel dx="1920" dy="1080" grid="1" gridSize="10" guides="1"'
        ' tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1"'
        f' pageWidth="{CANVAS_W}" pageHeight="{CANVAS_H}" math="0" shadow="0">',
        '      <root>',
        '        <mxCell id="0" />',
        '        <mxCell id="1" parent="0" />',
    ]


def _mx_close() -> list[str]:
    return ["      </root>", "    </mxGraphModel>", "  </diagram>", "</mxfile>"]


def _mx_node(cid, value, style, x, y, w, h) -> str:
    return (
        f'        <mxCell id="{cid}" value="{escape(value)}" style="{escape(style)}"'
        f' vertex="1" parent="1">'
        f'<mxGeometry x="{x}" y="{y}" width="{w}" height="{h}" as="geometry"/>'
        f'</mxCell>'
    )


def _mx_edge(cid, value, style, source, target) -> str:
    return (
        f'        <mxCell id="{cid}" value="{escape(value)}" style="{escape(style)}"'
        f' edge="1" parent="1" source="{source}" target="{target}">'
        f'<mxGeometry relative="1" as="geometry"/></mxCell>'
    )


def _title_cells(title: str, subtitle: str) -> list[str]:
    cells = [_mx_node(
        "title", title,
        "text;html=1;align=left;verticalAlign=middle;fontSize=40;fontStyle=1;"
        f"fontColor={TITLE_INK};fontFamily=Inter;",
        80, 40, 1600, 56)]
    if subtitle:
        cells.append(_mx_node(
            "subtitle", subtitle,
            "text;html=1;align=left;verticalAlign=middle;fontSize=20;"
            f"fontColor={MUTED};fontFamily=Inter;",
            80, 96, 1600, 34))
    return cells


def sequence_to_drawio(spec: Sequence) -> str:
    g = seq_geometry(spec)
    centres, head_w, rows = g["centres"], g["head_w"], g["rows"]
    out = _mx_open(spec.name)
    out += _title_cells(spec.title, spec.subtitle)

    for frag in spec.fragments:
        if frag.after >= len(rows):
            continue
        top = rows[frag.after] - 34
        last = min(frag.after + frag.span - 1, len(rows) - 1)
        stroke, fill, ink = ROLES[frag.tone or "core"]
        out.append(_mx_node(
            f"frag{frag.after}", frag.label,
            "rounded=1;html=1;dashed=1;verticalAlign=top;align=left;spacingLeft=10;"
            f"spacingTop=4;fontSize=15;fontStyle=1;fillColor={fill};opacity=45;"
            f"strokeColor={stroke};fontColor={ink};fontFamily=Inter;",
            SEQ_LEFT - 20, top, CANVAS_W - SEQ_LEFT * 2 + 40, rows[last] - top + 30))

    # umlLifeline gives a real, editable draw.io lifeline (head + dashed stem).
    for p in spec.participants:
        stroke, fill, ink = ROLES[p.role]
        value = f"{p.label}\n{p.sub}" if p.sub else p.label
        out.append(_mx_node(
            f"life_{p.key}", value,
            "shape=umlLifeline;perimeter=lifelinePerimeter;whiteSpace=wrap;html=1;"
            f"container=1;collapsible=0;recursiveResize=0;outlineConnect=0;rounded=1;"
            f"size={SEQ_HEAD_H};fillColor={fill};strokeColor={stroke};fontColor={ink};"
            "fontSize=15;fontStyle=1;fontFamily=Inter;",
            centres[p.key] - head_w // 2, SEQ_TOP, head_w, g["bottom"] - SEQ_TOP))

    for i, msg in enumerate(spec.messages):
        y = rows[i]
        stroke, _, ink = ROLES[msg.tone or "core"]
        dashed = 1 if msg.kind == "return" else 0
        endarrow = "open" if msg.kind == "return" else "block"
        label = f"{msg.label}\n{msg.note}" if msg.note else msg.label
        if msg.kind == "self":
            # A true mxGraph self-edge routes badly; a dashed callout pinned to
            # the lifeline reads the same and stays editable.
            _, fill, _ = ROLES[msg.tone or "core"]
            out.append(_mx_node(
                f"self{i}", label,
                "rounded=1;whiteSpace=wrap;html=1;dashed=1;align=left;"
                f"spacingLeft=8;fontSize=14;fillColor={fill};strokeColor={stroke};"
                f"fontColor={ink};fontFamily=Inter;",
                centres[msg.frm] + 12, y - 14, 300, 34))
            continue
        style = (
            "html=1;rounded=0;jumpStyle=arc;exitX=0.5;exitY=0;exitDx=0;exitDy=0;"
            f"entryX=0.5;entryY=0;entryDx=0;entryDy=0;dashed={dashed};"
            f"endArrow={endarrow};strokeColor={stroke};fontColor={ink};fontSize=15;"
            "fontStyle=1;fontFamily=Inter;verticalAlign=bottom;"
        )
        out.append(
            f'        <mxCell id="msg{i}" value="{escape(label)}"'
            f' style="{escape(style)}" edge="1" parent="1"'
            f' source="life_{msg.frm}" target="life_{msg.to}">'
            f'<mxGeometry relative="1" as="geometry">'
            f'<mxPoint x="{centres[msg.frm]}" y="{y}" as="sourcePoint"/>'
            f'<mxPoint x="{centres[msg.to]}" y="{y}" as="targetPoint"/>'
            f'</mxGeometry></mxCell>'
        )

    if spec.footnote:
        out.append(_mx_node(
            "footnote", spec.footnote,
            "text;html=1;align=left;verticalAlign=middle;fontSize=16;"
            f"fontColor={MUTED};fontFamily=Inter;whiteSpace=wrap;",
            80, CANVAS_H - 80, CANVAS_W - 160, 48))
    out += _mx_close()
    return "\n".join(out) + "\n"


def component_to_drawio(spec: Component) -> str:
    out = _mx_open(spec.name)
    out += _title_cells(spec.title, spec.subtitle)

    for i, grp in enumerate(spec.groups):
        stroke, fill, ink = ROLES[grp.role]
        out.append(_mx_node(
            f"grp{i}", grp.label,
            "rounded=1;html=1;dashed=1;verticalAlign=top;align=left;spacingLeft=12;"
            f"spacingTop=6;fontSize=17;fontStyle=1;fillColor={fill};opacity=35;"
            f"strokeColor={stroke};fontColor={ink};fontFamily=Inter;",
            grp.x, grp.y, grp.w, grp.h))

    for box in spec.boxes:
        stroke, fill, ink = ROLES[box.role]
        value = f"{box.label}\n{box.sub}" if box.sub else box.label
        out.append(_mx_node(
            f"n_{box.key}", value,
            "rounded=1;whiteSpace=wrap;html=1;arcSize=12;shadow=1;fontSize=17;"
            f"fontStyle=1;fillColor={fill};strokeColor={stroke};fontColor={ink};"
            "fontFamily=Inter;",
            box.x, box.y, box.w, box.h))

    for i, edge in enumerate(spec.edges):
        stroke, _, ink = ROLES[edge.tone or "core"]
        dashed = 1 if edge.style == "dashed" else 0
        out.append(_mx_edge(
            f"e{i}", edge.label,
            "html=1;rounded=1;jumpStyle=arc;endArrow=block;"
            f"dashed={dashed};strokeColor={stroke};fontColor={ink};fontSize=14;"
            "fontStyle=1;fontFamily=Inter;",
            f"n_{edge.frm}", f"n_{edge.to}"))

    for i, note in enumerate(spec.notes):
        stroke, fill, ink = ROLES[note.role]
        out.append(_mx_node(
            f"note{i}", note.text,
            "shape=note;whiteSpace=wrap;html=1;size=14;dashed=1;align=left;"
            f"spacingLeft=6;fontSize=14;fillColor={fill};strokeColor={stroke};"
            f"fontColor={ink};fontFamily=Inter;",
            note.x, note.y, note.w, note.h))

    if spec.footnote:
        out.append(_mx_node(
            "footnote", spec.footnote,
            "text;html=1;align=left;verticalAlign=middle;fontSize=16;"
            f"fontColor={MUTED};fontFamily=Inter;whiteSpace=wrap;",
            80, CANVAS_H - 80, CANVAS_W - 160, 48))
    out += _mx_close()
    return "\n".join(out) + "\n"


# ---- driver --------------------------------------------------------------
def render_all() -> dict[Path, str]:
    """Return {path: content} for every generated file."""
    from specs import COMPONENTS, SEQUENCES

    files: dict[Path, str] = {}
    for spec in COMPONENTS:
        files[DRAWIO_DIR / f"{spec.name}.drawio"] = component_to_drawio(spec)
        files[SVG_DIR / f"{spec.name}.svg"] = component_to_svg(spec)
    for spec in SEQUENCES:
        files[DRAWIO_DIR / f"{spec.name}.drawio"] = sequence_to_drawio(spec)
        files[SVG_DIR / f"{spec.name}.svg"] = sequence_to_svg(spec)
    return files


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true",
                        help="exit 1 if any output is missing or stale")
    args = parser.parse_args()

    sys.path.insert(0, str(HERE))
    files = render_all()

    if args.check:
        stale = [p for p, body in files.items()
                 if not p.exists() or p.read_text() != body]
        for path in stale:
            print(f"STALE: {path.relative_to(HERE.parent.parent)}")
        if stale:
            print(f"\n{len(stale)} file(s) out of date -- run build_diagrams.py")
            return 1
        print(f"All {len(files)} generated files are up to date.")
        return 0

    DRAWIO_DIR.mkdir(parents=True, exist_ok=True)
    SVG_DIR.mkdir(parents=True, exist_ok=True)
    for path, body in sorted(files.items()):
        path.write_text(body)
    print(f"Wrote {len(files)} files "
          f"({len(files) // 2} diagrams x .drawio + .svg) to {HERE}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
