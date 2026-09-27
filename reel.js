// Kaku 形象片：15 秒的動態影像，畫在 canvas 上。render(t) 是純函式（同一個 t 畫出同一格），
// 網頁上用 requestAnimationFrame 循環播放；?export=1 時由外部逐格呼叫、截圖、編成影片。
(() => {
  // 橫式 1920×1080（網頁、YouTube）與直式 1080×1920（手機、IG Reels）共用同一條時間軸，每一幕各自排版。
  // 直式的重要文字避開 IG 介面：上 250、下 440、右 140 px 以內不放字。
  const DURATION = 15;
  const SIZES = { landscape: [1920, 1080], portrait: [1080, 1920] };
  let W = 1920, H = 1080, P = false;
  const v = (landscape, portrait) => (P ? portrait : landscape);

  // 對拍：配樂是 128 BPM，一小節 1.875 秒，15 秒剛好 8 小節。每一幕的切點對到拍子上：
  // 左邊是實際秒數（配樂），右邊是動畫原本的時間，中間線性換算（各段只快慢 0.9–1.2 倍）。
  const BEATS = [[0, 0], [1.875, 1.7], [3.75, 3.6], [4.6875, 4.75], [7.5, 7.6], [9.375, 9.8], [11.25, 12.0], [13.125, 13.4], [15, 15]];
  function remap(x, from, to) {
    for (let i = 1; i < BEATS.length; i++) {
      const a = BEATS[i - 1], b = BEATS[i];
      if (x <= b[from]) return a[to] + (b[to] - a[to]) * (x - a[from]) / (b[from] - a[from]);
    }
    return x;
  }
  const animTime = real => remap(real, 0, 1);
  const realTime = anim => remap(anim, 1, 0);
  const C = {
    ink: '#0e0d0c', ink2: '#151412', char: '#1f1d1a', stone: '#2c2925', line: '#3b3732',
    paper: '#eee8dd', ash: '#a59e92', brass: '#c9a86a', brassHi: '#e3c68d', deepBlue: '#1f2b45',
  };
  const SERIF = '"Noto Serif TC", "Songti TC", serif';
  const SANS = '-apple-system, "PingFang TC", "Noto Sans TC", sans-serif';
  const MONO = 'ui-monospace, "SF Mono", Menlo, monospace';
  const LOOKS = [["original","原色","Original","#ede3d1","#cc997a","#334038"],["amber400","琥珀 400","Amber 400","#ebddc9","#c9987b","#3a473f"],["reportage","紀實","Reportage","#e8dfcf","#c89a7e","#35423d"],["yesterday","昨日","Yesterday","#ebe0d0","#cd9d7e","#2e3f37"],["harbor","港光","Harbor","#ede5d4","#cf9f81","#354741"],["mist","霧白","Mist","#f6eddd","#d4a58c","#55625c"],["afterglow","晚霞","Afterglow","#eddfca","#cc9d7f","#454f44"],["vista","山海","Vista","#ece1ce","#cd9572","#233429"],["ink","墨","Ink","#eeeeee","#b2b2b2","#333333"],["savor","食光","Savor","#f8ecd8","#d59f7e","#334439"],["soft160","柔光 160","Soft 160","#efe3d2","#c79d85","#414d46"],["y2k","千禧","Y2K","#faf1e3","#d7a68b","#36433c"],["mood","花樣","Mood","#e5dbc9","#ca9e80","#414e47"],["cream","奶油","Cream","#f4e9d8","#cfa389","#4f574f"],["milktea","奶茶","Milk Tea","#e4daca","#ca9f85","#515750"],["instant","即影","Instant","#f4e9d8","#d9a98c","#526058"],["cross","負沖","Cross","#f0e7d3","#d19e7b","#25362f"],["silver","銀鹽","Silver","#ebebeb","#acacac","#424242"],["still","劇照","Still","#e2d7c6","#c6987a","#35433e"],["storybook","童話","Storybook","#f9ebd6","#d19b81","#445349"],["camcorder","錄影帶","Camcorder","#e9dfd3","#cfa289","#4e5752"]]; // [id, 中文名, 英文名, 亮部, 膚色, 暗部]

  // ---------- 緩動 ----------
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const seg = (t, a, b) => clamp((t - a) / (b - a));
  const eo3 = t => 1 - Math.pow(1 - t, 3);
  const eio3 = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const eoBack = t => { const c1 = 2.2, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
  const eoExpo = t => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
  const eiExpo = t => (t <= 0 ? 0 : Math.pow(2, 10 * t - 10));
  const pulse = (t, a, b) => Math.sin(seg(t, a, b) * Math.PI);
  const lerpRect = (a, b, p) => ({ x: lerp(a.x, b.x, p), y: lerp(a.y, b.y, p), w: lerp(a.w, b.w, p), h: lerp(a.h, b.h, p) });
  const mix = (c1, c2, p) => {
    const a = parseInt(c1.slice(1), 16), b = parseInt(c2.slice(1), 16);
    const ch = s => Math.round(lerp((a >> s) & 255, (b >> s) & 255, p));
    return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
  };
  // 固定種子的亂數：每一格畫出來都一樣。
  const rand = seed => { const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

  // ---------- 素材 ----------
  const images = {};
  const sources = { print: 'img/instant.jpg', trails: 'img/trails.jpg' };
  for (const [id] of LOOKS) sources[id] = `looks/${id}.jpg`;
  const params = new URLSearchParams(location.search);
  const exporting = params.has('export');
  const loadImage = (key, src) => new Promise(resolve => {
    const img = new Image();
    img.onload = () => { images[key] = img; resolve(); };
    img.onerror = () => resolve();
    img.src = src;
  });
  const fontText = 'Kaku構圖相機教你站哪怎麼拿的底片感鏡頭往下一點剛好人像風景美食即時引導濾鏡款拍到就是看見拍立得機一卷張送洗後才看得魔幻時刻藍調長曝光車軌流水星軌遙控即將上架原色琥珀紀實昨日港光霧白晚霞山海墨食光柔千禧花樣奶油茶即影負沖銀鹽劇照童話錄影帶還有全部0123456789:–・、';
  const fontsReady = document.fonts ? Promise.all([
    document.fonts.load(`600 100px ${SERIF}`, fontText),
    document.fonts.load(`400 100px ${SERIF}`, fontText),
  ]).catch(() => {}) : Promise.resolve();
  // 先載第一張照片（原色），其他在背景載；還沒到的濾鏡先用原色代替，到了就換上。
  const first = loadImage('original', sources.original);
  const rest = Object.entries(sources).filter(([k]) => k !== 'original').map(([k, v]) => loadImage(k, v));
  const timeout = ms => new Promise(resolve => setTimeout(resolve, ms));
  // 輸出影片時每一格都要完整，全部等到；網頁上最多等 4 秒就開始播（字型晚到會自動換上）。
  const ready = exporting
    ? Promise.all([first, fontsReady, ...rest])
    : Promise.race([Promise.all([first, fontsReady]), timeout(4000)]);
  const lookImage = id => images[id] || images.original;

  // 底片顆粒：一塊 256×256 的雜訊，每格換位置平鋪。
  const grain = document.createElement('canvas');
  grain.width = grain.height = 256;
  {
    const g = grain.getContext('2d'), data = g.createImageData(256, 256);
    for (let i = 0; i < data.data.length; i += 4) {
      const v = Math.floor(rand(i * 0.37) * 255);
      data.data[i] = data.data[i + 1] = data.data[i + 2] = v; data.data[i + 3] = 255;
    }
    g.putImageData(data, 0, 0);
  }

  // ---------- 畫圖小工具 ----------
  function cover(ctx, img, r, zoom = 1, fx = 0.5, fy = 0.5) {
    if (!img) { ctx.fillStyle = C.stone; ctx.fillRect(r.x, r.y, r.w, r.h); return; }
    const s = Math.max(r.w / img.width, r.h / img.height) * zoom;
    const w = img.width * s, h = img.height * s;
    ctx.drawImage(img, r.x + (r.w - w) * fx, r.y + (r.h - h) * fy, w, h);
  }
  function brackets(ctx, r, arm, color, lw = 4, alpha = 1) {
    if (alpha <= 0 || arm <= 0) return;
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineCap = 'square';
    const a = Math.min(arm, r.w / 2, r.h / 2);
    ctx.beginPath();
    for (const [x, y, dx, dy] of [[r.x, r.y, 1, 1], [r.x + r.w, r.y, -1, 1], [r.x, r.y + r.h, 1, -1], [r.x + r.w, r.y + r.h, -1, -1]]) {
      ctx.moveTo(x + dx * a, y); ctx.lineTo(x, y); ctx.lineTo(x, y + dy * a);
    }
    ctx.stroke();
    ctx.restore();
  }
  function text(ctx, str, x, y, { size = 40, weight = 400, font = SERIF, color = C.paper, align = 'left', alpha = 1, baseline = 'alphabetic' } = {}) {
    if (alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.font = `${weight} ${size}px ${font}`;
    ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = baseline;
    ctx.fillText(str, x, y);
    ctx.restore();
  }
  // 逐字浮上來的標題（每個字從下方遮罩裡升起）。
  function riseText(ctx, str, x, y, t, start, { size = 120, weight = 600, color = C.paper, stagger = 0.045, dur = 0.5, align = 'left' } = {}) {
    ctx.save();
    const base = ctx.globalAlpha;
    ctx.font = `${weight} ${size}px ${SERIF}`;
    const chars = [...str];
    const widths = chars.map(c => ctx.measureText(c).width);
    const total = widths.reduce((a, b) => a + b, 0);
    let cx = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
    ctx.beginPath(); ctx.rect(cx - 20, y - size * 1.1, total + 40, size * 1.35); ctx.clip();
    chars.forEach((c, i) => {
      const p = eo3(seg(t, start + i * stagger, start + i * stagger + dur));
      if (p > 0) {
        ctx.globalAlpha = base * p;
        ctx.fillStyle = color; ctx.textBaseline = 'alphabetic';
        ctx.fillText(c, cx, y + (1 - p) * size * 0.9);
      }
      cx += widths[i];
    });
    ctx.restore();
  }
  function pill(ctx, cx, cy, label, { color = C.paper, bg = 'rgba(14,13,12,0.86)', size = 34, scale = 1, alpha = 1, sub = null } = {}) {
    if (alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.translate(cx, cy); ctx.scale(scale, scale);
    ctx.font = `600 ${size}px ${SANS}`;
    let w = ctx.measureText(label).width;
    let sw = 0;
    if (sub) { ctx.font = `400 ${size * 0.72}px ${SANS}`; sw = ctx.measureText(sub).width + 18; }
    const pw = w + sw + size * 1.4, ph = size * 1.9;
    ctx.fillStyle = bg;
    ctx.beginPath(); ctx.roundRect(-pw / 2, -ph / 2, pw, ph, ph / 2); ctx.fill();
    ctx.textBaseline = 'middle';
    ctx.font = `600 ${size}px ${SANS}`; ctx.fillStyle = color; ctx.textAlign = 'left';
    ctx.fillText(label, -pw / 2 + size * 0.7, 2);
    if (sub) { ctx.font = `400 ${size * 0.72}px ${SANS}`; ctx.fillStyle = C.ash; ctx.fillText(sub, -pw / 2 + size * 0.7 + w + 18, 3); }
    ctx.restore();
  }
  function ring(ctx, x, y, r, color, lw, alpha) {
    if (alpha <= 0) return;
    ctx.save(); ctx.globalAlpha = alpha; ctx.strokeStyle = color; ctx.lineWidth = lw;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
  }
  // 快門式轉場：上下兩片黑幕在 `at` 合起、再打開，中間一條黃銅細線。
  function shutter(ctx, t, at, half = 0.13) {
    const p = 1 - Math.abs(t - at) / half;
    if (p <= 0) return;
    const e = eio3(clamp(p));
    const h = (H / 2) * e;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, h); ctx.fillRect(0, H - h, W, h);
    ctx.fillStyle = C.brass; ctx.globalAlpha = e;
    const bar = v(360, 300);
    ctx.fillRect(W / 2 - bar * e, H / 2 - 1, bar * 2 * e, 2);
    ctx.globalAlpha = 1;
  }
  function flash(ctx, t, at, dur = 0.22, strength = 0.85) {
    const p = seg(t, at, at + dur);
    if (t < at || p >= 1) return;
    ctx.fillStyle = `rgba(255,250,240,${(1 - eo3(p)) * strength})`;
    ctx.fillRect(0, 0, W, H);
  }

  // ---------- 取景框：前 7.6 秒的主角 ----------
  // 橫式：開場置中 → 構圖引導在右 → 濾鏡在左。直式：字在上、框在下。
  const FRAMES = {
    landscape: [{ x: 690, y: 180, w: 540, h: 720 }, { x: 1090, y: 130, w: 615, h: 820 }, { x: 250, y: 130, w: 615, h: 820 }],
    portrait: [{ x: 270, y: 600, w: 540, h: 720 }, { x: 240, y: 670, w: 600, h: 800 }, { x: 240, y: 580, w: 600, h: 800 }],
  };
  function frameAt(t) {
    const [F0, F1, F2] = FRAMES[P ? 'portrait' : 'landscape'];
    if (t < 1.65) return F0;
    if (t < 2.1) return lerpRect(F0, F1, eio3(seg(t, 1.65, 2.1)));
    if (t < 4.6) return F1;
    if (t < 5.05) return lerpRect(F1, F2, eio3(seg(t, 4.6, 5.05)));
    return F2;
  }

  function sceneOpen(ctx, t) {
    const cx = W / 2, cy = H / 2;
    // 黃銅點彈出、裂成四個角飛到取景框。
    const dot = eoBack(seg(t, 0, 0.35));
    if (t < 0.45) {
      ctx.fillStyle = C.brass;
      ctx.beginPath(); ctx.arc(cx, cy, 16 * dot, 0, Math.PI * 2); ctx.fill();
    }
    const fly = eoBack(seg(t, 0.3, 0.85));
    if (t >= 0.3 && t < 2.1) {
      const r = lerpRect({ x: cx, y: cy, w: 0, h: 0 }, frameAt(t), fly);
      brackets(ctx, r, lerp(0, 70, fly), C.brass, 5);
    }
    // 快門一閃、漣漪。
    ring(ctx, cx, cy, lerp(40, 520, eo3(seg(t, 0.85, 1.5))), C.brass, 3, (1 - seg(t, 0.85, 1.5)) * 0.8);
    // Kaku
    const out = eo3(seg(t, 1.5, 1.85));
    ctx.save();
    ctx.globalAlpha = 1 - out;
    ctx.translate(0, -out * 80);
    riseText(ctx, 'Kaku', cx, cy + 60, t, 1.0, { size: 190, stagger: 0.07, dur: 0.45, align: 'center' });
    text(ctx, '構 圖 相 機', cx, cy + 150, { size: 38, color: C.ash, align: 'center', alpha: eo3(seg(t, 1.25, 1.55)) });
    ctx.restore();
  }

  // 構圖引導：人框對位、角度刻度歸零、提示變「剛好」。
  function sceneGuide(ctx, t) {
    const F = frameAt(t);
    const reveal = eo3(seg(t, 1.75, 2.25));
    // 照片從下往上掀開。
    ctx.save();
    ctx.beginPath(); ctx.rect(F.x, F.y + F.h * (1 - reveal), F.w, F.h * reveal); ctx.clip();
    if (t < CYCLE) cover(ctx, images.original, F, lerp(1.1, 1.0, eo3(seg(t, 1.75, 4.6))));
    else drawLooks(ctx, F, t);
    ctx.restore();
    // 外框
    ctx.strokeStyle = C.line; ctx.lineWidth = 2; ctx.strokeRect(F.x, F.y, F.w, F.h);
    const aligned = t >= 3.6;
    const guideAlpha = seg(t, 2.1, 2.4) * (1 - seg(t, 4.45, 4.7));
    if (guideAlpha > 0) {
      ctx.save(); ctx.globalAlpha = guideAlpha;
      // 九宮格
      ctx.strokeStyle = 'rgba(238,232,221,0.18)'; ctx.lineWidth = 1.5;
      for (let i = 1; i < 3; i++) {
        ctx.beginPath(); ctx.moveTo(F.x + F.w * i / 3, F.y); ctx.lineTo(F.x + F.w * i / 3, F.y + F.h); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(F.x, F.y + F.h * i / 3); ctx.lineTo(F.x + F.w, F.y + F.h * i / 3); ctx.stroke();
      }
      // 目標框（虛線）與人框（從偏位滑到目標）。
      const target = { x: F.x + F.w * 0.35, y: F.y + F.h * 0.165, w: F.w * 0.37, h: F.h * 0.79 };
      const off = { x: target.x - F.w * 0.16, y: target.y - F.h * 0.1, w: target.w * 0.86, h: target.h * 0.86 };
      ctx.setLineDash([10, 10]); ctx.strokeStyle = 'rgba(201,168,106,0.55)'; ctx.lineWidth = 2;
      ctx.strokeRect(target.x, target.y, target.w, target.h); ctx.setLineDash([]);
      const snap = eio3(seg(t, 2.6, 3.55));
      brackets(ctx, lerpRect(off, target, snap), 44, aligned ? C.brass : C.paper, 4);
      // 方向箭頭（往下）
      if (!aligned) {
        for (let i = 0; i < 3; i++) {
          const phase = ((t * 1.6) % 1) * 3 - i;
          const a = 0.25 + 0.7 * Math.max(0, 1 - Math.abs(phase - 0.5));
          const x = F.x + F.w - 70, y = F.y + 150 + i * 26;
          ctx.strokeStyle = `rgba(238,232,221,${a})`; ctx.lineWidth = 4; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(x - 18, y - 8); ctx.lineTo(x, y + 8); ctx.lineTo(x + 18, y - 8); ctx.stroke();
        }
      }
      // 角度刻度：一把直尺，黃銅那段是目標，指針從 +14° 回到 0°。
      const gx = F.x + F.w - 34, gy = F.y + F.h * 0.3, gh = F.h * 0.4;
      ctx.strokeStyle = 'rgba(238,232,221,0.5)'; ctx.lineWidth = 2;
      for (let i = 0; i <= 12; i++) {
        const y = gy + gh * i / 12;
        ctx.beginPath(); ctx.moveTo(gx - (i % 3 === 0 ? 16 : 9), y); ctx.lineTo(gx, y); ctx.stroke();
      }
      ctx.fillStyle = 'rgba(201,168,106,0.8)'; ctx.fillRect(gx - 4, gy + gh * 0.45, 4, gh * 0.1);
      const deg = lerp(14, 0, eio3(seg(t, 2.6, 3.55)));
      const ny = gy + gh * (0.5 - deg / 45);
      ctx.fillStyle = aligned ? C.brass : C.paper;
      ctx.beginPath(); ctx.moveTo(gx - 26, ny); ctx.lineTo(gx - 40, ny - 9); ctx.lineTo(gx - 40, ny + 9); ctx.fill();
      text(ctx, `${Math.round(deg)}°`, gx - 48, ny + 8, { size: 22, font: MONO, color: aligned ? C.brass : C.paper, align: 'right' });
      ctx.restore();
      // 提示條：「鏡頭往下一點」→「✓ 剛好」，到位時彈一下、兩圈漣漪（震動）。
      const px = F.x + F.w / 2, py = F.y + 58;
      if (!aligned) {
        pill(ctx, px, py, '鏡頭往下一點', { alpha: guideAlpha * seg(t, 2.2, 2.45), sub: '頭頂留一格' });
      } else {
        const pop = 1 + 0.18 * (1 - eoBack(seg(t, 3.6, 3.85)));
        pill(ctx, px, py, '✓ 剛好', { color: C.brass, scale: pop, alpha: guideAlpha, sub: '頭頂留一格、腳貼底邊' });
        for (const d of [0, 0.12]) {
          const p = seg(t, 3.6 + d, 4.2 + d);
          ring(ctx, px, py, lerp(40, 260, eo3(p)), C.brass, 3, (1 - p) * 0.7 * guideAlpha);
        }
        // 外框閃一下黃銅。
        ctx.save(); ctx.globalAlpha = (1 - seg(t, 3.6, 4.1)) * guideAlpha;
        ctx.strokeStyle = C.brass; ctx.lineWidth = 6; ctx.strokeRect(F.x, F.y, F.w, F.h); ctx.restore();
      }
    }
    // 左邊的字
    const leave = eiExpo(seg(t, 4.5, 4.75));
    ctx.save();
    ctx.globalAlpha = 1 - leave;
    ctx.translate(-leave * 300, 0);
    const [tx, ty1, ty2, ty3] = v([170, 470, 612, 706], [240, 420, 540, 612]);
    riseText(ctx, '教你站哪、', tx, ty1, t, 1.95, { size: v(118, 112) });
    riseText(ctx, '怎麼拿。', tx, ty2, t, 2.2, { size: v(118, 112) });
    text(ctx, '人像・風景・美食　即時構圖引導', tx + 6, ty3, { size: v(38, 34), color: C.ash, alpha: eo3(seg(t, 2.6, 3.0)) });
    ctx.restore();
  }

  // 20 款濾鏡：先一款一款快速換（每款由上往下刷過），再把照片切成 20 條、每條一款，
  // 最後琥珀 400 從左邊刷過去定格。右邊名字翻牌、下方色票捲動。
  const CYCLE = 4.9, STEP = 0.074, SLICES = 6.45, SETTLE = 7.15;
  function lookPhase(t) {
    const raw = (t - CYCLE) / STEP;
    const index = clamp(Math.floor(raw), 0, LOOKS.length - 1);
    return { raw, index, local: t < SLICES ? raw - Math.floor(raw) : 1 };
  }
  function drawLooks(ctx, F, t) {
    const { index, local } = lookPhase(t);
    if (t < SLICES) {
      cover(ctx, lookImage(LOOKS[Math.max(0, index - 1)][0]), F);
      ctx.save();
      ctx.beginPath(); ctx.rect(F.x, F.y, F.w, F.h * eo3(clamp(local / 0.6))); ctx.clip();
      cover(ctx, lookImage(LOOKS[index][0]), F);
      ctx.restore();
      if (local < 0.6) {
        ctx.fillStyle = 'rgba(227,198,141,0.6)';
        ctx.fillRect(F.x, F.y + F.h * eo3(local / 0.6) - 2, F.w, 4);
      }
      return;
    }
    cover(ctx, lookImage(LOOKS[LOOKS.length - 1][0]), F);
    const n = LOOKS.length - 1, edges = i => Math.round(F.x + (F.w * i) / n);
    for (let j = 0; j < n; j++) {
      const p = eo3(seg(t, SLICES + j * 0.02, SLICES + j * 0.02 + 0.28));
      if (p <= 0) continue;
      ctx.save();
      ctx.beginPath(); ctx.rect(edges(j), F.y + F.h * (1 - p), edges(j + 1) - edges(j), F.h * p); ctx.clip();
      cover(ctx, lookImage(LOOKS[j + 1][0]), F);
      ctx.restore();
    }
    const wipe = eio3(seg(t, SETTLE, SETTLE + 0.32));
    // 條與條之間的細縫，定格時消失。
    ctx.fillStyle = `rgba(14,13,12,${0.9 * (1 - wipe)})`;
    for (let j = 1; j < n; j++) ctx.fillRect(edges(j) - 1, F.y, 2, F.h);
    if (wipe > 0) {
      ctx.save();
      ctx.beginPath(); ctx.rect(F.x, F.y, F.w * wipe, F.h); ctx.clip();
      cover(ctx, lookImage('amber400'), F, lerp(1.0, 1.04, seg(t, SETTLE, 7.6)));
      ctx.restore();
      if (wipe < 1) { ctx.fillStyle = C.brassHi; ctx.fillRect(F.x + F.w * wipe - 2, F.y, 4, F.h); }
    }
  }

  function sceneLooks(ctx, t) {
    if (t < 4.75) return;
    const appear = eo3(seg(t, 4.95, 5.35));
    const count = LOOKS.length;
    const { raw, index, local } = lookPhase(t);
    const slicing = t >= SLICES && t < SETTLE, settle = t >= SETTLE;
    const F = frameAt(t);
    if (settle) { ctx.strokeStyle = C.brass; ctx.lineWidth = 3; ctx.strokeRect(F.x, F.y, F.w, F.h); }
    ctx.save();
    ctx.globalAlpha = appear;
    const shown = settle ? 1 : index;
    const [nx, cy0, ny, ey] = v([1000, 250, 470, 540], [240, 330, 478, 532]);
    text(ctx, slicing ? '20 / 20' : `${String(shown).padStart(2, '0')} / 20`, nx, cy0, { size: v(40, 34), font: MONO, color: C.brass, alpha: settle ? 0.45 : 1 });
    // 名字翻牌：新的從下面上來。
    let name, english, flip;
    if (settle) { [, name, english] = LOOKS[1]; flip = eoBack(seg(t, SETTLE, SETTLE + 0.3)); }
    else if (slicing) { name = '全部 20 款'; english = 'All twenty looks'; flip = eo3(seg(t, SLICES, SLICES + 0.25)); }
    else { [, name, english] = LOOKS[index]; flip = eo3(clamp(local / 0.45)); }
    ctx.save();
    const nameSize = settle ? v(190, 150) : v(150, 120);
    ctx.beginPath(); ctx.rect(nx - 10, ny - v(170, 150), W - nx, v(250, 190)); ctx.clip();
    text(ctx, name, nx, ny + (1 - flip) * 120, { size: nameSize, weight: 600, alpha: flip });
    ctx.restore();
    text(ctx, english, nx + 6, ey, { size: v(44, 36), font: SERIF, color: C.ash, alpha: flip });
    if (P) {
      text(ctx, '20 款底片與復古濾鏡', 840, 330, { size: 30, color: C.ash, align: 'right', alpha: eo3(seg(t, 5.1, 5.5)) });
    } else {
      text(ctx, '20 款底片與復古濾鏡', 1000, 660, { size: 46, weight: 600, alpha: eo3(seg(t, 5.1, 5.5)) });
      text(ctx, '取景時就看得到，拍到的就是看到的', 1000, 720, { size: 34, color: C.ash, alpha: eo3(seg(t, 5.3, 5.7)) });
    }
    // 色票列：目前這款放大、描黃銅邊（橫式在右下 x = 1250，直式在框下面置中）。
    const chip = v(74, 60), gap = v(22, 18), [sx0, sy0] = v([1250, 880], [540, 1440]);
    const run = Math.min(raw, count - 1);
    const position = settle ? lerp(run, 1, eio3(seg(t, SETTLE, SETTLE + 0.35))) : run;
    for (let i = 0; i < count; i++) {
      const x = sx0 + (i - position) * (chip + gap);
      if (x < v(900, -chip) || x > W + chip) continue;
      const focus = Math.max(0, 1 - Math.abs(i - position));
      const s = chip * (1 + 0.3 * focus);
      const y = sy0 - s / 2;
      ctx.save();
      ctx.globalAlpha = appear * (P ? clamp(x / 140) * clamp((W - x) / 140) : clamp((x - 900) / 120));
      ctx.beginPath(); ctx.roundRect(x - s / 2, y, s, s, s * 0.24); ctx.clip();
      const [, , , c1, c2, c3] = LOOKS[i];
      ctx.fillStyle = c1; ctx.fillRect(x - s / 2, y, s, s / 3 + 1);
      ctx.fillStyle = c2; ctx.fillRect(x - s / 2, y + s / 3, s, s / 3 + 1);
      ctx.fillStyle = c3; ctx.fillRect(x - s / 2, y + (2 * s) / 3, s, s / 3 + 1);
      ctx.restore();
      if (focus > 0.5) {
        ctx.strokeStyle = C.brass; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.roundRect(x - s / 2 - 6, y - 6, s + 12, s + 12, s * 0.3); ctx.stroke();
      }
    }
    ctx.restore();
  }

  // 拍立得出片與顯影；底片張數從 24 捲到 0。
  function sceneInstant(ctx, t) {
    ctx.fillStyle = C.ink2; ctx.fillRect(0, 0, W, H);
    // 相紙出口
    const [slotX, slotY, slotW] = v([610, 900, 640], [540, 980, 560]);
    ctx.fillStyle = '#050505';
    ctx.beginPath(); ctx.roundRect(slotX - slotW / 2, slotY - 12, slotW, 24, 12); ctx.fill();
    const img = images.print;
    const pw = v(500, 420), ph = img ? pw * img.height / img.width : pw * 1.5;
    const eject = eoExpo(seg(t, 7.72, 8.45));
    const settleRot = eio3(seg(t, 8.3, 8.9));
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, W, slotY); ctx.clip();
    ctx.translate(slotX, slotY + ph / 2 - (ph + 40) * eject);
    ctx.rotate((-4 * settleRot) * Math.PI / 180);
    ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 20;
    if (img) ctx.drawImage(img, -pw / 2, -ph / 2, pw, ph);
    ctx.shadowColor = 'transparent';
    // 顯影：相片那塊蓋一層深藍，慢慢淡掉。（外框比例同 App：左右 5.7%、上 7.6%，以相片寬為單位）
    const unit = pw / (1 + 2 * 0.057);
    const dev = eio3(seg(t, 8.35, 9.6));
    ctx.fillStyle = C.deepBlue; ctx.globalAlpha = 1 - dev;
    ctx.fillRect(-pw / 2 + 0.057 * unit, -ph / 2 + 0.076 * unit, unit, ph - (0.076 + 0.26) * unit);
    ctx.restore();
    text(ctx, '拍立得', slotX, slotY + v(68, 60), { size: v(46, 44), weight: 600, align: 'center', alpha: eo3(seg(t, 8.1, 8.5)) });
    text(ctx, '拍完從下面吐出來，慢慢顯影', slotX, slotY + v(108, 102), { size: v(28, 28), color: C.ash, align: 'center', alpha: eo3(seg(t, 8.3, 8.7)) });

    // 底片機：張數像計數輪一樣捲（橫式在右邊，直式在拍立得下面）。
    const alpha = eo3(seg(t, 7.8, 8.2));
    ctx.save(); ctx.globalAlpha = alpha;
    if (P) {
      text(ctx, '底片機', 540, 1210, { size: 80, weight: 600, align: 'center' });
      text(ctx, '一卷 24 張・沖洗後才看得到', 540, 1262, { size: 30, color: C.ash, align: 'center' });
    } else {
      text(ctx, '底片機', 1180, 330, { size: 110, weight: 600 });
      text(ctx, '一卷 24 張・沖洗後才看得到', 1184, 400, { size: 36, color: C.ash });
    }
    // 底片條：齒孔往左跑，片邊有橘色印字。
    const [stripX, stripY, stripW, stripH] = v([1140, 470, 760, 300], [0, 1296, 1080, 200]);
    const film = ctx.createLinearGradient(0, stripY, 0, stripY + stripH);
    film.addColorStop(0, '#3a2a17'); film.addColorStop(0.5, '#2a1e11'); film.addColorStop(1, '#3a2a17');
    ctx.fillStyle = film; ctx.fillRect(stripX, stripY, stripW, stripH);
    ctx.save();
    ctx.beginPath(); ctx.rect(stripX, stripY, stripW, stripH); ctx.clip();
    const shift = (t * 260) % 60;
    ctx.fillStyle = '#0b0a09';
    for (let x = stripX - shift; x < stripX + stripW; x += 60) {
      ctx.beginPath(); ctx.roundRect(x + 12, stripY + 16, 30, 20, 4); ctx.fill();
      ctx.beginPath(); ctx.roundRect(x + 12, stripY + stripH - 36, 30, 20, 4); ctx.fill();
    }
    for (let k = -1; k < 5; k++) {
      const x = stripX + k * 240 - ((t * 260) % 240);
      text(ctx, `KAKU 400  ${24 - k}  ▸${24 - k}A`, x, stripY + stripH - 44, { size: 18, font: MONO, color: '#e0813a', alpha: 0.75 });
    }
    ctx.restore();
    // 計數窗：24 → 0。個位一直轉，十位只在個位跨過 0 的那一格才跟著轉，跟真的計數輪一樣。
    const value = lerp(24, 0, eio3(seg(t, 8.0, 9.35)));
    const fontSize = v(170, 124), winW = fontSize * 1.47, winH = fontSize * 1.12;
    const winX = v(1300, 540 - winW / 2 - 24), digitsY = stripY + stripH / 2 + fontSize * 0.365;
    const winY = digitsY - fontSize * 0.92;
    ctx.fillStyle = '#0b0a09';
    ctx.beginPath(); ctx.roundRect(winX, winY, winW, winH, fontSize * 0.13); ctx.fill();
    ctx.save();
    ctx.beginPath(); ctx.rect(winX, winY, winW, winH); ctx.clip();
    ctx.font = `600 ${fontSize}px ${MONO}`; ctx.fillStyle = C.brass; ctx.textBaseline = 'alphabetic';
    const ones = value % 10, tens = Math.floor(value / 10) + Math.max(0, ones - 9);
    const drawDigit = (d0, x) => {
      const base = Math.floor(d0), frac = d0 - base;
      for (let k = 0; k <= 1; k++) {
        const d = ((base + k) % 10 + 10) % 10;
        ctx.fillText(String(d), x, digitsY + (frac - k) * fontSize * 1.05);
      }
    };
    drawDigit(tens, winX + fontSize * 0.118);
    drawDigit(ones, winX + fontSize * 0.765);
    ctx.restore();
    // 窗上下的陰影，讓數字像在轉輪上。
    const shade = ctx.createLinearGradient(0, winY, 0, winY + winH);
    shade.addColorStop(0, 'rgba(0,0,0,0.7)'); shade.addColorStop(0.25, 'rgba(0,0,0,0)');
    shade.addColorStop(0.75, 'rgba(0,0,0,0)'); shade.addColorStop(1, 'rgba(0,0,0,0.7)');
    ctx.fillStyle = shade; ctx.fillRect(winX, winY, winW, winH);
    text(ctx, '張', winX + winW + v(30, 20), digitsY - 8, { size: v(60, 46), color: C.ash });
    ctx.restore();
  }

  // 魔幻時刻：太陽沿弧線落下，天空從金色轉成藍調，動態島倒數。
  function sceneGolden(ctx, t) {
    const p = seg(t, 9.8, 12.0);
    const blue = eio3(seg(t, 10.7, 11.8));
    const horizon = v(700, 1180);
    const sky = ctx.createLinearGradient(0, 0, 0, horizon);
    sky.addColorStop(0, mix('#324266', '#0b1428', blue));
    sky.addColorStop(0.55, mix('#e39a55', '#2c3e68', blue));
    sky.addColorStop(1, mix('#f6cf8f', '#6f84b0', blue));
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, horizon);
    // 太陽
    const sx = lerp(v(1180, 700), v(1480, 790), eio3(p)), sy = lerp(v(300, 760), horizon + 90, eio3(p));
    const glow = ctx.createRadialGradient(sx, sy, 10, sx, sy, v(380, 440));
    glow.addColorStop(0, `rgba(255,214,150,${0.75 * (1 - blue)})`);
    glow.addColorStop(1, 'rgba(255,214,150,0)');
    ctx.fillStyle = glow; ctx.fillRect(0, 0, W, horizon);
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, horizon); ctx.clip();
    ctx.fillStyle = mix('#fff1d6', '#f6c38a', p); ctx.globalAlpha = 1 - blue * 0.6;
    ctx.beginPath(); ctx.arc(sx, sy, 62, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    // 遠山：顏色淡、慢慢往左飄，和近山拉出層次。
    ctx.fillStyle = mix('#8a5a44', '#26365a', blue);
    ctx.beginPath(); ctx.moveTo(0, horizon);
    const drift = (t - 9.8) * 18;
    for (let x = -100; x <= W + 100; x += 60) ctx.lineTo(x - drift, horizon - 140 + Math.sin(x * 0.006 + 1.3) * 40 + Math.sin(x * 0.017) * 14);
    ctx.lineTo(W, horizon); ctx.fill();
    // 山的剪影
    ctx.fillStyle = mix('#3b2d2a', '#0e1424', blue);
    ctx.beginPath(); ctx.moveTo(0, horizon);
    const ridge = v([[0, 600], [260, 540], [420, 610], [640, 520], [900, 640], [1140, 560], [1380, 630], [1620, 540], [1920, 620]],
      [[0, 1090], [180, 1020], [330, 1100], [520, 1010], [700, 1120], [880, 1040], [1080, 1100]]);
    ridge.push([W, horizon]);
    for (const [x, y] of ridge) ctx.lineTo(x, y);
    ctx.fill();
    // 水面與倒影
    const water = ctx.createLinearGradient(0, horizon, 0, H);
    water.addColorStop(0, mix('#c98a55', '#34466f', blue));
    water.addColorStop(1, mix('#2a1f1c', '#070b16', blue));
    ctx.fillStyle = water; ctx.fillRect(0, horizon, W, H - horizon);
    for (let i = 0; i < 16; i++) {
      const y = horizon + 14 + i * v(22, 30), w = (240 - i * 10) * (1 - blue * 0.7);
      ctx.fillStyle = `rgba(255,210,150,${(0.5 - i * 0.025) * (1 - blue)})`;
      ctx.fillRect(sx - w / 2 + Math.sin(t * 4 + i) * 12, y, w, 4);
    }
    const scrim = P ? ctx.createLinearGradient(0, 200, 0, 760) : ctx.createLinearGradient(0, 0, 1100, 0);
    scrim.addColorStop(0, 'rgba(8,8,10,0.55)'); scrim.addColorStop(1, 'rgba(8,8,10,0)');
    ctx.fillStyle = scrim; ctx.fillRect(0, 0, v(1100, W), v(H, 760));
    // 字
    const inA = eo3(seg(t, 9.95, 10.35));
    const [gx, gy, galign] = v([150, 330, 'left'], [540, 450, 'center']);
    text(ctx, '魔幻時刻', gx, gy, { size: 120, weight: 600, align: galign, alpha: inA * (1 - blue) });
    text(ctx, '藍調時刻', gx, gy, { size: 120, weight: 600, align: galign, alpha: blue });
    const clock = 17 * 60 + 16 + Math.floor(eio3(p) * 53); // 17:16 → 18:09
    const hh = Math.floor(clock / 60), mm = clock % 60;
    text(ctx, `${hh}:${String(mm).padStart(2, '0')}`, gx + v(6, 0), gy + 90, { size: 64, font: MONO, color: C.brassHi, align: galign, alpha: inA });
    text(ctx, '算好今天的光，快到了提醒你', gx + v(6, 0), gy + 150, { size: 34, color: C.paper, align: galign, alpha: eo3(seg(t, 10.2, 10.6)) * 0.9 });
    // 動態島：從小膠囊展開，倒數。
    const grow = eoBack(seg(t, 10.0, 10.45));
    const iw = lerp(160, v(540, 520), grow), ih = lerp(46, v(76, 72), grow);
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.roundRect(W / 2 - iw / 2, 40, iw, ih, ih / 2); ctx.fill();
    if (grow > 0.6) {
      const a = seg(grow, 0.6, 1);
      ctx.save(); ctx.globalAlpha = a;
      ctx.fillStyle = C.brass; ctx.beginPath(); ctx.arc(W / 2 - iw / 2 + 42, 40 + ih / 2, 16, 0, Math.PI * 2); ctx.fill();
      const remain = Math.max(0, Math.round(lerp(300, 0, seg(t, 10.4, 11.6))));
      text(ctx, remain > 0 ? `還有 ${Math.floor(remain / 60)}:${String(remain % 60).padStart(2, '0')}` : '開始了', W / 2 + iw / 2 - 36, 40 + ih / 2 + 12, { size: 34, font: MONO, color: C.paper, align: 'right' });
      ctx.restore();
    }
  }

  // 長曝光：夜色裡的車軌劃過；手錶從右邊滑進來。
  function sceneTrails(ctx, t) {
    ctx.fillStyle = '#04060b'; ctx.fillRect(0, 0, W, H);
    // 星軌：繞著右上方的北極星轉，越畫越長。
    const sweep = eo3(seg(t, 12.0, 13.3)) * 0.9;
    ctx.save();
    const ground = v(H * 0.62, 1250);
    ctx.beginPath(); ctx.rect(0, 0, W, ground); ctx.clip();
    ctx.lineCap = 'round';
    for (let i = 0; i < 150; i++) {
      const r = 16 + rand(i + 7) * v(1150, 1000), a0 = rand(i + 91) * Math.PI * 2;
      ctx.strokeStyle = `rgba(${200 + rand(i) * 55},${210 + rand(i + 3) * 45},255,${0.15 + rand(i + 5) * 0.5})`;
      ctx.lineWidth = 0.8 + rand(i + 11) * 1.6;
      ctx.beginPath(); ctx.arc(v(1560, 760), v(150, 560), r, a0, a0 + sweep + 0.01); ctx.stroke();
    }
    ctx.restore();
    // 大樓剪影與窗
    for (let i = 0; i < v(18, 11); i++) {
      const x = i * 112 - 30, bw = 70 + rand(i) * 90;
      // 橫式左邊矮，留位置給字；天空留給星軌。
      const bh = P ? 200 + rand(i + 50) * 360 : x < 1000 ? 170 + rand(i + 50) * 150 : 220 + rand(i + 50) * 250;
      ctx.fillStyle = '#0a0e18'; ctx.fillRect(x, ground - bh, bw, bh);
      for (let j = 0; j < v(14, 20); j++) {
        const wy = ground - bh + 20 + Math.floor(j / 3) * 46;
        if (wy + 18 < ground - 10 && rand(i * 31 + j) > 0.55) {
          ctx.fillStyle = `rgba(255,214,150,${0.25 + rand(j + i) * 0.45})`;
          ctx.fillRect(x + 10 + (j % 3) * (bw / 3.4), wy, 12, 18);
        }
      }
    }
    // 車軌：幾條貝茲曲線，逐漸畫出來，加亮混合。
    const draw = eo3(seg(t, 12.05, 13.0));
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const trails = [
      ['#ff3b30', 0], ['#ff5a3c', 26], ['#ff2d2d', 52],
      ['#fff4e0', 96], ['#ffe9c2', 122], ['#ffffff', 148],
    ];
    for (const [color, offset] of trails) {
      ctx.strokeStyle = color; ctx.lineWidth = 7; ctx.lineCap = 'round';
      ctx.shadowColor = color; ctx.shadowBlur = 28;
      ctx.beginPath();
      const steps = 60, n = Math.floor(steps * draw);
      for (let k = 0; k <= n; k++) {
        const u = k / steps;
        const x = lerp(-80, W + 80, u);
        const y = v(880, 1480) - offset * 0.9 + Math.sin(u * Math.PI) * -(v(170, 120) + offset * 0.6) + u * 40;
        k === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
      if (draw > 0 && draw < 1) {
        const u = n / steps, x = lerp(-80, W + 80, u);
        const y = v(880, 1480) - offset * 0.9 + Math.sin(u * Math.PI) * -(v(170, 120) + offset * 0.6) + u * 40;
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.restore();
    const scrim = P ? ctx.createLinearGradient(0, 250, 0, 620) : ctx.createLinearGradient(0, 0, 1100, 0);
    scrim.addColorStop(0, 'rgba(4,6,11,0.85)'); scrim.addColorStop(1, 'rgba(4,6,11,0)');
    ctx.fillStyle = scrim; ctx.fillRect(0, 0, v(1100, W), v(420, 620));
    const [lx, ly, lalign] = v([150, 250, 'left'], [540, 450, 'center']);
    text(ctx, '長曝光', lx, ly, { size: 120, weight: 600, align: lalign, alpha: eo3(seg(t, 12.1, 12.45)) });
    text(ctx, '車軌・流水・星軌，不用腳架也能試', lx + v(6, 0), ly + 70, { size: v(36, 34), color: C.ash, align: lalign, alpha: eo3(seg(t, 12.25, 12.6)) });
    // Apple Watch
    const slide = eoBack(seg(t, 12.55, 12.95));
    const wx = lerp(W + 200, v(1560, 540), slide), wy = v(250, 820), ws = v(1, 1.15);
    ctx.save(); ctx.translate(wx, wy); ctx.scale(ws, ws);
    ctx.fillStyle = '#1b1b1d';
    ctx.beginPath(); ctx.roundRect(-110, -130, 220, 260, 56); ctx.fill();
    ctx.fillStyle = '#2a2a2e'; ctx.fillRect(108, -40, 14, 56);
    ctx.save(); ctx.beginPath(); ctx.roundRect(-92, -112, 184, 224, 42); ctx.clip();
    cover(ctx, images.trails, { x: -92, y: -112, w: 184, h: 224 });
    ctx.restore();
    ctx.restore();
    ctx.save(); ctx.globalAlpha = slide; ctx.fillStyle = 'rgba(4,6,11,0.85)';
    const ly2 = wy + 130 * ws + 60;
    ctx.beginPath(); ctx.roundRect(wx - 210, ly2 - 40, 420, 56, 28); ctx.fill(); ctx.restore();
    text(ctx, 'Apple Watch 看取景、按快門', wx, ly2, { size: 30, color: C.paper, align: 'center', alpha: slide });
  }

  // 收尾：Logo、標語、快門一閃。
  function sceneOutro(ctx, t) {
    ctx.fillStyle = C.ink; ctx.fillRect(0, 0, W, H);
    const cx = W / 2, cy = v(470, 860);
    const snap = eoBack(seg(t, 13.5, 13.95));
    const box = v({ x: cx - 470, y: cy - 250, w: 940, h: 420 }, { x: cx - 380, y: cy - 240, w: 760, h: 400 });
    brackets(ctx, lerpRect({ x: 0, y: 0, w: W, h: H }, box, snap), lerp(160, 70, snap), C.brass, 5);
    const s = lerp(1.25, 1, eo3(seg(t, 13.55, 14.1)));
    ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s);
    text(ctx, 'Kaku', 0, 60, { size: 210, weight: 600, align: 'center', alpha: eo3(seg(t, 13.55, 13.95)) });
    ctx.restore();
    riseText(ctx, '教你站哪、怎麼拿的底片感相機', cx, cy + v(290, 300), t, 13.85, { size: v(60, 54), weight: 400, stagger: 0.022, dur: 0.35, align: 'center' });
    text(ctx, '即 將 上 架　A P P   S T O R E', cx, cy + v(380, 390), { size: v(30, 28), font: SANS, color: C.brass, align: 'center', alpha: eo3(seg(t, 14.2, 14.5)) });
    flash(ctx, t, 14.82, 0.18, 0.9);
    // 最後幾格淡到黑，接回開頭。
    ctx.fillStyle = `rgba(0,0,0,${eiExpo(seg(t, 14.9, 15))})`; ctx.fillRect(0, 0, W, H);
  }


  // 場記板式的角落資訊：章節、時間碼、底部進度條。開場與收尾不顯示。
  const CHAPTERS = [[1.7, '01', '構圖引導'], [4.75, '02', '濾鏡'], [7.6, '03', '拍立得・底片機'], [9.8, '04', '魔幻時刻'], [12.0, '05', '長曝光']];
  function hud(ctx, t, time) {
    const a = seg(t, 1.8, 2.2) * (1 - seg(t, 13.3, 13.5));
    if (a <= 0) return;
    ctx.save();
    ctx.globalAlpha = a;
    let chapter = CHAPTERS[0];
    for (const c of CHAPTERS) if (t >= c[0]) chapter = c;
    const swap = eo3(seg(t, chapter[0], chapter[0] + 0.35));
    ctx.save();
    ctx.beginPath(); ctx.rect(60, 34, 620, 50); ctx.clip();
    ctx.translate(0, (1 - swap) * 40);
    text(ctx, chapter[1], 72, 70, { size: 22, font: MONO, color: C.brass });
    text(ctx, chapter[2], 112, 70, { size: 24, font: SANS, color: C.paper, alpha: 0.85 });
    ctx.restore();
    const frame = Math.floor(time * 30);
    const tc = `00:00:${String(Math.floor(frame / 30)).padStart(2, '0')}:${String(frame % 30).padStart(2, '0')}`;
    text(ctx, tc, W - 72, 70, { size: 22, font: MONO, color: C.paper, align: 'right', alpha: 0.7 });
    if (P) text(ctx, '示範照片由 AI 生成', W / 2, 272, { size: 22, font: SANS, color: C.ash, align: 'center', alpha: 0.8 });
    else text(ctx, '示範照片由 AI 生成', 72, H - 62, { size: 18, font: SANS, color: C.ash, alpha: 0.75 });
    ctx.fillStyle = 'rgba(238,232,221,0.14)'; ctx.fillRect(72, H - 44, W - 144, 2);
    ctx.fillStyle = C.brass; ctx.fillRect(72, H - 44, (W - 144) * (time / DURATION), 2);
    for (const [at] of CHAPTERS) ctx.fillRect(72 + (W - 144) * (realTime(at) / DURATION) - 1, H - 50, 2, 14);
    ctx.restore();
  }

  // time 是實際秒數（跟配樂同一個時鐘），畫面用換算後的動畫時間 t。
  function render(ctx, time, orientation = 'landscape') {
    [W, H] = SIZES[orientation];
    P = orientation === 'portrait';
    time = ((time % DURATION) + DURATION) % DURATION;
    const t = animTime(time);
    ctx.save();
    ctx.fillStyle = C.ink; ctx.fillRect(0, 0, W, H);
    // 開場的快門抖動
    const shake = t > 0.85 && t < 1.05 ? (1 - seg(t, 0.85, 1.05)) * 10 : 0;
    ctx.translate(Math.sin(t * 90) * shake, Math.cos(t * 70) * shake);
    if (t < 7.6) {
      if (t < 2.1) sceneOpen(ctx, t);
      if (t >= 1.7) sceneGuide(ctx, t);
      sceneLooks(ctx, t);
      flash(ctx, t, 0.85, 0.25, 0.9);
    } else if (t < 9.8) sceneInstant(ctx, t);
    else if (t < 12.0) sceneGolden(ctx, t);
    else if (t < 13.4) sceneTrails(ctx, t);
    else sceneOutro(ctx, t);
    ctx.restore();
    hud(ctx, t, time);
    for (const at of [7.6, 9.8, 12.0, 13.4]) shutter(ctx, t, at);
    // 暗角與顆粒
    const vig = ctx.createRadialGradient(W / 2, H / 2, v(H * 0.35, 480), W / 2, H / 2, v(H * 0.95, 1150));
    vig.addColorStop(0, 'rgba(0,0,0,0)'); vig.addColorStop(1, 'rgba(0,0,0,0.42)');
    ctx.fillStyle = vig; ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.globalAlpha = 0.07; ctx.globalCompositeOperation = 'overlay';
    const frame = Math.floor(time * 24);
    ctx.translate(-(frame * 97) % 256, -(frame * 61) % 256);
    ctx.fillStyle = ctx.createPattern(grain, 'repeat');
    ctx.fillRect(0, 0, W + 256, H + 256);
    ctx.restore();
  }

  // ---------- 播放 ----------
  // orientation：'landscape'、'portrait'，或每次尺寸改變時回傳其中之一的函式。輸出時用網址的 ?orient=。
  function mount(canvas, { orientation = params.get('orient') || 'landscape' } = {}) {
    const ctx = canvas.getContext('2d');
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const orient = () => (typeof orientation === 'function' ? orientation() : orientation);
    let playing = false, loaded = false, start = null, pausedAt = 14.6; // 靜止時停在字都出來的收尾畫面
    let clock = null; // 開聲音時改用配樂的播放時間，畫面才不會跟音樂跑掉
    let current = orient();
    function size() {
      current = orient();
      const [w, h] = SIZES[current];
      const dpr = exporting ? 1 : Math.min(window.devicePixelRatio || 1, 2);
      const cssW = exporting ? w : canvas.clientWidth || w;
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssW * dpr * h / w);
      ctx.setTransform(canvas.width / w, 0, 0, canvas.height / h, 0, 0);
      if (loaded && !playing) render(ctx, pausedAt, current);
    }
    size();
    if (!exporting) window.addEventListener('resize', size);
    const draw = now => {
      if (!playing) return;
      if (clock) pausedAt = clock() % DURATION;
      else {
        if (start === null) start = now - pausedAt * 1000;
        pausedAt = ((now - start) / 1000) % DURATION;
      }
      render(ctx, pausedAt, current);
      requestAnimationFrame(draw);
    };
    const api = {
      render: t => render(ctx, t, current),
      resize: size,
      get orientation() { return current; },
      get playing() { return playing; },
      get time() { return pausedAt; },
      setClock(fn) { clock = fn; start = null; },
      play() {
        if (playing) return;
        playing = true; start = null;
        if (loaded) requestAnimationFrame(draw);
      },
      pause() { playing = false; },
    };
    ready.then(() => {
      loaded = true;
      window.KakuReel.isReady = true;
      if (playing) requestAnimationFrame(draw); else render(ctx, pausedAt, current);
    });
    // 減少動態效果時停在收尾的畫面，按播放才動。
    if (!reduce && !exporting) api.play();
    return api;
  }

  window.KakuReel = { duration: DURATION, isReady: false, mount, ready };
})();
