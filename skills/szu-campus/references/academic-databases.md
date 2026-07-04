# Academic Databases

Use CNKI and Wanfang commands for metadata workflows through the Shenzhen University library channel. These commands need a visible browser session.

## Search

```bash
szu-cli cnki search 交通设计 --headed --json
szu-cli cnki search 交通设计 --headed --year 2026 --type 期刊 --json
szu-cli cnki search 交通设计 --headed --format gbt7714 --json
szu-cli cnki search --title 优化 --abstract 交通 --abstract 调度 --headed --json
szu-cli wanfang search 交通设计 --headed --json
szu-cli wanfang search 交通设计 --headed --year 2026 --type 期刊 --json
szu-cli wanfang search 交通设计 --headed --format markdown --json
szu-cli wanfang search --title 优化 --keyword 交通 --abstract 调度 --headed --json
```

Use `--year` and `--type` only as returned-result filters; they do not change the remote provider's search scope.

For citations, add `--format markdown`, `--format gbt7714`, or `--format bibtex`, then read `data.exports.items` instead of reformatting manually.

## Item Metadata

```bash
szu-cli cnki item <url> --headed --json
szu-cli wanfang item <url> --headed --json
```

Use item commands to inspect one detail page's abstract, keywords, DOI, fund, classification, and citation helper fields. Do not download from item commands.

## Single Downloads

```bash
szu-cli cnki download <url> --headed --dir downloads --json
szu-cli wanfang download <url> --headed --dir downloads --json
```

Use downloads only for one user-requested detail page. The CLI clicks a visible PDF or full-text browser download button and returns the saved path.

Do not use downloads for batches, queues, retries, direct-link extraction, CAJ conversion, CAPTCHA bypass, hidden downloads, or non-user-requested full text.
