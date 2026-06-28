import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

// Paths to data files
const DATA_DIR = path.join(__dirname, 'data');
const DOCTORS_FILE = path.join(DATA_DIR, 'doctors.json');
const PATIENTS_FILE = path.join(DATA_DIR, 'patients.json');
const APPOINTMENTS_FILE = path.join(DATA_DIR, 'appointments.json');

// Middleware
app.use(cors());
app.use(express.json());

// Helper: read JSON file
function readJSON(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

// Helper: write JSON file
function writeJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

// ─── DOCTORS ─────────────────────────────────────────────────────────────────

// GET /api/doctors
app.get('/api/doctors', (req, res) => {
  let doctors = readJSON(DOCTORS_FILE);
  const { spec, city, type, conv, q, sort } = req.query;

  // Filter by specialty
  if (spec) {
    doctors = doctors.filter(d => d.spec === spec);
  }

  // Filter by city
  if (city) {
    doctors = doctors.filter(d => d.city.toLowerCase() === city.toLowerCase());
  }

  // Filter by consultation type
  if (type === 'cabinet') {
    doctors = doctors.filter(d => d.conv === true);
  } else if (type === 'tele') {
    doctors = doctors.filter(d => d.tele === true);
  }

  // Filter by conv (convenience alias for cabinet filter)
  if (conv === 'true') {
    doctors = doctors.filter(d => d.conv === true);
  }

  // Search by name or clinic
  if (q) {
    const query = q.toLowerCase();
    doctors = doctors.filter(
      d =>
        d.name.toLowerCase().includes(query) ||
        d.clinic.toLowerCase().includes(query) ||
        d.specLabel.toLowerCase().includes(query)
    );
  }

  // Sort
  if (sort === 'rating') {
    doctors = doctors.sort((a, b) => b.rating - a.rating);
  } else if (sort === 'price_asc') {
    doctors = doctors.sort((a, b) => a.price - b.price);
  } else if (sort === 'price_desc') {
    doctors = doctors.sort((a, b) => b.price - a.price);
  }

  res.json(doctors);
});

// GET /api/doctors/:id
app.get('/api/doctors/:id', (req, res) => {
  const doctors = readJSON(DOCTORS_FILE);
  const doctor = doctors.find(d => d.id === parseInt(req.params.id, 10));
  if (!doctor) {
    return res.status(404).json({ error: 'Médecin introuvable' });
  }
  res.json(doctor);
});

// ─── PATIENTS ─────────────────────────────────────────────────────────────────

// GET /api/patients
app.get('/api/patients', (req, res) => {
  const patients = readJSON(PATIENTS_FILE);
  res.json(patients);
});

// POST /api/patients
app.post('/api/patients', (req, res) => {
  const patients = readJSON(PATIENTS_FILE);
  const { name, cin, phone, email, dob, sex, blood, allergies, chronic, address, city, insurance, notes } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Le nom est requis' });
  }

  const newPatient = {
    id: patients.length > 0 ? Math.max(...patients.map(p => p.id)) + 1 : 1,
    name,
    phone: phone || '',
    email: email || '',
    cin: cin || '',
    dob: dob || '',
    sex: sex || '',
    blood: blood || '',
    allergies: allergies || 'Aucune connue',
    chronic: chronic || 'Aucune',
    address: address || '',
    city: city || '',
    insurance: insurance || '',
    notes: notes || ''
  };

  patients.push(newPatient);
  writeJSON(PATIENTS_FILE, patients);
  res.status(201).json(newPatient);
});

// ─── APPOINTMENTS ─────────────────────────────────────────────────────────────

// GET /api/appointments
app.get('/api/appointments', (req, res) => {
  const appointments = readJSON(APPOINTMENTS_FILE);
  res.json(appointments);
});

// POST /api/appointments
app.post('/api/appointments', (req, res) => {
  const appointments = readJSON(APPOINTMENTS_FILE);
  const { doctorId, patientName, date, time, motif, notes, payMethod } = req.body;

  if (!doctorId || !patientName || !date || !time) {
    return res.status(400).json({ error: 'doctorId, patientName, date et time sont requis' });
  }

  // Verify doctor exists
  const doctors = readJSON(DOCTORS_FILE);
  const doctor = doctors.find(d => d.id === parseInt(doctorId, 10));
  if (!doctor) {
    return res.status(404).json({ error: 'Médecin introuvable' });
  }

  const newAppointment = {
    id: appointments.length > 0 ? Math.max(...appointments.map(a => a.id)) + 1 : 1,
    doctorId: parseInt(doctorId, 10),
    doctorName: doctor.name,
    doctorSpec: doctor.specLabel,
    clinic: doctor.clinic,
    city: doctor.city,
    patientName,
    date,
    time,
    motif: motif || '',
    notes: notes || '',
    payMethod: payMethod || 'Sur place',
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  appointments.push(newAppointment);
  writeJSON(APPOINTMENTS_FILE, appointments);
  res.status(201).json(newAppointment);
});

// PATCH /api/appointments/:id
app.patch('/api/appointments/:id', (req, res) => {
  const appointments = readJSON(APPOINTMENTS_FILE);
  const id = parseInt(req.params.id, 10);
  const index = appointments.findIndex(a => a.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Rendez-vous introuvable' });
  }

  const allowedFields = ['status', 'date', 'time', 'motif', 'notes', 'payMethod'];
  allowedFields.forEach(field => {
    if (req.body[field] !== undefined) {
      appointments[index][field] = req.body[field];
    }
  });

  appointments[index].updatedAt = new Date().toISOString();
  writeJSON(APPOINTMENTS_FILE, appointments);
  res.json(appointments[index]);
});

// ─── STATIC FRONTEND ──────────────────────────────────────────────────────────

const frontendDist = path.join(__dirname, '../frontend/dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// ─── START ────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`Tabibo backend running on http://localhost:${PORT}`);
});
