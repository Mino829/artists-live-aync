# アーティスト公演情報スクレイパー & Notion/通知自動同期アプリ

アーティストの公式サイト等からライブ・イベント情報を自動で収集（スクレイピング）し、**Notionデータベースへの同期**、および **各種チャットツール（Discord、Slack、LINE）への即時通知**を自動で行うNext.jsアプリケーションです。

---

## 🌟 主な機能

1. **マルチプラットフォーム通知システム**:
   * **Discord**: リッチな埋め込みブロック（Embeds）で公演日・会場・詳細URLを見やすく通知。
   * **Slack**: Blocksを用いた美しく整理されたレイアウトで送信。
   * **LINE**: LINE Messaging APIを介して個人宛てにプッシュ通知。
   * Notionへの同期なしで、**通知のみ（Discord/Slack/LINE）のフローも可能**。

2. **スマートなスクレイピングエンジン**:
   * 一般的なHTML構造（米津玄師、Official髭男dismなど）に加え、Sony Music系API（King Gnuなど）や、**XML Feed形式（Mr.ChildrenのXMLニュースなど）**の解析にも対応。
   * 新しい公演のみを検出し、重複を完全に防止（deterministic ID生成）。
   * 取得されたデータをローカルDB（`data/db.json`）とNotionで二重管理。

3. **セキュリティロック（パスコード認証）**:
   * 環境変数 `ACCESS_PASSWORD` によるダッシュボード保護。
   * APIエンドポイントもヘッダー認証（`x-api-key`）およびクエリ認証（`?key=...`）で保護。

4. **ダッシュボード & 実行履歴ログ UI**:
   * **Events Feed**: 取得したライブ公演情報を一覧・日付順ソートでタイムライン表示。
   * **Sync History**: 手動実行やcron自動実行ごとのタイムスタンプ、処理ステータス、新規イベント件数、エラー詳細を履歴として記録・確認可能。
   * **Scraper Test**: 設定したCSSセレクターが正しく動くか、保存せずに画面上で瞬時にテスト可能。

---

## 🛠 動作環境・技術スタック

* **フレームワーク**: Next.js 15+ (App Router, TypeScript)
* **スクレイピング**: Cheerio (HTML & XML Mode)
* **ローカルデータベース**: ファイルベース JSON DB (`data/db.json`)
* **通知**: Discord, Slack Incoming Webhooks, LINE Messaging API

---

## 🚀 はじめに (ローカル/ラズパイでの起動)

### 1. 依存関係のインストール
```bash
bun install
# または
npm install
```

### 2. 環境変数の設定
プロジェクトのルートディレクトリに **`.env.local`** ファイルを作成し、ダッシュボードおよびAPIを保護するパスコードを設定します。

```env
ACCESS_PASSWORD=admin
```

### 3. アプリケーションの起動
#### 開発モード
```bash
bun run dev
# または
npm run dev
```

#### 本番モード (ビルドと起動)
```bash
bun run build && bun run start
# または
npm run build && npm run start
```
起動後、ブラウザで [http://localhost:3000](http://localhost:3000) にアクセスします。初回起動時にパスコードの入力を求められます。

---

## ⏰ クーロン（crontab）によるスクレイピング自動化

定期的にスクレイピングと通知・同期処理をバックグラウンドで走らせるために、`crontab` を使用して自動同期APIを実行します。

### 設定コードの例（1時間に1回実行）
```cron
0 * * * * /usr/bin/curl -s -X POST "http://localhost:3000/api/scrape?key=admin&trigger=cron" > /dev/null 2>&1
```

* **`key=admin`**: `.env.local` で設定した `ACCESS_PASSWORD` を指定します。
* **`trigger=cron`**: これを付与することで、ダッシュボードの実行履歴ログ上で `Cron Sync Job` として識別・記録されます。
* ログファイルを書き出してエラー検知を行いたい場合は以下のように設定します：
  ```cron
  0 * * * * /usr/bin/curl -s -X POST "http://localhost:3000/api/scrape?key=admin&trigger=cron" >> /tmp/scrape-cron.log 2>&1
  ```

---

## 📂 ディレクトリ構成
* `src/app/page.tsx`: メインのダッシュボードUI
* `src/app/api/`: APIエンドポイント (設定管理、スクレイピング、ログ取得、認証チェック)
* `src/lib/db.ts`: JSONファイルデータベースのI/O処理
* `src/lib/scraper.ts`: Cheerio HTML/XML スクレイピング処理
* `src/lib/notion.ts`: Notion API連携
* `src/lib/notification.ts`: Discord/Slack/LINEへの通知送信処理
* `src/lib/auth.ts`: セキュリティヘッダー・キー検証処理
* `data/db.json`: 設定と公演データ（Gitには含まれません）
