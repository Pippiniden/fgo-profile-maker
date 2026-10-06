# fgo-profile-maker
FGOのキャラ紹介風画像作成ツール

- `index.html` … キャラ紹介画像（1024×1024 PNG）
- `status.html` … プロフィール（ステータス）画面風の画像（1280×720 PNG）

どちらもブラウザ内だけで動作し、読み込んだ画像はどこにも送信されません。
ステータス画面の PNG 書き出しには [html-to-image](https://github.com/bubkoo/html-to-image)（MIT License）を CDN から読み込んで使っています。
