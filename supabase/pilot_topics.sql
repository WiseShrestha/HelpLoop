-- Starter tags for the six existing pilot course slugs, not an official syllabus.
-- Run after 0003_features.sql. Existing labels are preserved on repeat runs.
insert into public.course_topics (course_code, tag, label_ko, label_en)
select v.* from (values
 ('calc1','limits','극한과 연속','Limits and continuity'),
 ('calc1','derivatives','미분과 응용','Derivatives and applications'),
 ('calc1','integration','적분 기법','Integration techniques'),
 ('calc1','integration-applications','적분의 응용','Applications of integration'),
 ('calc1','sequences-series','수열과 급수','Sequences and series'),
 ('calc1','taylor-series','테일러 급수','Taylor series'),
 ('phys1','kinematics','운동학','Kinematics'),
 ('phys1','newton-laws','뉴턴 운동 법칙','Newton’s laws'),
 ('phys1','energy','일과 에너지','Work and energy'),
 ('phys1','momentum','운동량과 충돌','Momentum and collisions'),
 ('phys1','rotation','회전 운동과 토크','Rotation and torque'),
 ('phys1','oscillations','진동과 파동','Oscillations and waves'),
 ('chem1','atomic-structure','원자 구조','Atomic structure'),
 ('chem1','periodicity','주기적 성질','Periodic trends'),
 ('chem1','bonding','화학 결합','Chemical bonding'),
 ('chem1','stoichiometry','화학량론','Stoichiometry'),
 ('chem1','thermochemistry','열화학','Thermochemistry'),
 ('chem1','equilibrium','화학 평형','Chemical equilibrium'),
 ('bio1','cells','세포 구조와 기능','Cell structure and function'),
 ('bio1','biomolecules','생체 분자','Biomolecules'),
 ('bio1','metabolism','물질대사','Metabolism'),
 ('bio1','genetics','유전학','Genetics'),
 ('bio1','gene-expression','유전자 발현','Gene expression'),
 ('bio1','evolution','진화','Evolution'),
 ('eng1','thesis-statements','논제문','Thesis statements'),
 ('eng1','paragraph-structure','문단 구성','Paragraph structure'),
 ('eng1','argument-evidence','주장과 근거','Argument and evidence'),
 ('eng1','grammar-clarity','문법과 명료성','Grammar and clarity'),
 ('eng1','paraphrasing','인용과 바꿔쓰기','Citing and paraphrasing'),
 ('eng1','revision','글 수정과 퇴고','Revision and editing'),
 ('prog1','variables-types','변수와 자료형','Variables and types'),
 ('prog1','control-flow','조건문과 반복문','Conditionals and loops'),
 ('prog1','functions','함수와 매개변수','Functions and parameters'),
 ('prog1','collections','컬렉션과 자료구조','Collections and data structures'),
 ('prog1','debugging','오류 분석과 디버깅','Debugging'),
 ('prog1','recursion','재귀','Recursion')
) as v(course_code,tag,label_ko,label_en)
join public.courses c on c.code=v.course_code and c.active and c.kind='course'
on conflict (course_code,tag) do nothing;
