import json, sys
from lex import *
L = lexicon()
groups = []
for v in REG: groups.append([v, third(v), regpast(v), ing(v)])
for v,(p,pp) in IRR.items():
    if v in ('have','do'): continue
    groups.append([v, third(v), p, pp, ing(v)])
groups.append(['go','goes','went','gone','going'])
groups.append(['have','has','had','having']); groups.append(['do','does','did','done','doing'])
groups.append(['be','am','is','are','was','were','been','being'])
for n in NOUNS: groups.append([n, plural(n)])
for a,b in ADJ_ADV.items(): groups.append([a,b])
for a,(c,s) in ADJ_SHORT.items(): groups.append([a,c,s])
for g in (['a','an','the'],['i','me','my'],['he','him','his'],['she','her'],['we','us','our'],['they','them','their'],['you','your'],['it','its'],
          ['this','these'],['that','those'],['much','many'],['little','few'],['in','on','at'],['to','for','of','with','about','from','by','into'],
          ['can','could'],['will','would'],['shall','should'],['may','might'],['some','any'],['is','are'],['was','were'],['has','have']):
    groups.append(list(g))
fam = {}
for g in groups:
    for w in g:
        s = fam.setdefault(w, [])
        for x in g:
            if x != w and x not in s: s.append(x)
json.dump({'lex': L, 'fam': fam}, open(sys.argv[1], 'w'), separators=(',',':'))
print(len(L), len(fam))
