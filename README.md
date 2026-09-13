# G/S/Crystal → 3DS VC Save Converter

日本語版ポケットモンスター 金・銀・クリスタルのセーブを、3DS Virtual Console用 `sav.dat` に変換するクライアントサイドWebツールです。

## 現在の対応

- 日本語版 Pokémon Gold
- 日本語版 Pokémon Silver
- 実機・mGBA等から抽出した通常セーブ
- 日本語版 Pokémon Crystal

## 変換仕様

### 金・銀


1. 入力先頭の `0x8000` bytes を日本語G/Sセーブとして検証
2. `0x2009–0x2C8B` → `0x2D0D`
3. `0x7209–0x7E8B` → `0x7F0D`
4. VC出力を `0x8010` bytes にする
5. `0x2C8C–0x2D0C` を `00` で初期化
6. チェックサムを再検証
7. `sav.dat` としてダウンロード

`0x2C8C–0x2D0C` の初期化は、実機で複数の日本語Silverおよび日本語GoldをVCへ書き込み、ゲーム起動とPoké Transporter認識の両方が成功した実験結果に基づくものです。

### クリスタル

1. 入力先頭の `0x10000` bytes を日本語Crystalセーブとして検証
2. 既知の正常な日本語Crystal VC `sav.dat` の末尾16 bytesを付加
3. `0x2AE3–0x2D0C` を `00` で初期化
4. `0x7CE3–0x7F0C` を `00` で初期化
5. チェックサムを再検証
6. `sav.dat` として出力

この処理は、異なる日本語Crystalセーブ2件を実機3DSへ書き込み、ゲーム起動とPoké Transporter認識の両方が成功した実機検証に基づいています。

## 注意

この互換性パッチの内部的なTransporter実装上の意味はまだ完全には証明されていません。公開時には「実験的に確認された互換性処理」として扱うことを推奨します。

入力セーブはブラウザ内だけで処理します。サーバーへのアップロード処理はありません。


## 対応状況

- Pokémon Gold / Silver（日本語版）: 対応
- Pokémon Crystal（日本語版）: 対応

## 作者

- YouTube: https://www.youtube.com/@%E3%83%8D%E3%83%AB2048
- X: https://x.com/ner2048
