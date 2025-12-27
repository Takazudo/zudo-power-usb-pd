# MDX Formatter Setup for USB-PD Synth Power

このプロジェクト用にカスタマイズされたMDXフォーマッターのセットアップガイド。

## インストール済み

このプロジェクトには以下が既に設定されています:

- ✅ MDX Formatter (`/doc/sub-packages/mdx-formatter/`)
- ✅ Husky (Git hooks管理)
- ✅ lint-staged (ステージングされたファイルの自動フォーマット)
- ✅ pre-commit hook (コミット時の自動フォーマット)

## Git Hooks の有効化

初回セットアップ時、またはリポジトリをクローンした後に以下を実行:

```bash
# リポジトリルートで実行
git config core.hooksPath .husky
```

これにより、`.husky/pre-commit` フックが有効になります。

## フォーマッターの使い方

### 自動フォーマット (推奨)

Git commitを実行すると、自動的にステージングされた`.md`/`.mdx`ファイルがフォーマットされます:

```bash
git add docs/inbox/my-document.md
git commit -m "ドキュメントを追加"
# → 自動的にフォーマットされてコミットされます
```

### 手動フォーマット

#### 単一ファイル

```bash
cd doc
node sub-packages/mdx-formatter/src/cli.js --write docs/inbox/index.md
```

#### 全ドキュメント

```bash
cd doc
node sub-packages/mdx-formatter/src/cli.js --write "docs/**/*.{md,mdx}"
```

#### フォーマットチェック（書き込みなし）

```bash
cd doc
node sub-packages/mdx-formatter/src/cli.js --check "docs/**/*.{md,mdx}"
```

## フォーマットルール

### 見出し

- ATX形式 (`#`) を使用
- 見出しの後に空行を挿入

```markdown
## 見出し

本文が続きます...
```

### リスト

- 順序なしリストは `-` を使用
- 順序付きリストは `.` を使用
- 最小インデント（2スペース）

### コードブロック

- フェンスコードブロック (\`\`\`) を使用
- 言語識別子を保持
- コード内容は変更しない

### テーブル

- GFMテーブルを整列
- パイプの周りにスペースを追加

### 日本語テキスト

- 日本語の括弧 `（URL）` をmarkdownリンクに変換
- 日本語句読点の間隔を保持
- `、。！？` の周りに余分なスペースを入れない

### MDX/JSX

- JSXコンポーネントを適切なインデントで保持
- import/export文を維持
- 自己閉じタグはそのまま保持

## トラブルシューティング

### Git hookが動かない

```bash
# フックのパスを確認
git config --get core.hooksPath
# → .husky が表示されるはず

# 表示されない場合、設定する
git config core.hooksPath .husky
```

### フォーマッターがエラーを出す

```bash
# フォーマッターの依存関係を再インストール
cd doc/sub-packages/mdx-formatter
npm install
```

### pre-commit hookを一時的にスキップ

```bash
# --no-verifyオプションを使用（推奨しません）
git commit --no-verify -m "メッセージ"
```

## 開発

### フォーマッターのテスト

```bash
cd doc/sub-packages/mdx-formatter
npm test
```

### カバレッジレポート

```bash
cd doc/sub-packages/mdx-formatter
npm run test:coverage
```

## ディレクトリ構造

```
doc/
├── sub-packages/
│   └── mdx-formatter/          # MDXフォーマッター本体
│       ├── src/
│       │   ├── cli.js          # CLIエントリーポイント
│       │   ├── index.js        # APIエントリーポイント
│       │   └── plugins/        # カスタムプラグイン
│       ├── test/               # テストファイル
│       └── package.json
├── docs/                       # ドキュメントファイル
├── package.json                # lint-staged設定を含む
└── .husky/
    └── pre-commit              # Pre-commit hook (doc用)

/.husky/
└── pre-commit                  # Pre-commit hook (ルート)
```

## 参考リンク

- [remark](https://github.com/remarkjs/remark) - Markdownプロセッサー
- [unified](https://unifiedjs.com/) - AST処理フレームワーク
- [Husky](https://typicode.github.io/husky/) - Git hooks管理
- [lint-staged](https://github.com/okonet/lint-staged) - ステージングファイルのlint
