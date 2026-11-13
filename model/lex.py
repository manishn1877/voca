# Shared lexicon for the Voca grammar model (training data generator + exported tagger lexicon)
import re, json

def plural(n):
    irr = {'child':'children','man':'men','woman':'women','person':'people','foot':'feet','tooth':'teeth','knife':'knives','life':'lives','wife':'wives','mouse':'mice'}
    if n in irr: return irr[n]
    if re.search(r'(s|x|ch|sh)$', n): return n+'es'
    if re.search(r'[^aeiou]y$', n): return n[:-1]+'ies'
    return n+'s'

def third(v):
    if v=='go': return 'goes'
    if v=='do': return 'does'
    if v=='have': return 'has'
    if re.search(r'(s|x|ch|sh|z)$', v): return v+'es'
    if re.search(r'[^aeiou]y$', v): return v[:-1]+'ies'
    return v+'s'

def ing(v):
    if v=='be': return 'being'
    if v.endswith('ie'): return v[:-2]+'ying'
    if v.endswith('e') and not v.endswith('ee'): return v[:-1]+'ing'
    if v in ('run','sit','get','swim','stop','plan','begin','put','cut','hit','shop','chat'): return v+v[-1]+'ing'
    return v+'ing'

def regpast(v):
    if v.endswith('e'): return v+'d'
    if re.search(r'[^aeiou]y$', v): return v[:-1]+'ied'
    if v in ('stop','plan','shop','chat'): return v+v[-1]+'ed'
    return v+'ed'

REG = 'want need like love hate live play work study watch visit walk talk call ask help start finish enjoy use try move open decide order travel learn listen cook clean stay wait remember invite receive arrive plan prepare share show hope pass change believe appear happen follow agree answer laugh smile miss reach join attend book practice repeat explain describe create improve discuss enter marry stop shop chat dance paint fix check watch point carry'.split()
IRR = {  # base: (past, pp)
 'go':('went','gone'),'see':('saw','seen'),'eat':('ate','eaten'),'take':('took','taken'),'make':('made','made'),'get':('got','got'),'say':('said','said'),'come':('came','come'),'buy':('bought','bought'),'think':('thought','thought'),'know':('knew','known'),'give':('gave','given'),'find':('found','found'),'tell':('told','told'),'write':('wrote','written'),'read':('read','read'),'speak':('spoke','spoken'),'drive':('drove','driven'),'run':('ran','run'),'begin':('began','begun'),'drink':('drank','drunk'),'sleep':('slept','slept'),'sit':('sat','sat'),'stand':('stood','stood'),'leave':('left','left'),'meet':('met','met'),'bring':('brought','brought'),'build':('built','built'),'send':('sent','sent'),'spend':('spent','spent'),'lose':('lost','lost'),'win':('won','won'),'sing':('sang','sung'),'swim':('swam','swum'),'fly':('flew','flown'),'grow':('grew','grown'),'throw':('threw','thrown'),'wear':('wore','worn'),'teach':('taught','taught'),'catch':('caught','caught'),'sell':('sold','sold'),'pay':('paid','paid'),'feel':('felt','felt'),'keep':('kept','kept'),'hear':('heard','heard'),'hold':('held','held'),'choose':('chose','chosen'),'forget':('forgot','forgotten'),'break':('broke','broken'),'put':('put','put'),'cut':('cut','cut'),'understand':('understood','understood'),'wake':('woke','woken')}
# verbs usable with an object / without (very rough); transitive objects use NP
INTRANS = set('go come live work stay wait arrive laugh smile sleep run swim sing fly grow walk talk travel dance happen appear'.split())
NOUNS = 'friend student teacher book car house day week month year hour dog cat apple mistake problem question answer idea word place city country language movie song story room bag phone class lesson exam job doctor player team game boy girl brother sister cousin neighbour member reason example hobby habit plan dream goal photo message letter ticket shirt shoe chair table window door bike bus train flight meal egg cup bottle trip party sentence page rule topic skill way picture school office market shop park hospital restaurant hotel airport station village road street garden river mountain beach tree flower bird horse computer laptop camera engineer driver manager artist writer singer farmer nurse lawyer pilot baby family company business project meeting event festival holiday birthday gift card child man woman person foot tooth knife life wife mouse'.split()
MASS = 'water money time food rice milk sugar information advice work help traffic luck homework music knowledge furniture equipment luggage weather news research software feedback progress air bread butter oil salt tea coffee paper energy fun love happiness'.split()
PROPER = 'Sam Ravi Priya Anna John Maria Ali Raj Sara Tom Meena India London Delhi Paris Japan Canada'.split()
ADJ_ADV = {'good':'well','bad':'badly','quick':'quickly','slow':'slowly','easy':'easily','careful':'carefully','beautiful':'beautifully','happy':'happily','nice':'nicely','clear':'clearly','quiet':'quietly','polite':'politely','safe':'safely','loud':'loudly','sweet':'sweetly','perfect':'perfectly','proper':'properly','angry':'angrily','terrible':'terribly'}
ADJ_ONLY = 'sad big small tall short long new old young hot cold difficult useful interesting famous different expensive cheap delicious important special clean busy tired bored excited interested ready late early free fast hard loud kind smart rich poor strong weak healthy dangerous popular comfortable red blue green black white'.split()
ADJ_SHORT = {'tall':('taller','tallest'),'big':('bigger','biggest'),'small':('smaller','smallest'),'old':('older','oldest'),'young':('younger','youngest'),'long':('longer','longest'),'short':('shorter','shortest'),'cheap':('cheaper','cheapest'),'hot':('hotter','hottest'),'cold':('colder','coldest'),'strong':('stronger','strongest'),'smart':('smarter','smartest'),'fast':('faster','fastest'),'easy':('easier','easiest'),'happy':('happier','happiest'),'good':('better','best'),'bad':('worse','worst'),'quick':('quicker','quickest'),'slow':('slower','slowest'),'nice':('nicer','nicest')}
ADJ_LONG = 'beautiful difficult useful interesting famous different expensive delicious important popular comfortable dangerous careful polite'.split()
FREQ = 'always never usually often sometimes rarely'.split()
TIMEPAST = ['yesterday','last night','last week','last year','last month','two days ago','a week ago','in 2019','last summer','last weekend']
TIMEPRES = ['every day','every week','every morning','usually','now','today','these days']
# fixed prepositions: head -> prep  (adjective/verb collocations)
COLL_ADJ = {'interested':'in','good':'at','bad':'at','afraid':'of','proud':'of','angry':'with','tired':'of','fond':'of','famous':'for','ready':'for','responsible':'for','similar':'to','different':'from','married':'to','worried':'about','excited':'about','busy':'with','kind':'to'}
COLL_VERB = {'listen':'to','wait':'for','look':'at','depend':'on','believe':'in','think':'about','talk':'about','worry':'about','laugh':'at','agree':'with','belong':'to','arrive':'at','search':'for','care':'about'}
PREPS = 'in on at to for from with of about by into over under after before'.split()
DIRECT = set('discuss enter marry reach attend visit join answer describe explain'.split())  # take NO preposition

def lexicon():
    L = {}
    def add(w, t):
        L.setdefault(w.lower(), [])
        if t not in L[w.lower()]: L[w.lower()].append(t)
    for d in ('a','an'): add(d,'DET_A')
    add('the','DET_THE')
    for d in 'this that each every another one'.split(): add(d,'DET_SG')
    for d in 'these those many few several both'.split(): add(d,'DET_PL')
    for d in 'much little'.split(): add(d,'DET_MASS')
    for d in 'some any no all most more other'.split(): add(d,'DET_ANY')
    for d in 'my your his her our their its'.split(): add(d,'POSS')
    add('i','PRON_1'); add('he','PRON_3'); add('she','PRON_3'); add('it','PRON_3'); add('it','PRON_O')
    for d in 'we you they'.split(): add(d,'PRON_P')
    add('you','PRON_O')
    for d in 'me him her us them'.split(): add(d,'PRON_O')
    for d,t in [('am','BE_AM'),('is','BE_IS'),('are','BE_ARE'),('was','BE_WAS'),('were','BE_WERE'),('be','BE_BASE'),('been','BE_PP'),('being','BE_ING'),("i'm",'BE_AM'),("it's",'BE_IS'),("he's",'BE_IS'),("she's",'BE_IS'),("that's",'BE_IS'),("you're",'BE_ARE'),("they're",'BE_ARE'),("we're",'BE_ARE')]: add(d,t)
    for d,t in [('have','HAVE_BASE'),('has','HAVE_3'),('had','HAVE_PAST'),('having','HAVE_ING'),('do','DO_BASE'),('does','DO_3'),('did','DO_PAST'),("don't",'DO_BASE'),("doesn't",'DO_3'),("didn't",'DO_PAST')]: add(d,t)
    for d in "can could will would should must may might shall won't can't couldn't wouldn't shouldn't".split(): add(d,'MODAL')
    for v in REG:
        add(v,'V_BASE'); add(third(v),'V_3SG'); add(regpast(v),'V_PAST'); add(regpast(v),'V_PP'); add(ing(v),'V_ING')
    for v,(p,pp) in IRR.items():
        if v in ('have','do'): continue
        add(v,'V_BASE'); add(third(v),'V_3SG'); add(p,'V_PAST'); add(pp,'V_PP'); add(ing(v),'V_ING')
    add('go','V_BASE'); add('goes','V_3SG'); add('went','V_PAST'); add('gone','V_PP'); add('going','V_ING')
    for n in NOUNS: add(n,'N_SG'); add(plural(n),'N_PL')
    for n in MASS: add(n,'N_MASS')
    for n in PROPER: add(n,'N_PROP')
    for a,b in ADJ_ADV.items(): add(a,'ADJ'); add(b,'ADV')
    for a in ADJ_ONLY: add(a,'ADJ')
    for a,(c,s) in ADJ_SHORT.items(): add(c,'ADJ_COMP'); add(s,'ADJ_SUP')
    for w in 'very really too so quite just still also probably already enough again here there now today tomorrow yesterday well fast hard early late'.split(): add(w,'ADV')
    for w in FREQ: add(w,'ADV_FREQ')
    for w in PREPS: add(w,'PREP')
    add('to','TO')
    for w in 'and but or'.split(): add(w,'CONJ_C')
    for w in 'because if when although while though since unless until that'.split(): add(w,'CONJ_S')
    add('so','CONJ_C')
    for w in 'not never'.split(): add(w,'NEG')
    for w in 'two three four five six seven eight nine ten twenty hundred'.split(): add(w,'NUM')
    for w in 'what where when why how who which whom whose'.split(): add(w,'WH')
    for w in 'um uh hmm okay well like actually basically'.split(): add(w,'INTJ')
    for w in 'please yes no'.split(): add(w,'INTJ')
    return L

SUFFIX_RULES = [  # applied to unknown words, in order
 (r'ing$','V_ING'),(r'(ed)$','V_PAST'),(r'ly$','ADV'),(r'(tion|ment|ness|ity|ship|ance|ence|ism)$','N_SG'),(r'(ful|ous|ive|able|ible|less|ish|ic|al)$','ADJ'),(r'(er)$','ADJ_COMP'),(r'(est)$','ADJ_SUP'),(r'(ies|es|s)$','N_PL'),
]
if __name__=='__main__':
    L=lexicon(); print(len(L),'words')
