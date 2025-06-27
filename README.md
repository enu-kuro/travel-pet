# Travel Pet

旅するデジタルペット「たびぺっち」のクラウド実装です。メールを通じてペットを作成し、
毎日AI生成の旅日記をGmailへ届けます。

## 技術スタック
- Node.js 20 / TypeScript 4.x
- Firebase Cloud Functions v2
- Firestore & Cloud Storage
- Google Vertex AI (Gemini) & Imagen via Genkit
- dotprompt によるプロンプト管理 (prompts フォルダに .prompt ファイルを配置)
- nodemailer + imap による Gmail 送受信
- Cloud Scheduler による定期実行

### 主な Google 技術活用
- **Gemini テキスト生成**: `createPetFlow.ts` や `generateDiaryFlow.ts` では
  `ai.prompt()` を通じて Gemini モデルを呼び出し、ペットのプロフィールや日記を生成します。
- **Imagen 画像生成**: `generateDiaryImageFlow.ts` では Imagen モデルを利用して
  旅日記用の画像を作成します。
  ```ts
  const result = await ai.generate({
    model: vertexAI.model("imagen-4.0-fast-generate-preview-06-06"),
    prompt: input.prompt,
    output: { format: "media" },
    config: { aspectRatio: "1:1" },
  });
  ```
- **Cloud Storage への保存**: `saveImageToStorage` 関数で生成画像を Cloud Storage に
  保存し、共有 URL を返します。
  ```ts
  const bucket = getStorage().bucket();
  const originalFile = bucket.file(originalPath);
  await originalFile.save(buffer, { contentType: "image/png" });
  ```
- **Gmail エイリアス**: `email.ts` の `ALIAS_SUFFIX` でエイリアスを定義し、メール送受信を行います。
  ```ts
  const ALIAS_SUFFIX = "+travel-pet";
  ```

## Dotprompt でのプロンプト管理
本プロジェクトでは、Genkit が提供する Dotprompt ライブラリで AI モデル用のプロンプトを管理しています。`functions/prompts` 以下に `.prompt` 拡張子のファイルを配置し、YAML フロントマターでモデルや温度などの設定を記述します。開発時は `genkit start` で起動するデベロッパー UI からプロンプトを調整し、コードでは以下のように読み込みます。

```ts
const petProfilePrompt = ai.prompt('create-pet-profile');
const { output } = await petProfilePrompt({});
```

プロンプトはバージョン管理されるため、ハッカソン後も継続して改良可能です。

## セットアップ
1. Node.js 20 と [Firebase CLI](https://firebase.google.com/docs/cli) をインストール
2. リポジトリをクローンして `functions` ディレクトリで依存関係を取得
   ```bash
   git clone <this repo>
   cd travel-pet/functions
   npm install
   ```
3. Firebase プロジェクトを選択し、必要なシークレットを登録
   ```bash
   firebase use <project-id>
   firebase functions:secrets:set EMAIL_ADDRESS
   firebase functions:secrets:set EMAIL_APP_PASSWORD
   ```
  `EMAIL_ADDRESS` はベースの Gmail アドレス、`EMAIL_APP_PASSWORD` は Gmail の
  アプリ パスワードです。ローカル開発では `functions/.secret.local` ファイルを用
  いて同じキーを設定できます。内容例:
  ```
  EMAIL_ADDRESS=example@gmail.com
  EMAIL_APP_PASSWORD=app-password
  ```

   メールのエイリアスは `functions/src/email.ts` の `ALIAS_SUFFIX` 定数で指定し
   ており、デフォルトは `+travel-pet` です。変更した場合は同じエイリアス宛ての
   メールでペット作成が行われます。

## ローカル開発
- テスト実行: `npm run test`
- Lint チェック: `npm run lint`
- Genkit 開発環境起動: `npm run genkit:start`
- Functions エミュレータ: `npm run serve`

## デプロイ
Firebase へデプロイする場合は以下を実行します。
```bash
npm run deploy
```

## 動作確認
1. デフォルトでは `<gmail-user>+travel-pet@gmail.com` 宛てにメールを送るとペットが作成されます。
2. `ALIAS_SUFFIX` を変更した場合は、そのエイリアス宛てのメールで同様に作成されます。
3. スケジュールされた関数 (10分毎のメールチェック、毎朝の日記生成など) が自動で実行されます。
4. 必要に応じて `manualEmailCheck` などの HTTP トリガーを呼び出し、手動で処理を開始できます。

AI を活用した旅日記生成により、ユーザーへ新しい発見を届けるハッカソン向けプロジェクトです。
