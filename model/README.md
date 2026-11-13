# Grammar model experiment (not wired into the site)
lex.py (lexicon) -> gen.py (synthetic sentences with error labels) -> featurize.js (uses public/lib/gmodel.js tagger)
-> train.py (token-level logistic regression) -> prune.py -> public/lib/gmodel-data.js.
Result: ~92% error recall / 0.1% false alarms on its own synthetic dev set, but on real sentences it
over-flags (13/79 correct sentences) and rescued 0 extra mistakes beyond the rules, so it is NOT loaded by the site.
Needs real tagged learner text (e.g. a GEC corpus) to be useful.

Update: retrained on 100k sentences with extra builders (collocations, gerunds, linking verbs). Still over-flags real
sentences (10/79 correct ones) and rescues 0 extra mistakes, so it remains disabled.
