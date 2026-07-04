# Academic Databases

Use CNKI and Wanfang only for user-initiated metadata, citation, item-detail, or single-download workflows through the Shenzhen University library channel. These commands need `--headed`.

Run status first when access is uncertain:

```bash
szu-cli cnki status --headed --json
szu-cli wanfang status --headed --json
```

## Route By Intent

| User intent | Use | Boundary |
|---|---|---|
| Search papers | `cnki search <keyword> --headed --json` or `wanfang search <keyword> --headed --json` | Metadata only |
| Fielded search | CNKI: `--title`, repeated `--abstract`; Wanfang: `--title`, `--author`, `--keyword`, `--abstract` | Use supported fields only |
| Returned-result filter | Add `--year <yyyy>` or `--type <type>` | These do not change remote provider scope |
| Citation export | Add `--format markdown`, `--format gbt7714`, or `--format bibtex`; read `data.exports.items` | Do not reformat or invent missing fields |
| One detail page | `cnki item <url> --headed --json` or `wanfang item <url> --headed --json` | No download from item commands |
| One requested full text | `cnki download <url> --headed --dir <path> --json` or Wanfang equivalent | Single visible-button download only |

## Hard Limits

- Prefer metadata and citations before download.
- Do not batch download PDFs, CAJ files, original full text, or attachments.
- Do not construct hidden download URLs, bypass CAPTCHA/access controls, convert CAJ, or queue retries.
- Citation strings must come from visible metadata or `data.exports`; do not fill DOI, issue, pages, or author data from memory.
