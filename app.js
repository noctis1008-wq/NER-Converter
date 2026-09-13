const INPUT_SIZE = 0x8000;
const VC_SIZE = 0x8010;
const PRIMARY_START = 0x2009;
const PRIMARY_END = 0x2C8B;
const PRIMARY_CHECKSUM = 0x2D0D;
const SECONDARY_START = 0x7209;
const SECONDARY_END = 0x7E8B;
const SECONDARY_CHECKSUM = 0x7F0D;
const PATCH_START = 0x2C8C;
const PATCH_END = 0x2D0C;

const fileInput = document.getElementById("file");
const drop = document.getElementById("drop");
const status = document.getElementById("status");
const result = document.getElementById("result");
const game = document.getElementById("game");
const sizeEl = document.getElementById("size");
const checksum = document.getElementById("checksum");
const download = document.getElementById("download");

let outputBytes = null;

function le16(bytes, p) {
  return bytes[p] | (bytes[p + 1] << 8);
}

function sum16(bytes, start, endInclusive) {
  let s = 0;
  for (let i = start; i <= endInclusive; i++) s = (s + bytes[i]) & 0xFFFF;
  return s;
}

function isJapaneseGS(bytes) {
  if (bytes.length < INPUT_SIZE) return false;
  const primary = sum16(bytes, PRIMARY_START, PRIMARY_END);
  const primaryStored = le16(bytes, PRIMARY_CHECKSUM);
  const secondary = sum16(bytes, SECONDARY_START, SECONDARY_END);
  const secondaryStored = le16(bytes, SECONDARY_CHECKSUM);
  return primary === primaryStored && secondary === secondaryStored;
}

function showError(message) {
  status.textContent = message;
  status.className = "status error";
  result.classList.add("hidden");
}

async function convert(file) {
  status.textContent = "セーブデータを解析しています…";
  status.className = "status";
  result.classList.add("hidden");

  const buffer = await file.arrayBuffer();
  const input = new Uint8Array(buffer);

  if (input.length < INPUT_SIZE) {
    throw new Error("32 KiB未満のファイルです。日本語G/Sの通常セーブではない可能性があります。");
  }

  if (!isJapaneseGS(input)) {
    throw new Error("日本語版ポケットモンスター金・銀のセーブとしてチェックサムを確認できませんでした。クリスタル、別言語版、破損セーブなどは現在非対応です。");
  }

  // sav2vc-compatible output size: first 0x8010 bytes.
  // If the input is exactly 0x8000 bytes, the additional 16 bytes remain 00.
  const vc = new Uint8Array(VC_SIZE);
  vc.set(input.subarray(0, Math.min(input.length, VC_SIZE)));

  // Experimentally verified Japanese G/S VC + Poké Transporter compatibility patch.
  vc.fill(0x00, PATCH_START, PATCH_END + 1);

  // The patch is outside the Japanese G/S checksum range, so the original
  // checksums remain valid. Verify rather than silently changing them.
  if (sum16(vc, PRIMARY_START, PRIMARY_END) !== le16(vc, PRIMARY_CHECKSUM) ||
      sum16(vc, SECONDARY_START, SECONDARY_END) !== le16(vc, SECONDARY_CHECKSUM)) {
    throw new Error("変換後のチェックサム検証に失敗しました。ファイルは出力しませんでした。");
  }

  outputBytes = vc;

  game.textContent = "日本語版 ポケットモンスター 金・銀";
  sizeEl.textContent = `${input.length.toLocaleString()} bytes → ${VC_SIZE.toLocaleString()} bytes`;
  checksum.textContent = "正常";
  status.textContent = "変換に成功しました。";
  status.className = "status";
  result.classList.remove("hidden");
}

fileInput.addEventListener("change", () => {
  if (fileInput.files.length) convert(fileInput.files[0]).catch(e => showError(e.message));
});

["dragenter", "dragover"].forEach(type => {
  drop.addEventListener(type, e => {
    e.preventDefault();
    drop.classList.add("drag");
  });
});
["dragleave", "drop"].forEach(type => {
  drop.addEventListener(type, e => {
    e.preventDefault();
    drop.classList.remove("drag");
  });
});
drop.addEventListener("drop", e => {
  const file = e.dataTransfer.files[0];
  if (file) convert(file).catch(err => showError(err.message));
});

download.addEventListener("click", () => {
  if (!outputBytes) return;
  const blob = new Blob([outputBytes], {type: "application/octet-stream"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "sav.dat";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
