"""Builds lilguys-punct.ttf, the few marks m6x11plus lacks (· ★ ’ “ ” … → −) drawn on its grid, for the site to
load beside it by unicode-range. One unit here is 64 font units, a pixel at 16px; row 15 sits on the baseline, as
m6x11plus's glyphs do. Run: python3 docs/fonts/lilguys-punct.py docs/fonts/lilguys-punct.ttf"""
import sys
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen
U = 64
GLYPHS = {
  'periodcentered': (0x00B7, 10, ['##', '##']),
  'quoteright':     (0x2019, 5, ['##', '##', '.#']),
  'quotedblleft':   (0x201C, 5, ['#..#.', '##.##', '##.##']),
  'quotedblright':  (0x201D, 5, ['##.##', '##.##', '.#..#']),
  'ellipsis':       (0x2026, 14, ['##.##.##', '##.##.##']),
  'arrowright':     (0x2192, 7, ['.......##..', '........##.', '.........##', '###########', '###########', '.........##', '........##.', '.......##..']),
  'minus':          (0x2212, 10, ['######', '######']),
  'uni2605':        (0x2605, 5, ['.....#.....', '....###....', '....###....', '###########', '.#########.', '..#######..', '..#######..', '.####.####.', '.###...###.', '##.......##']),
}
fb = FontBuilder(1024, isTTF=True)
names = ['.notdef', 'space'] + list(GLYPHS)
fb.setupGlyphOrder(names)
fb.setupCharacterMap({0x20: 'space', **{cp: n for n, (cp, _, _) in GLYPHS.items()}})
glyphs, metrics = {}, {}
for n in ['.notdef', 'space']:
    glyphs[n] = TTGlyphPen(None).glyph(); metrics[n] = (6 * U, 0)
for n, (cp, top, rows) in GLYPHS.items():
    pen = TTGlyphPen(None)
    for i, row in enumerate(rows):
        r = top + i
        y0 = -128 + (15 - r) * U
        x = 0
        while x < len(row):
            if row[x] != '#': x += 1; continue
            e = x
            while e < len(row) and row[e] == '#': e += 1
            # Clockwise, as TrueType outer contours go.
            pen.moveTo((x * U, y0)); pen.lineTo((x * U, y0 + U)); pen.lineTo((e * U, y0 + U)); pen.lineTo((e * U, y0)); pen.closePath()
            x = e
    glyphs[n] = pen.glyph()
    metrics[n] = ((len(rows[0]) + 1) * U, 0)
fb.setupGlyf(glyphs)
fb.setupHorizontalMetrics(metrics)
fb.setupHorizontalHeader(ascent=832, descent=-320)
fb.setupOS2(sTypoAscender=832, sTypoDescender=-320, usWinAscent=832, usWinDescent=320)
fb.setupNameTable({'familyName': 'lilguys punct', 'styleName': 'Regular'})
fb.setupPost()
fb.save(sys.argv[1])
