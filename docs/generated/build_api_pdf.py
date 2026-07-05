from __future__ import annotations

import re
from pathlib import Path
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle,
    Preformatted, KeepTogether
)
from reportlab.pdfbase.pdfmetrics import stringWidth

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / 'API_MOBILE.md'
OUT = ROOT / 'generated' / 'RuangTemu-Mobile-API-Documentation.pdf'

text = SRC.read_text(encoding='utf-8')

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(
    name='CoverTitle', parent=styles['Title'], fontName='Helvetica-Bold', fontSize=26,
    leading=32, alignment=TA_CENTER, textColor=colors.HexColor('#0f172a'), spaceAfter=10
))
styles.add(ParagraphStyle(
    name='CoverSub', parent=styles['Normal'], fontName='Helvetica', fontSize=11,
    leading=16, alignment=TA_CENTER, textColor=colors.HexColor('#475569')
))
styles.add(ParagraphStyle(
    name='H1Custom', parent=styles['Heading1'], fontName='Helvetica-Bold', fontSize=18,
    leading=23, textColor=colors.HexColor('#0f172a'), spaceBefore=14, spaceAfter=8
))
styles.add(ParagraphStyle(
    name='H2Custom', parent=styles['Heading2'], fontName='Helvetica-Bold', fontSize=14,
    leading=18, textColor=colors.HexColor('#1e293b'), spaceBefore=11, spaceAfter=6
))
styles.add(ParagraphStyle(
    name='H3Custom', parent=styles['Heading3'], fontName='Helvetica-Bold', fontSize=11.5,
    leading=15, textColor=colors.HexColor('#334155'), spaceBefore=8, spaceAfter=4
))
styles.add(ParagraphStyle(
    name='BodyCustom', parent=styles['BodyText'], fontName='Helvetica', fontSize=9,
    leading=13, textColor=colors.HexColor('#1f2937'), spaceAfter=4
))
styles.add(ParagraphStyle(
    name='BulletCustom', parent=styles['BodyText'], fontName='Helvetica', fontSize=9,
    leading=12.5, leftIndent=12, firstLineIndent=-8, spaceAfter=2
))
styles.add(ParagraphStyle(
    name='CodeInline', parent=styles['BodyText'], fontName='Courier', fontSize=8,
    leading=11, textColor=colors.HexColor('#111827')))
styles.add(ParagraphStyle(
    name='SmallMuted', parent=styles['BodyText'], fontName='Helvetica', fontSize=8,
    leading=11, textColor=colors.HexColor('#64748b')))

def esc(s: str) -> str:
    return (s.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;'))

def inline_md(s: str) -> str:
    s = esc(s)
    s = re.sub(r'`([^`]+)`', r'<font name="Courier" backColor="#f1f5f9">\1</font>', s)
    s = re.sub(r'\*\*([^*]+)\*\*', r'<b>\1</b>', s)
    s = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', r'<u>\1</u> (\2)', s)
    return s

def make_table(rows: list[list[str]]):
    if not rows:
        return []
    max_cols = max(len(r) for r in rows)
    normalized = [r + [''] * (max_cols - len(r)) for r in rows]
    usable_width = A4[0] - 36*mm
    col_width = usable_width / max_cols
    data = [[Paragraph(inline_md(cell.strip()), styles['BodyCustom']) for cell in row] for row in normalized]
    tbl = Table(data, colWidths=[col_width] * max_cols, hAlign='LEFT', repeatRows=1)
    tbl.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#e2e8f0')),
        ('TEXTCOLOR', (0,0), (-1,0), colors.HexColor('#0f172a')),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('GRID', (0,0), (-1,-1), 0.35, colors.HexColor('#cbd5e1')),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
    ]))
    return [tbl, Spacer(1, 6)]

def parse_table(lines: list[str], i: int):
    rows = []
    while i < len(lines) and lines[i].strip().startswith('|'):
        parts = [p.strip() for p in lines[i].strip().strip('|').split('|')]
        if all(re.fullmatch(r':?-{3,}:?', p or '') for p in parts):
            i += 1
            continue
        rows.append(parts)
        i += 1
    return rows, i

story = []
story.append(Spacer(1, 70*mm))
story.append(Paragraph('RuangTemu', styles['CoverTitle']))
story.append(Paragraph('Mobile API Documentation', styles['CoverTitle']))
story.append(Spacer(1, 8))
story.append(Paragraph('Panduan integrasi API untuk aplikasi mobile Android/iOS', styles['CoverSub']))
story.append(Paragraph('Generated from docs/API_MOBILE.md • Last updated: 2026-07-05', styles['CoverSub']))
story.append(PageBreak())

lines = text.splitlines()
i = 0
in_code = False
code_buf: list[str] = []
para_buf: list[str] = []

def flush_para():
    global para_buf
    if para_buf:
        joined = ' '.join(x.strip() for x in para_buf).strip()
        if joined:
            story.append(Paragraph(inline_md(joined), styles['BodyCustom']))
        para_buf.clear()

while i < len(lines):
    line = lines[i]
    stripped = line.strip()

    if stripped.startswith('```'):
        if not in_code:
            flush_para()
            in_code = True
            code_buf = []
        else:
            in_code = False
            code = '\n'.join(code_buf).rstrip() or ' '
            story.append(KeepTogether([
                Preformatted(code, styles['CodeInline'], maxLineLength=92),
                Spacer(1, 5)
            ]))
            code_buf = []
        i += 1
        continue

    if in_code:
        code_buf.append(line)
        i += 1
        continue

    if not stripped:
        flush_para()
        i += 1
        continue

    if stripped == '---':
        flush_para()
        story.append(Spacer(1, 7))
        i += 1
        continue

    if stripped.startswith('|'):
        flush_para()
        rows, i = parse_table(lines, i)
        story.extend(make_table(rows))
        continue

    if stripped.startswith('#'):
        flush_para()
        level = len(stripped) - len(stripped.lstrip('#'))
        title = stripped[level:].strip()
        if title == 'RuangTemu Mobile API Documentation':
            i += 1
            continue
        style = styles['H1Custom'] if level == 1 else styles['H2Custom'] if level == 2 else styles['H3Custom']
        if level == 1 and story:
            story.append(PageBreak())
        story.append(Paragraph(inline_md(title), style))
        i += 1
        continue

    if stripped.startswith('- [ ]'):
        flush_para()
        story.append(Paragraph('☐ ' + inline_md(stripped[5:].strip()), styles['BulletCustom']))
        i += 1
        continue

    if stripped.startswith('- '):
        flush_para()
        story.append(Paragraph('• ' + inline_md(stripped[2:].strip()), styles['BulletCustom']))
        i += 1
        continue

    m = re.match(r'^(\d+)\.\s+(.*)$', stripped)
    if m:
        flush_para()
        story.append(Paragraph(f'{m.group(1)}. {inline_md(m.group(2))}', styles['BulletCustom']))
        i += 1
        continue

    if stripped.startswith('>'):
        flush_para()
        story.append(Paragraph(inline_md(stripped.lstrip('>').strip()), styles['SmallMuted']))
        i += 1
        continue

    para_buf.append(line)
    i += 1

flush_para()


def header_footer(canvas, doc):
    canvas.saveState()
    width, height = A4
    canvas.setFont('Helvetica', 8)
    canvas.setFillColor(colors.HexColor('#64748b'))
    canvas.drawString(18*mm, height - 12*mm, 'RuangTemu Mobile API Documentation')
    canvas.drawRightString(width - 18*mm, 10*mm, f'Page {doc.page}')
    canvas.setStrokeColor(colors.HexColor('#e2e8f0'))
    canvas.line(18*mm, height - 15*mm, width - 18*mm, height - 15*mm)
    canvas.restoreState()

OUT.parent.mkdir(parents=True, exist_ok=True)
doc = SimpleDocTemplate(
    str(OUT), pagesize=A4,
    rightMargin=18*mm, leftMargin=18*mm,
    topMargin=20*mm, bottomMargin=16*mm,
    title='RuangTemu Mobile API Documentation',
    author='RuangTemu'
)
doc.build(story, onFirstPage=header_footer, onLaterPages=header_footer)
print(OUT)
