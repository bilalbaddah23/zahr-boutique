# Zahr Boutique

Animated ASP.NET Core 10 demonstration website. Windows x64 IIS release included. 9 source-grounded collection edits, 12 unique public-source still images, brand-specific visual design and responsive layouts.

Collection search and category filters, product photos/zoom, saved favourites, a filterable photo diary, a bag and server-validated customer enquiry drafts. Contact mode: Verified WhatsApp; visitors review the draft and send it themselves.

## Open and run

Open `src/Storefront.csproj` in Visual Studio with .NET10 SDK, or:

```powershell
dotnet run --project src/Storefront.csproj --urls http://127.0.0.1:5654
```

## Publish on IIS

The compiled `publish/` folder is ready for Windows x64 with the ASP.NET Core10 Hosting Bundle. Follow `deployment/README.txt`. Pass your actual registered hostname to `Install-IIS.ps1 -HostName`. `zahr-boutique.duckdns.org` is a suggestion only; no DNS or VPS deployment was performed here.

`deployment/Update-Website.ps1` downloads incremental changes, stops on dirty/divergent checkouts, and preserves ignored production settings and data-protection keys. Source changes must be rebuilt before pushing the release. The SDK is needed only for rebuilding, not for running the included release.

## Content and verification

Research observations and image provenance are in `research/`. Validation reports and desktop/phone screenshots are in `qa/`. Read `VALIDATION.txt` for the exact verified scope. Public profile links plus bounded business/handle/contact searches found no matching official website; an unlisted site cannot be ruled out.

Names describe garments shown by the business and may differ from official references. Prices, stock, materials, sizes and terms require owner confirmation. No product imagery was generated for this build, and no prices or stock were invented. Some images may be still covers of public Reels where documented in research; no video files are embedded or frames extracted. Public-source images remain subject to their owners’ rights and need owner review before final launch. This independent WebBloom demo disables search indexing by default.

No messages are sent automatically. No payments, order database, customer accounts or owner admin/CMS are implemented. Saved favourites and the retail bag, where present, stay in this browser. The server validates draft requests without storing them in an enquiry database.
