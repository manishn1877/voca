import random, json, sys
from lex import *

R = random.Random(int(sys.argv[2]) if len(sys.argv) > 2 else 7)
ch = R.choice
ALLV = REG + [v for v in IRR if v not in ('have','do')]
TRANS = [v for v in ALLV if v not in INTRANS and v not in DIRECT and v not in COLL_VERB]
ADJ_ATTR = [a for a in list(ADJ_ONLY) + list(ADJ_ADV) if a not in ('ready','late','early','free','interested','tired','bored','excited','busy')]
LONGADJ = ADJ_LONG
def past(v): return IRR[v][0] if v in IRR else regpast(v)
def pp(v): return IRR[v][1] if v in IRR else regpast(v)
def an_(w): return 'an' if (w[0] in 'aeiou' and not w.startswith(('uni','use','eu','one'))) or w in ('hour','honest') else 'a'
def T(w, lab='OK'): return [w, lab]

def np_(num=None, allow_bare=True, adj_p=0.3):
    """returns (tokens, num) where num in sg/pl/mass"""
    num = num or ch(['sg','sg','pl','pl','mass'])
    if num == 'mass': n = ch(MASS)
    else:
        n = ch(NOUNS); n = plural(n) if num == 'pl' else n
    adj = [T(ch(ADJ_ATTR))] if R.random() < adj_p else []
    first = (adj[0][0] if adj else n)
    if num == 'sg':
        det = ch([[T(an_(first))], [T(an_(first))], [T('the')], [T(ch('this that my your his her our their'.split()))], [T(ch(['each','every']))]])
    elif num == 'pl':
        det = ch([[T('the')], [T(ch('these those my your his her our their'.split()))], [T(ch('two three four five ten many several some'.split()))], [], [T(ch('two three four five'.split()))]] if allow_bare else [[T('the')]])
    else:
        det = ch([[T('the')], [T(ch('my your some much'.split()))], [], []] if allow_bare else [[T('the')]])
    # 'much' with count not generated here
    return det + adj + [T(n)], num

def subj():
    r = R.random()
    if r < .55:
        w = ch(['I','he','she','we','you','they','it'])
        return [T(w)], {'I':'1','he':'3','she':'3','it':'3'}.get(w,'P'), w
    if r < .75:
        return [T(ch(PROPER[:10]))], '3', None
    t, num = np_(ch(['sg','pl']), allow_bare=False)
    return t, ('3' if num == 'sg' else 'P'), None

def be(person, tense): return {('1','p'):'am',('3','p'):'is',('P','p'):'are',('1','s'):'was',('3','s'):'was',('P','s'):'were'}[(person, tense)]
def vf(v, person, tense):
    if tense == 's': return past(v)
    return third(v) if person == '3' else v
def wrongperson(v, person):
    return v if person == '3' else third(v)

PRON_OBJ = {'I':'me','he':'him','she':'her','we':'us','they':'them'}
POSS_OF = {'I':'my','he':'his','she':'her','we':'our','they':'their'}

def obj():
    r = R.random()
    if r < .75: return np_()[0]
    if r < .9: return [T(ch(['him','her','them','us','me']))]
    return [T(ch(PROPER[:10]))]

def timepart(tense):
    if R.random() < .6: return []
    return [T(w) for w in ch(TIMEPAST if tense == 's' else TIMEPRES).split()]

def PP_(prep, n=None):
    t = np_(ch(['sg','pl','mass']))[0] if n is None else n
    return [T(prep)] + t

# ---------------- builders: return tokens (label per token) ----------------
def b_simple(err):
    s, p, w = subj(); v = ch(TRANS); tense = ch('ps')
    tm = [T(x) for x in ch(TIMEPAST).split()] if tense == 's' else timepart('p')
    o = obj()
    if err == 'AGR':
        if tense != 'p': return None
        verb = [T(wrongperson(v, p), 'AGR')]
    elif err == 'TENSE':
        if tense != 's' or not tm: return None
        verb = [T(v if R.random() < .5 else third(v), 'TENSE')]
        if R.random() < .5 and p != '3': verb = [T(v, 'TENSE')]
    elif err == 'PRON':
        if w not in PRON_OBJ: return None
        s = [T(PRON_OBJ[w], 'PRON')]; verb = [T(vf(v, p, tense))]
    else: verb = [T(vf(v, p, tense))]
    t = s + verb + o + tm
    if err == 'PRON2':   # object pronoun written in subject form (like she)
        if not any(x[0] in ('him','her','them','us','me') for x in o) or len(o) != 1: return None
        back = {'him':'he','her':'she','them':'they','us':'we','me':'I'}[o[0][0]]
        t = s + verb + [T(back, 'PRON')] + tm
    return t

def b_be_adj(err):
    s, p, w = subj(); tense = ch('ps'); adjs = [a for a in ADJ_ONLY + list(ADJ_ADV) if a not in ('late','early')]
    a = ch(adjs); b = be(p, tense); prep = []
    if a in COLL_ADJ and R.random() < .8:
        pr = COLL_ADJ[a]
        if err == 'PREP': pr2 = ch([x for x in PREPS if x != pr]); prep = [T(pr2, 'PREP')] + np_()[0]
        else: prep = [T(pr)] + np_()[0]
    elif err == 'PREP': return None
    deg = [T(ch(['very','really','so','too']))] if R.random() < .3 else []
    adjtok = [T(a)]
    if err == 'AGR': bt = T(ch([x for x in ['am','is','are'] if x != be(p, 'p')]) if tense == 'p' else ch([x for x in ['was','were'] if x != be(p, 's')]), 'AGR')
    else: bt = T(b)
    if err == 'MISS': return s + deg + [T(a, 'MISS')] + prep   # copula dropped: label the adjective
    if err == 'ADJADV':
        if a not in ADJ_ADV: return None
        adjtok = [T(ADJ_ADV[a], 'ADJADV')]
    return s + [bt] + deg + adjtok + prep

def b_be_ing(err):
    s, p, w = subj(); tense = ch('ps'); v = ch(ALLV)
    if v in ('know','like','love','want','need','hate','believe'): v = 'work'
    o = [] if v in INTRANS else obj()
    b = be(p, tense)
    if err == 'MISS': return s + [T(ing(v), 'MISS')] + o
    if err == 'AGR': bt = T(ch([x for x in ['am','is','are'] if x != be(p, 'p')]) if tense == 'p' else ch([x for x in ['was','were'] if x != be(p, 's')]), 'AGR'); return s + [bt, T(ing(v))] + o
    if err == 'VFORM': return s + [T(b), T(ch([v, third(v), past(v)]) if v != past(v) else v, 'VFORM')] + o if past(v) != v else None
    return s + [T(b), T(ing(v))] + o

def b_modal(err):
    s, p, w = subj(); m = ch('can could will would should must may might'.split()); v = ch(TRANS); o = obj()
    if err == 'VFORM':
        bad = ch([third(v), past(v), ing(v)])
        if bad == v: return None
        return s + [T(m), T(bad, 'VFORM')] + o
    if err == 'EXTRA': return s + [T('can'), T('able', 'EXTRA'), T('to'), T(v)] + o if False else None
    return s + [T(m), T(v)] + o

def b_do(err):
    s, p, w = subj(); v = ch(TRANS); o = obj(); k = ch(['pres','past','q'])
    if k == 'q':
        aux = ('does' if p == '3' else 'do')
        if err == 'AGR': aux = ('do' if p == '3' else 'does')
        wh = [T(ch(['what','where','why','how']))] if R.random() < .5 else []
        vv = T(v)
        if err == 'VFORM':
            bad = ch([third(v), past(v)]);
            if bad == v: return None
            vv = T(bad, 'VFORM')
        if err == 'ORDER': return wh + s[:1] + [T(aux)] + [T(v)] + o if False else None
        return wh + [T(aux if err != 'AGR' else aux, 'AGR' if err == 'AGR' else 'OK')] + s + [vv] + o
    aux = 'did' if k == 'past' else ('does' if p == '3' else 'do')
    neg = [T(ch(['not','not']))] if R.random() < .5 else []
    if err == 'AGR':
        if k == 'past': return None
        aux = 'do' if p == '3' else 'does'; at = T(aux, 'AGR')
    else: at = T(aux)
    vv = T(v)
    if err == 'VFORM':
        bad = ch([third(v), past(v)]) if k != 'past' else past(v)
        if bad == v: return None
        vv = T(bad, 'VFORM')
    return s + [at] + neg + [vv] + o

def b_perfect(err):
    s, p, w = subj(); v = ch(TRANS); o = obj(); aux = 'has' if p == '3' else 'have'
    tm = []
    if err == 'AGR': return s + [T('have' if p == '3' else 'has', 'AGR'), T(pp(v))] + o
    if err == 'VFORM':
        if past(v) == pp(v): bad = v
        else: bad = past(v)
        if bad == pp(v): return None
        return s + [T(aux), T(bad, 'VFORM')] + o
    if err == 'TENSE': return s + [T(aux, 'TENSE'), T(pp(v))] + o + [T(x) for x in ch(TIMEPAST).split()]
    if R.random() < .4: tm = [T(ch(['already','just','never','ever']))]
    return s + [T(aux)] + tm + [T(pp(v))] + o

def b_there(err):
    num = ch(['sg','pl','mass']); t, n = np_(num, allow_bare=False)
    if num == 'pl': t = [T(ch(['many','several','two','three','some']))] + [x for x in t if x[0] not in ('the','these','those','my','your','his','her','our','their','two','three','four','five','ten','many','several','some')][-1:]
    if num == 'mass': t = [T(ch(['some','much','little','a lot of'.split()[0]]))] + t[-1:]
    first = t[0][0]
    good = 'is' if (num in ('sg','mass') and first not in ('some',) or (num == 'mass') ) else 'are'
    if num == 'pl': good = 'are'
    if num == 'sg': good = 'is'
    if num == 'mass': good = 'is'
    b = good if err != 'AGR' else ('are' if good == 'is' else 'is')
    return [T('there'), T(b, 'AGR' if err == 'AGR' else 'OK')] + t

def b_number(err):
    s, p, w = subj(); v = ch(TRANS)
    if err == 'NUM':
        k = ch(['num','art','mass','many'])
        n = ch(NOUNS)
        if k == 'num': return s + [T(vf(v, p, ch('p')) if True else v)] + [T(ch('two three four five ten many several'.split())), T(n if plural(n) != n else n, 'NUM')] if False else s + [T(vf(v, p, 'p'))] + [T(ch('two three four five ten many several'.split())), T(n, 'NUM')]
        if k == 'art': return s + [T(vf(v, p, 'p')), T(ch(['a','each','every','this'])) if False else T('a'), T(plural(n), 'NUM')] if False else s + [T(vf(v, p, 'p')), T(ch(['each','every','this','that'])), T(plural(n), 'NUM')]
        if k == 'mass':
            m = ch(MASS); return s + [T(vf(v, p, 'p')), T(ch(['some','my','the'])), T(m + 's', 'NUM')] if True else None
        if k == 'many':
            m = ch(MASS); return s + [T(vf(v, p, 'p')), T(ch(['many'])), T(m, 'NUM')]
    t, n = np_()
    return s + [T(vf(v, p, ch('ps')))] + t

def b_article(err):
    s, p, w = subj(); v = ch(TRANS); n = ch(NOUNS); adj = ch(ADJ_ATTR) if R.random() < .3 else None
    first = adj or n; good = an_(first)
    tm = timepart('p') if False else []
    if err == 'ART':
        k = ch(['wrong','plural','missing'])
        if k == 'wrong': d = T('a' if good == 'an' else 'an', 'ART'); return s + [T(vf(v, p, 'p')), d] + ([T(adj)] if adj else []) + [T(n)]
        if k == 'plural': return s + [T(vf(v, p, 'p')), T(ch(['a','an']), 'ART')] + ([T(adj)] if adj else []) + [T(plural(n))]
        return s + [T(vf(v, p, 'p'))] + ([T(adj)] if adj else []) + [T(n, 'ART')]
    return s + [T(vf(v, p, 'p')), T(good)] + ([T(adj)] if adj else []) + [T(n)]

def b_advverb(err):
    s, p, w = subj(); v = ch([x for x in ALLV if x in ('speak','work','run','walk','talk','drive','sing','study','play','write','eat','dance','sleep','cook','swim','read','learn')])
    a = ch(list(ADJ_ADV)); tense = ch('ps')
    adv = T(ADJ_ADV[a])
    if err == 'ADJADV': adv = T(a, 'ADJADV')
    return s + [T(vf(v, p, tense))] + [adv]

def b_compar(err):
    s, p, w = subj(); tense = ch('p'); b = be(p, 'p')
    if R.random() < .6:
        a = ch(list(ADJ_SHORT)); c, sp = ADJ_SHORT[a]; sup = R.random() < .3
        if sup:
            t = [T(b), T('the'), T(sp)]
            if err == 'ADJADV': t = [T(b), T('the'), T('most', 'ADJADV'), T(sp)]
            return s + t + [T('in'), T('the'), T('class')]
        t = [T(b), T(c), T('than')] + np_()[0]
        if err == 'ADJADV': t = [T(b), T('more', 'ADJADV'), T(c), T('than')] + np_()[0]
        return s + t
    a = ch(LONGADJ); t = [T(b), T('more'), T(a), T('than')] + np_()[0]
    if err == 'ADJADV': t = [T(b), T(a + 'er' if False else 'more'), T('more', 'ADJADV'), T(a), T('than')] + np_()[0]
    return s + t

def b_prep(err):
    s, p, w = subj(); k = ch(['verb','direct','time','arrive'])
    if k == 'verb':
        v = ch(list(COLL_VERB)); pr = COLL_VERB[v]; o = np_()[0]
        if err == 'PREP':
            m = ch(['wrong','missing'])
            if m == 'wrong': return s + [T(vf(v, p, 'p')), T(ch([x for x in PREPS if x != pr]), 'PREP')] + o
            o2 = list(o); o2[0] = [o2[0][0], 'PREP']; return s + [T(vf(v, p, 'p'))] + o2
        return s + [T(vf(v, p, 'p')), T(pr)] + o
    if k == 'direct':
        v = ch(list(DIRECT)); o = np_()[0]
        if err == 'PREP': return s + [T(vf(v, p, 'p')), T(ch(['about','to','for','in']), 'PREP')] + o
        return s + [T(vf(v, p, 'p'))] + o
    if k == 'time':
        v = ch(TRANS); o = obj()
        phrase, good = ch([(['the','morning'],'in'),(['monday'],'on'),(['friday'],'on'),(['5','pm'],'at'),(['2019'],'in'),(['night'],'at'),(['the','evening'],'in'),(['june'],'in'),(['weekends'],'on')])
        pr = good if err != 'PREP' else ch([x for x in ['in','on','at'] if x != good])
        return s + [T(vf(v, p, 'p'))] + o + [T(pr, 'PREP' if err == 'PREP' else 'OK')] + [T(x) for x in phrase]
    v = 'arrive'; pl = ch([(['the','airport'],'at'),(['the','station'],'at'),(['london'],'in'),(['india'],'in'),(['the','hotel'],'at')])
    pr = pl[1] if err != 'PREP' else ch([x for x in ['to','in','at','on'] if x != pl[1]])
    return s + [T(vf(v, p, 'p')), T(pr, 'PREP' if err == 'PREP' else 'OK')] + [T(x) for x in pl[0]]

def b_order(err):
    s, p, w = subj(); f = ch(FREQ); k = ch(['freq','freq_be','adjn','wh'])
    if k == 'freq':
        v = ch(TRANS); o = np_()[0]
        if err == 'ORDER': return s + [T(vf(v, p, 'p')), T(f, 'ORDER')] + o
        return s + [T(f), T(vf(v, p, 'p'))] + o
    if k == 'freq_be':
        a = ch(['late','busy','happy','tired']); b = be(p, 'p')
        if err == 'ORDER': return s + [T(f, 'ORDER'), T(b), T(a)] if False else s + [T(f, 'ORDER'), T(b), T(a)]
        return s + [T(b), T(f), T(a)]
    if k == 'adjn':
        n = ch(NOUNS); a = ch(['red','blue','green','black','white','big','small','old','new','beautiful'])
        v = ch(TRANS)
        if err == 'ORDER': return s + [T(vf(v, p, 'p')), T(an_(n) if False else ch(['a','the','my'])), T(n), T(a, 'ORDER')]
        return s + [T(vf(v, p, 'p')), T(ch(['a','the','my']) if False else 'the'), T(a), T(n)]
    v = ch(TRANS); wh = ch(['what','where','why','how']); b = be(p, 'p')
    sb = s
    if err == 'ORDER': return [T(wh)] + [T(sb[0][0], 'ORDER')] + [T(b), T(ing(v))] if len(sb) == 1 and sb[0][0].lower() in ('you','he','she','they','we') else None
    if len(sb) == 1 and sb[0][0].lower() in ('you','he','she','they','we'): return [T(wh), T(b), T(sb[0][0]), T(ing(v))]
    return None

def b_to(err):
    s, p, w = subj(); k = ch(['want','enjoy','modal2'])
    v = ch(TRANS); o = obj()
    if k == 'want':
        h = ch(['want','need','like','love','hope','plan','decide','try'])
        hv = vf(h, p, 'p')
        vv = T(v)
        if err == 'VFORM':
            bad = ch([third(v), past(v), ing(v)])
            if bad == v: return None
            vv = T(bad, 'VFORM')
        return s + [T(hv), T('to'), vv] + o
    if k == 'enjoy':
        h = ch(['enjoy','avoid','finish','mind','keep','practice']); hv = vf(h, p, 'p')
        if err == 'VFORM': return s + [T(hv), T('to'), T(v, 'VFORM')] + o if False else s + [T(hv), T(ch([v, past(v)]) if past(v) != v else v, 'VFORM')] + o if past(v) != v else s + [T(hv), T(v, 'VFORM')] + o
        return s + [T(hv), T(ing(v))] + o
    return None

def b_conj(err):
    s1, p1, _ = subj(); s2, p2, _ = subj(); v1 = ch(TRANS); v2 = ch(TRANS); tense = ch('ps')
    c1 = s1 + [T(vf(v1, p1, tense))] + obj(); c2 = s2 + [T(vf(v2, p2, tense))] + obj()
    k = ch(['although','because'])
    if k == 'although':
        if err == 'EXTRA': return [T('although')] + c1 + [T('but', 'EXTRA')] + c2
        return [T('although')] + c1 + c2
    if err == 'EXTRA': return [T('because')] + c1 + [T('so', 'EXTRA')] + c2
    return [T('because')] + c1 + c2

def b_pron(err):
    s, p, w = subj(); v = ch(TRANS)
    n = ch(NOUNS) if R.random() < .5 else None
    if w not in POSS_OF: return None
    po = POSS_OF[w]
    nt = np_('sg')[0][-1:] if n is None else [T(n)]
    if err == 'PRON':
        bad = PRON_OBJ[w]
        return s + [T(vf(v, p, 'p')), T(bad, 'PRON')] + nt
    return s + [T(vf(v, p, 'p')), T(po)] + nt

def b_perfcopy(err): return None


LINK = ['look','feel','taste','smell','sound','seem','become','get','stay','remain','grow']
def b_link(err):
    s, p, w = subj(); v = ch(LINK); a = ch(list(ADJ_ADV)+ADJ_ONLY)
    t = ch('ps') if v not in ('seem',) else 'p'
    tail = [T(a)]
    if err == 'ADJADV':
        if a not in ADJ_ADV: return None
        tail = [T(ADJ_ADV[a], 'ADJADV')]
    if R.random() < .4 and err is None: tail = [T('very')] + tail
    out = s + [T(vf(v, p, t))] + tail
    if R.random() < .4:
        out += [T(ch(['and','but'])), T(ch(['it','she','he','they'])) ]
        v2 = ch(LINK); a2 = ch(ADJ_ONLY); pp2 = 'P' if out[-1][0]=='they' else '3'
        out += [T(vf(v2, pp2, t)), T(a2)]
    return out

FIXED = [('by',['bus','car','train','bike','taxi','air']),('on',['time','monday','foot','purpose']),('at',['home','school','work','night','the','office']),
         ('in',['class','time','the morning','the evening','bed','english']),('to',['school','work','bed','the market','the park']),('for',['two hours','a week','three years','a long time'])]
def b_fixed(err):
    s, p, w = subj(); v = ch(['go','come','arrive','walk','study','work','stay','wait','live','travel','sleep'])
    pr, objs = ch(FIXED); o = ch(objs).split()
    if err == 'PREP':
        pr = ch([x for x in 'in on at to for by of with from'.split() if x != pr])
        return s + [T(vf(v, p, ch('ps')))] + [T(pr, 'PREP')] + [T(x) for x in o]
    if R.random() < .5 and o[0] == 'the' and len(o) == 1: o = ['the','office']
    out = s + [T(vf(v, p, ch('ps')))] + [T(pr)] + [T(x) for x in o]
    return out

def b_indirect(err):
    s, p, w = subj(); wh = ch(['where','what','when','why','how','who'])
    s2, p2, w2 = subj(); v = ch(['live','work','go','study','come','play','sleep','eat'])
    lead = ch([['do','you','know'],['can','you','tell','me'],['i','know'],['i','dont','know'],['i','wonder'],['tell','me']])
    inner = s2 + [T(vf(v, p2, 'p'))]
    if err == 'ORDER':
        aux = 'does' if p2 == '3' else 'do'
        return [T(x) for x in lead] + [T(wh), T(aux, 'ORDER')] + s2 + [T(v)]
    return [T(x) for x in lead] + [T(wh)] + inner

def b_poss(err):
    n1 = ch(NOUNS); n2 = ch(NOUNS)
    ow = ch(['my','your','his','her','our','their'])
    return [T(ow), T(n1 + "'s"), T(n2), T(ch(['is','was'])), T(ch(ADJ_ONLY))]

def b_obj_unk(err):
    s, p, w = subj(); v = ch(['play','like','love','hate','enjoy','watch','study','learn'])
    return s + [T(vf(v, p, ch('ps'))), T(ch(['football','cricket','tennis','chess','basketball','music','english','maths','yoga','hockey']))]

def b_coord(err):
    s, p, w = subj(); v1 = ch(TRANS); v2 = ch(TRANS)
    return s + [T(vf(v1, p, 'p'))] + np_()[0] + [T(ch(['and','but']))] + [T(ch(['he','she','they','we','i']))]  # filled below

def b_collad(err):
    s, p, w = subj(); a = ch(list(COLL_ADJ)); pr = COLL_ADJ[a]; o = np_(ch(['sg','pl']))[0]
    b = be(p, ch('ps'))
    if err == 'PREP': pr = ch([x for x in 'in on at to for from with of about by'.split() if x != pr])
    return s + [T(b), T(a), T(pr, 'PREP' if err else 'OK')] + o

GER = [(['look','forward','to'],3),(['be','interested','in'],3),(['be','good','at'],3),(['be','afraid','of'],3),(['think','about'],2),(['be','tired','of'],3),(['insist','on'],2),(['be','used','to'],3)]
def b_gerund(err):
    s, p, w = subj(); pat, _ = ch(GER); v = ch(TRANS); o = np_()[0]
    toks = []
    for x in pat:
        if x == 'be': toks.append(T(be(p, 'p')))
        elif x in ('look','think','insist'): toks.append(T(vf(x, p, 'p')))
        else: toks.append(T(x))
    g = T(ing(v))
    if err == 'VFORM': g = T(ch([v, regpast(v) if v not in IRR else IRR[v][0]]), 'VFORM')
    return s + toks + [g] + o

def b_both(err):
    a, b2 = ch(['he','she','tom','sara','ravi','priya']), ch(['he','she','tom','sara','ravi','priya'])
    if a == b2: return None
    n = ch(['teachers','students','doctors','friends','engineers','players'])
    return [T('both'), T(a), T('and'), T(b2), T('are' if err != 'AGR' else ch(['is','ares']), 'AGR' if err else 'OK'), T(n)]

def b_subj_verb_long(err):
    s, p, w = subj(); v = ch(ALLV); adv = ch(['always','often','usually','never','sometimes'])
    if p == '3' and err == 'AGR': return s + [T(adv), T(v, 'AGR')] if v not in ('be',) else None
    return s + [T(adv), T(vf(v, p, 'p'))] + obj()

BUILDERS = [
 (b_simple, ['AGR','TENSE','PRON','PRON2'], 14), (b_be_adj, ['AGR','MISS','ADJADV','PREP'], 12), (b_be_ing, ['AGR','MISS','VFORM'], 9),
 (b_modal, ['VFORM'], 6), (b_do, ['AGR','VFORM'], 8), (b_perfect, ['AGR','VFORM','TENSE'], 8), (b_there, ['AGR'], 4), (b_number, ['NUM'], 8),
 (b_article, ['ART'], 8), (b_advverb, ['ADJADV'], 5), (b_compar, ['ADJADV'], 5), (b_prep, ['PREP'], 11), (b_order, ['ORDER'], 7), (b_to, ['VFORM'], 6),
 (b_conj, ['EXTRA'], 4), (b_pron, ['PRON'], 4),
 (b_link, ['ADJADV'], 6), (b_fixed, ['PREP'], 8), (b_indirect, ['ORDER'], 4), (b_poss, ['AGR'], 2), (b_collad, ['PREP'], 6), (b_gerund, ['VFORM'], 6), (b_both, ['AGR'], 2), (b_subj_verb_long, ['AGR'], 4), (b_obj_unk, ['AGR'], 3),
]
WEIGHTS = [w for _, _, w in BUILDERS]

FILLERS = ['um','uh','like','actually','basically','you know','so','well','okay']
def make_sentence(want_err):
    while True:
        b, errs, _ = R.choices(BUILDERS, WEIGHTS)[0]
        e = ch(errs) if want_err else None
        t = b(e)
        if t:
            if want_err and not any(x[1] != 'OK' for x in t): continue
            return t

def build(n):
    out = []
    for _ in range(n):
        parts = []
        k = R.choices([1, 2, 3], [.55, .35, .10])[0]
        err_slot = R.randrange(k) if R.random() < .45 else -1
        for i in range(k):
            parts.append(make_sentence(i == err_slot))
        toks = []
        for i, pt in enumerate(parts):
            if i > 0:
                r = R.random()
                if r < .4: toks.append(T(ch(['and','but','so','then']) if False else ch(['and','but','and then'.split()[0],'so'])))
                elif r < .55: toks.append(T('then'))
            if R.random() < .12: toks.append(T(ch(FILLERS)))
            toks += pt
        words = []; labs = []
        for w, l in toks:
            for piece in w.split():
                words.append(piece.lower()); labs.append(l)
        out.append({'w': words, 'l': labs})
    return out

if __name__ == '__main__':
    n = int(sys.argv[1]); data = build(n)
    json.dump(data, sys.stdout)
