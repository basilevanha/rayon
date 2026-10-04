-- REC-02 : version SQL de src/lib/normalize.ts, mêmes cas que src/lib/normalize.cases.ts
-- (parité vérifiée par src/lib/normalize.sql.test.ts).
begin;
select plan(18);

select is(public.normaliser_nom(input), expected, format('normaliser_nom(%L)', input))
from (values
  ('Œufs', 'oeuf'),
  ('ŒUFS', 'oeuf'),
  ('Crème  fraîche', 'creme fraiche'),
  ('  Pâtes  ', 'pate'),
  ('Noix', 'noi'),
  ('Choux', 'chou'),
  ('Riz', 'riz'),
  ('Jus', 'jus'),
  ('Prix', 'pri'),
  ('Œufs ×12', 'oeuf ×12'),
  ('Lait d''avoine', 'lait d''avoine'),
  ('Pain-surprises', 'pain-surprise'),
  ('Ænéas', 'aenea'),
  ('Pommes de terre', 'pomme de terre'),
  (E'Tomates\u00a0cerises', 'tomate cerise'),
  ('Stress', 'stres'),
  (E'Sucre\tglace', 'sucre glace'),
  ('', '')
) as cases (input, expected);

select * from finish();
rollback;
