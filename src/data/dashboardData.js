export const views = [
  ['itinerary', 'Itinerario'],
  ['dashboards', 'Tableros'],
  ['videos', 'Videos Diego'],
  ['training', 'Planes de capacitación']
];

export const initialTables = {
  itinerary: {
    columns: ['Diego', 'Esteban'],
    resources: [],
    rows: [
      {
        id: 1,
        name: 'CEDIS Ropa',
        values: ['done', 'on-course'],
        resource: { label: 'Guía CEDIS', url: 'https://example.com/cedis' }
      },
      { id: 2, name: 'Tienda Muebles', values: ['', ''], resource: null }
    ]
  },
  dashboards: {
    columns: ['Status', 'Date'],
    resources: [],
    rows: [
      {
        id: 3,
        name: 'Tablero Tienda',
        values: ['done', '08/24/26'],
        resource: {
          label: 'Tablero Tienda',
          url: 'https://example.com/tablero'
        }
      }
    ]
  },
  videos: {
    columns: ['Diego', 'Esteban'],
    resources: [],
    rows: [
      {
        id: 4,
        name: 'Video 1',
        values: ['done', 'on-course'],
        resource: { label: 'Video 1', url: 'https://example.com/video' }
      },
      { id: 5, name: 'Video 2', values: ['', ''], resource: null }
    ]
  },
  training: {
    columns: ['Status', 'Date'],
    resources: [],
    rows: [
      {
        id: 6,
        name: 'Gerente Titular',
        values: ['done', '08/24/26'],
        resource: {
          label: 'Plan Gerente Titular',
          url: 'https://example.com/plan'
        }
      }
    ]
  }
};
