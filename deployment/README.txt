ZAHR BOUTIQUE — IIS DEPLOYMENT
====================================

1. ONCE PER VPS
   Install Git and IIS. Install the ASP.NET Core 10 Windows x64 Hosting Bundle.
   If it is already installed and working for your other ASP.NET 10 sites, keep it.
   No SDK is needed on the VPS because publish/ contains a compiled release.

2. CREATE THE DNS NAME
   Register a hostname and point its A record to your VPS public IPv4 address.
   Suggested name: zahr-boutique.duckdns.org (not registered or verified here).
   The hostname below is an editable example. All sites can use one IP with different IIS host bindings.

3. OPEN WINDOWS POWERSHELL AS ADMINISTRATOR ON THE VPS
   Copy each command as a separate line. Use Notepad if RDP merges lines.

   New-Item -ItemType Directory -Path "C:\Sites\BusinessWebsites" -Force
   & "C:\Program Files\Git\cmd\git.exe" clone --depth 1 --branch main https://github.com/bilalbaddah23/zahr-boutique.git "C:\Sites\BusinessWebsites\zahr-boutique"
   powershell.exe -NoProfile -ExecutionPolicy Bypass -File "C:\Sites\BusinessWebsites\zahr-boutique\deployment\Install-IIS.ps1" -HostName "zahr-boutique.duckdns.org"

   The installer uses only this site's own IIS application pool and publish folder.
   IIS site: ArtisanZahrBoutique
   Physical path: C:\Sites\BusinessWebsites\zahr-boutique\publish
   Confirm TCP ports 80 and 443 are permitted by Windows and the VPS provider firewall.

4. TEST HTTP BEFORE REQUESTING A CERTIFICATE
   Open http://YOUR-REGISTERED-HOSTNAME/ and check images, collection, product and bag.

5. ENABLE HTTPS
   Run your existing simple-acme wacs.exe as Administrator on the VPS.
   Create a certificate from IIS bindings. Select ONLY ArtisanZahrBoutique and its hostname.
   Let simple-acme validate over HTTP and install the certificate into IIS.
   Verify the HTTPS binding is port 443, has the exact hostname, and uses SNI.
   Verify automatic renewal is scheduled and test https://YOUR-REGISTERED-HOSTNAME/.
   Keep port 80 available for certificate renewals.

6. OPTIONAL HTTP-TO-HTTPS REDIRECT AFTER HTTPS WORKS
   Create publish\appsettings.Production.json on the VPS containing:
   {"Site":{"ForceHttps":true,"AllowSearchEngines":false}}
   Recycle only ArtisanZahrBoutique's application pool. The configuration file is ignored by Git.
   Keep indexing disabled for this demo; enable it only after owner approval and final content review.

7. LATER UPDATES — DOWNLOAD ONLY CHANGES
   powershell.exe -NoProfile -ExecutionPolicy Bypass -File "C:\Sites\BusinessWebsites\zahr-boutique\deployment\Update-Website.ps1"
   Refresh with Ctrl+F5. Do not clone again. The update script requires a clean checkout and uses fast-forward updates.
   If you change source yourself, rebuild the compiled release before pushing: deployment\Build.ps1 (SDK required).

CONTACT MODE: Verified WhatsApp; visitors review the draft and send it themselves.
PRICES: Quote/price confirmation required; no invented prices or stock.
This release has not been installed on the VPS by this local build.
