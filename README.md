# modul2ai — Custom AI Chatbot RAG Berbasis Role (RBAC)

Praktikum *Artificial Intelligence and Its Application* — Chatbot RAG berbasis
Role-Based Access Control dengan **FastAPI + SQLite + PyJWT + Groq Cloud LLM**.

## Menjalankan

```bash
cd modul2ai
source venv/bin/activate          # Windows: venv\Scripts\activate
uvicorn app.main:app --reload
```

| Halaman | URL |
| --- | --- |
| Chatbot Mahasiswa (tanpa login) | http://127.0.0.1:8000 |
| Dashboard Admin | http://127.0.0.1:8000/admin |

Login admin default: **admin / admin123** (diatur lewat `.env`).

## Struktur

```
modul2ai/
├── app/
│   ├── auth.py         PBKDF2-SHA256 hashing + JWT (HS256, 12 jam)
│   ├── database.py     Skema SQLite + seed role & admin default
│   ├── extractor.py    Ekstraksi PDF/DOCX/XLSX/CSV/TXT/MD + tabel Markdown
│   ├── rag.py          Chunking table-aware, embedding 384-dim, hybrid search, Groq
│   └── main.py         REST API + routing halaman
├── dataset/            Dokumen yang di-seed otomatis saat DB kosong
├── static/             index.html (chat), admin.html (dashboard), shared-md.js
├── uploads/            Salinan berkas untuk pratinjau & unduhan
└── .env                GROQ_API_KEY, GROQ_MODEL, JWT_SECRET, akun admin
```

## Cara kerja RBAC

Relasi `document_roles` memetakan setiap dokumen ke satu atau lebih role.
`search_chunks_by_role()` hanya membaca chunk dari dokumen dengan
`is_active = 1` **dan** terhubung ke role penanya — penyaringan terjadi di
query SQL, bukan di prompt LLM, sehingga dokumen role lain tidak pernah
sampai ke konteks model.

File di `dataset/` yang namanya diawali `DOSEN_` otomatis di-seed ke role
`dosen` saja; sisanya ke role `mahasiswa`.

## Endpoint utama

| Method | Endpoint | Akses |
| --- | --- | --- |
| POST | `/api/auth/login` | publik |
| GET | `/api/roles` | publik |
| POST/PUT/DELETE | `/api/roles[/{id}]` | admin (JWT) |
| GET | `/api/documents` | admin |
| GET | `/api/documents/{id}/chunks` | admin |
| POST | `/api/documents/upload` | admin |
| PATCH | `/api/documents/{id}/toggle` | admin |
| DELETE | `/api/documents/{id}` | admin |
| GET | `/api/admin/groq-quota` | admin |
| POST | `/api/chat` | publik, difilter role |
| GET | `/api/public/documents/{id}?role=` | publik, difilter role |

## Pengujian yang sudah dilakukan

- Seeding otomatis 5 dokumen (112+ chunks) saat database kosong.
- Jawaban RAG benar untuk jam operasional SSC, alur menghubungi SSC, dan TAK,
  lengkap dengan kartu sumber referensi yang bisa diklik.
- Sapaan ("halo") dijawab tanpa memanggil LLM.
- Endpoint admin menolak request tanpa token (401).
- Nonaktifkan dokumen -> chunk-nya hilang dari hasil pencarian; aktifkan -> muncul lagi.
- **Pemisahan akses**: pertanyaan tentang isi dokumen dosen dijawab "tidak
  tersedia" untuk role `mahasiswa`, dan dijawab akurat untuk role `dosen`.
  Pratinjau dokumen dosen lewat role mahasiswa mengembalikan 404.
- Kuota Groq (RPD/TPM) tercatat dan tampil di popup admin.

## Catatan

`.env`, `venv/`, `uploads/`, dan `modul2ai.db` tidak ikut di-commit (lihat `.gitignore`).
Untuk mengindeks ulang dataset, hapus `modul2ai.db` lalu restart server.
