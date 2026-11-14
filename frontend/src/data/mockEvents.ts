import type { CulturalEvent, UserNotification } from "../types/event";

export const SAO_LUIS_NEIGHBORHOODS = [
  "Centro Histórico",
  "Reviver (Praia Grande)",
  "Ponta d'Areia",
  "Lagoa da Jansen",
  "Cohama",
  "Calhau",
  "Renascença",
  "Madre Deus",
] as const;

export const INITIAL_EVENTS: CulturalEvent[] = [
  {
    id: "musica-1",
    title: "Roda de Tambor de Crioula e Samba na Praça Nauro Machado",
    description:
      "Encontro aberto de grupos tradicionais de Tambor de Crioula seguido de roda de samba de raiz com artistas locais no coração do Reviver.",
    category: "musica",
    date: "2026-11-21",
    time: "19:00 às 23:30",
    location: "Praça Nauro Machado, Rua da Estrela",
    neighborhood: "Centro Histórico",
    latitude: -2.5297,
    longitude: -44.3028,
    bannerUrl:
      "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=900&q=80",
    organizer: "Coletivo Cultural Casarão SLZ",
    organizerId: "org-carlos",
    status: "ATIVO",
    isFavorite: true,
    reviews: [],
  },
  {
    id: "teatro-1",
    title: "Espetáculo 'Lendas da Ilha: A Serpente Encantada'",
    description:
      "Montagem teatral dramática e musical inspirada no imaginário ludovicense, encenada no palco principal do Teatro Arthur Azevedo.",
    category: "teatro",
    date: "2026-11-22",
    time: "20:00 às 21:45",
    location: "Teatro Arthur Azevedo — Rua do Sol, s/n",
    neighborhood: "Centro Histórico",
    latitude: -2.5318,
    longitude: -44.2989,
    bannerUrl:
      "https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?auto=format&fit=crop&w=900&q=80",
    organizer: "Cia Teatral Upaon-Açu",
    organizerId: "org-cia",
    status: "ATIVO",
    isFavorite: true,
    reviews: [],
  },
  {
    id: "gastronomia-1",
    title: "Festival Gastronômico Sabores do Maranhão",
    description:
      "Feira gastronômica ao ar livre com arroz de cuxá, torta de camarão, juçara artesanal, doces de espécie e cervejas artesanais maranhenses.",
    category: "gastronomia",
    date: "2026-11-28",
    time: "16:00 às 22:00",
    location: "Espigão Costeiro da Ponta d'Areia",
    neighborhood: "Ponta d'Areia",
    latitude: -2.5021,
    longitude: -44.3164,
    bannerUrl:
      "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=900&q=80",
    organizer: "Associação Gastronômica da Ilha",
    organizerId: "org-carlos",
    status: "ATIVO",
    isFavorite: false,
    reviews: [],
  },
  {
    id: "musica-2",
    title: "Noite do Reggae de Radiola na Lagoa",
    description:
      "Sequência clássica de vinil e pedradas da Jamaica Mellow na Concha Acústica da Lagoa da Jansen. Evento adiado devido a manutenção elétrica.",
    category: "musica",
    date: "2026-11-20",
    time: "21:00 às 02:00",
    location: "Concha Acústica da Lagoa da Jansen",
    neighborhood: "Lagoa da Jansen",
    latitude: -2.4995,
    longitude: -44.3036,
    bannerUrl:
      "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=900&q=80",
    organizer: "Carlos Produtor Cultural",
    organizerId: "org-carlos",
    status: "CANCELADO",
    isFavorite: true,
    reviews: [],
  },
  {
    id: "gastronomia-2",
    title: "Feirinha São Luís — Edição Especial Culinária & Artesanato",
    description:
      "Edição realizada na Praça Benedito Leite com barracas de gastronomia típica, licor de jenipapo, artesanato em fibra de buriti e chorinho ao vivo.",
    category: "gastronomia",
    date: "2026-11-08",
    time: "09:00 às 15:00",
    location: "Praça Benedito Leite",
    neighborhood: "Centro Histórico",
    latitude: -2.5283,
    longitude: -44.3044,
    bannerUrl:
      "https://images.unsplash.com/photo-1533900298318-6b8da08a523e?auto=format&fit=crop&w=900&q=80",
    organizer: "Secretaria Municipal de Cultura e Turismo",
    organizerId: "org-secult",
    status: "REALIZADO",
    isFavorite: false,
    reviews: [
      {
        id: "rev-1",
        author: "Marina (Moradora)",
        rating: 5,
        comment:
          "Organização impecável! O arroz de cuxá com peixe frito estava maravilhoso e a roda de choro animou a manhã.",
        createdAt: "09/11/2026 14:20",
      },
      {
        id: "rev-2",
        author: "Lucas (Turista)",
        rating: 4,
        comment:
          "Localização super fácil pelo mapa do IlhaRolê. Ótimo para comprar lembranças e provar guaraná Jesus gelado.",
        createdAt: "09/11/2026 18:05",
      },
    ],
  },
  {
    id: "teatro-2",
    title: "Mostra Universitária de Teatro de Rua e Cazumbá",
    description:
      "Apresentações gratuitas de grupos estudantis celebrando as figuras dramáticas do Bumba Meu Boi e do teatro popular maranhense.",
    category: "teatro",
    date: "2026-11-29",
    time: "17:30 às 20:30",
    location: "Largo do Carmo — Praça João Lisboa",
    neighborhood: "Centro Histórico",
    latitude: -2.5291,
    longitude: -44.2998,
    bannerUrl:
      "https://images.unsplash.com/photo-1503095396549-807759245b35?auto=format&fit=crop&w=900&q=80",
    organizer: "Carlos Produtor Cultural",
    organizerId: "org-carlos",
    status: "ATIVO",
    isFavorite: false,
    reviews: [],
  },
  {
    id: "bumba-1",
    title: "Noite de Bumba Meu Boi no Largo da Madre Deus",
    description:
      "Encontro de grupos de sotaques de matraca, zabumba e orquestra com o tradicional cortejo de Bumba Meu Boi, seguido de dança de roda aberta ao público.",
    category: "bumba",
    date: "2026-11-29",
    time: "18:00 às 23:00",
    location: "Largo da Madre Deus — Rua da Madre Deus",
    neighborhood: "Madre Deus",
    latitude: -2.5249,
    longitude: -44.2994,
    bannerUrl:
      "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&w=900&q=80",
    organizer: "Associação Cultural Bumba Meu Boi da Madre Deus",
    organizerId: "org-bumba",
    status: "ATIVO",
    isFavorite: false,
    reviews: [],
  },
  {
    id: "museu-1",
    title: "Exposição 'Azulejos e Casarões do Centro Histórico'",
    description:
      "Visita guiada por acervos de azulejos históricos, fotografias e maquetes dos casarões coloniais de São Luís, com mediação para escolas e famílias.",
    category: "museu",
    date: "2026-11-25",
    time: "10:00 às 17:00",
    location: "Museu Histórico e Artístico do Maranhão — Rua do Sol",
    neighborhood: "Centro Histórico",
    latitude: -2.531,
    longitude: -44.302,
    bannerUrl:
      "https://images.unsplash.com/photo-1564399579883-451a5d44ec08?auto=format&fit=crop&w=900&q=80",
    organizer: "Museu Histórico e Artístico do Maranhão",
    organizerId: "org-museu",
    status: "ATIVO",
    isFavorite: false,
    reviews: [],
  },
];

export const INITIAL_NOTIFICATIONS: UserNotification[] = [
  {
    id: "notif-1",
    eventId: "musica-1",
    eventTitle: "Roda de Tambor de Crioula e Samba na Praça Nauro Machado",
    type: "NOVO_EVENTO_COMPATIVEL",
    content:
      "Novo evento de Música no Centro Histórico compatível com suas preferências culturais!",
    createdAt: "12/11/2026 10:15",
    read: false,
  },
  {
    id: "notif-2",
    eventId: "teatro-1",
    eventTitle: "Espetáculo 'Lendas da Ilha: A Serpente Encantada'",
    type: "ALTERACAO_EVENTO",
    content:
      "Aviso: A abertura dos portões do Teatro Arthur Azevedo foi antecipada para as 19:30.",
    createdAt: "12/11/2026 11:40",
    read: false,
  },
  {
    id: "notif-3",
    eventId: "musica-2",
    eventTitle: "Noite do Reggae de Radiola na Lagoa",
    type: "CANCELAMENTO_EVENTO",
    content:
      "Importante: O evento que você salvou na agenda teve a publicação alterada para CANCELADO pelo organizador.",
    createdAt: "12/11/2026 14:00",
    read: false,
  },
];