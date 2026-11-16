-- Sample events (the ones from src/lib/sample-data.ts) as DRAFTS, so admins have something to
-- open in the events manager. Drafts are invisible on the public site. Safe to run twice.
-- Run once: npx supabase db query --remote -f supabase/seed/events_sample.sql
insert into public.events
  (slug, title_fr, title_en, description_fr, description_en, location, starts_at, tags, status, content_fr, content_en)
values
  ('bls-workshop', 'Atelier premiers secours (BLS)', 'First-aid workshop (BLS)',
   'Apprenez les gestes qui sauvent : massage cardiaque, PLS, défibrillateur.',
   'Learn life-saving skills: CPR, recovery position, defibrillator.',
   'Amphi A', '2026-12-12 09:00+01', '{Formation}', 'draft',
   '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Apprenez les gestes qui sauvent : massage cardiaque, PLS, défibrillateur."}]}]}',
   '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Learn life-saving skills: CPR, recovery position, defibrillator."}]}]}'),
  ('blood-drive', 'Journée de don de sang', 'Blood donation day',
   'Une goutte de sang, une vie sauvée. Rejoignez-nous.',
   'One drop of blood, one life saved. Join us.',
   'Campus', '2026-12-20 09:00+01', '{Solidarité}', 'draft',
   '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Une goutte de sang, une vie sauvée. Rejoignez-nous."}]}]}',
   '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"One drop of blood, one life saved. Join us."}]}]}'),
  ('health-caravan', 'Caravane de santé', 'Health caravan',
   'Dépistage et conseils de prévention pour le grand public.',
   'Screening and prevention advice for the public.',
   'Mostaganem', '2026-04-18 09:00+01', '{Sensibilisation}', 'draft',
   '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Dépistage et conseils de prévention pour le grand public."}]}]}',
   '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Screening and prevention advice for the public."}]}]}'),
  ('scientific-day', 'Journée scientifique', 'Scientific day',
   'Conférences, posters et échanges avec des professionnels.',
   'Talks, posters and exchanges with professionals.',
   'Faculté', '2026-02-07 09:00+01', '{Science}', 'draft',
   '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Conférences, posters et échanges avec des professionnels."}]}]}',
   '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Talks, posters and exchanges with professionals."}]}]}')
on conflict (slug) do nothing;
