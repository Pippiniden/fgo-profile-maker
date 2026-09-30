/*
 * FGO風キャラ紹介メーカー 設定ファイル
 *
 * ■ 魔法陣
 *   magicCircle に背景用の魔法陣画像のパスを書きます（assets/magic-circle.png）。
 *   ・透過PNG推奨。読み込むと「色の付け方」を自動で判定します。
 *       - 線が白っぽく光る、塗りつぶし＋透過の画像 → 明るい線だけを抽出して単色に
 *       - 線だけが残った透過PNG／白地に黒線の画像  → 透明度・濃淡をそのまま線に
 *   ・自動判定が合わないときは、下の magicCircleMode に 'bright' / 'alpha' / 'original'
 *     （original＝元画像の色のまま）のどれかを書くと固定できます。空なら自動です。
 *   ・ファイルが見つからない場合は、ツールが自動生成する簡易な魔法陣を使います。
 *
 * ■ クラスアイコン
 *   同梱していません。利用者が各自の画像をアップロードして使います。
 */
window.FGO_MAKER_CONFIG = {
  magicCircle: 'assets/magic-circle.png',
  magicCircleMode: ''
};
