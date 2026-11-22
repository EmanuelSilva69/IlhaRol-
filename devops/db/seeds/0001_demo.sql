-- Seed de demonstração idempotente.
-- Pode ser executado várias vezes: conflitos de slug/e-mail são ignorados.
-- Requer as migrações aplicadas (app.events etc.).

INSERT INTO app.users (id, email, display_name, password_hash, role)
VALUES
    ('00000000-0000-4000-8000-000000000001', 'ana@example.com',    'Ana Belfort',   crypt('demo1234', gen_salt('bf')), 'visitor'),
    ('00000000-0000-4000-8000-000000000002', 'bruno@example.com',  'Bruno Lopes',   crypt('demo1234', gen_salt('bf')), 'visitor'),
    ('00000000-0000-4000-8000-000000000003', 'carla@example.com',  'Carla Mendes',  crypt('demo1234', gen_salt('bf')), 'visitor'),
    ('00000000-0000-4000-8000-000000000004', 'produtor@example.com', 'Produtor Ilha', crypt('demo1234', gen_salt('bf')), 'producer'),
    ('00000000-0000-4000-8000-000000000005', 'admin@ilharole.dev', 'Admin IlhaRolê', crypt('demo1234', gen_salt('bf')), 'admin')
ON CONFLICT (email) DO NOTHING;

INSERT INTO app.categories (id, slug, name, description, color, icon, sort_order)
VALUES
    ('10000000-0000-4000-8000-000000000001', 'bumba-meu-boi',       'Bumba Meu Boi',        'Bois, matracas e a festa maranhense.', '#C0392B', 'drum',   1),
    ('10000000-0000-4000-8000-000000000002', 'reggae',              'Música/Reggae',        'Reggae, dub e shows na orla.',         '#27AE60', 'music',  2),
    ('10000000-0000-4000-8000-000000000003', 'teatro',              'Teatro',               'Peças, espetáculos e leituras.',       '#8E44AD', 'mask',   3),
    ('10000000-0000-4000-8000-000000000004', 'gastronomia',         'Gastronomia',          'Sabores e experiências locais.',       '#D35400', 'food',   4),
    ('10000000-0000-4000-8000-000000000005', 'museus',              'Museus',               'Acervos, exposições e visitas.',       '#2980B9', 'museum', 5),
    ('10000000-0000-4000-8000-000000000006', 'tambor-de-crioula',   'Tambor de Crioula',    'Roda, canto e tambor.',                '#E67E22', 'drum',   6),
    ('10000000-0000-4000-8000-000000000007', 'samba-pagode',        'Samba/Pagode',         'Rodas de samba e pagode.',             '#F1C40F', 'music',  7),
    ('10000000-0000-4000-8000-000000000008', 'orla-praia',          'Orla/Praia',           'Esporte, lazer e pôr do sol.',         '#16A085', 'wave',   8),
    ('10000000-0000-4000-8000-000000000009', 'feirinhas-artesanato','Feirinhas/Artesanato', 'Artesanato e cultura popular.',        '#7F8C8D', 'market', 9),
    ('10000000-0000-4000-8000-00000000000a', 'cinema-audiovisual',  'Cinema/Audiovisual',   'Cinema, vídeo e audiovisual.',         '#2C3E50', 'film',  10)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO app.venues (id, slug, name, address, neighborhood, latitude, longitude)
VALUES
    ('20000000-0000-4000-8000-000000000001', 'praca-maria-aracangao', 'Praça Maria Aragão',       'Av. Beira-Mar, s/n',        'Centro',       -2.529200, -44.302800),
    ('20000000-0000-4000-8000-000000000002', 'lagoa-da-jansen',       'Lagoa da Jansen',          'Av. dos Holandeses, s/n',   'Ponta d''Areia', -2.494300, -44.293600),
    ('20000000-0000-4000-8000-000000000003', 'teatro-arthur-azevedo', 'Teatro Arthur Azevedo',    'Rua do Sol, 180',           'Centro',       -2.529100, -44.303600),
    ('20000000-0000-4000-8000-000000000004', 'centro-historico',      'Centro Histórico',         'Rua Portugal, s/n',         'Centro',       -2.528600, -44.304600),
    ('20000000-0000-4000-8000-000000000005', 'casa-das-minas',        'Casa das Minas',           'Rua de São Pantaleão, 125', 'Centro',       -2.533000, -44.300700)
ON CONFLICT (slug) DO NOTHING;

-- Alinha os bairros do seed com os nomes usados no front-end.
UPDATE app.venues
SET neighborhood = 'Centro Histórico'
WHERE slug IN (
    'praca-maria-aracangao',
    'teatro-arthur-azevedo',
    'centro-historico',
    'casa-das-minas'
)
AND neighborhood = 'Centro';

WITH data (slug, title, description, venue_slug, category_slug, organizer_email, starts_at, ends_at, price_cents, is_free, status, capacity) AS (
    VALUES
        ('bumba-meu-boi-no-maria-aracangao', 'Bumba Meu Boi no Maria Aragão',
         'Uma noite de bumba meu boi com grupos tradicionais do Maranhão.',
         'praca-maria-aracangao', 'bumba-meu-boi', 'produtor@example.com',
         now() + interval '2 days', now() + interval '2 days 4 hours', 0, true, 'published', 500),
        ('reggae-na-lagoa', 'Reggae na Lagoa',
         'DJs e bandas de reggae ao pôr do sol na Lagoa da Jansen.',
         'lagoa-da-jansen', 'reggae', 'produtor@example.com',
         now() + interval '3 days', now() + interval '3 days 5 hours', 0, true, 'published', 800),
        ('teatro-arthur-azevedo-em-cena', 'Teatro em Cena',
         'Espetáculo convidado no histórico Teatro Arthur Azevedo.',
         'teatro-arthur-azevedo', 'teatro', 'produtor@example.com',
         now() + interval '4 days', now() + interval '4 days 2 hours', 3000, false, 'published', 300),
        ('noite-de-tambor-de-crioula', 'Noite de Tambor de Crioula',
         'Roda aberta de tambor de crioula com mestres da cultura popular.',
         'casa-das-minas', 'tambor-de-crioula', 'produtor@example.com',
         now() + interval '5 days', now() + interval '5 days 3 hours', 0, true, 'published', 200),
        ('samba-no-centro-historico', 'Samba no Centro Histórico',
         'Roda de samba com músicos locais nas ruas do Centro.',
         'centro-historico', 'samba-pagode', 'produtor@example.com',
         now() + interval '6 days', now() + interval '6 days 4 hours', 2000, false, 'published', 250),
        ('feirinha-da-praca-maria-aracangao', 'Feirinha de Artesanato',
         'Artesanato, comida de rua e apresentações culturais.',
         'praca-maria-aracangao', 'feirinhas-artesanato', 'produtor@example.com',
         now() + interval '7 days', now() + interval '7 days 6 hours', 0, true, 'published', 600),
        ('cinema-ao-ar-livre-na-orla', 'Cinema ao Ar Livre na Orla',
         'Sessão gratuita de cinema maranhense ao ar livre.',
         'lagoa-da-jansen', 'cinema-audiovisual', 'produtor@example.com',
         now() + interval '8 days', now() + interval '8 days 2 hours', 0, true, 'published', 400),
        ('degustacao-da-gastronomia-maranhense', 'Degustação Maranhense',
         'Menu degustação com pratos típicos e produtores locais.',
         'centro-historico', 'gastronomia', 'produtor@example.com',
         now() + interval '9 days', now() + interval '9 days 3 hours', 5000, false, 'published', 80),
        ('visita-guiada-ao-museu', 'Visita Guiada ao Museu',
         'Visita mediada pela história e pelo acervo do Centro Histórico.',
         'centro-historico', 'museus', 'produtor@example.com',
         now() + interval '10 days', now() + interval '10 days 2 hours', 0, true, 'published', 60),
        ('corrida-na-orla', 'Corrida na Orla',
         'Corrida de 5 km pela orla com largada na Lagoa da Jansen.',
         'lagoa-da-jansen', 'orla-praia', 'produtor@example.com',
         now() + interval '11 days', now() + interval '11 days 3 hours', 1000, false, 'published', 300)
)
INSERT INTO app.events (
    slug, title, description, venue_id, organizer_id,
    starts_at, ends_at, price_cents, is_free, status, capacity
)
SELECT
    d.slug,
    d.title,
    d.description,
    v.id,
    u.id,
    d.starts_at,
    d.ends_at,
    d.price_cents,
    d.is_free,
    d.status,
    d.capacity
FROM data d
JOIN app.venues v ON v.slug = d.venue_slug::citext
JOIN app.users u ON u.email = d.organizer_email::citext
ON CONFLICT (slug) DO NOTHING;

-- Evento já realizado para demonstrar avaliações pós-evento (RF06).
INSERT INTO app.events (
    slug, title, description, venue_id, organizer_id,
    starts_at, ends_at, price_cents, is_free, status, capacity
)
SELECT
    'feirinha-realizada',
    'Feirinha São Luís — Edição de Novembro',
    'Edição já realizada da feirinha, com gastronomia, artesanato e apresentações culturais.',
    v.id,
    u.id,
    now() - interval '7 days',
    now() - interval '7 days' + interval '6 hours',
    0,
    true,
    'finished',
    300
FROM app.venues v, app.users u
WHERE v.slug = 'praca-maria-aracangao'::citext
  AND u.email = 'produtor@example.com'::citext
ON CONFLICT (slug) DO NOTHING;

-- Evento cancelado para demonstrar o estado CANCELADO e os avisos (RF04/RF07/RF11).
INSERT INTO app.events (
    slug, title, description, venue_id, organizer_id,
    starts_at, ends_at, price_cents, is_free, status, capacity
)
SELECT
    'reggae-cancelado',
    'Reggae na Lagoa — Edição Cancelada',
    'Evento cancelado pelo organizador para demonstrar o estado de cancelamento e os avisos aos favoritos.',
    v.id,
    u.id,
    now() + interval '8 days',
    now() + interval '8 days 4 hours',
    0,
    true,
    'cancelled',
    300
FROM app.venues v, app.users u
WHERE v.slug = 'lagoa-da-jansen'::citext
  AND u.email = 'produtor@example.com'::citext
ON CONFLICT (slug) DO NOTHING;

WITH mappings (event_slug, category_slug) AS (
    VALUES
        ('bumba-meu-boi-no-maria-aracangao', 'bumba-meu-boi'),
        ('reggae-na-lagoa', 'reggae'),
        ('teatro-arthur-azevedo-em-cena', 'teatro'),
        ('noite-de-tambor-de-crioula', 'tambor-de-crioula'),
        ('samba-no-centro-historico', 'samba-pagode'),
        ('feirinha-da-praca-maria-aracangao', 'feirinhas-artesanato'),
        ('cinema-ao-ar-livre-na-orla', 'cinema-audiovisual'),
        ('degustacao-da-gastronomia-maranhense', 'gastronomia'),
        ('visita-guiada-ao-museu', 'museus'),
        ('corrida-na-orla', 'orla-praia'),
        ('feirinha-realizada', 'feirinhas-artesanato'),
        ('reggae-cancelado', 'reggae')
)
INSERT INTO app.event_categories (event_id, category_id, is_primary)
SELECT e.id, c.id, true
FROM mappings m
JOIN app.events e ON e.slug = m.event_slug::citext
JOIN app.categories c ON c.slug = m.category_slug::citext
ON CONFLICT (event_id, category_id) DO NOTHING;

WITH mappings (email, event_slug) AS (
    VALUES
        ('ana@example.com', 'bumba-meu-boi-no-maria-aracangao'),
        ('ana@example.com', 'reggae-na-lagoa'),
        ('ana@example.com', 'feirinha-da-praca-maria-aracangao'),
        ('ana@example.com', 'feirinha-realizada'),
        ('bruno@example.com', 'reggae-na-lagoa'),
        ('bruno@example.com', 'samba-no-centro-historico'),
        ('bruno@example.com', 'cinema-ao-ar-livre-na-orla'),
        ('carla@example.com', 'teatro-arthur-azevedo-em-cena'),
        ('carla@example.com', 'noite-de-tambor-de-crioula'),
        ('carla@example.com', 'degustacao-da-gastronomia-maranhense'),
        ('produtor@example.com', 'bumba-meu-boi-no-maria-aracangao')
)
INSERT INTO app.favorites (user_id, event_id)
SELECT u.id, e.id
FROM mappings m
JOIN app.users u ON u.email = m.email::citext
JOIN app.events e ON e.slug = m.event_slug::citext
ON CONFLICT DO NOTHING;

WITH mappings (email, event_slug, rating, comment) AS (
    VALUES
        ('ana@example.com', 'feirinha-realizada', 5, 'Edição muito bem organizada, com boa comida e artesanato.'),
        ('produtor@example.com', 'feirinha-realizada', 4, 'Boa estrutura e circulação; recomendo a edição.')
)
INSERT INTO app.reviews (event_id, user_id, rating, comment)
SELECT e.id, u.id, m.rating, m.comment
FROM mappings m
JOIN app.users u ON u.email = m.email::citext
JOIN app.events e ON e.slug = m.event_slug::citext
ON CONFLICT (event_id, user_id) DO NOTHING;

WITH data (email, event_slug, kind, payload) AS (
    VALUES
        ('ana@example.com', 'bumba-meu-boi-no-maria-aracangao', 'event_reminder', '{"dias_antes": 2}'::jsonb),
        ('bruno@example.com', 'reggae-na-lagoa', 'event_reminder', '{"dias_antes": 1}'::jsonb),
        ('carla@example.com', 'teatro-arthur-azevedo-em-cena', 'event_update', '{"mensagem": "Horário confirmado"}'::jsonb)
)
INSERT INTO app.notifications (user_id, event_id, kind, payload)
SELECT u.id, e.id, d.kind, d.payload
FROM data d
JOIN app.users u ON u.email = d.email::citext
JOIN app.events e ON e.slug = d.event_slug::citext
WHERE NOT EXISTS (
    SELECT 1
    FROM app.notifications n
    WHERE n.user_id = u.id
      AND n.event_id = e.id
      AND n.kind = d.kind
      AND n.payload = d.payload
);

-- Perfil: preferências padrão e interesses culturais.
INSERT INTO app.notification_preferences (user_id)
SELECT id FROM app.users
ON CONFLICT (user_id) DO NOTHING;

WITH mappings (email, category_slug) AS (
    VALUES
        ('ana@example.com', 'bumba-meu-boi'),
        ('ana@example.com', 'reggae'),
        ('ana@example.com', 'tambor-de-crioula'),
        ('bruno@example.com', 'reggae'),
        ('bruno@example.com', 'samba-pagode'),
        ('carla@example.com', 'teatro'),
        ('carla@example.com', 'gastronomia'),
        ('produtor@example.com', 'bumba-meu-boi'),
        ('produtor@example.com', 'feirinhas-artesanato')
)
INSERT INTO app.user_interests (user_id, category_id)
SELECT u.id, c.id
FROM mappings m
JOIN app.users u ON u.email = m.email::citext
JOIN app.categories c ON c.slug = m.category_slug::citext
ON CONFLICT DO NOTHING;

-- Usuários de demonstração usam Argon2 (RNF03). O WHERE evita sobrescrever
-- uma senha já alterada para Argon2.
UPDATE app.users
SET password_hash = '$argon2id$v=19$m=65536,t=3,p=4$pY1oHv3C+N/89eRdPLu3yQ$RXqX/0ipztEqWGbc8b609G69+A0uNIfj+CjkxAIZqWQ'
WHERE email IN (
    'ana@example.com',
    'bruno@example.com',
    'carla@example.com',
    'produtor@example.com',
    'admin@ilharole.dev'
)
AND password_hash LIKE '$2%';

-- Notificação de demonstração para o produtor.
INSERT INTO app.notifications (user_id, event_id, kind, payload)
SELECT u.id, e.id, 'event_reminder',
       '{"mensagem": "Novo evento de Bumba Meu Boi compatível com seus interesses."}'::jsonb
FROM app.users u, app.events e
WHERE u.email = 'produtor@example.com'::citext
  AND e.slug = 'bumba-meu-boi-no-maria-aracangao'::citext
  AND NOT EXISTS (
      SELECT 1 FROM app.notifications n
      WHERE n.user_id = u.id
        AND n.event_id = e.id
        AND n.kind = 'event_reminder'
        AND n.payload->>'mensagem' LIKE '%Bumba Meu Boi compatível%'
  );

-- Denúncia de demonstração para a central de perfil.
INSERT INTO app.reports (
    reporter_id, target_type, event_id, reason, description, status
)
SELECT u.id, 'EVENTO', e.id, 'INFORMACAO_FALSA',
       'Denúncia de demonstração: horário divergente do divulgado.',
       'EM_ANALISE'
FROM app.users u, app.events e
WHERE u.email = 'produtor@example.com'::citext
  AND e.slug = 'reggae-cancelado'::citext
  AND NOT EXISTS (
      SELECT 1 FROM app.reports r
      WHERE r.reporter_id = u.id
        AND r.event_id = e.id
        AND r.description = 'Denúncia de demonstração: horário divergente do divulgado.'
  );

SELECT 'IlhaRolê: seed de demonstração aplicado' AS status;
