const GS_INPUT_SIZE = 0x8000;
const GS_VC_SIZE = 0x8010;
const CRYSTAL_INPUT_SIZE = 0x10000;
const CRYSTAL_VC_SIZE = 0x10010;
const PRIMARY_START = 0x2009;
const PRIMARY_END = 0x2C8B;
const PRIMARY_CHECKSUM = 0x2D0D;
const SECONDARY_START = 0x7209;
const SECONDARY_END = 0x7E8B;
const SECONDARY_CHECKSUM = 0x7F0D;
const GS_PATCH_START = 0x2C8C;
const GS_PATCH_END = 0x2D0C;

const CRYSTAL_PRIMARY_START = 0x2009;
const CRYSTAL_PRIMARY_END = 0x2AE2;
const CRYSTAL_PRIMARY_CHECKSUM = 0x2D0D;
const CRYSTAL_SECONDARY_START = 0x7209;
const CRYSTAL_SECONDARY_END = 0x7CE2;
const CRYSTAL_SECONDARY_CHECKSUM = 0x7F0D;
const CRYSTAL_PATCH1_START = 0x2AE3;
const CRYSTAL_PATCH1_END = 0x2D0C;
const CRYSTAL_PATCH2_START = 0x7CE3;
const CRYSTAL_PATCH2_END = 0x7F0C;

// Footer taken from a known-working Japanese Crystal VC sav.dat.
const CRYSTAL_VC_FOOTER = new Uint8Array([
  0x1B, 0x34, 0x12, 0x07, 0x00, 0x00, 0x00, 0x00,
  0x76, 0x10, 0x5B, 0xAA, 0x1F, 0x00, 0x00, 0x00
]);

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
  if (bytes.length < GS_INPUT_SIZE) return false;
  const primary = sum16(bytes, PRIMARY_START, PRIMARY_END);
  const primaryStored = le16(bytes, PRIMARY_CHECKSUM);
  const secondary = sum16(bytes, SECONDARY_START, SECONDARY_END);
  const secondaryStored = le16(bytes, SECONDARY_CHECKSUM);
  return primary === primaryStored && secondary === secondaryStored;
}

function isJapaneseCrystal(bytes) {
  if (bytes.length < CRYSTAL_INPUT_SIZE) return false;
  const primary = sum16(bytes, CRYSTAL_PRIMARY_START, CRYSTAL_PRIMARY_END);
  const primaryStored = le16(bytes, CRYSTAL_PRIMARY_CHECKSUM);
  const secondary = sum16(bytes, CRYSTAL_SECONDARY_START, CRYSTAL_SECONDARY_END);
  const secondaryStored = le16(bytes, CRYSTAL_SECONDARY_CHECKSUM);
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
  let vc;
  let gameName;
  let outputSize;

  if (isJapaneseCrystal(input)) {
    // Japanese Crystal uses a 0x10000-byte save area. Additional emulator
    // data (for example in a 0x20000-byte .sav) is intentionally ignored.
    vc = new Uint8Array(CRYSTAL_VC_SIZE);
    vc.set(input.subarray(0, CRYSTAL_INPUT_SIZE));
    vc.set(CRYSTAL_VC_FOOTER, CRYSTAL_INPUT_SIZE);

    // Experimentally verified Japanese Crystal VC + Poké Transporter
    // compatibility patch. These areas are outside the Japanese Crystal
    // checksum data ranges and are zero in a known-good VC save.
    vc.fill(0x00, CRYSTAL_PATCH1_START, CRYSTAL_PATCH1_END + 1);
    vc.fill(0x00, CRYSTAL_PATCH2_START, CRYSTAL_PATCH2_END + 1);

    if (sum16(vc, CRYSTAL_PRIMARY_START, CRYSTAL_PRIMARY_END) !== le16(vc, CRYSTAL_PRIMARY_CHECKSUM) ||
        sum16(vc, CRYSTAL_SECONDARY_START, CRYSTAL_SECONDARY_END) !== le16(vc, CRYSTAL_SECONDARY_CHECKSUM)) {
      throw new Error("クリスタル変換後のチェックサム検証に失敗しました。ファイルは出力しませんでした。");
    }

    gameName = "日本語版 ポケットモンスター クリスタル";
    outputSize = CRYSTAL_VC_SIZE;
  } else if (isJapaneseGS(input)) {
    vc = new Uint8Array(GS_VC_SIZE);
    vc.set(input.subarray(0, Math.min(input.length, GS_VC_SIZE)));

    // Experimentally verified Japanese G/S VC + Poké Transporter compatibility patch.
    vc.fill(0x00, GS_PATCH_START, GS_PATCH_END + 1);

    if (sum16(vc, PRIMARY_START, PRIMARY_END) !== le16(vc, PRIMARY_CHECKSUM) ||
        sum16(vc, SECONDARY_START, SECONDARY_END) !== le16(vc, SECONDARY_CHECKSUM)) {
      throw new Error("金・銀変換後のチェックサム検証に失敗しました。ファイルは出力しませんでした。");
    }

    gameName = "日本語版 ポケットモンスター 金・銀";
    outputSize = GS_VC_SIZE;
  } else {
    if (input.length < GS_INPUT_SIZE) {
      throw new Error("32 KiB未満のファイルです。日本語版 金・銀・クリスタルの通常セーブではない可能性があります。");
    }
    throw new Error("日本語版ポケットモンスター金・銀・クリスタルのセーブとしてチェックサムを確認できませんでした。別言語版、破損セーブなどは現在非対応です。");
  }

  outputBytes = vc;
  game.textContent = gameName;
  sizeEl.textContent = `${input.length.toLocaleString()} bytes → ${outputSize.toLocaleString()} bytes`;
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
