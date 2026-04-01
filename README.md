# 📖 KBBI Sambung Kata — Kamus Besar Bahasa Indonesia

Website kamus besar bahasa Indonesia berbasis web dengan fitur pencarian super cepat, auto suggestion, dan mode sambung kata.

---

## 🚀 Fitur Utama

* 🔍 **Pencarian Kata Cepat**

  * Realtime search
  * Mode:

    * Awalan (Prefix)
    * Mengandung (Contains)
    * Sambung Kata

* ⚡ **Auto Suggestion**

  * Highlight kata yang dicari

* 🎮 **Mode Sambung Kata**

  * Membantu permainan sambung kata (Roblox, dll)

* 🔤 **Filter Huruf A–Z**

* 📊 **Statistik Kata**

* 🎲 **Random Word Generator**

* 🌙 **Dark / Light Mode**

---

## 🧠 Teknologi

* HTML5
* CSS3
* Vanilla JavaScript

---

## ⚙️ Cara Menjalankan (Laragon)

Project ini dijalankan menggunakan **Laragon (local server)**.

### 1. Pindahkan Project ke Folder www

Letakkan project di:

```bash
C:\laragon\www\kbbi-sambungkata
```

---

### 2. Jalankan Laragon

* Start Laragon
* Pastikan Apache aktif

---

### 3. Akses di Browser

Buka:

```bash
http://localhost/kbbi-sambungkata
```

atau:

```bash
http://kbbi-sambungkata.test
```

(jika menggunakan auto virtual host Laragon)

---

## 📂 Struktur Project

```
kbbi-sambungkata/
│
├── index.html
├── style.css
├── script.js
│
└── kbbi_database.txt
```

---

## 📚 Database

Database kata berasal dari gabungan beberapa sumber KBBI yang telah:

* Digabungkan
* Dibersihkan (1 kata per baris)
* Dihapus duplikat
* Diurutkan alfabet

---

## ⚡ Optimasi Performa

* Binary Search (prefix search)
* Debounce input
* Cache `localStorage`
* Limit hasil pencarian

---

## 🎯 Tujuan Project

* Kamus digital ringan tanpa backend
* Alat bantu sambung kata
* Eksperimen UI & algoritma pencarian


---

## ⭐ Dukungan

⭐ Star repository
🍴 Fork project

---

## 📌 Catatan

Menggunakan Laragon diperlukan agar fitur `fetch()` dapat membaca file `kbbi_database.txt` dengan benar. Jika dibuka langsung tanpa server, kemungkinan akan terjadi error CORS.

---

## 📄 Lisensi

Bebas digunakan untuk pembelajaran dan pengembangan.
