export type LegalSection = {
  id: string;
  title: string;
  paragraphs?: string[];
  bullets?: string[];
};

export const legalRequiredData = [
  "Nama badan usaha resmi dan alamat",
  "NIB atau izin usaha, apabila akan dicantumkan",
  "Email layanan pelanggan dan email privasi",
  "Nomor WhatsApp resmi dan jam layanan",
  "Alamat retur",
  "Waktu pemrosesan Ready Stock",
  "Estimasi Custom Order per quotation atau invoice",
  "Toleransi ukuran berdasarkan standar QC",
  "Estimasi refund",
  "Batas waktu pengambilan di toko",
  "Masa retensi data per kategori"
] as const;

export const termsSections: LegalSection[] = [
  {
    id: "identitas",
    title: "1. Identitas Pengelola",
    paragraphs: [
      "Layanan ini menggunakan nama dagang DEBRODER. Nama badan usaha, NIB atau izin usaha, alamat, email, WhatsApp, dan jam layanan belum diverifikasi untuk publikasi.",
      "Sebelum halaman ini dapat berlaku sebagai ketentuan final, seluruh identitas pengelola wajib diisi dari dokumen resmi dan diperiksa oleh owner."
    ]
  },
  {
    id: "persetujuan",
    title: "2. Persetujuan dan Versi Ketentuan",
    paragraphs: [
      "Draft ini mengusulkan bahwa persetujuan diberikan ketika pengguna mengakses layanan transaksi, membuat akun, mengirim pesanan, menyetujui proof, atau melanjutkan checkout setelah menerima ketentuan yang berlaku.",
      "Versi yang diterapkan pada pesanan adalah versi yang tercatat ketika pesanan dikonfirmasi. Perubahan berikutnya tidak berlaku surut, kecuali diwajibkan hukum atau disepakati para pihak."
    ]
  },
  {
    id: "pelanggan",
    title: "3. Pelanggan Perorangan dan Bisnis",
    paragraphs: [
      "DEBRODER melayani pelanggan perorangan serta bisnis, komunitas, organisasi, dan instansi. Quotation, purchase order, invoice, kontrak, atau lembar persetujuan produksi dapat memuat syarat komersial khusus untuk pesanan bisnis.",
      "Ketentuan khusus hanya berlaku pada bagian yang diatur secara jelas dan tidak boleh mengurangi hak atau kewajiban yang tidak dapat dikesampingkan oleh hukum."
    ]
  },
  {
    id: "kelayakan",
    title: "4. Kelayakan dan Kebenaran Informasi",
    bullets: [
      "Pelanggan perorangan harus cakap melakukan transaksi atau didampingi orang tua atau wali.",
      "Nama, kontak, alamat, ukuran, warna, jumlah, desain, dan instruksi wajib benar serta terbaru.",
      "Pemesan yang mewakili organisasi wajib memiliki kewenangan.",
      "Ringkasan pesanan harus diperiksa sebelum pembayaran atau persetujuan produksi."
    ]
  },
  {
    id: "produk",
    title: "5. Informasi Produk",
    paragraphs: [
      "Deskripsi, foto, bahan, ukuran, warna, harga, dan stok diupayakan akurat. Tampilan warna dapat berbeda karena layar, pencahayaan, kamera, dan karakter bahan.",
      "Toleransi ukuran belum ditetapkan dan wajib mengikuti standar QC yang disetujui owner. Foto adalah representasi; variasi minor tidak boleh mengubah spesifikasi atau mutu yang dijanjikan."
    ]
  },
  {
    id: "harga",
    title: "6. Harga, Pajak, dan Kesalahan Sistem",
    paragraphs: [
      "Harga menggunakan Rupiah dan dapat berubah sebelum pesanan dikonfirmasi. Ongkir, desain, produksi khusus, payment gateway, pajak, dan biaya lain harus ditampilkan atau disampaikan sebelum total disetujui.",
      "Jika terdapat kesalahan harga atau sistem yang nyata, pelanggan dapat melanjutkan dengan harga yang benar, mengubah pesanan, atau membatalkan. Dana yang harus dikembalikan akibat kesalahan DEBRODER tidak boleh dibebani potongan yang menjadi tanggung jawab pelanggan."
    ]
  },
  {
    id: "pemesanan",
    title: "7. Proses Pemesanan dan Terbentuknya Kontrak",
    bullets: [
      "Pelanggan memilih produk atau mengirim kebutuhan Custom Order.",
      "Sistem atau tim menyampaikan ringkasan, harga, metode pembayaran, dan estimasi.",
      "Pelanggan memeriksa serta menyetujui ringkasan.",
      "Pembayaran atau uang muka diverifikasi apabila disyaratkan.",
      "Order dicatat sebelum pembayaran; pembayaran penuh atau DP memperbarui order yang sama.",
      "Penerimaan final mengikuti konfirmasi setelah pemeriksaan stok, pembayaran, dan kelayakan produksi."
    ]
  },
  {
    id: "penolakan",
    title: "8. Hak Menolak atau Membatalkan Pesanan",
    bullets: [
      "Stok atau bahan tidak tersedia.",
      "Pembayaran tidak dapat diverifikasi.",
      "Informasi tidak lengkap atau terindikasi disalahgunakan.",
      "Pesanan tidak layak diproduksi atau melanggar hukum maupun hak pihak lain.",
      "Terdapat kesalahan sistem atau harga yang material.",
      "Persetujuan atau pelunasan tidak diberikan sesuai tenggat yang disepakati."
    ],
    paragraphs: [
      "Jika DEBRODER membatalkan setelah menerima pembayaran dan pembatalan bukan akibat pelanggan, opsi yang wajar adalah penggantian, perubahan pesanan, atau refund sesuai nilai yang seharusnya dikembalikan."
    ]
  },
  {
    id: "pembayaran",
    title: "9. Pembayaran",
    paragraphs: [
      "Pembayaran hanya melalui metode resmi. Bukti transfer belum berarti dana terverifikasi. Untuk Custom Order, uang muka, termin, atau pelunasan dapat ditetapkan pada dokumen pesanan.",
      "Retry pembayaran dan callback berulang harus memperbarui transaksi yang sama secara idempotent, bukan membuat order atau pembayaran ganda."
    ]
  },
  {
    id: "ready-stock",
    title: "10. Produk Ready Stock",
    paragraphs: [
      "Pelanggan memilih ukuran, warna, dan jumlah. Perubahan hanya dapat diminta sebelum pengemasan atau penyerahan ke kurir, bergantung pada stok dan persetujuan DEBRODER.",
      "Penukaran akibat salah pilih pelanggan dapat menjadi fasilitas goodwill. Hak atas produk salah kirim, cacat, atau tidak sesuai tetap berlaku."
    ]
  },
  {
    id: "custom-order",
    title: "11. Custom Order dan Persetujuan Produksi",
    paragraphs: [
      "Custom Order mencakup produk yang dibuat atau diubah berdasarkan desain, logo, tulisan, ukuran, warna, bahan, jumlah, posisi bordir atau sablon, nama, nomor, kemasan, atau spesifikasi pelanggan.",
      "Proof final, ejaan, warna, ukuran, jumlah, posisi, bahan, dan jadwal harus diperiksa sebelum produksi. Setelah persetujuan, perubahan dapat menambah biaya atau waktu. DEBRODER tetap bertanggung jawab atas hasil yang secara material menyimpang dari proof atau spesifikasi final karena kesalahannya."
    ]
  },
  {
    id: "materi",
    title: "12. Materi, Logo, dan Hak Pihak Ketiga",
    paragraphs: [
      "Pelanggan wajib memiliki hak atau izin atas desain, logo, gambar, foto, merek, nama, dan materi yang diserahkan. Materi yang melanggar hukum atau hak pihak lain dapat ditolak.",
      "Materi digunakan untuk quotation, proof, produksi, QC, penyelesaian keluhan, dan arsip. Portofolio atau promosi memerlukan persetujuan terpisah."
    ]
  },
  {
    id: "estimasi",
    title: "13. Estimasi Produksi",
    paragraphs: [
      "Waktu pemrosesan Ready Stock belum ditetapkan. Estimasi Custom Order harus dicantumkan pada quotation atau invoice dan dihitung setelah proof, pembayaran atau uang muka, serta bahan siap.",
      "Perubahan material pada estimasi harus dikomunikasikan dan disertai solusi yang wajar."
    ]
  },
  {
    id: "pengiriman",
    title: "14. Pengiriman dan Pengambilan",
    paragraphs: [
      "Pelanggan wajib memberikan alamat dan kontak akurat. Penyerahan paket kepada kurir tidak otomatis menghapus kewajiban DEBRODER.",
      "Penanganan keterlambatan, kerusakan, atau kehilangan harus mempertimbangkan penyebab, bukti, asuransi, ketentuan kurir, dan hukum yang berlaku."
    ]
  },
  {
    id: "keluhan",
    title: "15. Pemeriksaan dan Keluhan",
    paragraphs: [
      "Paket sebaiknya diperiksa segera. Masalah jumlah, salah kirim, atau kerusakan yang terlihat perlu dilaporkan secepatnya agar investigasi dapat dilakukan.",
      "Video unboxing membantu tetapi bukan satu-satunya bukti. Foto, label, transaksi, komunikasi, pemeriksaan fisik, dan bukti wajar lain dapat dinilai."
    ]
  },
  {
    id: "retur",
    title: "16. Retur, Penukaran, dan Refund",
    paragraphs: [
      "Retur, perbaikan, produksi ulang, penukaran, dan refund memerlukan kebijakan operasional terpisah yang belum menjadi bagian halaman final.",
      "Tidak ada ketentuan yang dimaksudkan untuk menghapus hak atas barang cacat, salah kirim, tidak sesuai perjanjian, atau hak lain yang tidak dapat dikesampingkan."
    ]
  },
  {
    id: "promo",
    title: "17. Promo dan Voucher",
    paragraphs: [
      "Promo dapat memiliki periode, minimum transaksi, produk, wilayah, kuota, dan batas penggunaan. Manfaat yang timbul dari manipulasi, akun ganda, transaksi fiktif, atau kesalahan sistem yang jelas dapat ditinjau dengan penjelasan yang wajar."
    ]
  },
  {
    id: "akun",
    title: "18. Akun dan Keamanan",
    bullets: [
      "Jaga kata sandi, kode pelacakan, dan akses akun.",
      "Laporkan aktivitas yang tidak dikenal.",
      "Akun dapat dibatasi secara proporsional untuk mencegah penipuan, serangan, atau pelanggaran.",
      "Permintaan penghapusan akun mengikuti Kebijakan Privasi dan kewajiban retensi."
    ]
  },
  {
    id: "larangan",
    title: "19. Penggunaan yang Dilarang",
    bullets: [
      "Kegiatan melanggar hukum atau merugikan pihak lain.",
      "Identitas, pembayaran, bukti, atau klaim palsu.",
      "Akses tanpa izin ke akun, sistem, kode, atau data.",
      "Malware, scraping massal, atau gangguan layanan.",
      "Penyalahgunaan promo, refund, chargeback, atau metode pembayaran."
    ]
  },
  {
    id: "kekayaan-intelektual",
    title: "20. Kekayaan Intelektual DEBRODER",
    paragraphs: [
      "Nama, logo, foto, video, desain, teks, tata letak, perangkat lunak, dan materi DEBRODER dilindungi hukum atau digunakan berdasarkan izin. Penggunaan komersial dan publikasi ulang memerlukan izin tertulis kecuali diperbolehkan hukum."
    ]
  },
  {
    id: "privasi",
    title: "21. Privasi",
    paragraphs: [
      "Data pribadi diproses untuk akun, transaksi, produksi, pembayaran, pengiriman, keamanan, dan layanan pelanggan sesuai Kebijakan Privasi."
    ]
  },
  {
    id: "ketersediaan",
    title: "22. Ketersediaan Website dan Pihak Ketiga",
    paragraphs: [
      "Pemeliharaan, gangguan jaringan, atau pembaruan dapat memengaruhi layanan. Penyedia pembayaran, kurir, hosting, atau pihak ketiga dapat memiliki ketentuan sendiri, tetapi tidak menghapus kewajiban DEBRODER."
    ]
  },
  {
    id: "tanggung-jawab",
    title: "23. Batas Tanggung Jawab yang Wajar",
    paragraphs: [
      "Sepanjang diperbolehkan hukum, tanggung jawab dinilai dari kerugian langsung yang dapat dibuktikan, hubungan sebab-akibat, dan kontribusi kesalahan para pihak.",
      "Pembatasan tidak berlaku untuk penipuan, kesengajaan, kelalaian berat, pelanggaran data yang menjadi tanggung jawab DEBRODER, cedera karena produk, atau hak dan kewajiban lain yang tidak dapat dibatasi."
    ]
  },
  {
    id: "keadaan-kahar",
    title: "24. Keadaan Kahar",
    paragraphs: [
      "Peristiwa di luar kendali wajar mencakup bencana, kebakaran besar, wabah, perang, kerusuhan, gangguan transportasi luas, pemadaman besar, kebijakan pemerintah, atau gangguan infrastruktur kritis.",
      "Pihak terdampak harus memberi informasi, mengurangi dampak, dan melanjutkan kewajiban yang masih dapat dilakukan."
    ]
  },
  {
    id: "sengketa",
    title: "25. Pengaduan dan Penyelesaian Sengketa",
    paragraphs: [
      "Kontak pengaduan resmi belum diverifikasi. Keluhan seharusnya menyertakan nomor pesanan dan bukti pendukung.",
      "Penyelesaian diutamakan melalui komunikasi dan musyawarah tanpa menghilangkan akses konsumen pada mekanisme hukum yang tersedia."
    ]
  },
  {
    id: "perubahan",
    title: "26. Perubahan, Keterpisahan, dan Hukum yang Berlaku",
    paragraphs: [
      "Versi dan tanggal pembaruan harus dicatat. Jika suatu ketentuan tidak berlaku, bagian lain tetap berlaku sepanjang dapat dipisahkan.",
      "Draft mengusulkan hukum Republik Indonesia sebagai hukum yang berlaku. Rumusan final tetap memerlukan pemeriksaan penasihat hukum yang kompeten."
    ]
  }
];

export const privacySections: LegalSection[] = [
  {
    id: "pengendali",
    title: "1. Pengendali Data Pribadi",
    paragraphs: [
      "Nama badan usaha, alamat, email privasi, dan WhatsApp pengendali belum diverifikasi. Penyedia teknologi dapat bertindak sebagai prosesor berdasarkan instruksi DEBRODER atau sebagai pengendali tersendiri sesuai layanannya."
    ]
  },
  {
    id: "data",
    title: "2. Data yang Dapat Dikumpulkan",
    bullets: [
      "Identitas dan kontak, termasuk nama, email, telepon atau WhatsApp, dan alamat.",
      "Data akun, preferensi, riwayat login, serta token autentikasi yang diamankan.",
      "Data transaksi, produk, ukuran, warna, jumlah, harga, diskon, pembayaran, pengiriman, dan status layanan.",
      "Data Custom Order, termasuk desain, logo, nama, nomor, ukuran, proof, persetujuan, dan komunikasi.",
      "Data teknis seperti IP, perangkat, browser, log, waktu akses, cookie, sesi, performa, dan kejadian keamanan.",
      "Data komunikasi, ulasan, keluhan, dan hasil penyelesaian."
    ]
  },
  {
    id: "sumber",
    title: "3. Sumber Data",
    paragraphs: [
      "Data dapat berasal dari pengguna, perwakilan organisasi yang sah, penggunaan website, serta penyedia pembayaran, autentikasi, kurir, analytics, hosting, dan mitra layanan.",
      "Pihak yang memberikan data orang lain, misalnya nama anggota tim, wajib memiliki kewenangan dan memberi informasi yang diperlukan kepada orang tersebut."
    ]
  },
  {
    id: "tujuan",
    title: "4. Tujuan dan Dasar Pemrosesan",
    bullets: [
      "Akun dan autentikasi: pelaksanaan layanan, keamanan, serta persetujuan jika diperlukan.",
      "Pesanan dan pembayaran: pelaksanaan transaksi dan kewajiban hukum.",
      "Custom Order: pelaksanaan kontrak dan instruksi pelanggan.",
      "Pengiriman dan pelacakan: pelaksanaan kontrak.",
      "Layanan pelanggan dan sengketa: kontrak, kewajiban hukum, dan kepentingan yang sah.",
      "Keamanan dan pencegahan penipuan: kewajiban keamanan dan kepentingan yang sah.",
      "Pembukuan, pajak, dan kepatuhan: kewajiban hukum.",
      "Analytics dan promosi: persetujuan atau dasar lain yang diperbolehkan sesuai konteks."
    ]
  },
  {
    id: "cookie",
    title: "5. Cookie dan Teknologi Sejenis",
    paragraphs: [
      "Cookie esensial dapat digunakan untuk keamanan, sesi, keranjang, checkout, dan fungsi utama. Cookie non-esensial untuk analytics atau pemasaran hanya boleh aktif sesuai pilihan pengguna apabila persetujuan diwajibkan.",
      "Pusat preferensi cookie belum diaudit sebagai bagian halaman ini dan harus diverifikasi sebelum kebijakan final dipublikasikan."
    ]
  },
  {
    id: "pembayaran",
    title: "6. Pembayaran",
    paragraphs: [
      "Bank, payment gateway, virtual account, dompet digital, atau penyedia lain dapat memproses pembayaran berdasarkan kebijakan mereka. DEBRODER hanya menerima data yang diperlukan untuk verifikasi, rekonsiliasi, refund, pencegahan penipuan, dan pembukuan."
    ]
  },
  {
    id: "custom",
    title: "7. Custom Order dan Kerahasiaan Materi",
    paragraphs: [
      "Materi digunakan untuk quotation, proof, produksi, quality control, pengiriman, dan penyelesaian keluhan. Akses dibatasi kepada personel dan vendor yang memerlukannya.",
      "Materi tidak digunakan untuk portofolio, media sosial, iklan, atau pelatihan model AI tanpa persetujuan terpisah yang jelas."
    ]
  },
  {
    id: "penerima",
    title: "8. Pihak yang Dapat Menerima Data",
    bullets: [
      "Penyedia hosting, cloud, database, storage, autentikasi, dan keamanan.",
      "Penyedia pembayaran, perbankan, kurir, logistik, pengemasan, dan asuransi.",
      "Vendor produksi, bordir, sablon, atau bahan sesuai kebutuhan pesanan.",
      "Penyedia email, WhatsApp, layanan pelanggan, analytics, dan pemantauan performa.",
      "Akuntan, auditor, penasihat profesional, atau instansi yang berwenang secara sah."
    ],
    paragraphs: [
      "Draft menyatakan DEBRODER tidak menjual data pribadi. Daftar vendor dan perjanjian pemrosesan tetap harus diaudit sebelum publikasi final."
    ]
  },
  {
    id: "lintas-negara",
    title: "9. Pemrosesan Lintas Negara",
    paragraphs: [
      "Sebagian penyedia teknologi dapat memproses data di luar Indonesia. Persyaratan hukum, tingkat pelindungan, kontrak, keamanan, lokasi pemrosesan, dan mekanisme transfer wajib didokumentasikan dalam audit vendor."
    ]
  },
  {
    id: "retensi",
    title: "10. Masa Penyimpanan",
    bullets: [
      "Akun: selama aktif dan untuk masa setelah penutupan yang belum ditetapkan.",
      "Pesanan, invoice, dan pembayaran: selama diperlukan untuk transaksi, sengketa, pembukuan, pajak, dan hukum.",
      "Komunikasi layanan, materi Custom Order, log keamanan, serta data promosi: masa retensi belum ditetapkan dan tidak boleh ditebak."
    ],
    paragraphs: [
      "Setelah retensi berakhir, data dihapus, dimusnahkan, atau dianonimkan kecuali penyimpanan lebih lama diwajibkan atau dibenarkan hukum."
    ]
  },
  {
    id: "keamanan",
    title: "11. Keamanan Data",
    bullets: [
      "Kontrol akses berbasis peran dan kebutuhan untuk mengetahui.",
      "Autentikasi, sesi, enkripsi transit, perlindungan penyimpanan, dan pencatatan administratif.",
      "Pencadangan, pemulihan, pembaruan, pengelolaan kerentanan, pembatasan vendor, dan respons insiden."
    ],
    paragraphs: [
      "Tidak ada sistem yang bebas risiko. Kontrol yang benar-benar diterapkan tetap harus divalidasi melalui audit teknis sebelum klaim final dipublikasikan."
    ]
  },
  {
    id: "insiden",
    title: "12. Kegagalan Pelindungan Data Pribadi",
    paragraphs: [
      "Draft mengusulkan pembatasan dampak, investigasi, dokumentasi, pemulihan, serta pemberitahuan tertulis kepada subjek data dan lembaga berwenang apabila diwajibkan.",
      "Batas dan isi pemberitahuan harus diperiksa kembali oleh penasihat hukum terhadap hukum yang berlaku saat publikasi."
    ]
  },
  {
    id: "hak",
    title: "13. Hak Subjek Data Pribadi",
    bullets: [
      "Memperoleh informasi, mengakses, dan memperbaiki data.",
      "Menarik persetujuan untuk pemrosesan yang bergantung pada persetujuan.",
      "Meminta penghentian, pembatasan, penghapusan, atau pemusnahan jika diperbolehkan.",
      "Mengajukan keberatan atas keputusan otomatis, meminta portabilitas, mengajukan keluhan, dan memperoleh pemulihan sesuai hukum."
    ],
    paragraphs: [
      "Hak tertentu dapat dibatasi jika data masih diperlukan untuk kontrak, kewajiban hukum, keamanan, pencegahan penipuan, atau pembelaan klaim."
    ]
  },
  {
    id: "permintaan",
    title: "14. Cara Mengajukan Permintaan Data",
    paragraphs: [
      "Email privasi dan WhatsApp belum diverifikasi. Prosedur final perlu mencatat permintaan, melakukan verifikasi identitas secara proporsional, meninjau, dan menjawab dalam jangka waktu yang diwajibkan hukum."
    ]
  },
  {
    id: "anak",
    title: "15. Data Anak",
    paragraphs: [
      "Layanan tidak ditujukan kepada anak yang belum cakap bertransaksi sendiri. Data anak dalam Custom Order harus diberikan oleh orang tua, wali, sekolah, organisasi, atau pihak yang memiliki kewenangan dan dasar pemrosesan sah."
    ]
  },
  {
    id: "promosi",
    title: "16. Promosi",
    paragraphs: [
      "Pengguna dapat berhenti menerima promosi. Penghentian promosi tidak menghentikan pesan penting tentang pesanan, keamanan, pembayaran, atau perubahan layanan."
    ]
  },
  {
    id: "otomatis",
    title: "17. Pengambilan Keputusan Otomatis",
    paragraphs: [
      "Draft menyatakan tidak ada keputusan yang semata-mata otomatis untuk menolak hak hukum pelanggan. Klaim ini harus diverifikasi terhadap sistem produksi sebelum publikasi final."
    ]
  },
  {
    id: "pihak-ketiga",
    title: "18. Tautan dan Layanan Pihak Ketiga",
    paragraphs: [
      "Kebijakan ini tidak mengatur website pihak ketiga. Pengguna perlu membaca kebijakan masing-masing layanan."
    ]
  },
  {
    id: "perubahan",
    title: "19. Perubahan Kebijakan",
    paragraphs: [
      "Perubahan material seharusnya diberitahukan melalui website, email, atau sarana wajar. Versi dan tanggal pembaruan harus dicatat, dan persetujuan baru diminta jika hukum mewajibkannya."
    ]
  }
];
