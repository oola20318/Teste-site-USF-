import {
  type Database,
  type Evaluation,
  type Patient,
  type Appointment,
  SENTINELS,
  today,
  shiftDay,
} from './domain';

export function makeDemo(): Database {
  const day = today();
  const families = [
    {
      id: 'fam-1',
      name: 'Família Oliveira',
      address: 'Rua das Acácias, 120 (fictício)',
      team: 'Equipe Girassol · UBS Esperança',
      microarea: '01',
    },
    {
      id: 'fam-2',
      name: 'Família Santos',
      address: 'Rua dos Ipês, 45 (fictício)',
      team: 'Equipe Girassol · UBS Esperança',
      microarea: '02',
    },
    {
      id: 'fam-3',
      name: 'Família Costa',
      address: 'Rua das Flores, 82 (fictício)',
      team: 'Equipe Girassol · UBS Esperança',
      microarea: '01',
    },
    {
      id: 'fam-4',
      name: 'Família Almeida',
      address: 'Rua do Sol, 16 (fictício)',
      team: 'Equipe Girassol · UBS Esperança',
      microarea: '03',
    },
    {
      id: 'fam-5',
      name: 'Família Ferreira',
      address: 'Travessa Azul, 9 (fictício)',
      team: 'Equipe Girassol · UBS Esperança',
      microarea: '02',
    },
    {
      id: 'fam-6',
      name: 'Família Lima',
      address: 'Rua da Paz, 64 (fictício)',
      team: 'Equipe Girassol · UBS Esperança',
      microarea: '03',
    },
  ];
  const names = [
    'Maria Helena Oliveira',
    'José Carlos Santos',
    'Ana Beatriz Costa',
    'Antônio Almeida',
    'Clara Ferreira',
    'Pedro Henrique Lima',
    'Lucas Oliveira',
    'Rosa Maria Santos',
  ];
  const familyIds = ['fam-1', 'fam-2', 'fam-3', 'fam-4', 'fam-5', 'fam-6', 'fam-1', 'fam-2'];
  const patients: Patient[] = names.map((name, i) => ({
    id: `PAC-${String(i + 1).padStart(4, '0')}`,
    name,
    familyId: familyIds[i],
    birthDate: [
      '1950-04-12',
      '1962-08-21',
      '1988-03-15',
      '1954-10-02',
      '1994-11-08',
      '1980-07-06',
      '2006-02-11',
      '1967-06-25',
    ][i],
    team: families[0].team,
    microarea: families.find((f) => f.id === familyIds[i])!.microarea,
    professional: 'Enf. Camila · exemplo',
    notes: 'Registro fictício para demonstração.',
  }));
  const evaluations: Evaluation[] = families.slice(0, 5).map((f, i) => {
    const counts = Object.fromEntries(SENTINELS.map((s) => [s.key, 0])) as Evaluation['counts'];
    if (i === 0) {
      counts.bedridden = 1;
      counts.elderly = 1;
      counts.hypertension = 2;
      counts.diabetes = 1;
    }
    if (i === 1) {
      counts.hypertension = 2;
      counts.unemployment = 1;
      counts.elderly = 1;
    }
    if (i === 2) {
      counts.physical = 1;
      counts.diabetes = 1;
      counts.unemployment = 1;
    }
    if (i === 3) {
      counts.hypertension = 1;
      counts.elderly = 1;
    }
    if (i === 4) {
      counts.diabetes = null;
    }
    return {
      id: `eval-${i + 1}`,
      familyId: f.id,
      date: shiftDay(day, -3 - i),
      operator: 'Enf. Camila · exemplo',
      createdAt: `${shiftDay(day, -3 - i)}T10:00:00.000Z`,
      members: 4,
      rooms: i < 2 ? 4 : 5,
      counts,
      sanitation: { trash: i === 0, water: false, sewage: false },
    };
  });
  const appointments: Appointment[] = patients.map((p, i) => ({
    id: `apt-${i + 1}`,
    patientId: p.id,
    date: day,
    time: ['08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '14:00', '14:30'][i],
    professional: p.professional,
    team: p.team,
    notes: '',
    status: i === 6 ? 'completed' : i === 7 ? 'cancelled' : 'scheduled',
    evaluationId: evaluations.find((e) => e.familyId === p.familyId)?.id ?? null,
    createdAt: `${shiftDay(day, -1)}T${String(8 + i).padStart(2, '0')}:00:00.000Z`,
    history: [
      {
        at: `${shiftDay(day, -1)}T10:00:00.000Z`,
        action: 'Agendamento de exemplo',
        detail: 'Dados fictícios.',
      },
    ],
  }));
  appointments.push({
    ...appointments[0],
    id: 'apt-tomorrow',
    date: shiftDay(day, 1),
    time: '09:00',
    history: [
      {
        at: new Date().toISOString(),
        action: 'Agendamento de exemplo',
        detail: 'Consulta em outra data; mesmo cadastro.',
      },
    ],
  });
  return { version: 1, families, patients, evaluations, appointments, audit: [] };
}
