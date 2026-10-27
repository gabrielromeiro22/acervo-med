"""Marca o assunto de cada questão (campo "s") nos arquivos provas/<grupo>.js.

Uso: python3 assuntos.py   (rodar depois do converter_provas.py)

Fontes, em ordem de prioridade:
1. "Gabarito com Topicos" (HAM 5-8 e áreas do Internato): o próprio material agrupa as
   questões por tópico; a questão é localizada pelo início do enunciado.
2. "ASSUNTOS DO Nº PERÍODO": temas do roteiro (título + objetivos); a questão vai para o
   tema mais parecido (TF-IDF), ou "Outros" se nenhum for claro.
3. TPI/ENAMED: tópico do Internato mais parecido (as questões dos tópicos servem de exemplo).
"""
import json, math, os, re, unicodedata
from collections import Counter, defaultdict
import fitz

from converter_provas import TREE, download, load_all, write_out

fitz.TOOLS.mupdf_display_errors(False)

STOP = set('''a o e de da do das dos em no na nos nas um uma uns umas para por com sem que se ao aos as os
sua seu suas seus mais menos como qual quais ser sao foi esta este essa esse isso pode podem ter tem
apos sobre entre ate pela pelo pelas pelos muito anos ano paciente pacientes caso alternativa correta
assinale afirmativa assertiva questao seguinte seguintes respeito acordo base diante clinico clinica
quadro apresenta relata exame refere'''.split())


def norm(s):
    s = unicodedata.normalize('NFD', s.lower())
    return ''.join(c for c in s if unicodedata.category(c) != 'Mn')


def toks(s):
    return [w[:7] for w in re.findall(r'[a-z]{4,}', norm(re.sub(r'\[\[IMG:[^\]]+\]\]', ' ', s))) if w not in STOP]


def pdf_text(fid):
    try:
        return '\n'.join(pg.get_text() for pg in fitz.open(download(fid)))
    except Exception:
        return ''


def key(s):
    return re.sub(r'[^a-z0-9]', '', norm(s))


def topic_blocks(fid):
    """Gabarito com Topicos: [(tópico, texto do bloco)]. Cabeçalho = linha em maiúsculas repetida + 'N QTS'."""
    lines = [l.strip() for l in pdf_text(fid).split('\n') if l.strip()]
    out, cur, buf = [], None, []
    i = 0
    while i < len(lines):
        l = lines[i]
        if l.isupper() and len(l) > 3 and i + 1 < len(lines) and lines[i + 1] == l:
            j = i
            while j < len(lines) and lines[j] == l:
                j += 1
            if j < len(lines) and re.match(r'^\d+\s*QTS?$', lines[j]):
                if cur:
                    out.append((cur, '\n'.join(buf)))
                cur, buf, i = l, [], j + 1
                continue
        buf.append(l)
        i += 1
    if cur:
        out.append((cur, '\n'.join(buf)))
    return out


def roteiro(fid):
    """ASSUNTOS DO PERÍODO: [(título, título + objetivos)]."""
    lines = [l.strip() for l in pdf_text(fid).split('\n') if l.strip()]
    out, i = [], 0
    while i < len(lines):
        if re.match(r'^\d\d\)$', lines[i]):
            j, title = i + 1, []
            while j < len(lines) and not lines[j].startswith('___') and not re.match(r'^\d\d\)$', lines[j]) and len(title) < 3:
                title.append(lines[j]); j += 1
            k = j + 1 if j < len(lines) and lines[j].startswith('___') else j
            body = []
            while k < len(lines) and not re.match(r'^\d\d\)$', lines[k]) and len(body) < 12:
                body.append(lines[k]); k += 1
            t = re.sub(r'\s*_+/?_*.*$', '', ' '.join(title)).strip(' .:')
            if t:
                out.append((t, t + ' ' + t + ' ' + ' '.join(body)))
            i = k
        else:
            i += 1
    return out


class Tfidf:
    def __init__(self, docs):
        self.df = Counter(w for d in docs for w in set(toks(d)))
        self.n = len(docs)
        self.vecs = [self.vec(d) for d in docs]

    def vec(self, s):
        tf = Counter(toks(s))
        v = {w: (1 + math.log(c)) * math.log((self.n + 1) / (self.df.get(w, 0) + 1)) for w, c in tf.items() if w in self.df}
        nrm = math.sqrt(sum(x * x for x in v.values())) or 1
        return {w: x / nrm for w, x in v.items()}

    def best(self, s):
        v = self.vec(s)
        sc = [sum(v.get(w, 0) * x for w, x in tv.items()) for tv in self.vecs]
        i = max(range(len(sc)), key=sc.__getitem__) if sc else -1
        return (i, sc[i]) if sc else (-1, 0)


def nice(t):
    t = re.sub(r'\s+', ' ', t).strip()
    return t[:1].upper() + t[1:].lower() if t.isupper() else t


def main():
    provas = load_all()
    files = [(x['id'], x['path'].split('/')) for x in TREE]
    per_of = lambda segs: re.sub(r'[^\wº ]', '', segs[0]).strip()

    # 1) tópicos oficiais por (grupo, disciplina)
    oficiais = defaultdict(list)
    for fid, segs in files:
        if 'Gabarito com Topicos' in segs[-1] and len(segs) >= 3:
            oficiais[(per_of(segs), segs[1])] += topic_blocks(fid)
    # 2) roteiro por período
    rot = {}
    for fid, segs in files:
        if len(segs) == 2 and 'ASSUNTOS DO' in segs[-1].upper():
            rot[per_of(segs)] = roteiro(fid)
    # 3) TPI/ENAMED: blocos do Internato como exemplos
    intern = [(f'{d} · {nice(t)}', txt) for (p, d), bl in oficiais.items() if p == 'INTERNATO' for t, txt in bl]
    models = {p: Tfidf([d for _, d in r]) for p, r in rot.items() if r}
    m_int = Tfidf([d for _, d in intern]) if intern else None

    stats = Counter()
    for fid, p in provas.items():
        bl = [(nice(t), key(txt)) for t, txt in oficiais.get((p['per'], p['disc']), [])]
        for q in p['q']:
            q.pop('s', None)
            body = q['e'] + ' ' + q['e'] + ' ' + ' '.join(t for _, t in q.get('a', [])) + ' ' + q.get('r', '')  # enunciado pesa 2x
            k = key(q['e'])
            probe = k[40:120] if len(k) > 140 else k[:80]
            hit = next((t for t, txt in bl if len(probe) > 30 and probe in txt), None)
            if hit:
                q['s'], src = hit, 'oficial'
            elif p['per'] in models:
                i, sc = models[p['per']].best(body + ' ' + q['k'][:300])
                q['s'], src = (rot[p['per']][i][0], 'roteiro') if sc >= .12 else ('Outros', 'outros')
            elif m_int and p['per'] in ('TPI', 'ENAMED'):
                i, sc = m_int.best(body)
                q['s'], src = (intern[i][0], 'internato') if sc >= .12 else ('Outros', 'outros')
            elif bl:  # internato sem casar o texto: tópico mais parecido da própria área
                m = Tfidf([t + ' ' + txt for t, txt in oficiais[(p['per'], p['disc'])]])
                i, sc = m.best(body)
                q['s'], src = (nice(oficiais[(p['per'], p['disc'])][i][0]), 'similar') if sc >= .12 else ('Outros', 'outros')
            else:
                q['s'], src = 'Outros', 'outros'
            stats[src] += 1
    write_out(provas)
    print(dict(stats))


if __name__ == '__main__':
    main()
