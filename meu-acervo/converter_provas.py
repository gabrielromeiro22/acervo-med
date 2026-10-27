"""Converte os PDFs de devolutiva (Drive) em questões para o modo prova do Meu Acervo.

Uso: python3 converter_provas.py "5º PERÍODO" ["TPI" "ENAMED" "INTERNATO" ...]
Baixa os PDFs que faltam para _cache/pdfs, gera provas/<grupo>.js (um por período/grupo),
o carregador provas.js e as imagens das questões em img/.
"""
import json, os, re, subprocess, sys
from concurrent.futures import ThreadPoolExecutor
import hashlib
import fitz

fitz.TOOLS.mupdf_display_errors(False)

BASE = os.path.dirname(os.path.abspath(__file__))
CACHE = os.path.join(BASE, '_cache', 'pdfs')
OUT = os.path.join(BASE, 'provas.js')  # carregador: inclui provas/<grupo>.js
OUTDIR = os.path.join(BASE, 'provas')
IMG = os.path.join(BASE, 'img')
TREE = json.load(open(os.path.join(BASE, 'acervo_tree.json')))

# marca d'água de rastreio + rodapés de página
NOISE = [
    re.compile(r'\d{6}\.[0-9a-f]{6}\.[0-9a-f.]+\s*P\S*gina\s*\d+\s*de\s*\d+'),
    re.compile(r'\d{6}\.[0-9a-f]{6}\.[0-9a-f.]{10,}'),
    re.compile(r'^\s*P\S*gina\s*\d+\s*de\s*\d+\s*$', re.M),
    re.compile(r'^\s*acervo\.(vip|top)( / acervotop\.com)?\s*$', re.M),
    re.compile(r'^\s*\d{1,2}/\d{1,2}/\d{4},? \d{1,2}:\d{2}.*$', re.M),
    # banner da 1ª página (aparece como texto solto no OCR)
    re.compile(r'^\s*(Quer treinar essa prova\??|Acesse:?|www\.acervo\S*.*|acervo do|Rique|que)\s*$', re.M | re.I),
]
SPLIT = re.compile(r'(?:\d+\s*ª\s*)?QUEST[ÃA]O[^\n]*\n(?:(?!Enunciado:)[^\n]*\n){0,6}?\s*Enunciado:\s*')
ALT = re.compile(r'\(\s*alternativa\s+([A-E])\s*\)\s*(\(\s*CORRETA\s*\))?')
NEWPAR = re.compile(r'^(?:[IVX]{1,4}\s*[-–.)]|[a-e]\)|PORQUE\b|Refer[êe]ncia|Justificativa|[A-E]\)\s|•|-\s)')


def download(fid):
    p = os.path.join(CACHE, fid + '.pdf')
    if not (os.path.exists(p) and os.path.getsize(p) > 0):
        subprocess.run(['curl', '-sL', '-A', 'Mozilla/5.0', '-o', p,
                        f'https://drive.google.com/uc?export=download&id={fid}'], check=False)
    return p


def save_img(data, ext, prefix=''):
    name = prefix + hashlib.md5(data).hexdigest()[:12] + '.' + ext
    p = os.path.join(IMG, name)
    if not os.path.exists(p):
        open(p, 'wb').write(data)
    return f'[[IMG:{name}]]'


def page_figs(pg, first):
    """Figuras da página (sem logos, cabeçalho e página escaneada inteira): [(y0, y1, marcador)]."""
    W, H, out = pg.rect.width, pg.rect.height, []
    for b in pg.get_text('dict')['blocks']:
        if b['type'] != 1:
            continue
        x0, y0, x1, y1 = b['bbox']
        w, h = x1 - x0, y1 - y0
        if (w < 80 and h < 80) or (first and y1 < 140) or (w > W * .9 and h > H * .9):
            continue
        out.append((y0, y1, save_img(b['image'], b['ext'])))
    return out


def page_items(pg, first):
    """Linhas de texto e imagens/tabelas da página, na ordem do conteúdo."""
    W, H = pg.rect.width, pg.rect.height
    # tabelas desenhadas dentro das questões (a moldura da devolutiva começa em x≈29 e é ignorada)
    tabs = []
    try:
        for t in pg.find_tables().tables:
            x0, y0, x1, y1 = t.bbox
            if x0 >= 31 and t.row_count >= 2 and t.col_count >= 2 and (x1 - x0) * (y1 - y0) > 3000:
                tabs.append(fitz.Rect(t.bbox))
    except Exception:
        pass
    out, placed = [], set()
    for b in pg.get_text('dict')['blocks']:
        if b['type'] == 1:
            x0, y0, x1, y1 = b['bbox']
            w, h = x1 - x0, y1 - y0
            if (w < 80 and h < 80) or (first and y1 < 140) or (w > W * .9 and h > H * .9):
                continue  # logo, cabeçalho ou página escaneada
            if any(fitz.Rect(b['bbox']).intersects(r) for r in tabs):
                continue
            out.append(save_img(b['image'], b['ext']))
            continue
        for ln in b['lines']:
            txt = ''.join(sp['text'] for sp in ln['spans'])
            c = fitz.Rect(ln['bbox'])
            c = fitz.Point((c.x0 + c.x1) / 2, (c.y0 + c.y1) / 2)
            hit = next((i for i, r in enumerate(tabs) if c in r), None)
            if hit is None:
                out.append(txt)
            elif hit not in placed:
                placed.add(hit)
                pix = pg.get_pixmap(clip=tabs[hit] + (-2, -2, 2, 2), dpi=144)
                out.append(save_img(pix.tobytes('png'), 'png'))
    return out


ALT_HEAD = re.compile(r'^\(\s*alternativa\s+[A-E]\s*\)')
ALT_END = re.compile(r'^(\(\s*alternativa|Resposta comentada|\d+\s*ª\s*QUEST|P\S{0,2}gina\s*\d|\d{6}\.)')
ROMAN_JUNK = re.compile(r'^[\sIVXlNn|1ШІі,.;:e-]*$')
FILLER = re.compile(r'\b(somente|apenas|as|alternativas|afirmativas|assertivas|estão|corretas?)\b', re.I)


def crop_roman_alts(pg, rows):
    """O OCR erra romanos curtos (I, II, IV...) e às vezes não lê nada: troca por recorte da página."""
    from PIL import Image, ImageOps
    import io
    out, i = [], 0
    while i < len(rows):
        y, x = rows[i]
        out.append((y, x))
        i += 1
        if not ALT_HEAD.match(x):
            continue
        j = i
        while j < len(rows) and not ALT_END.match(rows[j][1]):
            j += 1
        body = ' '.join(r[1] for r in rows[i:j])
        if len(body) < 60 and ROMAN_JUNK.match(FILLER.sub('', body)):
            y0 = y + 7
            y1 = rows[j][0] - 7 if j < len(rows) else y0 + 18 * max(1, j - i)
            if y1 - y0 > 6:
                pix = pg.get_pixmap(clip=fitz.Rect(33, y0, pg.rect.width - 33, y1), dpi=144)
                im = Image.open(io.BytesIO(pix.tobytes('png'))).convert('L')
                ink = ImageOps.invert(im).point(lambda v: 255 if v > 40 else 0)
                px, w, h = ink.load(), ink.width, ink.height
                for yy in range(h):  # apaga as bordas da caixa (linhas quase contínuas)
                    if sum(px[xx, yy] > 0 for xx in range(w)) > w * .6:
                        for xx in range(w): px[xx, yy] = 0; im.putpixel((xx, yy), 255)
                for xx in range(w):
                    if sum(px[xx, yy] > 0 for yy in range(h)) > h * .6:
                        for yy in range(h): px[xx, yy] = 0; im.putpixel((xx, yy), 255)
                bb = ink.getbbox()
                if bb:
                    im = im.crop((max(0, bb[0] - 8), max(0, bb[1] - 6), min(im.width, bb[2] + 8), min(im.height, bb[3] + 6)))
                    buf = io.BytesIO(); im.save(buf, 'PNG')
                    out.append((y0, save_img(buf.getvalue(), 'png', 'r_')))
                    i = j
    return out


def ocr(path):
    """PDF com o texto convertido em contornos: OCR do macOS (tools/ocr), com cache."""
    cache = os.path.join(BASE, '_cache', 'txt', os.path.basename(path)[:-4] + '.ocr.txt')
    if not os.path.exists(cache):
        tool = os.path.join(BASE, 'tools', 'ocr')
        if not os.path.exists(tool):
            subprocess.run(['swiftc', '-O', tool + '.swift', '-o', tool], check=True)
        r = subprocess.run([tool, path], capture_output=True, text=True)
        os.makedirs(os.path.dirname(cache), exist_ok=True)
        open(cache, 'w').write(r.stdout)
    # junta as linhas do OCR com as figuras da página, pela altura
    d, out = fitz.open(path), []
    for i, pg_txt in enumerate(open(cache).read().split('\f')):
        rows = [(float(y), x) for y, _, x in (l.partition('\t') for l in pg_txt.strip('\n').split('\n')) if _]
        if i < len(d):
            figs = page_figs(d[i], i == 0)
            keep = re.compile(r'(QUEST[ÃA]O|Enunciado:|Alternativas:|\(\s*alternativa|Resposta comentada)')
            rows = [r for r in rows if keep.search(r[1]) or not any(y0 <= r[0] <= y1 for y0, y1, _ in figs)]  # texto de dentro da figura
            rows += [(y0, m) for y0, _, m in figs]
            rows = crop_roman_alts(d[i], sorted(rows, key=lambda r: r[0]))
        out += [x for _, x in sorted(rows, key=lambda r: r[0])]
    t = '\n'.join(out)
    t = t.translate(str.maketrans('АВСЕНКМОРТХаеосрх', 'ABCEHKMOPTXaeocpx'))  # cirílico que o OCR confunde
    # romano no início de afirmativa ("N." = IV., "Il -" = II -, ...)
    ROM = {'N': 'IV', 'Ш': 'III', 'І': 'I', 'l': 'I', 'Il': 'II', 'Ill': 'III', 'll': 'II', 'lll': 'III',
           '|': 'I', '||': 'II', '|||': 'III', 'lI': 'II', 'IIl': 'III', 'Vl': 'VI'}
    t = re.sub(r'^(N|Ш|І|l|Il|Ill|ll|lll|\|{1,3}|lI|IIl|Vl)(\s*[.\-–)]\s)', lambda m: ROM[m.group(1)] + m.group(2), t, flags=re.M)
    return re.sub(r'^\s*\d{6}\.\w{6}\.[\w.]{8,}\s*$', '', t, flags=re.M)  # código de rastreio lido com erro


def text_of(path):
    try:
        d = fitz.open(path)
        t = '\n'.join('\n'.join(page_items(pg, i == 0)) for i, pg in enumerate(d))
        if len(t.strip()) < 100 * len(d) and len(d) > 1 and len(d[0].get_drawings()) > 300:
            t = ocr(path)
    except Exception:
        return ''
    for rx in NOISE:
        t = rx.sub('', t)
    return t


def para_by_lines(block):
    lines = [l.strip() for l in block.replace('\xa0', ' ').split('\n') if l.strip()]
    if not lines:
        return ''
    width = sorted(len(l) for l in lines)[min(len(lines) - 1, int(len(lines) * .9))]
    out, cur, prev = [], '', ''
    for l in lines:
        if l.startswith('[[IMG:'):
            if cur:
                out.append(cur)
            out.append(l)
            cur, prev = '', ''
            continue
        brk = cur and not re.match(r'[,;.:)\]]', l) and (NEWPAR.match(l) or (prev[-1:] in ('.', ':', '?', '!', ')') and len(prev) < width * .8))
        if brk:
            out.append(cur)
            cur = l
        else:
            cur = f'{cur} {l}' if cur else l
        prev = l
    if cur:
        out.append(cur)
    return '\n\n'.join(re.sub(r'\(\s+', '(', re.sub(r'\s+', ' ', p)).strip() for p in out)


def parse(t):
    head, *blocks = SPLIT.split(t)
    # cabeçalho numerado sem "Enunciado:" (o PDF trouxe só a resposta): vira questão própria sem enunciado
    blocks = [x for b in blocks for x in re.split(r'\n\s*(?=\d+\s*ª\s*QUEST[ÃA]O)', b)]
    blocks = [re.sub(r'^\d+\s*ª\s*QUEST[ÃA]O[^\n]*\n', '\x00', b) for b in blocks]
    title = ''
    m = re.search(r'Data:[^\n]*\n(.*?)RELAT[ÓO]RIO DE DEVOLUTIVA', head, re.S)
    if m:
        title = re.sub(r'\s+', ' ', m.group(1)).strip()
        title = re.sub(r'^[\d/]+\s*', '', title)
    qs = []
    for b in blocks:
        if b.startswith('\x00'):  # sem enunciado
            b = re.sub(r'^\x00', '', b)
            enun, rest = '', b if 'Alternativas:' not in b else b.partition('Alternativas:')[2]
        else:
            enun, _, rest = b.partition('Alternativas:')
        alts_raw, _, com = rest.partition('Resposta comentada:')
        com = re.sub(r'^\s*Resposta comentada:\s*', '', com)
        q = {'e': para_by_lines(enun), 'k': para_by_lines(com)}
        parts = ALT.split(alts_raw)
        if len(parts) > 3:  # alternativas completas (ou só a correta, no S_alt)
            alts = []
            for i in range(1, len(parts), 3):
                letter, corr, txt = parts[i], parts[i + 1], para_by_lines(parts[i + 2]).replace('\n\n', ' ')
                alts.append([letter, txt])
                if corr:
                    q['c'] = letter
            if len(alts) >= 4:
                q['t'], q['a'] = 'mc', alts
            else:  # S_alt: o PDF só traz a correta (às vezes junto com a A)
                q['t'] = 'one'
                q['r'] = next((t for l, t in alts if l == q.get('c')), alts[0][1] if alts else '')
                q.pop('c', None)
        elif '(CORRETA)' in alts_raw.upper():
            q['t'], q['r'] = 'one', para_by_lines(re.sub(r'\(\s*CORRETA\s*\)', '', alts_raw)).lstrip('. ')
        else:
            q['t'] = 'disc'
        if q['t'] == 'mc' and 'c' not in q:
            q['anul'] = 1  # sem gabarito marcado
        qs.append(q)
    return title, qs


def group_of(segs):
    """(grupo, disciplina) de um arquivo da árvore, ou None se não for prova."""
    top = re.sub(r'[^\wº ]', '', segs[0]).strip()
    if 'ACERVO.VIP' in '/'.join(segs).upper() or not segs[-1].lower().endswith('.pdf'):
        return None
    if top in ('TPI', 'ENAMED'):
        return (top, segs[0]) if len(segs) == 2 else None
    if top == 'INTERNATO':
        if len(segs) == 3 or (len(segs) == 4 and 'REINTEGRADORA' in segs[2].upper()):
            return top, segs[1]
        return None
    return (top, segs[1]) if len(segs) == 3 else None


def sub_of(name, disc):
    """Rótulo que diferencia provas do mesmo semestre (ROT. 1 · B · 14T, Simulado Enamed 01...)."""
    x = re.sub(r'\(?www\.acervo\.\w+\)?|\(?20\d\d\.[12]\)?|\b(Recursos?|S_alt|Anulada|Irregular|normal|comprimido)\b', ' ', name, flags=re.I)
    x = re.sub(r'^\s*' + re.escape(re.sub(r'[^\w ]', '', disc).strip()) + r'\b', '', x.strip(), flags=re.I)
    x = re.sub(r'\s*-\s*', ' · ', re.sub(r'\s+', ' ', x)).strip(' ·()')
    return x


def slug(per):
    return re.sub(r'\W+', '', per.replace('º', '').replace(' PERÍODO', 'p').lower())


def load_all():
    provas = {}
    for f in sorted(os.listdir(OUTDIR)) if os.path.isdir(OUTDIR) else []:
        if f.endswith('.js'):
            provas.update(json.loads(open(os.path.join(OUTDIR, f)).read().split(',', 1)[1].rsplit(')', 1)[0]))
    return provas


def main(groups):
    os.makedirs(CACHE, exist_ok=True)
    os.makedirs(IMG, exist_ok=True)
    os.makedirs(OUTDIR, exist_ok=True)
    items = []
    for x in TREE:
        segs = x['path'].split('/')
        g = group_of(segs)
        if g and any(p.upper() in g[0].upper() for p in groups):
            items.append((x['id'], g[0], g[1], segs[-1]))
    with ThreadPoolExecutor(6) as ex:
        list(ex.map(lambda it: download(it[0]), items))

    provas = {k: v for k, v in load_all().items() if not any(p.upper() in v['per'].upper() for p in groups)}
    for fid, per, disc, fname in items:
        name = re.sub(r'\.pdf$', '', fname, flags=re.I)
        sem = (re.search(r'(20\d\d\.[12])', name) or [None, ''])[1]
        flags = [f for f in ['Recurso', 'S_alt', 'Anulada', 'Irregular', 'Comentada', 'Gabarito', 'Topicos', 'Repetidas'] if f.lower() in name.lower()]
        t = text_of(os.path.join(CACHE, fid + '.pdf'))
        title, qs = parse(t) if t else ('', [])
        kind = 'recurso' if 'Recurso' in flags else ('prova' if sem and not {'Comentada', 'Gabarito', 'Topicos', 'Repetidas'} & set(flags) else 'extra')
        if kind == 'extra' and len(qs) >= 5:
            kind = 'prova'  # compilação que também está no formato de devolutiva
        provas[fid] = {'per': per, 'disc': disc, 'name': name, 'sem': sem, 'sub': sub_of(name, disc), 'flags': flags,
                       'title': title, 'kind': kind, 'q': qs}
        n = len(qs)
        tipos = {k: sum(1 for q in qs if q['t'] == k) for k in ('mc', 'one', 'disc')}
        print(f'{n:3} questões {tipos} | {per}/{disc}/{name}')
    # banners/logos: imagem repetida em 4+ arquivos não faz parte de questão
    seen = {}
    for fid, v in provas.items():
        for name in set(re.findall(r'\[\[IMG:([^\]]+)\]\]', json.dumps(v['q']))):
            seen.setdefault(name, set()).add(fid)
    ban = {n for n, fs in seen.items() if len(fs) >= 4}
    rx = re.compile(r'\s*\[\[IMG:(%s)\]\]\s*' % '|'.join(map(re.escape, ban))) if ban else None
    def strip(x):
        return re.sub(r'\n{3,}', '\n\n', rx.sub('\n\n', x)).strip() if isinstance(x, str) else x
    for v in (provas.values() if rx else []):
        for q in v['q']:
            for f in ('e', 'k', 'r'):
                if f in q:
                    q[f] = strip(q[f])
            if 'a' in q:
                q['a'] = [[l, strip(t)] for l, t in q['a']]
    for n in ban:
        if os.path.exists(os.path.join(IMG, n)):
            os.remove(os.path.join(IMG, n))
    used = set(re.findall(r'\[\[IMG:([^\]]+)\]\]', json.dumps(provas)))
    for n in os.listdir(IMG):
        if n not in used:
            os.remove(os.path.join(IMG, n))
    write_out(provas)


def write_out(provas):
    """provas/<grupo>.js (carregados pelo app via provas.js) + provas_completo.js no formato antigo
    (window.PROVAS={...}), que é o que o scripts/acervo/merge-meuacervo.mjs do ~/acervo-med lê."""
    os.makedirs(OUTDIR, exist_ok=True)
    groups_out = {}
    for fid, v in provas.items():
        groups_out.setdefault(slug(v['per']), {})[fid] = v
    for f in os.listdir(OUTDIR):
        if f.endswith('.js') and f[:-3] not in groups_out:
            os.remove(os.path.join(OUTDIR, f))
    for g, d in sorted(groups_out.items()):
        open(os.path.join(OUTDIR, g + '.js'), 'w').write(
            'Object.assign(window.PROVAS,' + json.dumps(d, ensure_ascii=False, separators=(',', ':')) + ');\n')
    open(OUT, 'w').write('// gerado por converter_provas.py\nwindow.PROVAS = {};\n' + ''.join(
        f'document.write(\'<script src="provas/{g}.js"><\\/script>\');\n' for g in sorted(groups_out)))
    open(os.path.join(BASE, 'provas_completo.js'), 'w').write(
        'window.PROVAS=' + json.dumps(provas, ensure_ascii=False, separators=(',', ':')) + ';\n')
    print('->', OUTDIR, {g: len(d) for g, d in sorted(groups_out.items())})


if __name__ == '__main__':
    main(sys.argv[1:] or ['5º PERÍODO'])
