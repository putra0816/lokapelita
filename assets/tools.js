'use strict';

(() => {
  const $ = (id) => document.getElementById(id);
  const format = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });
  const money = (value) => format.format(Math.round(value));
  const maxMoney = 999999999999;

  function resetResult(form, output, text) {
    for (const input of form.querySelectorAll('[aria-invalid]')) {
      input.removeAttribute('aria-invalid');
      input.removeAttribute('aria-errormessage');
    }
    output.classList.remove('error');
    output.textContent = text;
  }

  function readFields(form, output, checks) {
    const data = {};
    for (const [key, type, min, max, message] of checks) {
      const input = form.elements.namedItem(key);
      const raw = input.value.trim();
      const decimal = type === 'percent' || type === 'decimal';
      const valid = type === 'percent' ? /^-?\d+(?:[,.]\d{1,3})?$/.test(raw)
        : type === 'decimal' ? /^\d+(?:[,.]\d{1,2})?$/.test(raw)
        : type === 'money' ? /^(?:\d+|\d{1,3}(?:\.\d{3})+)$/.test(raw) : /^\d+$/.test(raw);
      const value = Number(decimal ? raw.replace(',', '.') : raw.replaceAll('.', ''));
      if (!valid || !Number.isFinite(value) || value < min || value > max) {
        output.classList.add('error');
        output.textContent = message;
        input.setAttribute('aria-invalid', 'true');
        input.setAttribute('aria-errormessage', output.id);
        input.focus();
        return null;
      }
      data[key] = value;
    }
    return data;
  }

  function coach(el, who, mood, text) {
    el.querySelectorAll('.coach').forEach((n) => n.remove());
    const box = document.createElement('p'); box.className = 'coach';
    const img = document.createElement('img'); img.alt = ''; img.width = 40; img.height = 40;
    img.src = `assets/${who === 'Loka' ? (mood === 'happy' ? 'loka-happy' : 'loka-health') : (mood === 'happy' ? 'pelita-teaching' : 'pelita-reading')}.webp`;
    const span = document.createElement('span'); span.textContent = `${who}: ${text}`;
    box.append(img, span); el.append(box);
  }
  function show(output, label, value, notes) {
    const heading = document.createElement('span');
    const number = document.createElement('strong');
    heading.textContent = label;
    number.textContent = value;
    output.replaceChildren(heading, number, ...notes.map((note) => {
      const row = document.createElement('span');
      row.textContent = note;
      return row;
    }));
    const cta = document.createElement('a');
    cta.className = 'text-link result-cta';
    cta.href = '#mitra';
    cta.textContent = /^(tvm|fire)/.test(output.id) ? 'Ingin membahas hasil ini? Atur jadwal konsultasi keuangan' : 'Ingin membahas hasilmu? Konsultasi dengan praktisi kesehatan';
    output.append(cta);
    const id = output.id;
    if (id === 'bmi-result') { const ok = /Normal/.test(label); coach(output, 'Loka', ok ? 'happy' : 'calm', ok ? 'Kerja bagus! Pertahankan pola makan dan geraknya.' : 'BMI hanya gambaran awal. Pelan-pelan saja, dan boleh konsultasi dulu.'); }
    else if (id === 'water-result') coach(output, 'Loka', 'happy', 'Mulai dari satu gelas setelah bangun tidur, ya!');
    else if (id === 'tvm-result') coach(output, 'Pelita', 'happy', 'Waktu dan konsistensi sering lebih berpengaruh daripada angka awal.');
    else if (id === 'fire-result') coach(output, 'Pelita', 'calm', 'Angka ini gambaran. Uji ulang saat penghasilan atau biaya hidupmu berubah.');
  }

  const tvm = $('tvm-form');
  const tvmResult = $('tvm-result');
  const tvmPlaceholder = tvmResult.textContent;
  const isFV = () => tvm.elements.mode.value === 'fv';
  function syncTvm() {
    for (const [name, visible] of [['start', isFV()], ['monthly', isFV()], ['target', !isFV()]]) {
      $(`tvm-${name}-row`).hidden = !visible;
      tvm.elements.namedItem(name).disabled = !visible;
    }
    resetResult(tvm, tvmResult, tvmPlaceholder);
  }
  tvm.hidden = false;
  syncTvm();
  tvm.elements.mode.addEventListener('change', syncTvm);
  tvm.addEventListener('input', () => resetResult(tvm, tvmResult, tvmPlaceholder));
  tvm.addEventListener('submit', (event) => {
    event.preventDefault();
    resetResult(tvm, tvmResult, tvmPlaceholder);
    const moneyChecks = isFV() ? [
      ['start', 'money', 0, maxMoney, 'Modal awal harus diisi dengan angka bulat dari Rp0 sampai Rp999.999.999.999.'],
      ['monthly', 'money', 0, maxMoney, 'Setoran bulanan harus diisi dengan angka bulat dari Rp0 sampai Rp999.999.999.999.'],
    ] : [['target', 'money', 1, maxMoney, 'Target harus diisi dengan angka bulat dari Rp1 sampai Rp999.999.999.999.']];
    const data = readFields(tvm, tvmResult, [...moneyChecks,
      ['years', 'integer', 1, 60, 'Jangka waktu harus berupa angka bulat dari 1 sampai 60 tahun.'],
      ['rate', 'percent', -50, 30, 'Imbal hasil tahunan harus dari −50% sampai 30%, dengan paling banyak tiga angka desimal.'],
    ]);
    if (!data) return;
    const { years, rate, start, monthly, target } = data;
    const yearLog = Math.log1p(rate / 100);
    const growth = Math.exp(yearLog * years);
    const periods = years * 12;
    const depositFactor = rate === 0 ? periods : Math.expm1(yearLog * years) / Math.expm1(yearLog / 12);
    const value = isFV() ? start * growth + monthly * depositFactor : target / growth;
    if (!Number.isSafeInteger(Math.round(value))) {
      tvmResult.classList.add('error');
      tvmResult.textContent = 'Hasil terlalu besar untuk ditampilkan secara andal. Coba kurangi jangka waktu atau ubah asumsi.';
      return;
    }
    const note = isFV() ? `Total modal dan setoran: ${money(start + monthly * periods)}.` : `Target dalam ${years} tahun: ${money(target)}, tanpa setoran tambahan.`;
    show(tvmResult, isFV() ? 'Perkiraan nilai akhir (FV)' : 'Perkiraan modal saat ini (PV)', money(value), [note, 'Simulasi nominal sebelum inflasi, pajak, dan biaya.']);
  });

  const fire = $('fire-form');
  const fireResult = $('fire-result');
  const firePlaceholder = fireResult.textContent;
  fire.hidden = false;
  fire.addEventListener('input', () => resetResult(fire, fireResult, firePlaceholder));
  fire.addEventListener('submit', (event) => {
    event.preventDefault();
    resetResult(fire, fireResult, firePlaceholder);
    const range = 'harus berupa angka bulat dari Rp0 sampai Rp999.999.999.999.';
    const data = readFields(fire, fireResult, [
      ['expenses', 'money', 1, maxMoney, 'Pengeluaran bulanan harus berupa angka bulat dari Rp1 sampai Rp999.999.999.999.'],
      ['income', 'money', 0, maxMoney, `Pendapatan lain ${range}`],
      ['assets', 'money', 0, maxMoney, `Aset awal ${range}`],
      ['monthly', 'money', 0, maxMoney, `Setoran bulanan ${range}`],
      ['draw', 'percent', 0.1, 25, 'Penarikan awal harus dari 0,1% sampai 25%, dengan paling banyak tiga angka desimal.'],
      ['rate', 'percent', -50, 30, 'Imbal hasil riil tahunan harus dari −50% sampai 30%, dengan paling banyak tiga angka desimal.'],
    ]);
    if (!data) return;
    const { expenses, income, assets, monthly, draw, rate } = data;
    const yearlyGap = Math.max(0, expenses - income) * 12;
    const target = yearlyGap / (draw / 100);
    const gap = Math.max(0, target - assets);
    const monthlyGrowth = Math.exp(Math.log1p(rate / 100) / 12);
    let portfolio = assets;
    let month = 0;
    const roundingTolerance = Math.max(0.000001, target * Number.EPSILON * 16);
    while (month < 1200 && portfolio < target - roundingTolerance) {
      portfolio = portfolio * monthlyGrowth + monthly;
      month += 1;
    }
    let time;
    if (target === 0) time = 'Pendapatan rutin yang dimasukkan sudah menutup pengeluaran dalam skenario ini.';
    else if (gap === 0) time = 'Aset awal sudah memenuhi target hitung dalam skenario ini.';
    else if (portfolio < target - roundingTolerance) time = 'Target tidak tercapai dalam simulasi hingga 100 tahun dengan asumsi ini.';
    else {
      const years = Math.floor(month / 12);
      const remainder = month % 12;
      const duration = [years ? `${years} tahun` : '', remainder ? `${remainder} bulan` : ''].filter(Boolean).join(' ');
      time = `Perkiraan waktu ke target: ${duration}.`;
    }
    show(fireResult, 'Target FIRE dalam rupiah hari ini', money(target), [
      `Kebutuhan bersih tahunan: ${money(yearlyGap)} · Selisih dari aset saat ini: ${money(gap)}.`, time,
      'Angka target bukan jaminan dana akan bertahan selama pensiun.',
    ]);
  });

  const financeItems = [
    { text: 'Apa langkah pertama untuk memahami ke mana gajimu pergi?', choices: ['Langsung membeli produk investasi', 'Mencatat pendapatan dan pengeluaran', 'Mengikuti anggaran orang lain'], answer: 1,
      explain: 'Catatan arus kas membantu membedakan kebutuhan wajib dan pengeluaran yang bisa ditunda.' },
    { text: 'Apa yang paling penting dari tempat menyimpan dana darurat?', choices: ['Mudah dicairkan saat dibutuhkan', 'Menawarkan keuntungan tertinggi', 'Tidak bisa ditarik selama beberapa tahun'], answer: 0,
      explain: 'Fungsi dana darurat adalah menutup kebutuhan mendesak, jadi kemudahan mencairkannya penting.' },
    { text: 'Apa yang perlu dipahami sebelum membeli reksa dana?', choices: ['Nilainya selalu naik', 'Semua jenis reksa dana punya risiko yang sama', 'Nilainya bisa turun dan hasilnya tidak dijamin'], answer: 2,
      explain: 'Risiko berbeda menurut isi portofolio. Baca prospektus untuk memahami aset, biaya, dan aturan pencairan.' },
    { text: 'Dua polis berpreminya sama. Apa yang sebaiknya kamu bandingkan?', choices: ['Hanya hadiah promosi', 'Manfaat, pengecualian, dan syarat klaim', 'Hanya desain kartu peserta'], answer: 1,
      explain: 'Premi yang sama tidak berarti perlindungannya sama. Ketentuan polis menentukan apa yang bisa diklaim.' },
    { text: 'Apa arti angka 4% dalam contoh kalkulator FIRE di sini?', choices: ['Asumsi tingkat penarikan awal, bukan jaminan', 'Imbal hasil yang pasti diterima tiap tahun', 'Angka wajib untuk semua rencana pensiun'], answer: 0,
      explain: 'Tingkat penarikan awal adalah asumsi untuk menghitung target. Hasil riil bergantung pada pasar, inflasi, biaya, dan lamanya masa pensiun.' },
    { text: 'Rp1 juta tumbuh dengan asumsi 10% per tahun selama dua tahun tanpa setoran. Berapa nilai akhirnya?', choices: ['Rp1.100.000', 'Rp1.200.000', 'Rp1.210.000'], answer: 2,
      explain: 'Dengan pertumbuhan majemuk, tahun kedua dihitung dari Rp1.100.000, bukan lagi dari modal awal. Jadi hasilnya Rp1.210.000.' },
    { text: 'Mana yang sebaiknya disiapkan lebih dulu sebelum memilih investasi yang nilainya bisa turun tajam?', choices: ['Dana darurat yang mudah dicairkan', 'Pinjaman tambahan untuk membeli lebih banyak', 'Seluruh tabungan untuk satu produk'], answer: 0,
      explain: 'Dana darurat mencegah kamu terpaksa menjual investasi di saat harga sedang turun.' },
    { text: 'Menurut kalkulator di sini, berapa kisaran dana darurat untuk orang yang sudah menikah?', choices: ['1–2 kali pengeluaran bulanan', '6–12 kali pengeluaran bulanan', '24 kali pengeluaran bulanan'], answer: 1,
      explain: 'Kisaran ini 6–12 bulan pengeluaran pokok (lajang 3–6 bulan). Sesuaikan dengan tanggungan dan kestabilan penghasilanmu.' },
    { text: 'Apa dampak inflasi pada uang yang disimpan tanpa tumbuh?', choices: ['Daya belinya cenderung menurun', 'Nilainya otomatis naik', 'Tidak ada pengaruh sama sekali'], answer: 0,
      explain: 'Saat harga barang naik, jumlah uang yang sama membeli lebih sedikit. Karena itu tujuan jangka panjang perlu mempertimbangkan inflasi.' },
    { text: 'Bagaimana cara menghitung dana yang perlu ditopang tabungan atau investasi saat pensiun?', choices: ['Pengeluaran rutin dikurangi penghasilan rutin yang tersedia', 'Hanya memakai gaji terakhir', 'Menebak angka besar tanpa rincian'], answer: 0,
      explain: 'Selisih antara kebutuhan dan penghasilan rutin saat pensiun menjadi dasar menghitung dana yang perlu disiapkan.' },
  ];

  const healthItems = [
    { text: 'Berapa lama aktivitas fisik intensitas sedang per minggu yang umumnya dianjurkan bagi orang dewasa?', choices: ['Sekitar 30 menit per minggu', 'Sekitar 150–300 menit per minggu', 'Minimal 20 jam per minggu'], answer: 1,
      explain: 'WHO menganjurkan 150–300 menit aktivitas intensitas sedang per minggu untuk dewasa. Mulai pelan dan tambah bertahap sesuai kemampuan.' },
    { text: 'Menurut panduan Isi Piringku, setengah piring makan sebaiknya diisi apa?', choices: ['Sayur dan buah', 'Nasi putih', 'Gorengan'], answer: 0,
      explain: 'Setengah piring untuk sayur dan buah, setengahnya lagi untuk makanan pokok dan lauk pauk.' },
    { text: 'Berapa lama tidur yang umumnya dianjurkan untuk orang dewasa setiap malam?', choices: ['4–5 jam', '7–9 jam', '12–14 jam'], answer: 1,
      explain: 'Kebutuhan tiap orang berbeda, tetapi sekitar 7–9 jam per malam umum dianjurkan bagi orang dewasa.' },
    { text: 'Bagaimana rumus Body Mass Index (BMI)?', choices: ['Tinggi (cm) ÷ berat (kg)', 'Berat (kg) ÷ tinggi (m) dikuadratkan', 'Berat (kg) × tinggi (m)'], answer: 1,
      explain: 'BMI = berat badan (kg) dibagi tinggi badan (m) kuadrat. Contoh: 60 kg dan 1,65 m menghasilkan BMI sekitar 22.' },
    { text: 'Apa keterbatasan BMI sebagai ukuran kesehatan?', choices: ['Menghitung lemak tubuh secara tepat', 'Tidak membedakan massa lemak dan otot', 'Berlaku sama untuk semua usia'], answer: 1,
      explain: 'BMI hanya gambaran awal. Orang berotot bisa memiliki BMI tinggi tanpa kelebihan lemak, dan BMI tidak berlaku untuk anak atau ibu hamil.' },
    { text: 'Mana kebiasaan yang membantu tidur lebih teratur?', choices: ['Minum kopi menjelang tidur', 'Jam tidur dan bangun yang konsisten', 'Bermain ponsel sampai larut tiap malam'], answer: 1,
      explain: 'Jadwal konsisten dan rutinitas malam yang tenang membantu tubuh terbiasa. Kafein dekat waktu tidur dapat mengganggu tidur.' },
    { text: 'Apa yang memengaruhi kebutuhan air minum seseorang?', choices: ['Hanya usia', 'Berat badan, aktivitas, dan cuaca', 'Hanya jenis kelamin'], answer: 1,
      explain: 'Berat badan, tingkat aktivitas, suhu lingkungan, dan kondisi kesehatan memengaruhi kebutuhan cairan, jadi angka kalkulator hanyalah perkiraan.' },
    { text: 'Apa yang perlu diperhatikan saat membandingkan makanan kemasan?', choices: ['Hanya gambar di bungkus', 'Ukuran sajian serta kandungan gula, garam, dan lemak', 'Hanya harga'], answer: 1,
      explain: 'Label gizi menunjukkan kandungan per sajian. Perhatikan ukuran sajian agar perbandingannya adil.' },
    { text: 'Rasa tertekan, cemas, atau sedih berlangsung lama dan mengganggu aktivitas harian. Langkah yang tepat?', choices: ['Dipendam sendiri sampai hilang', 'Bicara dengan orang tepercaya dan cari bantuan tenaga kesehatan', 'Menghindari semua orang'], answer: 1,
      explain: 'Meminta bantuan adalah langkah yang wajar. Latihan mandiri membantu, tetapi bukan pengganti bantuan profesional.' },
    { text: 'Apakah jalan santai termasuk aktivitas fisik?', choices: ['Ya, berjalan kaki juga menghitung', 'Tidak, harus olahraga berat', 'Hanya jika dilakukan di pusat kebugaran'], answer: 0,
      explain: 'Berjalan kaki, bersepeda, atau menari termasuk aktivitas fisik. Pilih yang kamu sukai dan lakukan rutin.' },
  ];

  function makeQuiz(p, items, who) {
    let lastScore = 0;
    const quizForm = $(`${p}-form`);
    const fieldset = $(`${p}-fieldset`);
    const question = $(`${p}-question`);
    const choices = $(`${p}-choices`);
    const count = $(`${p}-count`);
    const progress = $(`${p}-progress`);
    const feedback = $(`${p}-feedback`);
    const check = $(`${p}-check`);
    const next = $(`${p}-next`);
    const end = $(`${p}-end`);
    const score = $(`${p}-score`);
    const review = $(`${p}-review`);
    let index = 0;
    let answers = [];
    progress.max = items.length;

    function renderQuestion(focus = true) {
      const item = items[index];
      quizForm.hidden = false;
      end.hidden = true;
      fieldset.disabled = false;
      feedback.textContent = '';
      feedback.classList.remove('quiz-error');
      check.hidden = false;
      next.hidden = true;
      count.textContent = `Pertanyaan ${index + 1} dari ${items.length}`;
      progress.value = answers.length;
      question.textContent = item.text;
      choices.replaceChildren(...item.choices.map((text, i) => {
        const label = document.createElement('label');
        const input = document.createElement('input');
        const caption = document.createElement('span');
        label.className = 'quiz-choice';
        input.type = 'radio'; input.name = `${p}-answer`; input.value = i;
        caption.textContent = text;
        label.append(input, caption);
        return label;
      }));
      if (focus) question.focus();
    }

    quizForm.addEventListener('submit', (event) => {
      event.preventDefault();
      if (fieldset.disabled) return;
      const selected = choices.querySelector('input:checked');
      if (!selected) {
        feedback.classList.add('quiz-error');
        feedback.textContent = 'Pilih salah satu jawaban dulu.';
        choices.querySelector('input').focus();
        return;
      }
      const item = items[index];
      const response = Number(selected.value);
      const correct = response === item.answer;
      answers.push(response);
      progress.value = answers.length;
      choices.children[item.answer].classList.add('is-correct');
      if (!correct) selected.closest('label').classList.add('is-wrong');
      feedback.classList.toggle('quiz-error', !correct);
      feedback.textContent = `${correct ? 'Benar.' : `Belum tepat. Jawaban yang benar: ${item.choices[item.answer]}.`} ${item.explain}`;
      fieldset.disabled = true;
      check.hidden = true;
      next.hidden = false;
      next.firstChild.textContent = index + 1 === items.length ? 'Lihat Hasil ' : 'Soal Berikutnya ';
      next.focus();
    });

    next.addEventListener('click', () => {
      if (answers.length !== index + 1) return;
      index += 1;
      if (index < items.length) { renderQuestion(); return; }
      quizForm.hidden = true;
      end.hidden = false;
      count.textContent = 'Kuis selesai';
      lastScore = answers.filter((answer, i) => answer === items[i].answer).length;
      score.textContent = `${lastScore} dari ${items.length} benar`;
      const good = lastScore / items.length >= 0.7;
      coach(score.parentElement, who.name, good ? 'happy' : 'calm', good ? 'Hebat, kamu sudah paham dasarnya!' : 'Tidak apa-apa, lihat ringkasan jawaban lalu coba lagi.');
      $(`${p}-konsul`).href += encodeURIComponent(` Skor kuis saya ${lastScore}/${items.length}.`);
      review.closest('details').open = false;
      review.replaceChildren(...items.map((item, i) => {
        const li = document.createElement('li');
        const title = document.createElement('strong');
        const summary = document.createElement('p');
        title.textContent = item.text;
        summary.textContent = `${answers[i] === item.answer ? 'Benar' : 'Belum tepat'}. Jawabanmu: ${item.choices[answers[i]]}. ${answers[i] === item.answer ? '' : `Jawaban benar: ${item.choices[item.answer]}. `}${item.explain}`;
        li.append(title, summary);
        return li;
      }));
      score.focus();
    });
    $(`${p}-restart`).addEventListener('click', () => { index = 0; answers = []; renderQuestion(); });
    const nick = () => { const r = lastScore / items.length; return r >= 0.9 ? 'Jagoan' : r >= 0.7 ? 'Sudah Paham' : r >= 0.4 ? 'Terus Belajar' : 'Pemanasan Dulu'; };
    const msg = () => `Aku baru ikut kuis ${who.topic} bareng ${who.name} di LokaPelita dan dapat ${lastScore}/${items.length}! Coba cek punyamu: https://lokapelita.vercel.app/#${who.hash}`;
    $(`${p}-wa`).addEventListener('click', () => window.open(`https://wa.me/?text=${encodeURIComponent(msg())}`, '_blank', 'noopener'));
    $(`${p}-share`).addEventListener('click', async (e) => {
      if (navigator.share) { try { await navigator.share({ title: 'LokaPelita', text: msg() }); } catch (err) { /* dibatalkan */ } return; }
      try { await navigator.clipboard.writeText(msg()); e.target.textContent = 'Teks disalin'; } catch (err) { e.target.textContent = 'Gagal menyalin'; }
    });
    $(`${p}-card`).addEventListener('click', async () => {
      const c = document.createElement('canvas'); c.width = 1080; c.height = 1920;
      const g = c.getContext('2d'); const grad = g.createLinearGradient(0, 0, 0, 1920);
      grad.addColorStop(0, who.color); grad.addColorStop(1, '#fcfaf4'); g.fillStyle = grad; g.fillRect(0, 0, 1080, 1920);
      g.fillStyle = '#fff'; g.beginPath(); g.roundRect(80, 300, 920, 1320, 48); g.fill();
      const logo = new Image(); logo.src = 'assets/logo.webp';
      try { await logo.decode(); g.drawImage(logo, 340, 340, 400, 391); } catch (err) { /* tanpa logo */ }
      g.textAlign = 'center'; g.fillStyle = '#14234f';
      g.font = '800 54px Manrope, system-ui, sans-serif'; g.fillText(`Kuis bersama ${who.name}`, 540, 850);
      g.font = '800 260px Manrope, system-ui, sans-serif'; g.fillText(`${lastScore}/${items.length}`, 540, 1130);
      g.fillStyle = who.accent; g.font = '800 76px Manrope, system-ui, sans-serif'; g.fillText(nick(), 540, 1270);
      g.fillStyle = '#43506a'; g.font = '600 44px Manrope, system-ui, sans-serif'; g.fillText('Coba cek skormu di', 540, 1440);
      g.fillStyle = '#14234f'; g.font = '800 52px Manrope, system-ui, sans-serif'; g.fillText('lokapelita.vercel.app', 540, 1510);
      c.toBlob((b) => { const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `skor-${p}.png`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); }, 'image/png');
    });
    $(`${p}-app`).hidden = false;
    renderQuestion(false);
  }

  makeQuiz('quiz', financeItems, { name: 'Pelita', topic: 'literasi keuangan', hash: 'kuis', color: '#cfe0ff', accent: '#1d4ed8' });
  makeQuiz('hquiz', healthItems, { name: 'Loka', topic: 'kesehatan', hash: 'kuis-kesehatan', color: '#ffe3a3', accent: '#8a5a00' });

  const bmi = $('bmi-form');
  const bmiResult = $('bmi-result');
  const bmiPlaceholder = bmiResult.textContent;
  bmi.hidden = false;
  bmi.addEventListener('input', () => resetResult(bmi, bmiResult, bmiPlaceholder));
  bmi.addEventListener('submit', (event) => {
    event.preventDefault();
    resetResult(bmi, bmiResult, bmiPlaceholder);
    const data = readFields(bmi, bmiResult, [
      ['height', 'decimal', 100, 250, 'Tinggi badan harus antara 100 dan 250 cm.'],
      ['weight', 'decimal', 20, 300, 'Berat badan harus antara 20 dan 300 kg.'],
    ]);
    if (!data) return;
    const m = data.height / 100;
    const value = data.weight / (m * m);
    const category = value < 18.5 ? 'Berat badan kurang' : value < 25 ? 'Normal' : value < 27 ? 'Berat badan lebih' : 'Obesitas';
    const nf = new Intl.NumberFormat('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    const kg = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 });
    show(bmiResult, `BMI kamu · ${category}`, nf.format(value), [
      `Rentang berat normal untuk tinggimu: sekitar ${kg.format(18.5 * m * m)}–${kg.format(24.9 * m * m)} kg.`,
      'Hanya gambaran awal untuk dewasa. Konsultasikan dengan tenaga kesehatan untuk penilaian lengkap.',
    ]);
  });

  const water = $('water-form');
  const waterResult = $('water-result');
  const waterPlaceholder = waterResult.textContent;
  water.hidden = false;
  water.addEventListener('input', () => resetResult(water, waterResult, waterPlaceholder));
  water.addEventListener('submit', (event) => {
    event.preventDefault();
    resetResult(water, waterResult, waterPlaceholder);
    const data = readFields(water, waterResult, [['weight', 'decimal', 20, 300, 'Berat badan harus antara 20 dan 300 kg.']]);
    if (!data) return;
    const level = Number(water.elements.level.value);
    const ml = data.weight * level;
    const liters = new Intl.NumberFormat('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(ml / 1000);
    show(waterResult, 'Perkiraan kebutuhan minum per hari', `${liters} liter`, [
      `Sekitar ${Math.round(ml / 250)} gelas ukuran 250 ml (${level} ml per kg berat badan).`,
      'Tambah saat cuaca panas atau banyak berkeringat. Ikuti anjuran dokter jika punya kondisi medis tertentu.',
    ]);
  });

  const as = $('as-form');
  if (as) {
    as.hidden = false;
    const personas = {
      both: ['Si Seimbang Tangguh', 'Uang dan kebiasaan sehatmu sudah berjalan beriringan. Pertahankan, lalu uji ulang tiap beberapa bulan.', '#finansial'],
      fin: ['Si Perencana Tangguh tapi Kurang Rawat Diri', 'Keuanganmu sudah terarah. Sekarang beri ruang untuk gerak, tidur, dan makan seimbang.', '#kesehatan'],
      hel: ['Si Bugar yang Butuh Jaring Pengaman', 'Kebiasaan sehatmu bagus. Lengkapi dengan anggaran, dana darurat, dan cek perlindungan.', '#finansial'],
      none: ['Si Pemula Penuh Potensi', 'Semua orang mulai dari nol. Pilih satu langkah kecil dari uang atau kesehatan untuk minggu ini.', '#finansial'],
    };
    as.addEventListener('submit', (e) => {
      e.preventDefault();
      const v = (i) => as.querySelector(`input[name=as${i}]:checked`);
      const all = [0, 1, 2, 3, 4, 5].map(v);
      const err = $('as-error');
      if (all.includes(null)) { err.textContent = 'Jawab keenam pertanyaan dulu, ya.'; return; }
      err.textContent = '';
      const sum = (a) => a.reduce((n, x) => n + Number(x.value), 0);
      const f = sum(all.slice(0, 3)); const h = sum(all.slice(3));
      const [name, tip, href] = personas[f >= 4 && h >= 4 ? 'both' : f >= 4 ? 'fin' : h >= 4 ? 'hel' : 'none'];
      const out = $('as-result'); out.replaceChildren();
      const title = document.createElement('h3'); title.textContent = name;
      const info = document.createElement('p'); info.textContent = `Skor uang ${f}/6 · Skor kebiasaan sehat ${h}/6. ${tip}`;
      const go = document.createElement('a'); go.className = 'text-link'; go.href = href; go.textContent = 'Lanjut belajar';
      const wa = document.createElement('a'); wa.className = 'btn secondary'; wa.target = '_blank'; wa.rel = 'noopener noreferrer';
      wa.textContent = 'Bagikan ke WhatsApp';
      wa.href = `https://wa.me/?text=${encodeURIComponent(`Profilku di LokaPelita: ${name}! Coba cek punyamu: https://lokapelita.vercel.app/#skor-hidup`)}`;
      out.append(title, info, go, document.createElement('br'), wa);
      coach(out, f >= h ? 'Pelita' : 'Loka', 'happy', 'Terima kasih sudah jujur pada diri sendiri. Satu langkah kecil sudah cukup!');
      out.hidden = false; title.tabIndex = -1; title.focus();
    });
  }
})();
