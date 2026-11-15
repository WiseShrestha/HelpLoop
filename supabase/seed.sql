-- Courses offered in the pilot. EDIT BEFORE RUNNING: replace these with the actual
-- freshman courses your classmates are taking (the codes are our own short slugs).
insert into courses (code, name_ko, name_en) values
  ('calc1',  '미적분학 I',        'Calculus I'),
  ('phys1',  '일반물리학 I',      'General Physics I'),
  ('chem1',  '일반화학 I',        'General Chemistry I'),
  ('bio1',   '일반생물학',        'General Biology'),
  ('prog1',  '프로그래밍 기초',   'Introduction to Programming'),
  ('eng1',   '영어 글쓰기',       'English Writing')
on conflict (code) do nothing;
